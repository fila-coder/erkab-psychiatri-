import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <main className="page container">
      <section className="hero">
        <p className="eyebrow">Erkab Therapy</p>
        <h1>Talk to a verified therapist, from anywhere.</h1>
        <p>
          Book a secure video consultation with a therapist whose
          identity, licence and qualifications have been checked by our
          team. Therapists only appear for public booking after an
          admin approves them.
        </p>
        <div className="hero-actions">
          <Link to="/find" className="btn btn-primary btn-lg">
            Find a therapist
          </Link>
          <Link to="/auth/sign-up" className="btn btn-light btn-lg">
            Create an account
          </Link>
        </div>
      </section>

      <div className="disclaimer">
        <strong>Erkab is not an emergency service.</strong> If you are in
        immediate danger, call your local emergency services first. See
        the <Link to="/emergency">emergency page</Link>.
      </div>

      <h2>How it works</h2>
      <ol className="steps">
        <li>
          <strong>Create an account</strong> as a patient — or apply to
          join as a therapist.
        </li>
        <li>
          <strong>Complete your confidential intake</strong> so your
          therapist has the context they need.
        </li>
        <li>
          <strong>Find an approved therapist</strong> and book an open
          time slot.
        </li>
        <li>
          <strong>Join the video call</strong> at your appointment time
          from the link in your account.
        </li>
      </ol>

      <div className="grid">
        <div className="card">
          <h3>Verified therapists only</h3>
          <p>
            Every therapist&apos;s identity, licence, qualification and
            interview are checked, and an admin approves them before they
            can be booked.
          </p>
        </div>
        <div className="card">
          <h3>Secure video consultations</h3>
          <p>
            Confirmed appointments include a private video call link. The
            call opens in a new tab — no software to install.
          </p>
        </div>
        <div className="card">
          <h3>Your information stays yours</h3>
          <p>
            Your intake answers and appointments are visible only to you
            and the therapist you book.
          </p>
        </div>
      </div>

      <div className="card">
        <h3>Are you a therapist?</h3>
        <p>
          Apply to join Erkab. You will complete an application with your
          professional details, and our team reviews it before you can
          be listed for public booking.
        </p>
        <Link to="/auth/sign-up?role=therapist" className="btn btn-primary">
          Apply to join
        </Link>
      </div>

      <p className="muted">
        Questions? Contact us at filimongselassie@gmail.com or
        +251 936 573 692.
      </p>
    </main>
  );
}
