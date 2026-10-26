import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { jitsiJoinUrl } from '../../services/video';
import { Button } from '../../components/Button';
import styles from '../Dashboard.module.css';

/**
 * Embedded Jitsi Meet room for an appointment.
 * Works for patient and psychiatrist (and admin for support).
 */
export function Session() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const { user } = useAuth();
  const provider = (import.meta.env.VITE_VIDEO_PROVIDER as string | undefined)?.toLowerCase();

  if (!appointmentId) {
    return (
      <div>
        <p className={styles.error}>Missing appointment.</p>
        <Link to="/account">Back</Link>
      </div>
    );
  }

  const joinUrl = jitsiJoinUrl(appointmentId);
  const displayName = user?.displayName || 'Erkab user';
  // Jitsi supports hash config for display name
  const embedUrl = `${joinUrl}#userInfo.displayName="${encodeURIComponent(displayName)}"`;

  if (provider !== 'jitsi') {
    return (
      <div>
        <header className={styles.pageHead}>
          <div>
            <p className="eyebrow">Video session</p>
            <h1>Video not enabled</h1>
          </div>
        </header>
        <p className={styles.lead}>
          Set <code>VITE_VIDEO_PROVIDER=jitsi</code> in <code>.env</code> and restart the
          app to enable embedded Jitsi Meet.
        </p>
        <p className={styles.meta}>
          You can still open a room manually:{' '}
          <a href={joinUrl} target="_blank" rel="noreferrer">
            {joinUrl}
          </a>
        </p>
        <Link to="/account">
          <Button variant="soft">Back</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <header className={styles.pageHead}>
        <div>
          <p className="eyebrow">Video session</p>
          <h1>Consultation room</h1>
          <p className={styles.lead} style={{ marginTop: 4 }}>
            Powered by Jitsi Meet. Allow camera and microphone when prompted. Do not share
            this room link publicly.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a href={joinUrl} target="_blank" rel="noreferrer">
            <Button variant="soft" size="sm">
              Open in new tab
            </Button>
          </a>
          <Link to="/account">
            <Button variant="ghost" size="sm">
              Leave
            </Button>
          </Link>
        </div>
      </header>

      <div
        style={{
          width: '100%',
          height: 'min(70vh, 640px)',
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid var(--line)',
          background: '#0b1220',
        }}
      >
        <iframe
          title="Erkab video session"
          src={embedUrl}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          style={{ width: '100%', height: '100%', border: 0 }}
        />
      </div>

      <p className={styles.meta} style={{ marginTop: 12 }}>
        Room: {joinUrl}
      </p>
    </div>
  );
}
