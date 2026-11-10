import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import {
  appointmentsRepo,
  availabilityRepo,
  jitsiUrl,
  therapistsRepo,
} from '../repositories';
import type {
  Appointment,
  AvailabilitySlot,
  PsychiatristProfile,
  TrustPassport,
} from '../lib/types';
import { JURISDICTIONS, LANGUAGES } from '../lib/types';
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
  if (status === 'ACTIVE' || status === 'CONFIRMED') return 'pill pill-green';
  if (status === 'REJECTED' || status === 'CANCELLED') return 'pill pill-red';
  if (status === 'PENDING' || status === 'REQUESTED') return 'pill pill-amber';
  return 'pill pill-grey';
}

const EMPTY_PASSPORT: TrustPassport = {
  identity: { status: 'pending' },
  licence: { status: 'pending' },
  qualification: { status: 'pending' },
  interview: { status: 'pending' },
  overall: 'unverified',
};

export function ProviderPage() {
  const { user } = useAuth();
  const [app, setApp] = useState<PsychiatristProfile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [professionalName, setProfessionalName] = useState('');
  const [bio, setBio] = useState('');
  const [specialties, setSpecialties] = useState('');
  const [languages, setLanguages] = useState<string[]>(['English']);
  const [jurisdictions, setJurisdictions] = useState<string[]>(['ET']);
  const [duration, setDuration] = useState(50);
  const [price, setPrice] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [cancellationPolicy, setCancellationPolicy] = useState('');
  const [driveUrl, setDriveUrl] = useState('');

  const [slotDate, setSlotDate] = useState('');
  const [slotTime, setSlotTime] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      // Load each part separately: one failing list (e.g. appointments)
      // must never hide the therapist's application again.
      const [aResult, apptsResult, sResult] = await Promise.allSettled([
        therapistsRepo.getApplication(user.uid),
        appointmentsRepo.listByProvider(user.uid),
        availabilityRepo.listByProvider(user.uid),
      ]);
      if (aResult.status === 'rejected') throw aResult.reason;
      if (sResult.status === 'rejected') throw sResult.reason;
      const a = aResult.value;
      const s = sResult.value;
      setApp(a);
      if (apptsResult.status === 'fulfilled') {
        setAppointments(apptsResult.value);
      } else {
        setAppointments([]);
        setError(
          apptsResult.reason instanceof Error
            ? apptsResult.reason.message
            : 'Could not load your appointments.'
        );
      }
      setSlots(s);
      if (a) {
        setProfessionalName(a.professionalName || '');
        setBio(a.bio || '');
        setSpecialties((a.specialties || []).join(', '));
        setLanguages(a.languages?.length ? a.languages : ['English']);
        setJurisdictions(a.jurisdictions?.length ? a.jurisdictions : ['ET']);
        setDuration(a.sessionDurationMin || 50);
        setPrice(a.price?.amount || 0);
        setCurrency(a.price?.currency || 'USD');
        setCancellationPolicy(a.cancellationPolicy || '');
        setDriveUrl(a.driveEvidenceUrl || '');
      } else {
        setProfessionalName(user.displayName);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your portal.');
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

  async function saveApplication() {
    if (!user) return;
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const profile: PsychiatristProfile = {
        uid: user.uid,
        professionalName: professionalName.trim() || user.displayName,
        bio: bio.trim(),
        specialties: specialties
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        languages,
        jurisdictions,
        sessionDurationMin: duration,
        price: { amount: price, currency },
        trustPassport: app?.trustPassport || EMPTY_PASSPORT,
        cancellationPolicy: cancellationPolicy.trim(),
        status: app?.status === 'ACTIVE' ? 'ACTIVE' : 'PENDING',
        driveEvidenceUrl: driveUrl.trim() || undefined,
        applicationNotes: app?.applicationNotes || '',
        updatedAt: new Date().toISOString(),
      };
      await therapistsRepo.upsertApplication(profile);
      setSaved(true);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your application.');
    } finally {
      setSaving(false);
    }
  }

  async function publishSlot() {
    if (!user || !slotDate || !slotTime) return;
    setError('');
    try {
      const start = new Date(`${slotDate}T${slotTime}:00`);
      const end = new Date(start.getTime() + duration * 60000);
      const id = `${user.uid}_${start.toISOString()}`;
      await availabilityRepo.publish({
        id,
        providerId: user.uid,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        status: 'open',
        appointmentId: null,
        updatedAt: new Date().toISOString(),
      });
      setSlotDate('');
      setSlotTime('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not publish this slot.');
    }
  }

  async function setApptStatus(a: Appointment, status: 'CONFIRMED' | 'CANCELLED') {
    setError('');
    try {
      await appointmentsRepo.updateStatus(a.id, status);
      if (status === 'CANCELLED' && a.availabilitySlotId) {
        await availabilityRepo.setStatus(a.availabilitySlotId, 'open', null);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the appointment.');
    }
  }

  if (!user) return null;

  const statusLabel =
    app?.status === 'ACTIVE'
      ? 'ACTIVE — you are listed for public booking.'
      : app?.status === 'PENDING'
        ? 'Pending approval — an admin is reviewing your application.'
        : app?.status === 'REJECTED'
          ? 'Your application was not approved. Update it and contact support.'
          : 'DRAFT — complete your application below.';

  return (
    <main className="page container">
      <div className="portal-head">
        <span className="avatar avatar-lg" aria-hidden="true">
          {initials(user.displayName)}
        </span>
        <div>
          <p className="eyebrow">Therapist portal</p>
          <h1>Welcome, {user.displayName}</h1>
          <p className="muted">{user.email}</p>
        </div>
      </div>
      <p className="status-line">
        <strong>Profile status:</strong>{' '}
        <span className={statusPill(app?.status || 'DRAFT')}>
          {app?.status || 'DRAFT'}
        </span>{' '}
        {statusLabel}
      </p>

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
            <h2>Your application</h2>
            <div className="form">
              <label>
                Professional name
                <input
                  value={professionalName}
                  onChange={(e) => setProfessionalName(e.target.value)}
                  required
                />
              </label>
              <label>
                Bio
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} />
              </label>
              <label>
                Specialties (comma-separated)
                <input
                  value={specialties}
                  onChange={(e) => setSpecialties(e.target.value)}
                  placeholder="Anxiety, Depression, Sleep problems"
                />
              </label>
              <fieldset className="check-grid">
                <legend>Languages</legend>
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
              <fieldset className="check-grid">
                <legend>Jurisdictions you practise in</legend>
                {JURISDICTIONS.map((j) => (
                  <label key={j} className="check-row">
                    <input
                      type="checkbox"
                      checked={jurisdictions.includes(j)}
                      onChange={() => toggle(jurisdictions, j, setJurisdictions)}
                    />
                    {j}
                  </label>
                ))}
              </fieldset>
              <label>
                Session length (minutes)
                <input
                  type="number"
                  min={15}
                  max={120}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                />
              </label>
              <div className="row">
                <label>
                  Price
                  <input
                    type="number"
                    min={0}
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                  />
                </label>
                <label>
                  Currency
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                    <option value="USD">USD</option>
                    <option value="ETB">ETB</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </label>
              </div>
              <label>
                Cancellation policy
                <textarea
                  value={cancellationPolicy}
                  onChange={(e) => setCancellationPolicy(e.target.value)}
                />
              </label>
              <label>
                Drive evidence link (optional — may be left empty)
                <input
                  type="url"
                  value={driveUrl}
                  onChange={(e) => setDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/…"
                />
              </label>
              <Button onClick={() => void saveApplication()} disabled={saving}>
                {saving ? 'Saving…' : 'Save application'}
              </Button>
              {saved && <p className="success">Saved.</p>}
            </div>
          </div>

          <div className="card">
            <h2>Availability</h2>
            <p className="muted">
              Publish open time slots. Patients can request them; you confirm
              each request below.
            </p>
            <div className="row">
              <label>
                Date
                <input
                  type="date"
                  value={slotDate}
                  onChange={(e) => setSlotDate(e.target.value)}
                />
              </label>
              <label>
                Start time
                <input
                  type="time"
                  value={slotTime}
                  onChange={(e) => setSlotTime(e.target.value)}
                />
              </label>
              <Button onClick={() => void publishSlot()} disabled={!slotDate || !slotTime}>
                Publish slot
              </Button>
            </div>
            {slots.length === 0 ? (
              <p>No slots published yet.</p>
            ) : (
              slots.map((s) => (
                <div key={s.id} className="slot-row">
                  <span>
                    {new Date(s.startAt).toLocaleString()}{' '}
                    <span className={statusPill(s.status)}>{s.status}</span>
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="card">
            <h2>Appointments</h2>
            {appointments.length === 0 ? (
              <p>No appointments yet.</p>
            ) : (
              appointments.map((a) => (
                <div key={a.id} className="card appt-card">
                  <p>
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
                    <div className="row">
                      <Button size="sm" onClick={() => void setApptStatus(a, 'CONFIRMED')}>
                        Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => void setApptStatus(a, 'CANCELLED')}
                      >
                        Cancel
                      </Button>
                    </div>
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
