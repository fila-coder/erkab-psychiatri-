import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import {
  appointmentsRepo,
  availabilityRepo,
  jitsiUrl,
  patientsRepo,
  therapistsRepo,
} from '../repositories';
import type {
  Appointment,
  AvailabilitySlot,
  PatientProfile,
  PsychiatristProfile,
} from '../lib/types';
import { JURISDICTIONS, LANGUAGES, REASONS } from '../lib/types';
import { Button } from '../components/Button';

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function statusPill(status: string): string {
  if (status === 'CONFIRMED') return 'pill pill-green';
  if (status === 'CANCELLED') return 'pill pill-red';
  return 'pill pill-amber';
}

export function PatientPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [providers, setProviders] = useState<Record<string, PsychiatristProfile>>({});
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [booking, setBooking] = useState<string | null>(null);

  const [jurisdiction, setJurisdiction] = useState('ET');
  const [reasons, setReasons] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>(['English']);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const [p, appts, active] = await Promise.all([
        patientsRepo.get(user.uid),
        appointmentsRepo.listByPatient(user.uid),
        therapistsRepo.listActive(),
      ]);
      setProfile(p);
      setAppointments(appts);
      const byId: Record<string, PsychiatristProfile> = {};
      for (const pr of active) byId[pr.uid] = pr;
      setProviders(byId);
      if (p?.jurisdiction) setJurisdiction(p.jurisdiction);
      if (p?.intake) {
        setReasons(p.intake.reasons || []);
        setLanguages(p.intake.languages || ['English']);
      }
      // Open slots of approved therapists, for booking.
      const allSlots: AvailabilitySlot[] = [];
      for (const pr of active) {
        const open = await availabilityRepo.listOpenByProvider(pr.uid);
        allSlots.push(...open);
      }
      allSlots.sort((a, b) => a.startAt.localeCompare(b.startAt));
      setSlots(allSlots.slice(0, 20));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your account.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggle(list: string[], value: string, set: (v: string[]) => void) {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  async function saveIntake() {
    if (!user) return;
    setSaving(true);
    setSaved(false);
    setSaveError('');
    try {
      await patientsRepo.upsert({
        uid: user.uid,
        jurisdiction,
        intake: {
          reasons,
          languages,
          completedAt: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      });
      setSaved(true);
      await load();
    } catch (err) {
      // Never fake "saved": show the real error and offer a retry.
      setSaveError(err instanceof Error ? err.message : 'Could not save intake.');
    } finally {
      setSaving(false);
    }
  }

  async function book(slot: AvailabilitySlot) {
    if (!user) return;
    setBooking(slot.id);
    setError('');
    try {
      const provider = providers[slot.providerId];
      const appointmentId = await appointmentsRepo.create({
        patientId: user.uid,
        providerId: slot.providerId,
        startAt: slot.startAt,
        endAt: slot.endAt,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        status: 'REQUESTED',
        availabilitySlotId: slot.id,
        priceSnapshot: provider?.price || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await availabilityRepo.setStatus(slot.id, 'booked', appointmentId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not book this slot.');
    } finally {
      setBooking(null);
    }
  }

  async function cancel(appt: Appointment) {
    setError('');
    try {
      await appointmentsRepo.updateStatus(appt.id, 'CANCELLED');
      if (appt.availabilitySlotId) {
        await availabilityRepo.setStatus(appt.availabilitySlotId, 'open', null);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel the appointment.');
    }
  }

  if (!user) return null;

  return (
    <main className="page container">
      <div className="portal-head">
        <span className="avatar avatar-lg" aria-hidden="true">
          {initials(user.displayName)}
        </span>
        <div>
          <p className="eyebrow">Patient portal</p>
          <h1>Welcome, {user.displayName}</h1>
          <p className="muted">{user.email}</p>
        </div>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p>Loading…</p>
      ) : (
        <>
          <div className="card">
            <h2>Overview</h2>
            <div className="stat-grid">
              <div className="stat">
                <div className="stat-label">Intake</div>
                <div className="stat-value">
                  {profile?.intake ? 'Complete' : 'Not complete yet'}
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">Jurisdiction</div>
                <div className="stat-value">
                  {profile?.jurisdiction || 'Not set'}
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">Upcoming appointments</div>
                <div className="stat-value">
                  {appointments.filter((a) => a.status !== 'CANCELLED').length}
                </div>
              </div>
            </div>
            {!profile?.intake && (
              <p className="muted">
                Please complete your confidential intake below.
              </p>
            )}
            <Link to="/find" className="btn btn-primary">
              Find a therapist
            </Link>
          </div>

          <div className="card">
            <h2>Your confidential intake</h2>
            <div className="form">
              <label>
                Where are you based?
                <select
                  value={jurisdiction}
                  onChange={(e) => setJurisdiction(e.target.value)}
                >
                  {JURISDICTIONS.map((j) => (
                    <option key={j} value={j}>
                      {j}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset className="check-grid">
                <legend>What would you like help with?</legend>
                {REASONS.map((r) => (
                  <label key={r} className="check-row">
                    <input
                      type="checkbox"
                      checked={reasons.includes(r)}
                      onChange={() => toggle(reasons, r, setReasons)}
                    />
                    {r}
                  </label>
                ))}
              </fieldset>
              <fieldset className="check-grid">
                <legend>Preferred languages</legend>
                {LANGUAGES.map((l) => (
                  <label key={l} className="check-row">
                    <input
                      type="checkbox"
                      checked={languages.includes(l)}
                      onChange={() => toggle(languages, l, setLanguages)}
                    />
                    {l}
                  </label>
                ))}
              </fieldset>
              <Button onClick={() => void saveIntake()} disabled={saving}>
                {saving ? 'Saving…' : 'Save intake'}
              </Button>
              {saveError && (
                <p className="error" role="alert">
                  {saveError}{' '}
                  <button
                    type="button"
                    className="link-button"
                    style={{ color: 'inherit', textDecoration: 'underline' }}
                    onClick={() => void saveIntake()}
                  >
                    Try saving again
                  </button>
                </p>
              )}
              {saved && !saveError && <p className="success">Saved.</p>}
            </div>
          </div>

          <div className="card">
            <h2>Book an open slot</h2>
            {slots.length === 0 ? (
              <p>No open slots right now. Approved therapists publish their availability here.</p>
            ) : (
              slots.map((s) => (
                <div key={s.id} className="slot-row">
                  <span>
                    <strong>{providers[s.providerId]?.professionalName || 'Therapist'}</strong>{' '}
                    — {new Date(s.startAt).toLocaleString()} to{' '}
                    {new Date(s.endAt).toLocaleTimeString()}
                  </span>
                  <Button
                    size="sm"
                    disabled={booking === s.id}
                    onClick={() => void book(s)}
                  >
                    {booking === s.id ? 'Booking…' : 'Request appointment'}
                  </Button>
                </div>
              ))
            )}
          </div>

          <div className="card">
            <h2>Your appointments</h2>
            {appointments.length === 0 ? (
              <p>No appointments yet.</p>
            ) : (
              appointments.map((a) => (
                <div key={a.id} className="card appt-card">
                  <p>
                    <strong>{providers[a.providerId]?.professionalName || 'Therapist'}</strong>
                    <br />
                    {new Date(a.startAt).toLocaleString()}{' '}
                    <span className={statusPill(a.status)}>{a.status}</span>
                  </p>
                  {a.status === 'CONFIRMED' && (
                    <p>
                      <a
                        href={jitsiUrl(a.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-primary"
                      >
                        Join video call
                      </a>
                    </p>
                  )}
                  {a.status === 'REQUESTED' && (
                    <Button size="sm" variant="danger" onClick={() => void cancel(a)}>
                      Cancel request
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </main>
  );
}
