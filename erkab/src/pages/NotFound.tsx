import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import styles from './SimplePage.module.css';

export function NotFound() {
  return (
    <main className={styles.page}>
      <div className="wrap" style={{ textAlign: 'center' }}>
        <h1>Page not found</h1>
        <p className={styles.lead}>The page you requested does not exist.</p>
        <Link to="/">
          <Button>Back to home</Button>
        </Link>
      </div>
    </main>
  );
}
