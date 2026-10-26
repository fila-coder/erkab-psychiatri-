import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getRepositories } from '../../repositories';
import { Button } from '../../components/Button';
import styles from '../Dashboard.module.css';
import type { PsychiatristProfile, ProviderStatus } from '../../types';
import { getPlatformPackage } from '../../services/pricing';

/** Statuses that allow the applicant to edit and resubmit */
const EDITABLE: ProviderStatus[] = ['DRAFT', 'MORE_INFORMATION_REQUIRED', 'ACTIVE', 'APPROVED'];

function isValidDriveUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    const host = u.hostname.replace(/^www\./, '');
    return host === 'drive.google.com' || host === 'docs.google.com';
  } catch {
    return false;
  }
}

export function Application() {
  const { user } = useAuth();
  const [professionalName, setProfessionalName] = useState('');
  const [bio, setBio] = useState('');
  const [specialties, setSpecialties] = useState('');
  const [languages, setLanguages] = useState('English');
  const [jurisdictions, setJurisdictions] = useState('');
  const [status, setStatus] = useState<ProviderStatus>('DRAFT');
  const [notes, setNotes] = useState('');
  const [driveEvidenceUrl, setDriveEvidenceUrl] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    getRepositories().psychiatrists.get(user.uid).then((p) => {
      if (!p) return;
      setProfessionalName(p.professionalName);
      setBio(p.bio);
      setSpecialties(p.specialties.join(', '));
      setLanguages(p.languages.join(', ') || 'English');
      setJurisdictions(p.jurisdictions.join(', '));
      setStatus(p.status);
      setNotes(p.applicationNotes || '');
      setDriveEvidenceUrl((p as { driveEvidenceUrl?: string }).driveEvidenceUrl || '');
    });
  }, [user]);

  const canEdit = EDITABLE.includes(status);

  async function save(asSubmit: boolean) {
    if (!user) return;
    setError('');
    setMessage('');
    if (!canEdit && asSubmit) {
      setError('This application cannot be edited in its current status.');
      return;
    }
    if (!professionalName.trim()) {
      setError('Professional name is required.');
      return;
    }
    setLoading(true);
    try {
      const existing = await getRepositories().psychiatrists.get(user.uid);
      // Never allow applicant to write ACTIVE/APPROVED or verified passport
      if (
        existing &&
        (existing.status === 'ACTIVE' ||
          existing.status === 'APPROVED' ||
          existing.status === 'UNDER_REVIEW')
      ) {
        if (asSubmit || !canEdit) {
          setError('You cannot modify an application that is under review or approved.');
          setLoading(false);
          return;
        }
      }

      const t = new Date().toISOString();
      const profile: PsychiatristProfile = {
        uid: user.uid,
        status: existing?.status || 'DRAFT',
        professionalName: professionalName.trim(),
        bio: bio.trim(),
        specialties: specialties.split(',').map((s) => s.trim()).filter(Boolean),
        languages: languages.split(',').map((s) => s.trim()).filter(Boolean),
        jurisdictions: jurisdictions
          .split(',')
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean),
        sessionDurationMin: existing?.sessionDurationMin || 50,
        price: (() => { const pkg = getPlatformPackage(); return { amount: pkg.amount, currency: pkg.currency }; })(),
        // Preserve existing verification — never self-verify
        trustPassport: existing?.trustPassport || {
          identity: { status: 'pending' },
          licence: { status: 'pending' },
          qualification: { status: 'pending' },
          interview: { status: 'pending' },
          overall: 'unverified',
        },
        cancellationPolicy:
          existing?.cancellationPolicy ||
          'Cancel or reschedule at least 24 hours before the session for a full refund.',
        applicationNotes: existing?.applicationNotes,
        driveEvidenceUrl: driveEvidenceUrl.trim() || undefined,
        updatedAt: t,
      };

      // Evidence or material changes after approval require re-review
      const wasApproved =
        existing && (existing.status === 'ACTIVE' || existing.status === 'APPROVED');
      if (wasApproved) {
        const driveChanged =
          (driveEvidenceUrl.trim() || '') !==
          ((existing as { driveEvidenceUrl?: string }).driveEvidenceUrl || '');
        const nameChanged =
          professionalName.trim() !== (existing.professionalName || '');
        if (driveChanged || nameChanged) {
          profile.status = 'UNDER_REVIEW';
          profile.trustPassport = {
            ...profile.trustPassport,
            overall: 'unverified',
          };
          setMessage(
            'Important details changed. Your profile is pending review again and is not publicly bookable until re-approved.'
          );
        }
      }

      if (asSubmit) {
        if (driveEvidenceUrl.trim() && !isValidDriveUrl(driveEvidenceUrl.trim())) {
          setError('Evidence link must be an https://drive.google.com or docs.google.com URL.');
          setLoading(false);
          return;
        }
        if (asSubmit && !driveEvidenceUrl.trim()) {
          setError('Add a Google Drive folder link with your credentials and share it with Erkab\'s verification account.');
          setLoading(false);
          return;
        }
        if (profile.jurisdictions.length === 0) {
          setError('At least one jurisdiction code is required (e.g. ET, KE).');
          setLoading(false);
          return;
        }
        if (profile.status === 'DRAFT' || profile.status === 'MORE_INFORMATION_REQUIRED') {
          profile.status = 'UNDER_REVIEW';
        } else {
          setError('Only draft or “more information required” applications can be submitted.');
          setLoading(false);
          return;
        }
        setMessage(
          "Application submitted for review. Share your Google Drive folder with Erkab’s verification account. A link alone does not prove authenticity or access."
        );
      } else {
        // Draft save must not demote ACTIVE/APPROVED
        if (profile.status === 'ACTIVE' || profile.status === 'APPROVED') {
          setError('Approved profiles cannot be reverted to draft by the applicant.');
          setLoading(false);
          return;
        }
        if (profile.status === 'UNDER_REVIEW') {
          setError('Application is under review and cannot be saved as draft.');
          setLoading(false);
          return;
        }
        profile.status = 'DRAFT';
        setMessage('Draft saved.');
      }

      await getRepositories().psychiatrists.upsert(profile);
      setStatus(profile.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <header className={styles.pageHead}>
        <div>
          <p className="eyebrow">Credentials</p>
          <h1>Professional application</h1>
        </div>
      </header>
      <p className={styles.lead}>
        Current status: <strong>{status}</strong>
        {notes ? ` — Reviewer note: ${notes}` : ''}. You cannot approve your own
        application. Verification is performed only by administrators.
      </p>
      <form
        className={styles.formCard}
        onSubmit={(e) => {
          e.preventDefault();
          save(true);
        }}
      >
        <label>
          <span>Professional name</span>
          <input
            value={professionalName}
            onChange={(e) => setProfessionalName(e.target.value)}
            required
            disabled={!canEdit}
          />
        </label>
        <label>
          <span>Biography</span>
          <textarea
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            disabled={!canEdit}
          />
        </label>
        <label>
          <span>Specialties (comma-separated)</span>
          <input
            value={specialties}
            onChange={(e) => setSpecialties(e.target.value)}
            disabled={!canEdit}
          />
        </label>
        <label>
          <span>Languages (comma-separated)</span>
          <input
            value={languages}
            onChange={(e) => setLanguages(e.target.value)}
            disabled={!canEdit}
          />
        </label>
        <label>
          <span>Licensed jurisdictions (ISO codes)</span>
          <input
            value={jurisdictions}
            onChange={(e) => setJurisdictions(e.target.value)}
            placeholder="ET, KE"
            disabled={!canEdit}
          />
        </label>
        <div className={styles.banner}>
          <strong>Package pricing</strong> is set by Erkab (admin), not by individual
          psychiatrists. Current package: {getPlatformPackage().label}. Your payout is the
          package amount minus platform commission.
        </div>
        <label>
          <span>Google Drive folder link (private — not shown publicly)</span>
          <input
            type="url"
            value={driveEvidenceUrl}
            onChange={(e) => setDriveEvidenceUrl(e.target.value)}
            placeholder="https://drive.google.com/drive/folders/..."
            disabled={!canEdit}
          />
        </label>
        <div className={styles.banner}>
          Share the folder with Erkab&apos;s designated verification Google account
          (see setup docs). Submitting a link does not prove authenticity or access.
          Use a private Google Drive folder link (not public web search results).
        </div>
        
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        {message && <p className={styles.success}>{message}</p>}
        {canEdit && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Button type="button" variant="ghost" disabled={loading} onClick={() => save(false)}>
              Save draft
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving…' : 'Submit for review'}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
