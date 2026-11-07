export function PrivacyPage() {
  return (
    <main className="page container narrow prose-page">
      <p className="eyebrow">Privacy notice</p>
      <h1>Privacy notice</h1>
      <p>
        <strong>
          Draft — not a legal document. Final terms must be
          counsel-reviewed.
        </strong>
      </p>
      <p>
        This page will hold the final privacy notice for Erkab Therapy
        once it has been reviewed by legal counsel. Until then, the
        points below describe how your information is intended to be
        handled.
      </p>
      <h2>What we collect</h2>
      <p>
        Your account details (name, email), your role (patient,
        therapist or admin), your intake answers, your appointments
        and any message you send through the contact form.
      </p>
      <h2>Who can see it</h2>
      <p>
        Your intake answers and appointments are visible only to you and
        the therapist you book. Admins can see therapist
        applications and user accounts in order to run the service.
        Public therapist profiles show only the professional
        information the therapist chose to publish.
      </p>
      <h2>Where it is stored</h2>
      <p>
        Data is stored in Firebase Authentication and Cloud Firestore.
      </p>
      <h2>Your choices</h2>
      <p>
        You can sign out at any time. To ask for your account data to be
        removed, contact filimongselassie@gmail.com.
      </p>
    </main>
  );
}
