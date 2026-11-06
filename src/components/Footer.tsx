import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div>
          <strong>Erkab Therapy</strong>
          <p>
            Book verified therapists for secure video consultations.
            Erkab is not an emergency service.
          </p>
          <p>
            Contact: filimongselassie@gmail.com · +251 936 573 692
          </p>
        </div>
        <nav className="footer-nav">
          <Link to="/about">About</Link>
          <Link to="/faq">FAQ</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/cancellation-policy">Cancellation policy</Link>
          <Link to="/emergency">Emergency</Link>
          <Link to="/contact">Contact</Link>
        </nav>
      </div>
    </footer>
  );
}
