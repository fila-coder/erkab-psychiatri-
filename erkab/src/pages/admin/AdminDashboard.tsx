import { Link } from 'react-router-dom';
import { getRepositories } from '../../repositories';
import styles from '../Dashboard.module.css';
import { useEffect, useState } from 'react';

export function AdminDashboard() {
  const [stats, setStats] = useState({ review: 0, active: 0, patients: 0, appts: 0 });

  useEffect(() => {
    (async () => {
      const repo = getRepositories();
      const providers = await repo.psychiatrists.listAll();
      const patients = (await repo.users.list()).filter((u) => u.role === 'PATIENT');
      const appts = await repo.appointments.listAll();
      setStats({
        review: providers.filter((p) =>
          ['SUBMITTED', 'UNDER_REVIEW', 'MORE_INFORMATION_REQUIRED'].includes(p.status)
        ).length,
        active: providers.filter((p) => p.status === 'ACTIVE' || p.status === 'APPROVED')
          .length,
        patients: patients.length,
        appts: appts.length,
      });
    })();
  }, []);

  return (
    <div>
      <header className={styles.pageHead}>
        <div>
          <p className="eyebrow">Administration</p>
          <h1>Operations overview</h1>
        </div>
      </header>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <strong>{stats.review}</strong>
          <span>In review</span>
        </div>
        <div className={styles.stat}>
          <strong>{stats.active}</strong>
          <span>Active psychiatrists</span>
        </div>
        <div className={styles.stat}>
          <strong>{stats.patients}</strong>
          <span>Patients</span>
        </div>
        <div className={styles.stat}>
          <strong>{stats.appts}</strong>
          <span>Appointments</span>
        </div>
      </div>
      <section className={styles.section}>
        <h2>Quick links</h2>
        <ul className={styles.list}>
          <li className={styles.card}>
            <Link to="/admin/applications">
              <strong>Review psychiatrist applications</strong>
            </Link>
            <p className={styles.meta}>Approve, reject, or request more information</p>
          </li>
          <li className={styles.card}>
            <strong>Payments & payouts</strong>
            <p className={styles.meta}>Not configured — connect a payment provider first.</p>
          </li>
        </ul>
      </section>
    </div>
  );
}
