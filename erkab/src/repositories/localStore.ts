/**
 * Local development repository — persists to localStorage.
 * Clearly labelled development-only. Not production security.
 */

import type {
  AppUser,
  PatientProfile,
  PsychiatristProfile,
  Appointment,
  PaymentRecord,
  MeetingRecord,
  SupportTicket,
  AuditEvent,
  TrustPassport,
  ProviderStatus,
} from '../types';
import type { DataRepositories } from './types';

const STORAGE_KEY = 'erkab_local_v1';
const SESSION_KEY = 'erkab_local_session_uid';

interface Snapshot {
  users: AppUser[];
  passwords: Record<string, string>;
  patients: PatientProfile[];
  psychiatrists: PsychiatristProfile[];
  appointments: Appointment[];
  payments: PaymentRecord[];
  meetings: MeetingRecord[];
  tickets: SupportTicket[];
  audit: AuditEvent[];
}

function now() {
  return new Date().toISOString();
}

function makePassport(verified: boolean): TrustPassport {
  const base = {
    status: verified ? ('checked' as const) : ('pending' as const),
    reviewedAt: verified ? now() : undefined,
  };
  return {
    identity: { ...base },
    licence: { ...base },
    qualification: { ...base },
    interview: { ...base },
    overall: verified ? 'verified' : 'unverified',
    verificationDate: verified ? now() : undefined,
  };
}

function seed(): Snapshot {
  const t = now();
  return {
    users: [
      {
        uid: 'admin-demo',
        email: 'admin@demo.erkab.local',
        displayName: 'Erkab Admin (Demo)',
        role: 'ADMIN',
        timezone: 'UTC',
        status: 'active',
        createdAt: t,
        updatedAt: t,
        isDemo: true,
      },
      {
        uid: 'patient-demo',
        email: 'patient@demo.erkab.local',
        displayName: 'Demo Patient',
        role: 'PATIENT',
        timezone: 'Africa/Addis_Ababa',
        status: 'active',
        createdAt: t,
        updatedAt: t,
        isDemo: true,
      },
      {
        uid: 'psy-demo-1',
        email: 'amara@demo.erkab.local',
        displayName: 'Dr. Amara Tesfaye (Demo)',
        role: 'PSYCHIATRIST',
        timezone: 'Africa/Addis_Ababa',
        status: 'active',
        createdAt: t,
        updatedAt: t,
        isDemo: true,
      },
      {
        uid: 'psy-demo-2',
        email: 'james@demo.erkab.local',
        displayName: 'Dr. James Okello (Demo)',
        role: 'PSYCHIATRIST',
        timezone: 'Africa/Nairobi',
        status: 'active',
        createdAt: t,
        updatedAt: t,
        isDemo: true,
      },
    ],
    passwords: {
      'admin@demo.erkab.local': 'admin1234',
      'patient@demo.erkab.local': 'patient1234',
      'amara@demo.erkab.local': 'provider1234',
      'james@demo.erkab.local': 'provider1234',
    },
    patients: [
      {
        uid: 'patient-demo',
        jurisdiction: 'ET',
        intake: {
          reasons: ['Anxiety or low mood'],
          languages: ['English'],
          completedAt: t,
        },
        updatedAt: t,
      },
    ],
    psychiatrists: [
      {
        uid: 'psy-demo-1',
        status: 'ACTIVE',
        professionalName: 'Dr. Amara Tesfaye (Demo)',
        bio: 'Consultant psychiatrist focusing on anxiety, mood disorders, and cross-cultural mental health. Demonstration profile only — not a real booking.',
        specialties: ['Anxiety', 'Mood disorders', 'Cross-cultural psychiatry'],
        languages: ['English', 'Amharic'],
        jurisdictions: ['ET', 'KE'],
        sessionDurationMin: 50,
        price: { amount: 80, currency: 'USD' },
        trustPassport: makePassport(true),
        cancellationPolicy:
          'Cancel or reschedule at least 24 hours before the session for a full refund.',
        isDemo: true,
        updatedAt: t,
      },
      {
        uid: 'psy-demo-2',
        status: 'ACTIVE',
        professionalName: 'Dr. James Okello (Demo)',
        bio: 'Specialist in ADHD assessment and adult attention difficulties. Demonstration profile only.',
        specialties: ['ADHD', 'Medication review'],
        languages: ['English'],
        jurisdictions: ['KE', 'UG', 'GB'],
        sessionDurationMin: 50,
        price: { amount: 110, currency: 'USD' },
        trustPassport: makePassport(true),
        cancellationPolicy:
          'Cancel or reschedule at least 24 hours before the session for a full refund.',
        isDemo: true,
        updatedAt: t,
      },
      {
        uid: 'psy-pending-1',
        status: 'UNDER_REVIEW',
        professionalName: 'Dr. Pending Application (Demo)',
        bio: 'Under review — not bookable.',
        specialties: ['Sleep'],
        languages: ['English', 'Arabic'],
        jurisdictions: ['AE'],
        sessionDurationMin: 50,
        price: { amount: 95, currency: 'USD' },
        trustPassport: makePassport(false),
        cancellationPolicy: 'TBD',
        isDemo: true,
        updatedAt: t,
      },
    ],
    appointments: [],
    payments: [],
    meetings: [],
    tickets: [],
    audit: [],
  };
}

