import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Button } from '../components/Button';

export function SignUpPage() {
  const { user, loading: authLoading, signUp } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // ?role=therapist pre-selects the therapist role; the old
  // ?role=psychiatrist value is still accepted for old links.
  const roleParam = params.get('role');
  const initialRole =
    roleParam === 'therapist' || roleParam === 'psychiatrist'
      ? 'PSYCHIATRIST'
      : 'PATIENT';

  const [role, setRole] = useState<'PATIENT' | 'PSYCHIATRIST'>(initialRole);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Single navigation source: only this effect navigates, and only
  // after the auth layer has loaded the real profile (with its role).
  useEffect(() => {
    if (!authLoading && user) {
      const to =
        user.role === 'PSYCHIATRIST'
          ? '/provider'
          : user.role === 'ADMIN'
            ? '/admin'
            : '/patient';
      navigate(to, { replace: true });
    }
  }, [authLoading, user, navigate]);

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
      // Do NOT navigate here — the useEffect above navigates once the
      // user state (with the real role) is set.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  if (user) {
    return (
      <main className="page container">
        <div className="card">
          <p>Taking you to your account…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page container">
      <div className="card">
        <p className="eyebrow">Create account</p>
        <h1>Join Erkab</h1>
        <p className="muted">
          Book verified therapists for secure video consultations.
        </p>

        <div className="row" style={{ marginBottom: 16 }}>
          <Button
            type="button"
            size="sm"
            variant={role === 'PATIENT' ? 'primary' : 'soft'}
            onClick={() => setRole('PATIENT')}
          >
            I am a patient
          </Button>
          <Button
            type="button"
            size="sm"
            variant={role === 'PSYCHIATRIST' ? 'primary' : 'soft'}
            onClick={() => setRole('PSYCHIATRIST')}
          >
            I am a therapist
          </Button>
        </div>

        {role === 'PSYCHIATRIST' && (
          <p className="muted">
            Therapists apply to join Erkab. After signing up you will
            complete your application; an admin reviews it before you can
            be listed for public booking.
          </p>
        )}

        <form onSubmit={(e) => void onSubmit(e)} className="form">
          <label>
            Full name
            <input
              type="text"
              required
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </label>
          <label>
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Password (min. 8 characters)
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label className="check">
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
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={loading} size="lg">
            {loading ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <p>
          Already have an account? <Link to="/auth/sign-in">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
