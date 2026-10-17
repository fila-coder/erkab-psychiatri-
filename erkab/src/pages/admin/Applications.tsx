import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getRepositories } from '../../repositories';
import { Button } from '../../components/Button';
import styles from '../Dashboard.module.css';
import type { ProviderStatus, PsychiatristProfile } from '../../types';

type AppRow = PsychiatristProfile & { driveEvidenceUrl?: string };

export function Applications() {
  const { user, mode } = useAuth();
  const [list, setList] = useState<AppRow[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [checks, setChecks] = useState<Record<string, string[]>>({});

  const reload = useCallback(async () => {
    const all = await getRepositories().psychiatrists.listAll();
    setList(all as AppRow[]);
  }, []);

  useEffect(() => {
    reload().catch((e) => setError(e instanceof Error ? e.message : 'Load failed'));
  }, [reload]);

  async function decide(uid: string, status: ProviderStatus) {
    setError('');
    setMessage('');
    if (!user || user.role !== 'ADMIN') {
      setError('Only an authorized administrator can record decisions.');
      return;
    }
    if (status === 'REJECTED' || status === 'MORE_INFORMATION_REQUIRED') {
      if (!notes[uid]?.trim()) {
        setError('Notes are required for rejection or more-information decisions.');
        return;
      }
    }
    setLoading(true);
    try {
      const repo = getRepositories();
      const app = await repo.psychiatrists.get(uid);
      if (!app) throw new Error('Application not found.');

      const evidenceChecked = checks[uid] || [];
      const review = {
        decision:
          status === 'ACTIVE' || status === 'APPROVED'
            ? ('approved' as const)
            : status === 'REJECTED'
              ? ('rejected' as const)
              : status === 'MORE_INFORMATION_REQUIRED'
                ? ('needs_more_information' as const)
                : ('pending' as const),
        reviewerId: user.uid,
        reviewedAt: new Date().toISOString(),
        notes: notes[uid] || '',
        evidenceItemsChecked: evidenceChecked,
      };

      if (status === 'ACTIVE' || status === 'APPROVED') {
        if (evidenceChecked.length === 0) {
          setError('Record at least one evidence item checked before approval.');
          setLoading(false);
          return;
        }
        if (!(app as AppRow).driveEvidenceUrl) {
          setError('No Drive evidence link on this application.');
          setLoading(false);
          return;
        }
        // Mark overall verified only after explicit admin checks (manual review)
        app.trustPassport = {
          ...app.trustPassport,
          overall: 'verified',
          verificationDate: new Date().toISOString(),
        };
      }

      app.applicationNotes = notes[uid] || app.applicationNotes;
      (app as AppRow & { review?: typeof review }).review = review;
      await repo.psychiatrists.upsert(app);
      await repo.psychiatrists.setStatus(uid, status, {
        actorId: user.uid,
        reason: notes[uid] || '',
      });
      setMessage(`Decision recorded: ${status}`);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Decision failed.');
    } finally {
      setLoading(false);
    }
  }

  function toggleCheck(uid: string, item: string) {
    setChecks((prev) => {
      const cur = new Set(prev[uid] || []);
      if (cur.has(item)) cur.delete(item);
      else cur.add(item);
      return { ...prev, [uid]: [...cur] };
    });
  }

  const evidenceOptions = [
    'Identity document',
    'Professional licence',
    'Qualifications',
    'Other supporting file',
  ];

  return (
    <div>
      <header className={styles.pageHead}>
        <div>
          <p className="eyebrow">Administration</p>
          <h1>Psychiatrist applications</h1>
        </div>
      </header>
      <p className={styles.lead}>
        Review private applications and Drive evidence links. Submitting a link does not
        prove authenticity. Open the folder, review files, record what you checked, then
        decide. Mode: <strong>{mode}</strong>.
      </p>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {message && <p className={styles.success}>{message}</p>}
      <ul className={styles.list}>
        {list.map((p) => (
          <li key={p.uid} className={styles.card}>
            <h2>{p.professionalName || p.uid}</h2>
            <p>
              Status: <strong>{p.status}</strong>
            </p>
            <p>{p.bio}</p>
            <p>
              Specialties: {(p.specialties || []).join(', ') || '—'} · Jurisdictions:{' '}
              {(p.jurisdictions || []).join(', ') || '—'}
            </p>
            {p.driveEvidenceUrl ? (
              <p>
                <a href={p.driveEvidenceUrl} target="_blank" rel="noopener noreferrer">
                  Open Google Drive evidence (private)
                </a>
              </p>
            ) : (
              <p role="status">No Drive evidence link submitted.</p>
            )}
            <fieldset style={{ border: '1px solid #ccc', padding: 12, marginTop: 8 }}>
              <legend>Evidence reviewed (admin)</legend>
              {evidenceOptions.map((item) => (
                <label key={item} style={{ display: 'block' }}>
                  <input
                    type="checkbox"
                    checked={(checks[p.uid] || []).includes(item)}
                    onChange={() => toggleCheck(p.uid, item)}
                  />{' '}
                  {item}
                </label>
              ))}
            </fieldset>
            <label style={{ display: 'block', marginTop: 8 }}>
              Review notes
              <textarea
                rows={2}
                value={notes[p.uid] || ''}
                onChange={(e) => setNotes((n) => ({ ...n, [p.uid]: e.target.value }))}
                style={{ width: '100%' }}
              />
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              <Button size="sm" disabled={loading} onClick={() => decide(p.uid, 'ACTIVE')}>
                Approve
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={loading}
                onClick={() => decide(p.uid, 'MORE_INFORMATION_REQUIRED')}
              >
                Need more info
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={loading}
                onClick={() => decide(p.uid, 'REJECTED')}
              >
                Reject
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {list.length === 0 && <p>No applications yet.</p>}
    </div>
  );
}
