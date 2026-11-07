import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const onHome = location.pathname === '/';

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
    <header
      className={`site-header${onHome ? ' site-header--over-hero' : ''}`}
    >
      <div
        className={`container header-inner${onHome ? ' container--wide' : ''}`}
      >
        <Link to="/" className={`brand${onHome ? ' brand--hero' : ''}`}>
          {!onHome && (
            <span className="brand-mark" aria-hidden="true">
              E
            </span>
          )}
          <span className="brand-text">
            <span className="brand-name">
              {onHome ? 'Erkab' : 'Erkab Therapy'}
            </span>
            <span className="brand-am" lang="am">
              {onHome ? 'እርካብ' : 'እርካብ ቴራፒ'}
            </span>
          </span>
        </Link>
        {onHome ? (
          <nav className="nav" aria-label="Main">
            <Link to="/find" className="nav-link">
              Find a therapist
            </Link>
            <a href="#how" className="nav-link">
              How it works
            </a>
            <Link to="/about" className="nav-link">
              Stories
            </Link>
            <Link to="/find" className="nav-cta">
              Book a session
            </Link>
          </nav>
        ) : (
          <nav className="nav" aria-label="Main">
            <Link to="/find">Find a therapist</Link>
            <Link to="/about">About</Link>
            <Link to="/faq">FAQ</Link>
            <Link to="/contact">Contact</Link>
            {user ? (
              <>
                <Link to={portal}>My account</Link>
                <button
                  type="button"
                  className="link-button"
                  onClick={() => void handleSignOut()}
                >
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
        )}
      </div>
    </header>
  );
}
