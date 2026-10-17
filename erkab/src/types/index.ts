/** Domain types for Erkab Psychiatry */

export type UserRole = 'PATIENT' | 'PSYCHIATRIST' | 'ADMIN';

export type ProviderStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'MORE_INFORMATION_REQUIRED'
  | 'APPROVED'
  | 'ACTIVE'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'EXPIRED';

export type AppointmentStatus =
  | 'REQUESTED'
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW'
  | 'REFUND_PENDING'
  | 'REFUNDED';

export type PaymentStatus =
  | 'NOT_CONFIGURED'
  | 'CREATED'
  | 'PENDING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUND_PENDING'
  | 'REFUNDED';

export type MeetingStatus = 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELLED' | 'FAILED';

export interface VerificationAttribute {
  status: 'pending' | 'checked' | 'failed' | 'expired';
  reviewedAt?: string;
  reviewerId?: string;
  expiresAt?: string;
  evidenceRef?: string;
}

export interface TrustPassport {
  identity: VerificationAttribute;
  licence: VerificationAttribute;
  qualification: VerificationAttribute;
  interview: VerificationAttribute;
  overall: 'verified' | 'partial' | 'unverified' | 'suspended';
  verificationDate?: string;
}

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  timezone: string;
  status: 'active' | 'suspended';
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;
}

export interface PatientProfile {
  uid: string;
  jurisdiction: string;
  intake?: {
    reasons: string[];
    languages: string[];
    completedAt?: string;
  };
  updatedAt: string;
}

export interface PsychiatristProfile {
  uid: string;
  status: ProviderStatus;
  professionalName: string;
  bio: string;
  specialties: string[];
  languages: string[];
  jurisdictions: string[];
  sessionDurationMin: number;
  price: { amount: number; currency: string };
  portraitURL?: string;
  trustPassport: TrustPassport;
  cancellationPolicy: string;
  applicationNotes?: string;
  /** Private Google Drive folder URL — never publish to public profiles */
  driveEvidenceUrl?: string;
  review?: {
    decision?: 'pending' | 'needs_more_information' | 'approved' | 'rejected';
    reviewerId?: string;
    reviewedAt?: string;
    notes?: string;
    evidenceItemsChecked?: string[];
    licenseCheckOutcome?: string;
  };
  isDemo?: boolean;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  providerId: string;
  startAt: string;
  endAt: string;
  timezone: string;
  status: AppointmentStatus;
  priceSnapshot: { amount: number; currency: string; platformFee: number };
  availabilitySlotId?: string;
  paymentId?: string;
  meetingId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  id: string;
  appointmentId: string;
  patientId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  isTestTransaction: boolean;
  providerRef?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingRecord {
  id: string;
  appointmentId: string;
  status: MeetingStatus;
  provider: 'local' | 'zoom' | 'meet' | 'none';
  joinHint?: string;
  isTestMeeting: boolean;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  body: string;
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  reason?: string;
  at: string;
}

export interface AvailabilitySlot {
  id: string;
  startAt: string;
  endAt: string;
  localLabel: string;
}

export interface PsychiatristPublic {
  id: string;
  professionalName: string;
  bio: string;
  specialties: string[];
  languages: string[];
  jurisdictions: string[];
  sessionDurationMin: number;
  price: { amount: number; currency: string };
  portraitURL?: string;
  trustPassport: TrustPassport;
  cancellationPolicy: string;
  isDemo?: boolean;
}


/** Provider-published bookable slot (deterministic id: providerId_startAt) */
export interface ProviderAvailabilitySlot {
  id: string;
  providerId: string;
  startAt: string;
  endAt: string;
  status: 'open' | 'booked' | 'cancelled';
  appointmentId?: string;
  createdAt: string;
  updatedAt: string;
}