function load(): Snapshot {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw) as Snapshot;
  } catch {
    const s = seed();
    return s;
  }
}

function save(s: Snapshot) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getSessionUid(): string | null {
  return sessionStorage.getItem(SESSION_KEY);
}

export function setSessionUid(uid: string | null) {
  if (uid) sessionStorage.setItem(SESSION_KEY, uid);
  else sessionStorage.removeItem(SESSION_KEY);
}

export function createLocalRepositories(): DataRepositories {
  return {
    mode: 'local',

    users: {
      async getById(uid) {
        return load().users.find((u) => u.uid === uid) || null;
      },
      async getByEmail(email) {
        const e = email.toLowerCase();
        return load().users.find((u) => u.email === e) || null;
      },
      async list() {
        return load().users;
      },
      async create(user, password) {
        const s = load();
        if (s.users.some((u) => u.email === user.email.toLowerCase())) {
          throw new Error('An account with this email already exists.');
        }
        s.users.push({ ...user, email: user.email.toLowerCase() });
        s.passwords[user.email.toLowerCase()] = password;
        save(s);
      },
      async update(uid, patch) {
        const s = load();
        const i = s.users.findIndex((u) => u.uid === uid);
        if (i < 0) throw new Error('User not found');
        // Prevent role self-elevation via client patch
        const { role: _r, ...safe } = patch as Partial<AppUser> & { role?: string };
        s.users[i] = { ...s.users[i]!, ...safe, updatedAt: now() };
        save(s);
      },
      async verifyPassword(email, password) {
        const s = load();
        const e = email.toLowerCase();
        if (s.passwords[e] !== password) return null;
        return s.users.find((u) => u.email === e) || null;
      },
    },

    patients: {
      async get(uid) {
        return load().patients.find((p) => p.uid === uid) || null;
      },
      async upsert(profile) {
        const s = load();
        const i = s.patients.findIndex((p) => p.uid === profile.uid);
        if (i >= 0) s.patients[i] = { ...profile, updatedAt: now() };
        else s.patients.push({ ...profile, updatedAt: now() });
        save(s);
      },
    },

    psychiatrists: {
      async get(uid) {
        return load().psychiatrists.find((p) => p.uid === uid) || null;
      },
      async listActive(filters) {
        let list = load().psychiatrists.filter(
          (p) => p.status === 'ACTIVE' || p.status === 'APPROVED'
        );
        if (filters?.language) {
          list = list.filter((p) =>
            p.languages.some((l) => l.toLowerCase() === filters.language!.toLowerCase())
          );
        }
        if (filters?.specialty) {
          list = list.filter((p) =>
            p.specialties.some((s) =>
              s.toLowerCase().includes(filters.specialty!.toLowerCase())
            )
          );
        }
        if (filters?.jurisdiction) {
          list = list.filter((p) => p.jurisdictions.includes(filters.jurisdiction!));
        }
        return list;
      },
      async listAll() {
        return load().psychiatrists;
      },
      async upsert(profile) {
        const s = load();
        const i = s.psychiatrists.findIndex((p) => p.uid === profile.uid);
        if (i >= 0) s.psychiatrists[i] = { ...profile, updatedAt: now() };
        else s.psychiatrists.push({ ...profile, updatedAt: now() });
        save(s);
      },
      async setStatus(uid, status, meta) {
        const s = load();
        const i = s.psychiatrists.findIndex((p) => p.uid === uid);
        if (i < 0) throw new Error('Provider not found');
        const p = s.psychiatrists[i]!;
        p.status = status;
        p.applicationNotes = meta.reason || p.applicationNotes;
        p.updatedAt = now();
        if (status === 'APPROVED' || status === 'ACTIVE') {
          const tp = p.trustPassport;
          const allChecked =
            tp.identity.status === 'checked' &&
            tp.licence.status === 'checked' &&
            tp.qualification.status === 'checked' &&
            tp.interview.status === 'checked';
          if (!allChecked) {
            throw new Error(
              'Cannot activate: all Trust Passport categories must be individually marked checked before approval.'
            );
          }
          p.status = 'ACTIVE';
          p.trustPassport.overall = 'verified';
          p.trustPassport.verificationDate = now();
        }
        if (status === 'REJECTED' || status === 'SUSPENDED') {
          p.trustPassport.overall = 'unverified';
        }
        s.audit.push({
          id: id('audit'),
          actorId: meta.actorId,
          action: `provider.${status.toLowerCase()}`,
          targetType: 'psychiatrist',
          targetId: uid,
          reason: meta.reason,
          at: now(),
        });
        save(s);
      },
    },

    appointments: {
      async get(apptId) {
        return load().appointments.find((a) => a.id === apptId) || null;
      },
      async listByPatient(patientId) {
        return load()
          .appointments.filter((a) => a.patientId === patientId)
          .sort((a, b) => a.startAt.localeCompare(b.startAt));
      },
      async listByProvider(providerId) {
        return load()
          .appointments.filter((a) => a.providerId === providerId)
          .sort((a, b) => a.startAt.localeCompare(b.startAt));
      },
      async listAll() {
        return load().appointments;
      },
      async create(appt) {
        const s = load();
        s.appointments.push(appt);
        save(s);
      },
      async update(apptId, patch) {
        const s = load();
        const i = s.appointments.findIndex((a) => a.id === apptId);
        if (i < 0) throw new Error('Appointment not found');
        s.appointments[i] = { ...s.appointments[i]!, ...patch, updatedAt: now() };
        save(s);
      },
    },

    payments: {
      async get(payId) {
        return load().payments.find((p) => p.id === payId) || null;
      },
      async listByPatient(patientId) {
        return load().payments.filter((p) => p.patientId === patientId);
      },
      async create(payment) {
        const s = load();
        s.payments.push(payment);
        save(s);
      },
      async update(payId, patch) {
        const s = load();
        const i = s.payments.findIndex((p) => p.id === payId);
        if (i < 0) throw new Error('Payment not found');
        s.payments[i] = { ...s.payments[i]!, ...patch, updatedAt: now() };
        save(s);
      },
    },

    meetings: {
      async get(mId) {
        return load().meetings.find((m) => m.id === mId) || null;
      },
      async getByAppointment(appointmentId) {
        return load().meetings.find((m) => m.appointmentId === appointmentId) || null;
      },
      async create(meeting) {
        const s = load();
        s.meetings.push(meeting);
        save(s);
      },
    },

    audit: {
      async append(event) {
        const s = load();
        s.audit.push(event);
        save(s);
      },
      async list(limit = 50) {
        return load().audit.slice(-limit).reverse();
      },
    },

    
    availability: {
      async listOpenByProvider(providerId: string) {
        const raw = localStorage.getItem('erkab_availability') || '[]';
        const all = JSON.parse(raw) as import('../types').ProviderAvailabilitySlot[];
        return all.filter((s) => s.providerId === providerId && s.status === 'open');
      },
      async listByProvider(providerId: string) {
        const raw = localStorage.getItem('erkab_availability') || '[]';
        const all = JSON.parse(raw) as import('../types').ProviderAvailabilitySlot[];
        return all.filter((s) => s.providerId === providerId);
      },
      async publish(slot: import('../types').ProviderAvailabilitySlot) {
        const raw = localStorage.getItem('erkab_availability') || '[]';
        const all = JSON.parse(raw) as import('../types').ProviderAvailabilitySlot[];
        const i = all.findIndex((s) => s.id === slot.id);
        if (i >= 0) all[i] = slot;
        else all.push(slot);
        localStorage.setItem('erkab_availability', JSON.stringify(all));
      },
      async releaseSlot(slotId: string, appointmentId: string) {
        const raw = localStorage.getItem('erkab_availability') || '[]';
        const all = JSON.parse(raw) as import('../types').ProviderAvailabilitySlot[];
        const s = all.find((x) => x.id === slotId);
        if (s && s.status === 'booked' && s.appointmentId === appointmentId) {
          s.status = 'open';
          s.appointmentId = undefined;
          localStorage.setItem('erkab_availability', JSON.stringify(all));
        }
      },
      async claim(slotId: string, appointmentId: string, _patientId: string) {
        const raw = localStorage.getItem('erkab_availability') || '[]';
        const all = JSON.parse(raw) as import('../types').ProviderAvailabilitySlot[];
        const s = all.find((x) => x.id === slotId);
        if (!s || s.status !== 'open') throw new Error('Slot is no longer available.');
        s.status = 'booked';
        s.appointmentId = appointmentId;
        localStorage.setItem('erkab_availability', JSON.stringify(all));
      },
    },
    support: {
      async create(ticket) {
        const s = load();
        s.tickets.push(ticket);
        save(s);
      },
      async listByUser(userId) {
        return load().tickets.filter((t) => t.userId === userId);
      },
      async listAll() {
        return load().tickets;
      },
    },

    async resetDemoData() {
      const s = seed();
      save(s);
      setSessionUid(null);
    },
  };
}
