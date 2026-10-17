import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/Button';
import styles from './Auth.module.css';

export function SignUp() {
  const { signUp, mode } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialRole =
    params.get('role') === 'psychiatrist' ? 'PSYCHIATRIST' : 'PATIENT';

  const [role, setRole] = useState<'PATIENT' | 'PSYCHIATRIST'>(initialRole);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!consent) {
      setError('You must accept the privacy notice and terms to continue.');
      return;
    }
    setLoading(true);
    try {
      await signUp(email.trim(), password, displayName.trim(), role);
      navigate(role === 'PSYCHIATRIST' ? '/provider' : '/patient', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <p className="eyebrow">Create account</p>
        <h1>Join Erkab</h1>
        <p className={styles.sub}>
          {role === 'PATIENT'
            ? 'Book verified psychiatrists for secure video consultations.'
            : 'Apply to offer consultations after credential review.'}
        </p>

        {mode === 'mock' && (
          <div className={styles.demoBox}>
            Running in demo mode — accounts are stored in this browser session only.
          </div>
        )}

        <div className={styles.roleTabs} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={role === 'PATIENT'}
            className={role === 'PATIENT' ? styles.roleActive : ''}
            onClick={() => setRole('PATIENT')}
          >
            I am a patient
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={role === 'PSYCHIATRIST'}
            className={role === 'PSYCHIATRIST' ? styles.roleActive : ''}
            onClick={() => setRole('PSYCHIATRIST')}
          >
            I am a psychiatrist
          </button>
        </div>

        <form onSubmit={onSubmit} className={styles.form}>
          <label>
            <span>Full name</span>
            <input
              type="text"
              required
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </label>
          <label>
            <span>Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            <span>Password (min. 8 characters)</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>
              I agree to the{' '}
              <Link to="/privacy" target="_blank">
                Privacy notice
              </Link>{' '}
              and{' '}
              <Link to="/terms" target="_blank">
                Terms of service
              </Link>
              . Erkab is not an emergency service.
            </span>
          </label>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <Button type="submit" disabled={loading} size="lg">
            {loading ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <p className={styles.footer}>
          Already have an account? <Link to="/auth/sign-in">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
