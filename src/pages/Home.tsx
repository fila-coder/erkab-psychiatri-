import { Link } from 'react-router-dom';

/**
 * Home — First Light with the old homepage texts, exactly as in the
 * approved mockup ~/workspace/design-previews/first-light-mockup/
 * index-with-old-texts.html (approved by Fili 2026-11-07 12:20 EAT).
 * Hero is untouched; the old texts sit below it in First Light styling.
 * The short "Checked before listing" seal section is NOT here — the
 * mockup replaced it with the full "Verified therapists only" pillar.
 */
export function HomePage() {
  return (
    <main className="page home-first-light">
      <section className="hero-dawn hero-board">
        <img src="/hero.jpg" alt="A woman meditating at sunrise" />
        <div className="hero-dawn-overlay">
          <div className="container container--wide hero-dawn-inner">
            <p className="eyebrow hero-eyebrow-board">
              <span lang="am">እርካብ</span> — calm, before anything else
            </p>
            <h1>
              Your mind,
              <br />
              at <em>first light.</em>
            </h1>
            <blockquote className="hero-quote">
              <p>
                “Almost everything will work again if you unplug it for a
                few minutes. Including you.”
              </p>
              <cite>— Anne Lamott</cite>
            </blockquote>
            <div className="hero-actions">
              <Link to="/find" className="btn btn-gold btn-lg">
                Find your therapist
              </Link>
              <a href="#how" className="btn btn-outline-light btn-lg">
                How it works
              </a>
            </div>
          </div>
        </div>
        <div className="tibeb-zigzag" aria-hidden="true" />
        <p className="hero-credit">Image made for Erkab Therapy</p>
      </section>

      <section className="breath-band">
        <div className="container container--wide breath-band-inner">
          <p className="breath-lead">
            <em>Take a breath. Then:</em>
          </p>
          <ol className="breath-steps">
            <li>
              <span className="breath-num" aria-hidden="true">
                01
              </span>
              Find
            </li>
            <li>
              <span className="breath-num" aria-hidden="true">
                02
              </span>
              Book
            </li>
            <li>
              <span className="breath-num" aria-hidden="true">
                03
              </span>
              Talk
            </li>
          </ol>
        </div>
        <p className="breath-facts">
          Verified therapists · Amharic &amp; English · From your phone —
          even on a slow connection.
        </p>
      </section>

      <div className="container container--wide home-body">
        <section className="fl-section" id="how">
          <div className="fl-section-head">
            <p className="fl-eyebrow">How it works</p>
          </div>
          <div className="how-grid">
            <div className="how-step">
              <p className="how-num">01</p>
              <h3>Create an account</h3>
              <p>
                Create an account as a patient — or apply to join as a
                therapist.
              </p>
            </div>
            <div className="how-step">
              <p className="how-num">02</p>
              <h3>Complete your intake</h3>
              <p>
                Complete your confidential intake so your therapist has
                the context they need.
              </p>
            </div>
            <div className="how-step">
              <p className="how-num">03</p>
              <h3>Find and book</h3>
              <p>
                Find an approved therapist and book an open time slot.
              </p>
            </div>
            <div className="how-step">
              <p className="how-num">04</p>
              <h3>Join the video call</h3>
              <p>
                Join the video call at your appointment time from the
                link in your account.
              </p>
            </div>
          </div>
        </section>

        <section className="fl-section fl-section--tight">
          <div className="pillars">
            <div className="pillar">
              <span className="seal pillar-seal" aria-hidden="true">
                ✓
              </span>
              <h3>Verified therapists only</h3>
              <p>
                Every therapist&rsquo;s identity, licence, qualification
                and interview are checked, and an admin approves them
                before they can be booked.
              </p>
            </div>
            <div className="pillar">
              <span className="seal pillar-seal" aria-hidden="true">
                ▶
              </span>
              <h3>Secure video consultations</h3>
              <p>
                Confirmed appointments include a private video call
                link. The call opens in a new tab — no software to
                install.
              </p>
            </div>
            <div className="pillar">
              <span className="seal pillar-seal" aria-hidden="true">
                🔒
              </span>
              <h3>Your information stays yours</h3>
              <p>
                Your intake answers and appointments are visible only
                to you and the therapist you book.
              </p>
            </div>
          </div>
        </section>

        <section className="cta-quiet">
          <h2 className="section-title">Are you a therapist?</h2>
          <p>
            Apply to join Erkab. You will complete an application with
            your professional details, and our team reviews it before
            you can be listed for public booking.
          </p>
          <Link
            to="/auth/sign-up?role=therapist"
            className="btn btn-gold btn-lg"
          >
            Apply to join
          </Link>
        </section>

        <p className="muted contact-line">
          Questions? Contact us at{' '}
          <a href="mailto:filimongselassie@gmail.com">
            filimongselassie@gmail.com
          </a>{' '}
          or +251 936 573 692.
        </p>

        <p className="disclaimer">
          <strong>Erkab is not an emergency service.</strong> If you are
          in immediate danger, call your local emergency services first.
          See the <Link to="/emergency">emergency page</Link>.
        </p>
      </div>
    </main>
  );
}
