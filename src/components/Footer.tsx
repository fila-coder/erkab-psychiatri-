import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="tibeb-strip" aria-hidden="true" />
      <div className="container container--wide footer-inner">
        <div className="footer-brand">
          <strong>
            Erkab Therapy{' '}
            <span className="footer-am" lang="am">
              እርካብ ቴራፒ
            </span>
          </strong>
        </div>
        <nav className="footer-nav" aria-label="Footer">
          <Link to="/about">About</Link>
          <Link to="/faq">FAQ</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/contact">Contact</Link>
        </nav>
      </div>
    </footer>
  );
}
