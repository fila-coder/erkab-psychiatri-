import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { listPatientAppointments, cancelAppointment } from '../../services/booking';
import { getRepositories } from '../../repositories';
import { Button } from '../../components/Button';
import styles from '../Dashboard.module.css';
import { useEffect, useState } from 'react';
import type { Appointment, PatientProfile, PsychiatristProfile } from '../../types';

export function PatientDashboard() {
  const { user, mode, resetDemoData } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [providers, setProviders] = useState<Record<string, PsychiatristProfile>>({});

  async function reload() {
    if (!user) return;
    const repo = getRepositories();
    const [appts, p] = await Promise.all([
      listPatientAppointments(user.uid),
      repo.patients.get(user.uid),
    ]);
    setAppointments(appts);
    setPatient(p);
    const map: Record<string, PsychiatristProfile> = {};
    for (const a of appts) {
      const pr = await repo.psychiatrists.get(a.providerId);
      if (pr) map[a.providerId] = pr;
    }
    setProviders(map);
  }

  useEffect(() => {
    reload();
  }, [user]);

  async function handleCancel(id: string) {
    if (!user) return;
    const res = await cancelAppointment(id, user.uid);
    if (!res.ok) alert(res.error);
    await reload();
  }

  return (
    <div>
      <header className={styles.pageHead}>
        <div>
          <p className="eyebrow">Patient</p>
          <h1>Your care</h1>
        </div>
        <Link to="/find">
          <Button>Find a psychiatrist</Button>
        </Link>
      </header>

      {mode === 'local' && (
        <div className={styles.banner}>
          Local development mode — data persists in this browser. Demo profiles are
          fictional.{' '}
          <button
            type="button"
            onClick={() => resetDemoData()}
            style={{
              background: 'none',
              border: 0,
              color: 'inherit',
              textDecoration: 'underline',
              cursor: 'pointer',
              font: 'inherit',
            }}
          >
            Reset demo data
          </button>
        </div>
      )}

      {!patient?.intake?.completedAt && (
        <div className={styles.banner}>
          Complete your confidential intake so we can match you more accurately.{' '}
          <Link to="/patient/intake">Start intake</Link>
        </div>
      )}

      <section className={styles.section}>
        <h2>Appointments</h2>
        {appointments.length === 0 ? (
          <div className={styles.empty}>
            <p>No appointments yet.</p>
            <Link to="/find">
              <Button variant="soft" size="sm">
                Browse psychiatrists
              </Button>
            </Link>
          </div>
        ) : (
          <ul className={styles.list}>
            {appointments.map((a) => (
              <li key={a.id} className={styles.card}>
                <div>
                  <strong>
                    {providers[a.providerId]?.professionalName || 'Psychiatrist'}
                  </strong>
                  <p className={styles.meta}>
                    {new Date(a.startAt).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                      timeZone: a.timezone,
                    })}{' '}
                    · {a.priceSnapshot.currency} {a.priceSnapshot.amount}
                  </p>
                </div>
                <div className={styles.cardRight}>
                  <span className={`${styles.pill}`}>{a.status}</span>
                  {a.status === 'PENDING_PAYMENT' && (
                    <span className={styles.note}>
                      Awaiting payment confirmation (provider not configured).
                    </span>
                  )}
                  {(a.status === 'PENDING_PAYMENT' || a.status === 'CONFIRMED') && (
                    <Button variant="ghost" size="sm" onClick={() => handleCancel(a.id)}>
                      Cancel
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <h2>Account</h2>
        <div className={styles.card}>
          <p>
            <strong>Jurisdiction:</strong> {patient?.jurisdiction || 'Not set'}
          </p>
          <p className={styles.meta}>
            Payments and receipts appear after a payment provider is connected.
          </p>
        </div>
      </section>
    </div>
  );
}
