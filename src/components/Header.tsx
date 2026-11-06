import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  const portal =
    user?.role === 'PSYCHIATRIST'
      ? '/provider'
      : user?.role === 'ADMIN'
        ? '/admin'
        : '/patient';

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" className="brand">
          Erkab Therapy
        </Link>
        <nav className="nav">
          <Link to="/find">Find a therapist</Link>
          <Link to="/about">About</Link>
          <Link to="/faq">FAQ</Link>
          <Link to="/contact">Contact</Link>
          {user ? (
            <>
              <Link to={portal}>My account</Link>
              <button type="button" className="link-button" onClick={() => void handleSignOut()}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/auth/sign-in">Sign in</Link>
              <Link to="/auth/sign-up" className="nav-cta">
                Get started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
