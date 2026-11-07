import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { therapistsRepo } from '../repositories';
import type { PsychiatristProfile } from '../lib/types';
import { Button } from '../components/Button';
import { ErkabSeal } from '../components/Seal';

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function FindPage() {
  const [list, setList] = useState<PsychiatristProfile[]>([]);
  const [language, setLanguage] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const results = await therapistsRepo.listActive({
        language: language || undefined,
        jurisdiction: jurisdiction || undefined,
      });
      setList(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load therapists.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="page container">
      <div className="page-head">
        <p className="eyebrow">Find a therapist</p>
        <h1>Approved therapists</h1>
        <p className="lede">
          Only therapists approved by an Erkab admin appear here. Each
          one&apos;s identity, licence and qualifications have been checked.
        </p>
      </div>

      <div className="card filter-card">
        <div className="row">
          <label>
            Language
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="">Any language</option>
              <option value="English">English</option>
              <option value="Amharic">Amharic</option>
              <option value="Arabic">Arabic</option>
              <option value="French">French</option>
            </select>
          </label>
          <label>
            Location
            <select
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
            >
              <option value="">Anywhere</option>
              <option value="ET">Ethiopia</option>
              <option value="KE">Kenya</option>
              <option value="UG">Uganda</option>
              <option value="AE">United Arab Emirates</option>
              <option value="GB">United Kingdom</option>
              <option value="US">United States</option>
            </select>
          </label>
          <Button type="button" onClick={() => void load()}>
            Show matching therapists
          </Button>
        </div>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p>Loading…</p>
      ) : list.length === 0 ? (
        <div className="card empty-state">
          <h2>No therapists are listed for public booking yet.</h2>
          <p>
            Therapists only appear here after admin approval (ACTIVE in
            the public directory). Please check back soon, or{' '}
            <Link to="/contact">contact us</Link> for help.
          </p>
        </div>
      ) : (
        <div className="grid">
          {list.map((p) => (
            <article key={p.uid} className="card therapist-card">
              <div className="therapist-head">
                <span className="avatar" aria-hidden="true">
                  {initials(p.professionalName)}
                </span>
                <div>
                  <h2>{p.professionalName}</h2>
                  <span className="verified-row">
                    <span className="pill pill-green">Verified</span>
                    <ErkabSeal size="sm" />
                  </span>
                </div>
              </div>
              <p>{p.bio || 'Therapist at Erkab.'}</p>
              <p>
                {p.specialties.map((s) => (
                  <span key={s} className="tag">
                    {s}
                  </span>
                ))}
              </p>
              <p className="muted">
                {p.languages.join(', ') || 'Languages not listed'} ·{' '}
                {p.sessionDurationMin} min
              </p>
              <div className="therapist-foot">
                <span className="therapist-price">
                  {p.price?.amount
                    ? `${p.price.currency} ${p.price.amount}`
                    : 'Price on booking'}
                </span>
                <Link
                  to="/auth/sign-up"
                  className="btn btn-primary"
                >
                  Book — sign up first
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
