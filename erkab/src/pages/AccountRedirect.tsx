import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/** Routes authenticated users to the correct role home. */
export function AccountRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--muted)' }}>
        Loading…
      </div>
    );
  }

  if (!user) return <Navigate to="/auth/sign-in" replace />;

  if (user.role === 'ADMIN' || user.role === 'FINANCE_ADMIN' || user.role === 'SUPPORT_AGENT') {
    return <Navigate to="/admin" replace />;
  }
  if (user.role === 'PSYCHIATRIST') {
    return <Navigate to="/provider" replace />;
  }
  return <Navigate to="/patient" replace />;
}
