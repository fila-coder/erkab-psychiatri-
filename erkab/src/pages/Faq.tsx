import styles from './SimplePage.module.css';

const faqs = [
  {
    q: 'Is Erkab an emergency service?',
    a: 'No. If you or someone near you is in immediate danger, contact local emergency services or go to the nearest hospital.',
  },
  {
    q: 'How are psychiatrists verified?',
    a: 'Each applicant submits identity, licence and qualification documents. Erkab reviews them before a profile can accept bookings. Public profiles show only verified attributes.',
  },
  {
    q: 'Can any psychiatrist treat me in my country?',
    a: 'No. Eligibility depends on the psychiatrist’s licensed jurisdictions and platform rules. Matching filters by your location.',
  },
  {
    q: 'How do video sessions work?',
    a: 'After a confirmed booking you receive access to a waiting room and a secure meeting link (Zoom or Google Meet when configured). Links are not public.',
  },
  {
    q: 'When am I charged?',
    a: 'Payment is collected through the configured payment provider at booking. Until a provider is connected, the platform will not claim a successful charge.',
  },
];

export function Faq() {
  return (
    <main className={styles.page}>
      <div className="wrap">
        <p className="eyebrow">FAQ</p>
        <h1>Frequently asked questions</h1>
        <div style={{ marginTop: 32, display: 'grid', gap: 20, maxWidth: '62ch' }}>
          {faqs.map((f) => (
            <div key={f.q}>
              <h2 style={{ fontSize: 18, marginBottom: 6 }}>{f.q}</h2>
              <p style={{ color: 'var(--muted)', margin: 0 }}>{f.a}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
