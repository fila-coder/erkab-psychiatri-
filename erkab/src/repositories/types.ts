import type {
  AppUser,
  PatientProfile,
  PsychiatristProfile,
  Appointment,
  PaymentRecord,
  MeetingRecord,
  SupportTicket,
  AuditEvent,
  ProviderStatus,
  ProviderAvailabilitySlot,
} from '../types';

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
  /** Requested role — ADMIN cannot be self-assigned */
  role: 'PATIENT' | 'PSYCHIATRIST';
}

export interface UserRepository {
  getById(uid: string): Promise<AppUser | null>;
  getByEmail(email: string): Promise<AppUser | null>;
  list(): Promise<AppUser[]>;
  create(user: AppUser, password: string): Promise<void>;
  update(uid: string, patch: Partial<AppUser>): Promise<void>;
  verifyPassword(email: string, password: string): Promise<AppUser | null>;
}

export interface PatientRepository {
  get(uid: string): Promise<PatientProfile | null>;
  upsert(profile: PatientProfile): Promise<void>;
}

export interface PsychiatristRepository {
  get(uid: string): Promise<PsychiatristProfile | null>;
  listActive(filters?: {
    language?: string;
    specialty?: string;
    jurisdiction?: string;
  }): Promise<PsychiatristProfile[]>;
  listAll(): Promise<PsychiatristProfile[]>;
  upsert(profile: PsychiatristProfile): Promise<void>;
  setStatus(
    uid: string,
    status: ProviderStatus,
    meta: { actorId: string; reason?: string }
  ): Promise<void>;
}

export interface AppointmentRepository {
  get(id: string): Promise<Appointment | null>;
  listByPatient(patientId: string): Promise<Appointment[]>;
  listByProvider(providerId: string): Promise<Appointment[]>;
  listAll(): Promise<Appointment[]>;
  create(appt: Appointment): Promise<Appointment>;
  update(id: string, patch: Partial<Appointment>): Promise<void>;
}

export interface PaymentRepository {
  get(id: string): Promise<PaymentRecord | null>;
  listByPatient(patientId: string): Promise<PaymentRecord[]>;
  create(payment: PaymentRecord): Promise<PaymentRecord>;
  update(id: string, patch: Partial<PaymentRecord>): Promise<void>;
}

export interface MeetingRepository {
  get(id: string): Promise<MeetingRecord | null>;
  getByAppointment(appointmentId: string): Promise<MeetingRecord | null>;
  create(meeting: MeetingRecord): Promise<void>;
}

export interface AuditRepository {
  append(event: AuditEvent): Promise<void>;
  list(limit?: number): Promise<AuditEvent[]>;
}

export interface SupportRepository {
  create(ticket: SupportTicket): Promise<void>;
  listByUser(userId: string): Promise<SupportTicket[]>;
  listAll(): Promise<SupportTicket[]>;
}

export interface AvailabilityRepo {
  listOpenByProvider(providerId: string): Promise<ProviderAvailabilitySlot[]>;
  listByProvider(providerId: string): Promise<ProviderAvailabilitySlot[]>;
  publish(slot: ProviderAvailabilitySlot): Promise<void>;
  claim(slotId: string, appointmentId: string, patientId: string): Promise<void>;
  releaseSlot?(slotId: string, appointmentId: string): Promise<void>;
}

export interface DataRepositories {
  availability?: AvailabilityRepo;

  mode: 'local' | 'firebase';
  users: UserRepository;
  patients: PatientRepository;
  psychiatrists: PsychiatristRepository;
  appointments: AppointmentRepository;
  payments: PaymentRepository;
  meetings: MeetingRepository;
  audit: AuditRepository;
  support: SupportRepository;
  /** Wipe and reseed local demo data */
  resetDemoData?(): Promise<void>;
}
