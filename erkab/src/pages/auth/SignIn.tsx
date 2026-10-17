import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/Button';
import styles from './Auth.module.css';

export function SignIn() {
  const { signIn, mode, configError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      // Role-based redirect happens after auth state updates; send to a safe default
      navigate(from || '/account', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <p className="eyebrow">Sign in</p>
        <h1>Welcome back</h1>
        <p className={styles.sub}>
          Access your appointments, messages, and account settings.
        </p>

        {configError && (
          <div className={styles.error} role="alert">{configError}</div>
        )}

        {mode === 'local' && (
          <div className={styles.demoBox}>
            <strong>Local development mode</strong>. Demo accounts:
            <ul>
              <li>patient@demo.erkab.local / patient1234</li>
              <li>admin@demo.erkab.local / admin1234</li>
              <li>amara@demo.erkab.local / provider1234</li>
            </ul>
          </div>
        )}

        <form onSubmit={onSubmit} className={styles.form}>
          <label>
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <Button type="submit" disabled={loading} size="lg">
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p className={styles.footer}>
          No account? <Link to="/auth/sign-up">Create one</Link>
        </p>
      </div>
    </main>
  );
}
