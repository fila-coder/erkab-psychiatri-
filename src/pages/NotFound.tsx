import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="page container">
      <div className="card">
        <h1>Page not found</h1>
        <p>
          The page you are looking for does not exist or has moved.
        </p>
        <p>
          <Link to="/">Go to the homepage</Link> ·{' '}
          <Link to="/find">Find a therapist</Link> ·{' '}
          <Link to="/contact">Contact us</Link>
        </p>
      </div>
    </main>
  );
}
