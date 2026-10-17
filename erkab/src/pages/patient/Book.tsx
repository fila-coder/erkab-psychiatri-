import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getRepositories } from '../../repositories';
import { bookAppointment } from '../../services/booking';
import { startPayment } from '../../services/payment';
import { Button } from '../../components/Button';
import type { ProviderAvailabilitySlot, PsychiatristProfile } from '../../types';
import styles from '../Dashboard.module.css';

export function Book() {
  const { providerId } = useParams<{ providerId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [provider, setProvider] = useState<PsychiatristProfile | null>(null);
  const [slots, setSlots] = useState<ProviderAvailabilitySlot[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(true);

  const timezone =
    user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    if (!providerId) return;
    (async () => {
      setLoadingSlots(true);
      try {
        const repo = getRepositories();
        const p = await repo.psychiatrists.get(providerId);
        setProvider(p);
        // Real provider-published open slots only
        if (repo.availability?.listOpenByProvider) {
          const list = await repo.availability.listOpenByProvider(providerId);
          setSlots(list.filter((s) => s.status === 'open' && Date.parse(s.startAt) > Date.now()));
        } else {
          setSlots([]);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load provider.');
      } finally {
        setLoadingSlots(false);
      }
    })();
  }, [providerId]);

  async function onBook() {
    if (!user || !providerId) return;
    setError('');
    setMessage('');
    if (!selected) {
      setError('Please select a time.');
      return;
    }
    const slot = slots.find((s) => s.id === selected);
    if (!slot) {
      setError('Selected slot is no longer available.');
      return;
    }
    setLoading(true);
    try {
      const res = await bookAppointment({
        patientId: user.uid,
        providerId,
        startAt: slot.startAt,
        endAt: slot.endAt,
        timezone,
        availabilitySlotId: slot.id,
      });
      if (!res.ok) {
        setError(res.error);
        setLoading(false);
        return;
      }
      const pay = await startPayment(res.appointment.id);
      if (pay.status === 'NOT_CONFIGURED') {
        setMessage(
          'Appointment requested. Online payment is not configured — your request is pending confirmation. ' +
            pay.message
        );
      } else if (pay.status === 'LOCAL_TEST') {
        setMessage(pay.message + ' Appointment saved as a request.');
      } else {
        setMessage('Appointment requested.');
      }
      setTimeout(() => navigate('/patient'), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Booking failed.');
    } finally {
      setLoading(false);
    }
  }

  if (!providerId) return <p>Missing provider.</p>;

  return (
    <div>
      <header className={styles.pageHead}>
        <div>
          <p className="eyebrow">Booking</p>
          <h1>{provider?.professionalName || 'Book a session'}</h1>
        </div>
      </header>
      <p className={styles.lead}>
        Choose a time published by this psychiatrist. Requests stay pending until
        confirmed. Payment collection is not configured in this release.
      </p>
      {loadingSlots && <p>Loading availability…</p>}
      {!loadingSlots && slots.length === 0 && (
        <p className={styles.banner} role="status">
          No open appointment times are published for this provider right now.
          Please check again later.
        </p>
      )}
      {slots.length > 0 && (
        <ul className={styles.list}>
          {slots.map((s) => (
            <li key={s.id}>
              <label style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <input
                  type="radio"
                  name="slot"
                  value={s.id}
                  checked={selected === s.id}
                  onChange={() => setSelected(s.id)}
                />
                <span>
                  {new Date(s.startAt).toLocaleString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: timezone,
                  })}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {message && <p className={styles.success}>{message}</p>}
      <Button
        type="button"
        disabled={loading || !selected || slots.length === 0}
        onClick={onBook}
      >
        {loading ? 'Submitting…' : 'Request appointment'}
      </Button>
    </div>
  );
}
