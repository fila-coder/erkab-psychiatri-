import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getRepositories } from '../../repositories';
import { Button } from '../../components/Button';
import styles from '../Dashboard.module.css';

const REASONS = [
  'Anxiety or low mood',
  'Sleep problems',
  'ADHD assessment',
  'Medication review',
  'Not sure yet',
];

export function Intake() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jurisdiction, setJurisdiction] = useState('ET');
  const [reasons, setReasons] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>(['English']);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    getRepositories().patients.get(user.uid).then((p) => {
      if (p) {
        setJurisdiction(p.jurisdiction || 'ET');
        setReasons(p.intake?.reasons || []);
        setLanguages(p.intake?.languages || ['English']);
      }
    });
  }, [user]);

  function toggle(list: string[], value: string, set: (v: string[]) => void) {
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    await getRepositories().patients.upsert({
      uid: user.uid,
      jurisdiction,
      intake: {
        reasons,
        languages,
        completedAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    });
    setSaved(true);
    setTimeout(() => navigate('/patient'), 800);
  }

  return (
    <div>
      <header className={styles.pageHead}>
        <div>
          <p className="eyebrow">Confidential intake</p>
          <h1>Help us match you</h1>
        </div>
      </header>
      <p className={styles.lead}>
        Answers are used only for matching and eligibility. Erkab is not an emergency
        service.
      </p>
      <form onSubmit={onSubmit} className={styles.formCard}>
        <label>
          <span>Your current country / jurisdiction</span>
          <select value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)}>
            <option value="ET">Ethiopia</option>
            <option value="KE">Kenya</option>
            <option value="UG">Uganda</option>
            <option value="AE">United Arab Emirates</option>
            <option value="GB">United Kingdom</option>
            <option value="US">United States</option>
          </select>
        </label>
        <fieldset>
          <legend>What would you like help with?</legend>
          {REASONS.map((r) => (
            <label key={r} className={styles.checkRow}>
              <input
                type="checkbox"
                checked={reasons.includes(r)}
                onChange={() => toggle(reasons, r, setReasons)}
              />
              {r}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Preferred languages</legend>
          {['English', 'Amharic', 'Arabic', 'French'].map((l) => (
            <label key={l} className={styles.checkRow}>
              <input
                type="checkbox"
                checked={languages.includes(l)}
                onChange={() => toggle(languages, l, setLanguages)}
              />
              {l}
            </label>
          ))}
        </fieldset>
        <Button type="submit">Save intake</Button>
        {saved && <p className={styles.success}>Saved.</p>}
      </form>
    </div>
  );
}
