import styles from './SimplePage.module.css';

export function Trust() {
  return (
    <main className={styles.page}>
      <div className="wrap">
        <p className="eyebrow">Trust Passport</p>
        <h1>Verification you can see</h1>
        <p className={styles.lead}>
          Every public psychiatrist profile displays only verified attributes that
          the system can substantiate. Sensitive documents remain private.
        </p>

        <h2>What we check</h2>
        <ul className={styles.list}>
          <li>Identity document</li>
          <li>Professional registration or licence</li>
          <li>Specialist qualification</li>
          <li>Erkab review interview</li>
          <li>Jurisdiction and registration details</li>
        </ul>

        <h2>How it stays current</h2>
        <p>
          Verification has a review date and, where applicable, an expiry or
          renewal date. A previously approved profile does not remain eligible
          forever. Erkab can suspend a profile at any time.
        </p>

        <h2>What you will not see</h2>
        <p>
          Public profiles never expose raw identity documents or private
          credentials. “Verified” is only shown after all mandatory checks have
          passed.
        </p>
      </div>
    </main>
  );
}
