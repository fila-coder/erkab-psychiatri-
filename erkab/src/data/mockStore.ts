/**
 * In-memory mock store used when Firebase is not configured.
 * Allows full UI flow testing without inventing successful payments
 * or claiming external integrations work.
 */

import type {
  UserRole,
  ProviderStatus,
  AppointmentStatus,
  PaymentStatus,
  TrustPassport,
} from '../types';

export interface MockUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  timezone: string;
  createdAt: string;
}

export interface MockPatient {
  uid: string;
  jurisdiction: string;
  intake?: {
    reasons: string[];
    languages: string[];
    completedAt?: string;
  };
}

export interface MockPsychiatrist {
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
}

export interface MockAppointment {
  id: string;
  patientId: string;
  providerId: string;
  startAt: string;
  endAt: string;
  timezone: string;
  status: AppointmentStatus;
  priceSnapshot: { amount: number; currency: string; platformFee: number };
  meetingId?: string;
  createdAt: string;
}

export interface MockPayment {
  id: string;
  appointmentId: string;
  patientId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  providerRef?: string;
  createdAt: string;
}

export interface MockSupportTicket {
  id: string;
  userId: string;
  subject: string;
  body: string;
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: string;
}

const now = () => new Date().toISOString();

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

// Seed data — clearly demo, never presented as real licensed professionals
const seedPsychiatrists: MockPsychiatrist[] = [
  {
    uid: 'psy-demo-1',
    status: 'ACTIVE',
    professionalName: 'Dr. Amara Tesfaye (Demo)',
    bio: 'Consultant psychiatrist focusing on anxiety, mood disorders, and cross-cultural mental health. This is a demonstration profile for development only.',
    specialties: ['Anxiety', 'Mood disorders', 'Cross-cultural psychiatry'],
    languages: ['English', 'Amharic'],
    jurisdictions: ['ET', 'KE'],
    sessionDurationMin: 50,
    price: { amount: 80, currency: 'USD' },
    trustPassport: makePassport(true),
    cancellationPolicy: 'Cancel or reschedule at least 24 hours before the session for a full refund.',
  },
  {
    uid: 'psy-demo-2',
    status: 'ACTIVE',
    professionalName: 'Dr. James Okello (Demo)',
    bio: 'Specialist in ADHD assessment and adult attention difficulties. Demonstration profile only — not a real booking.',
    specialties: ['ADHD', 'Medication review'],
    languages: ['English'],
    jurisdictions: ['KE', 'UG', 'GB'],
    sessionDurationMin: 50,
    price: { amount: 110, currency: 'USD' },
    trustPassport: makePassport(true),
    cancellationPolicy: 'Cancel or reschedule at least 24 hours before the session for a full refund.',
  },
  {
    uid: 'psy-pending-1',
    status: 'UNDER_REVIEW',
    professionalName: 'Dr. Pending Application (Demo)',
    bio: 'This profile is under review and is not bookable.',
    specialties: ['Sleep'],
    languages: ['English', 'Arabic'],
    jurisdictions: ['AE'],
    sessionDurationMin: 50,
    price: { amount: 95, currency: 'USD' },
    trustPassport: makePassport(false),
    cancellationPolicy: 'TBD',
  },
];

class MockStore {
  users = new Map<string, MockUser>();
  patients = new Map<string, MockPatient>();
  psychiatrists = new Map<string, MockPsychiatrist>();
  appointments = new Map<string, MockAppointment>();
  payments = new Map<string, MockPayment>();
  tickets = new Map<string, MockSupportTicket>();
  /** email -> password (mock only; never used when Firebase is live) */
  passwords = new Map<string, string>();
  sessionUid: string | null = null;

  constructor() {
    for (const p of seedPsychiatrists) {
      this.psychiatrists.set(p.uid, p);
      this.users.set(p.uid, {
        uid: p.uid,
        email: `${p.uid}@demo.erkab.local`,
        displayName: p.professionalName,
        role: 'PSYCHIATRIST',
        timezone: 'Africa/Addis_Ababa',
        createdAt: now(),
      });
    }
    // Seed admin
    const adminId = 'admin-demo';
    this.users.set(adminId, {
      uid: adminId,
      email: 'admin@demo.erkab.local',
      displayName: 'Erkab Admin',
      role: 'ADMIN',
      timezone: 'UTC',
      createdAt: now(),
    });
    this.passwords.set('admin@demo.erkab.local', 'admin1234');
    this.passwords.set('patient@demo.erkab.local', 'patient1234');
    // Pre-create a demo patient
    const patientId = 'patient-demo';
    this.users.set(patientId, {
      uid: patientId,
      email: 'patient@demo.erkab.local',
      displayName: 'Demo Patient',
      role: 'PATIENT',
      timezone: 'Africa/Addis_Ababa',
      createdAt: now(),
    });
    this.patients.set(patientId, {
      uid: patientId,
      jurisdiction: 'ET',
      intake: { reasons: ['Anxiety or low mood'], languages: ['English'], completedAt: now() },
    });
  }

  listActivePsychiatrists(filters?: {
    language?: string;
    specialty?: string;
    jurisdiction?: string;
  }): MockPsychiatrist[] {
    let list = [...this.psychiatrists.values()].filter(
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
  }
}

export const mockStore = new MockStore();
