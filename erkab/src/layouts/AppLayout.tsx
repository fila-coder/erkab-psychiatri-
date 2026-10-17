import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import styles from './AppLayout.module.css';

export function AppLayout({
  nav,
  title,
}: {
  nav: { to: string; label: string }[];
  title: string;
}) {
  const { user, signOut, mode } = useAuth();

  return (
    <div className={styles.shell}>
      <aside className={styles.aside}>
        <Link to="/" className={styles.brand}>
          <span className={styles.mark}>E</span>
          <span>
            <strong>Erkab</strong>
            <small>{title}</small>
          </span>
        </Link>
        <nav className={styles.nav}>
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to.split('/').length <= 2}
              className={({ isActive }) =>
                isActive ? `${styles.link} ${styles.active}` : styles.link
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className={styles.asideFoot}>
          {mode === 'mock' && <span className={styles.badge}>Demo mode</span>}
          <p className={styles.userName}>{user?.displayName}</p>
          <p className={styles.userEmail}>{user?.email}</p>
          <Button variant="ghost" size="sm" onClick={() => signOut()}>
            Sign out
          </Button>
        </div>
      </aside>
      <div className={styles.main}>
        <Outlet />
      </div>
    </div>
  );
}
