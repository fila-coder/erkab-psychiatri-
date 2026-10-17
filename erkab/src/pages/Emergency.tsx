import styles from './SimplePage.module.css';

export function Emergency() {
  return (
    <main className={styles.page}>
      <div className="wrap">
        <p className="eyebrow">Safety</p>
        <h1>Emergency information</h1>
        <div className={styles.crisisBox}>
          <strong>Erkab is not an emergency service.</strong>
          <p>
            If you or someone near you is in immediate danger, contact your local
            emergency number or go to the nearest hospital. Do not use this
            platform as a substitute for emergency care.
          </p>
        </div>
        <p className={styles.lead}>
          We do not publish universal emergency numbers because the correct number
          depends on your location. Please use the emergency services that apply
          where you are.
        </p>
      </div>
    </main>
  );
}
