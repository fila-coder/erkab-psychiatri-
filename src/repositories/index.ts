/**
 * Repositories — all Firestore access through the REST API
 * (firestoreRest.ts). No imports from 'firebase/firestore' anywhere.
 *
 * Collections: users, patients, psychiatristApplications,
 * psychiatristPublic, availability, appointments, supportTickets,
 * auditLogs. Listing uses the REST collection list and filters
 * client-side; collections in this app are small.
 */
import { restGet, restSet, restAdd, restDelete, restList, restQuery } from '../lib/firestoreRest';
import type {
  AppUser,
  Appointment,
  AvailabilitySlot,
  PatientProfile,
  PsychiatristProfile,
  SupportTicket,
  UserRole,
} from '../lib/types';

const nowIso = (): string => new Date().toISOString();

export const usersRepo = {
  async getById(uid: string): Promise<AppUser | null> {
    const doc = await restGet<AppUser>(`users/${uid}`);
    if (!doc) return null;
    const { id: _id, ...rest } = doc;
    void _id;
    return rest as AppUser;
  },
  async list(): Promise<AppUser[]> {
    const docs = await restList<AppUser>('users');
    return docs.map((d) => {
      const { id: _id, ...rest } = d;
      void _id;
      return rest as AppUser;
    });
  },
  async updateRole(uid: string, role: UserRole): Promise<void> {
    const existing = await usersRepo.getById(uid);
    if (!existing) throw new Error('User profile not found.');
    await restSet(`users/${uid}`, {
      ...existing,
      role,
      updatedAt: nowIso(),
    });
  },
};

export const patientsRepo = {
  async get(uid: string): Promise<PatientProfile | null> {
    const doc = await restGet<PatientProfile>(`patients/${uid}`);
    if (!doc) return null;
    const { id: _id, ...rest } = doc;
    void _id;
    return rest as PatientProfile;
  },
  async upsert(profile: PatientProfile): Promise<void> {
    await restSet(`patients/${profile.uid}`, {
      ...profile,
      updatedAt: nowIso(),
    });
  },
};

export const therapistsRepo = {
  async getApplication(uid: string): Promise<PsychiatristProfile | null> {
    const doc = await restGet<PsychiatristProfile>(
      `psychiatristApplications/${uid}`
    );
    if (!doc) return null;
    const { id: _id, ...rest } = doc;
    void _id;
    return rest as PsychiatristProfile;
  },
  async upsertApplication(profile: PsychiatristProfile): Promise<void> {
    await restSet(`psychiatristApplications/${profile.uid}`, {
      ...profile,
      updatedAt: nowIso(),
    });
  },
  async listApplications(): Promise<PsychiatristProfile[]> {
    const docs = await restList<PsychiatristProfile>('psychiatristApplications');
    return docs.map((d) => {
      const { id: _id, ...rest } = d;
      void _id;
      return rest as PsychiatristProfile;
    });
  },
  async listActive(filters?: {
    language?: string;
    jurisdiction?: string;
  }): Promise<PsychiatristProfile[]> {
    const docs = await restList<PsychiatristProfile>('psychiatristPublic', {
      requireAuth: false,
    });
    let list = docs
      .filter((d) => d.status === 'ACTIVE')
      .map((d) => {
        const { id: _id, ...rest } = d;
        void _id;
        return rest as PsychiatristProfile;
      });
    // Soft filters only — an empty filter result never hides everyone.
    if (filters?.language) {
      const lang = filters.language.toLowerCase();
      const filtered = list.filter(
        (p) =>
          !p.languages?.length ||
          p.languages.some((l) => l.toLowerCase() === lang)
      );
      if (filtered.length) list = filtered;
    }
    if (filters?.jurisdiction) {
      const filtered = list.filter(
        (p) =>
          !p.jurisdictions?.length ||
          p.jurisdictions.includes(filters.jurisdiction!)
      );
      if (filtered.length) list = filtered;
    }
    return list;
  },
  /** Publish the public profile when an admin approves a therapist. */
  async publishPublic(profile: PsychiatristProfile): Promise<void> {
    await restSet(`psychiatristPublic/${profile.uid}`, {
      ...profile,
      status: 'ACTIVE',
      updatedAt: nowIso(),
    });
  },
  async unpublishPublic(uid: string): Promise<void> {
    await restDelete(`psychiatristPublic/${uid}`);
  },
};

