import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Button } from '../components/Button';

export function SignInPage() {
  const { user, loading: authLoading, signIn, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [lastError, setLastError] = useState<{
    step: string;
    code: string;
    message: string;
    at: string;
  } | null>(null);

  // Show the last sign-up/sign-in error on screen, if one was saved.
  useEffect(() => {
    try {
      const raw = localStorage.getItem('erkab-last-auth-error');
      if (raw) setLastError(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

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
    setInfo('');
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      // Navigation happens in the useEffect above once the user is set.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setLoading(false);
    }
  }

  async function onForgotPassword() {
    setError('');
    setInfo('');
    if (!email.trim()) {
      setError('Enter your email above, then tap Forgot password.');
      return;
    }
    setResetLoading(true);
    try {
      await resetPassword(email.trim());
      setInfo(
        'If an account exists for that email, a reset link has been sent. Check your inbox.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reset email.');
    } finally {
      setResetLoading(false);
    }
  }

  if (user) {
    return (
      <main className="page container">
        <div className="card">
          <p>Redirecting to your account…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page container">
      <div className="card">
        <p className="eyebrow">Sign in</p>
        <h1>Welcome back</h1>
        <p className="muted">
          Access your appointments, messages, and account settings.
        </p>

        {lastError && (
          <div className="error" role="alert">
            <strong>Last sign-in error</strong>
            <br />
            Step: {lastError.step}
            <br />
            Code: {lastError.code}
            <br />
            Message: {lastError.message}
            <br />
            At: {lastError.at}
            <br />
            <button
              type="button"
              className="link-button"
              style={{ color: 'inherit', textDecoration: 'underline' }}
              onClick={() => {
                localStorage.removeItem('erkab-last-auth-error');
                setLastError(null);
              }}
            >
              Clear
            </button>
          </div>
        )}

        <form onSubmit={(e) => void onSubmit(e)} className="form">
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <p style={{ margin: 0, fontSize: 14 }}>
            <button
              type="button"
              className="link-button"
              style={{ color: 'var(--teal-dark)', textDecoration: 'underline' }}
              onClick={() => void onForgotPassword()}
              disabled={resetLoading}
            >
              {resetLoading ? 'Sending reset email…' : 'Forgot password?'}
            </button>
          </p>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {info && (
            <p className="success" role="status">
              {info}
            </p>
          )}
          <Button type="submit" disabled={loading} size="lg">
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p>
          No account? <Link to="/auth/sign-up">Create one</Link>
        </p>
      </div>
    </main>
  );
}
