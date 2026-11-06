export type UserRole = 'PATIENT' | 'PSYCHIATRIST' | 'ADMIN';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  timezone: string;
  status: 'active' | 'disabled';
  createdAt: string;
  updatedAt: string;
}

export interface PatientProfile {
  uid: string;
  jurisdiction: string;
  intake?: {
    reasons: string[];
    languages: string[];
    completedAt: string;
  };
  updatedAt: string;
}

export interface TrustPassport {
  identity: { status: string };
  licence: { status: string };
  qualification: { status: string };
  interview: { status: string };
  overall: string;
  verificationDate?: string;
}

export interface PsychiatristProfile {
  uid: string;
  professionalName: string;
  bio: string;
  specialties: string[];
  languages: string[];
  jurisdictions: string[];
  sessionDurationMin: number;
  price: { amount: number; currency: string };
  trustPassport: TrustPassport;
  cancellationPolicy: string;
  status: 'DRAFT' | 'PENDING' | 'ACTIVE' | 'REJECTED';
  driveEvidenceUrl?: string;
  applicationNotes?: string;
  updatedAt: string;
}

export interface AvailabilitySlot {
  id: string;
  providerId: string;
  startAt: string;
  endAt: string;
  status: 'open' | 'booked';
  appointmentId?: string | null;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  providerId: string;
  startAt: string;
  endAt: string;
  timezone: string;
  status: 'REQUESTED' | 'CONFIRMED' | 'CANCELLED';
  availabilitySlotId: string;
  priceSnapshot?: { amount: number; currency: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  name: string;
  email: string;
  message: string;
  createdAt: string;
}

export const REASONS = [
  'Anxiety',
  'Depression',
  'Stress',
  'Sleep problems',
  'Relationship issues',
  'Grief or loss',
  'Trauma',
  'Other',
];

export const LANGUAGES = ['English', 'Amharic', 'Arabic', 'French'];
export const JURISDICTIONS = ['ET', 'KE', 'UG', 'AE', 'GB', 'US'];
