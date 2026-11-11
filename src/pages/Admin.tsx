import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import {
  auditRepo,
  therapistsRepo,
  usersRepo,
} from '../repositories';
import type { AppUser, PsychiatristProfile } from '../lib/types';
import { Button } from '../components/Button';

function statusPill(status: string): string {
  if (status === 'ACTIVE' || status === 'verified') return 'pill pill-green';
  if (status === 'REJECTED') return 'pill pill-red';
  if (status === 'PENDING') return 'pill pill-amber';
  return 'pill pill-grey';
}

export function AdminPage() {
  const { user } = useAuth();
  const [apps, setApps] = useState<PsychiatristProfile[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [a, u] = await Promise.all([
        therapistsRepo.listApplications(),
        usersRepo.list(),
      ]);
      setApps(a);
      setUsers(u);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the admin portal.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function approve(app: PsychiatristProfile) {
    if (!user) return;
    if (app.trustPassport?.overall !== 'verified') {
      setError(
        'Set the Trust Passport overall to verified before activating. This is an admin attestation done in the Firebase Console on the application document.'
      );
      return;
    }
    setBusy(app.uid);
    setError('');
    setInfo('');
    try {
      const updated: PsychiatristProfile = {
        ...app,
        status: 'ACTIVE',
        updatedAt: new Date().toISOString(),
      };
      await therapistsRepo.upsertApplication(updated);
      await therapistsRepo.publishPublic(updated);
      await auditRepo.append({
        actorId: user.uid,
        action: 'provider.ACTIVE',
        targetType: 'therapist',
        targetId: app.uid,
        reason: 'Approved by admin',
      });
      setInfo(`${app.professionalName} is now ACTIVE and listed for public booking.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not approve this application.');
    } finally {
      setBusy(null);
    }
  }

  async function reject(app: PsychiatristProfile) {
    if (!user) return;
    setBusy(app.uid);
    setError('');
    setInfo('');
    try {
      const updated: PsychiatristProfile = {
        ...app,
        status: 'REJECTED',
        updatedAt: new Date().toISOString(),
      };
      await therapistsRepo.upsertApplication(updated);
      await therapistsRepo.unpublishPublic(app.uid);
      await auditRepo.append({
        actorId: user.uid,
        action: 'provider.REJECTED',
        targetType: 'therapist',
        targetId: app.uid,
        reason: 'Rejected by admin',
      });
      setInfo(`${app.professionalName} was rejected and removed from public booking.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reject this application.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="page container">
      <p className="eyebrow">Admin portal</p>
      <h1>Administration</h1>
      <p className="muted">
        Approve therapists before they appear for public booking. Admin
        accounts are created directly in the Firebase Console (Auth +
        users/{'{uid}'} with role ADMIN) — never by signing up through
        the site.
      </p>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {info && <p className="success">{info}</p>}

      {loading ? (
        <p>Loading…</p>
      ) : (
        <>
          <div className="stat-grid">
            <div className="stat">
              <div className="stat-label">Applications</div>
              <div className="stat-value">{apps.length}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Active therapists</div>
              <div className="stat-value">
                {apps.filter((a) => a.status === 'ACTIVE').length}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Users</div>
              <div className="stat-value">{users.length}</div>
            </div>
          </div>

          <div className="card">
            <h2>Therapist applications ({apps.length})</h2>
            {apps.length === 0 ? (
              <p>No applications yet.</p>
            ) : (
              <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Trust Passport</th>
                    <th>Documents</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {apps.map((a) => (
                    <tr key={a.uid}>
                      <td>
                        <strong>{a.professionalName}</strong>
                        <br />
                        <span className="muted">{a.bio}</span>
                        <br />
                        <span className="muted">
                          {(a.specialties || []).join(', ')}
                        </span>
                      </td>
                      <td>
                        <span className={statusPill(a.status)}>{a.status}</span>
                      </td>
                      <td>
                        <span className={statusPill(a.trustPassport?.overall || 'unverified')}>
                          {a.trustPassport?.overall || 'unverified'}
                        </span>
                      </td>
                      <td>
                        {a.driveEvidenceUrl ? (
                          <a href={a.driveEvidenceUrl} target="_blank" rel="noreferrer">
                            Open documents
                          </a>
                        ) : (
                          <span className="muted">No link</span>
                        )}
                      </td>
                      <td>
                        <div className="row">
                          <Button
                            size="sm"
                            disabled={busy === a.uid || a.status === 'ACTIVE'}
                            onClick={() => void approve(a)}
                          >
                            {busy === a.uid ? 'Working…' : 'Approve'}
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            disabled={busy === a.uid || a.status === 'REJECTED'}
                            onClick={() => void reject(a)}
                          >
                            Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
            <p className="muted">
              Approval requires the Trust Passport overall to be
              &apos;verified&apos; first. Set it on the application document
              in the Firebase Console after checking identity, licence,
              qualification and interview evidence.
            </p>
          </div>

          <div className="card">
            <h2>Users ({users.length})</h2>
            {users.length === 0 ? (
              <p>No users yet.</p>
            ) : (
              <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.uid}>
                      <td>{u.displayName}</td>
                      <td>{u.email}</td>
                      <td>
                        {u.role === 'PATIENT'
                          ? 'Client'
                          : u.role === 'PSYCHIATRIST'
                            ? 'Therapist'
                            : 'Admin'}
                      </td>
                      <td>
                        <span className={statusPill(u.status)}>{u.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