export const availabilityRepo = {
  async listOpenByProvider(providerId: string): Promise<AvailabilitySlot[]> {
    const docs = await restList<AvailabilitySlot>('availability');
    return docs
      .filter((d) => d.providerId === providerId && d.status === 'open')
      .map((d) => d as AvailabilitySlot)
      .sort((a, b) => a.startAt.localeCompare(b.startAt));
  },
  async listByProvider(providerId: string): Promise<AvailabilitySlot[]> {
    const docs = await restList<AvailabilitySlot>('availability');
    return docs
      .filter((d) => d.providerId === providerId)
      .map((d) => d as AvailabilitySlot)
      .sort((a, b) => a.startAt.localeCompare(b.startAt));
  },
  async publish(slot: AvailabilitySlot): Promise<void> {
    await restSet(`availability/${slot.id}`, {
      ...slot,
      updatedAt: nowIso(),
    });
  },
  async setStatus(
    slotId: string,
    status: 'open' | 'booked',
    appointmentId: string | null
  ): Promise<void> {
    const slot = await restGet<AvailabilitySlot>(`availability/${slotId}`);
    if (!slot) throw new Error('Availability slot not found.');
    const { id: _id, ...rest } = slot;
    void _id;
    await restSet(`availability/${slotId}`, {
      ...rest,
      status,
      appointmentId,
      updatedAt: nowIso(),
    });
  },
};

export const appointmentsRepo = {
  async listByPatient(patientId: string): Promise<Appointment[]> {
    // Filtered server-side: an unfiltered list of ALL appointments is
    // denied by the owner-only read rule (403), even when empty.
    // Asking only for this patient's appointments passes the rule.
    const docs = await restQuery<Appointment>(
      'appointments',
      'patientId',
      patientId
    );
    return docs
      .map((d) => d as Appointment)
      .sort((a, b) => a.startAt.localeCompare(b.startAt));
  },
  async listByProvider(providerId: string): Promise<Appointment[]> {
    // Filtered server-side — see listByPatient above.
    const docs = await restQuery<Appointment>(
      'appointments',
      'providerId',
      providerId
    );
    return docs
      .map((d) => d as Appointment)
      .sort((a, b) => a.startAt.localeCompare(b.startAt));
  },
  async create(appt: Omit<Appointment, 'id'>): Promise<string> {
    return restAdd('appointments', appt as unknown as Record<string, unknown>);
  },
  async updateStatus(
    id: string,
    status: 'REQUESTED' | 'CONFIRMED' | 'CANCELLED'
  ): Promise<void> {
    const existing = await restGet<Appointment>(`appointments/${id}`);
    if (!existing) throw new Error('Appointment not found.');
    const { id: _id, ...rest } = existing;
    void _id;
    await restSet(`appointments/${id}`, {
      ...rest,
      status,
      updatedAt: nowIso(),
    });
  },
};

export const supportRepo = {
  async create(ticket: Omit<SupportTicket, 'id'>): Promise<string> {
    return restAdd('supportTickets', ticket as unknown as Record<string, unknown>);
  },
  async listAll(): Promise<SupportTicket[]> {
    const docs = await restList<SupportTicket>('supportTickets');
    return docs.map((d) => d as SupportTicket);
  },
};

export const auditRepo = {
  async append(entry: {
    actorId: string;
    action: string;
    targetType: string;
    targetId: string;
    reason?: string;
  }): Promise<string> {
    return restAdd('auditLogs', {
      ...entry,
      reason: entry.reason || '',
      at: nowIso(),
    });
  },
};

export function jitsiUrl(appointmentId: string): string {
  const room = `erkab-${appointmentId}`.replace(/[^a-zA-Z0-9-]/g, '');
  return `https://meet.jit.si/${room}`;
}
