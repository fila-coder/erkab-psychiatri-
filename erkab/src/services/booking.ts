/**
 * Appointment domain service (Spark client path).
 * Booking claims a provider-published open slot then creates a REQUESTED appointment.
 * Exact-slot exclusivity depends on availability status transitions; see KNOWN_LIMITATIONS.
 */

import { getRepositories } from '../repositories';
import type { Appointment, AppointmentStatus, PsychiatristProfile } from '../types';

export interface BookSlotInput {
  patientId: string;
  providerId: string;
  startAt: string;
  endAt: string;
  timezone: string;
  availabilitySlotId?: string;
}

export type BookResult =
  | { ok: true; appointment: Appointment }
  | { ok: false; error: string };

export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function normalizeIso(value: string): string | null {
  const d = parseIso(value);
  return d ? d.toISOString() : null;
}

export function parseIso(value: string): Date | null {
  if (!value || typeof value !== 'string') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function validateSlotTimes(
  startAt: string,
  endAt: string,
  expectedDurationMin?: number
): string | null {
  const start = parseIso(startAt);
  const end = parseIso(endAt);
  if (!start || !end) return 'Invalid appointment date or time.';
  if (end.getTime() <= start.getTime()) return 'End time must be after start time.';
  const durationMs = end.getTime() - start.getTime();
  if (durationMs <= 0) return 'Appointment duration must be positive.';
  const durationMin = durationMs / 60000;
  if (expectedDurationMin != null && Math.abs(durationMin - expectedDurationMin) > 1) {
    return `Appointment duration must be ${expectedDurationMin} minutes.`;
  }
  if (start.getTime() <= Date.now()) return 'Cannot book a slot in the past.';
  return null;
}

export function canBookProvider(
  provider: PsychiatristProfile,
  patientJurisdiction: string
): string | null {
  if (provider.status !== 'ACTIVE') {
    return 'This psychiatrist is not currently bookable.';
  }
  if (provider.trustPassport.overall !== 'verified') {
    return 'This psychiatrist has not completed verification.';
  }
  if (patientJurisdiction && !provider.jurisdictions.includes(patientJurisdiction)) {
    return `This psychiatrist is not eligible to treat patients in ${patientJurisdiction}.`;
  }
  return null;
}

export async function bookAppointment(input: BookSlotInput): Promise<BookResult> {
  const repo = getRepositories();
  const provider = await repo.psychiatrists.get(input.providerId);
  if (!provider) return { ok: false, error: 'Psychiatrist not found.' };

  const normStart = normalizeIso(input.startAt);
  const normEnd = normalizeIso(input.endAt);
  if (!normStart || !normEnd) {
    return { ok: false, error: 'Invalid appointment date or time.' };
  }
  const timeError = validateSlotTimes(
    normStart,
    normEnd,
    provider.sessionDurationMin
  );
  if (timeError) return { ok: false, error: timeError };
  input = { ...input, startAt: normStart, endAt: normEnd };

  const patient = await repo.patients.get(input.patientId);
  const jurisdiction = patient?.jurisdiction || '';
  const eligibilityError = canBookProvider(provider, jurisdiction);
  if (eligibilityError) return { ok: false, error: eligibilityError };

  const existing = await repo.appointments.listByProvider(input.providerId);
  for (const appt of existing) {
    if (appt.status === 'CANCELLED' || appt.status === 'REFUNDED') continue;
    if (overlaps(input.startAt, input.endAt, appt.startAt, appt.endAt)) {
      return { ok: false, error: 'This time slot is no longer available.' };
    }
  }

  const patientAppts = await repo.appointments.listByPatient(input.patientId);
  for (const appt of patientAppts) {
    if (appt.status === 'CANCELLED' || appt.status === 'REFUNDED') continue;
    if (overlaps(input.startAt, input.endAt, appt.startAt, appt.endAt)) {
      return { ok: false, error: 'You already have an appointment at this time.' };
    }
  }

  const t = new Date().toISOString();
  const appointment: Appointment = {
    id: `appt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    patientId: input.patientId,
    providerId: input.providerId,
    startAt: input.startAt,
    endAt: input.endAt,
    timezone: input.timezone,
    status: 'REQUESTED',
    priceSnapshot: {
      amount: provider.price.amount,
      currency: provider.price.currency,
      platformFee: Math.round(provider.price.amount * 0.1 * 100) / 100,
    },
    createdAt: t,
    updatedAt: t,
  };
  if (!input.availabilitySlotId) {
    return { ok: false, error: 'A published availability slot is required.' };
  }

  appointment.availabilitySlotId = input.availabilitySlotId;
  appointment.status = 'REQUESTED';

  try {
    // Single repository operation: transaction claims availability + creates appointment
    const created = await repo.appointments.create(appointment);
    return { ok: true, appointment: created || appointment };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Booking failed.',
    };
  }
}

export async function cancelAppointment(
  appointmentId: string,
  actorId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const repo = getRepositories();
  const appt = await repo.appointments.get(appointmentId);
  if (!appt) return { ok: false, error: 'Appointment not found.' };

  const actor = await repo.users.getById(actorId);
  const isOwner = appt.patientId === actorId || appt.providerId === actorId;
  const isAdmin = actor?.role === 'ADMIN';
  if (!isOwner && !isAdmin) {
    return { ok: false, error: 'Not authorized to cancel this appointment.' };
  }
  if (
    appt.status === 'CANCELLED' ||
    appt.status === 'COMPLETED' ||
    appt.status === 'REFUNDED'
  ) {
    return { ok: false, error: `Cannot cancel an appointment that is ${appt.status}.` };
  }

  // Update appointment then release slot only if still linked to this appointment
  try {
    await repo.appointments.update(appointmentId, { status: 'CANCELLED' });
    const slotId = (appt as { availabilitySlotId?: string }).availabilitySlotId;
    if (slotId && repo.availability && 'releaseSlot' in repo.availability) {
      await (repo.availability as { releaseSlot: (a: string, b: string) => Promise<void> }).releaseSlot(
        slotId,
        appointmentId
      );
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Cancellation failed.',
    };
  }
}

export async function listPatientAppointments(patientId: string) {
  const repo = getRepositories();
  return repo.appointments.listByPatient(patientId);
}

export async function listProviderAppointments(providerId: string) {
  const repo = getRepositories();
  return repo.appointments.listByProvider(providerId);
}
