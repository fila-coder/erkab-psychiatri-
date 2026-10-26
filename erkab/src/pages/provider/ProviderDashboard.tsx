import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getRepositories } from '../../repositories';
import { listProviderAppointments } from '../../services/booking';
import { Button } from '../../components/Button';
import styles from '../Dashboard.module.css';
import { useEffect, useState } from 'react';
import type { Appointment, PsychiatristProfile } from '../../types';

export function ProviderDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<PsychiatristProfile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setProfile(await getRepositories().psychiatrists.get(user.uid));
      setAppointments(await listProviderAppointments(user.uid));
    })();
  }, [user]);

  return (
    <div>
      <header className={styles.pageHead}>
        <div>
          <p className="eyebrow">Psychiatrist portal</p>
          <h1>Practice home</h1>
          <p className={styles.lead} style={{ marginTop: 4 }}>
            Credentials, application status, and your session schedule.
          </p>
        </div>
        <Link to="/provider/application">
          <Button variant="soft" size="sm">
            Application & credentials
          </Button>
        </Link>
      </header>
      <section className={styles.section}>
        <h2>Application status</h2>
        <div className={styles.card}>
          {profile ? (
            <>
              <p>
                <strong>Status:</strong> <span className={styles.pill}>{profile.status}</span>
              </p>
              <p className={styles.meta}>Trust Passport: {profile.trustPassport.overall}</p>
              {(profile.status === 'DRAFT' ||
                profile.status === 'MORE_INFORMATION_REQUIRED') && (
                <p>
                  <Link to="/provider/application">Complete your application</Link>
                </p>
              )}
              {(profile.status === 'ACTIVE' || profile.status === 'APPROVED') && (
                <p className={styles.success}>Approved — you may receive bookings.</p>
              )}
            </>
          ) : (
            <p>No provider profile found.</p>
          )}
        </div>
      </section>
      <section className={styles.section}>
        <h2>Appointments</h2>
        {appointments.length === 0 ? (
          <div className={styles.empty}>
            <p>No appointments yet.</p>
          </div>
        ) : (
          <ul className={styles.list}>
            {appointments.map((a) => (
              <li key={a.id} className={styles.card}>
                <div>
                  <strong>Patient appointment</strong>
                  <p className={styles.meta}>
                    {new Date(a.startAt).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>
                <div className={styles.cardRight}>
                  <span className={styles.pill}>{a.status}</span>
                  <Link to={`/session/${a.id}`}>
                    <Button variant="soft" size="sm">
                      Join session
                    </Button>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className={styles.section}>
        <h2>Earnings</h2>
        <div className={styles.card}>
          <p className={styles.meta}>
            Package price is set by Erkab admin. Your payout is package amount minus
            platform commission. Bank payout is not automated yet — record accounts
            offline until payout integration is added.
          </p>
        </div>
      </section>
    </div>
  );
}
