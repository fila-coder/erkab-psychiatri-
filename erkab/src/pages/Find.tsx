import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { getRepositories } from '../repositories';
import { useAuth } from '../context/AuthContext';
import styles from './Find.module.css';
import type { PsychiatristProfile } from '../types';

const COUNTRY_TO_CODE: Record<string, string> = {
  Ethiopia: 'ET',
  Kenya: 'KE',
  Uganda: 'UG',
  'United Arab Emirates': 'AE',
  'United Kingdom': 'GB',
  'United States': 'US',
};

export function Find() {
  const { user } = useAuth();
  const [need, setNeed] = useState('Anxiety or low mood');
  const [lang, setLang] = useState('English');
  const [country, setCountry] = useState('Ethiopia');
  const [shown, setShown] = useState(false);
  const [results, setResults] = useState<PsychiatristProfile[]>([]);

  const jurisdiction = COUNTRY_TO_CODE[country] || '';

  useEffect(() => {
    if (!shown) return;
    (async () => {
      const list = await getRepositories().psychiatrists.listActive({
        language: lang,
        specialty: need === 'Not sure yet' ? undefined : need.split(' ')[0],
        jurisdiction: jurisdiction || undefined,
      });
      setResults(list);
    })();
  }, [shown, lang, need, jurisdiction]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setShown(true);
  }

  return (
    <main className={styles.page}>
      <div className="wrap">
        <div className={styles.head}>
          <p className="eyebrow">Find a psychiatrist</p>
          <h1>Choose an eligible, verified psychiatrist</h1>
          <p>
            Only approved, verified providers appear. Eligibility depends on
            jurisdiction rules. Demo profiles are labelled.
          </p>
        </div>

        <form className={styles.form} onSubmit={onSubmit}>
          <label>
            <span>What would you like help with?</span>
            <select value={need} onChange={(e) => setNeed(e.target.value)}>
              <option>Anxiety or low mood</option>
              <option>Sleep problems</option>
              <option>ADHD assessment</option>
              <option>Medication review</option>
              <option>Not sure yet</option>
            </select>
          </label>
          <div className={styles.row}>
            <label>
              <span>Language</span>
              <select value={lang} onChange={(e) => setLang(e.target.value)}>
                <option>English</option>
                <option>Amharic</option>
                <option>Arabic</option>
                <option>French</option>
              </select>
            </label>
            <label>
              <span>Your country</span>
              <select value={country} onChange={(e) => setCountry(e.target.value)}>
                <option>Ethiopia</option>
                <option>Kenya</option>
                <option>Uganda</option>
                <option>United Arab Emirates</option>
                <option>United Kingdom</option>
                <option>United States</option>
              </select>
            </label>
          </div>
          <Button type="submit">Show matching psychiatrists</Button>
        </form>

        {shown && (
          <div className={styles.results} aria-live="polite">
            <p className={styles.resultNote}>
              {results.length === 0
                ? 'No eligible psychiatrists match these filters. Try English + Ethiopia or Kenya.'
                : `Showing ${results.length} profile(s). Names marked (Demo) are fictional test data.`}
            </p>
            {results.map((p) => (
              <article key={p.uid} className={styles.card}>
                <div className={styles.cardTop}>
                  <div className={styles.av}>
                    {p.professionalName
                      .replace(/\(Demo\)/g, '')
                      .split(' ')
                      .filter((w) => w.length > 1)
                      .slice(0, 2)
                      .map((w) => w[0])
                      .join('')}
                  </div>
                  <div>
                    <h2>{p.professionalName}</h2>
                    <p>
                      {p.specialties.join(' · ')} · {p.languages.join(', ')}
                    </p>
                  </div>
                </div>
                <ul className={styles.checks}>
                  <li>
                    <span>Medical licence</span>
                    <em>{p.trustPassport.licence.status === 'checked' ? 'Checked' : 'Pending'}</em>
                  </li>
                  <li>
                    <span>Identity</span>
                    <em>
                      {p.trustPassport.identity.status === 'checked' ? 'Checked' : 'Pending'}
                    </em>
                  </li>
                  <li>
                    <span>Qualification</span>
                    <em>
                      {p.trustPassport.qualification.status === 'checked'
                        ? 'Checked'
                        : 'Pending'}
                    </em>
                  </li>
                </ul>
                <div className={styles.cardActions}>
                  <span className={styles.price}>
                    {p.price.currency} {p.price.amount} · {p.sessionDurationMin} min ·{' '}
                    {p.jurisdictions.join(', ')}
                  </span>
                  {user?.role === 'PATIENT' ? (
                    <Link to={`/patient/book/${p.uid}`}>
                      <Button size="sm">Book</Button>
                    </Link>
                  ) : (
                    <Link to="/auth/sign-in">
                      <Button size="sm">Sign in to book</Button>
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
