import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';

interface Props {
  children: React.ReactNode;
  roles?: UserRole[];
}

export function RequireAuth({ children, roles }: Props) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--muted)' }}>
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/sign-in" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    const home =
      user.role === 'ADMIN'
        ? '/admin'
        : user.role === 'PSYCHIATRIST'
          ? '/provider'
          : '/patient';
    return <Navigate to={home} replace />;
  }

  return <>{children}</>;
}
