import { useState } from 'react';
import {
  getPlatformPackage,
  savePlatformPackageLocal,
  platformFeeAmount,
  providerPayoutAmount,
} from '../../services/pricing';
import { Button } from '../../components/Button';
import styles from '../Dashboard.module.css';

export function Pricing() {
  const initial = getPlatformPackage();
  const [amount, setAmount] = useState(String(initial.amount));
  const [currency, setCurrency] = useState(initial.currency);
  const [sessions, setSessions] = useState(String(initial.sessionsPerWeek));
  const [feePct, setFeePct] = useState(String(initial.platformFeePercent));
  const [saved, setSaved] = useState<string | null>(null);
  const [preview, setPreview] = useState(initial);

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    const next = savePlatformPackageLocal({
      amount: Number(amount) || 0,
      currency: currency.trim() || 'USD',
      sessionsPerWeek: Number(sessions) || 3,
      platformFeePercent: Number(feePct) || 20,
    });
    setPreview(next);
    setSaved('Package pricing saved on this browser. Redeploy with matching VITE_PACKAGE_* env on Vercel for production defaults.');
  }

  return (
    <div>
      <header className={styles.pageHead}>
        <div>
          <p className="eyebrow">Admin portal</p>
          <h1>Package pricing</h1>
          <p className={styles.lead} style={{ marginTop: 4 }}>
            Platform sets one package price. Psychiatrists do not set their own session fee.
            Your commission is a percent of this package at payout.
          </p>
        </div>
      </header>

      <form className={styles.card} onSubmit={onSave} style={{ flexDirection: 'column', alignItems: 'stretch', maxWidth: 480 }}>
        <label>
          <span>Package price (per week)</span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </label>
        <label>
          <span>Currency</span>
          <input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="USD" />
        </label>
        <label>
          <span>Sessions included per week</span>
          <input
            type="number"
            min={1}
            value={sessions}
            onChange={(e) => setSessions(e.target.value)}
          />
        </label>
        <label>
          <span>Platform commission %</span>
          <input
            type="number"
            min={0}
            max={100}
            value={feePct}
            onChange={(e) => setFeePct(e.target.value)}
          />
        </label>

        <div className={styles.banner} style={{ marginTop: 8 }}>
          <strong>{preview.label}</strong>
          <br />
          Platform fee: {preview.currency} {platformFeeAmount(preview)} · Provider
          payout: {preview.currency} {providerPayoutAmount(preview)}
        </div>

        {saved && (
          <p className={styles.meta} role="status">
            {saved}
          </p>
        )}

        <Button type="submit">Save package pricing</Button>
      </form>

      <p className={styles.meta} style={{ marginTop: 16, maxWidth: '52ch' }}>
        Production tip: also set <code>VITE_PACKAGE_PRICE</code>,{' '}
        <code>VITE_PACKAGE_SESSIONS</code>, <code>VITE_PACKAGE_CURRENCY</code>, and{' '}
        <code>VITE_PLATFORM_FEE_PERCENT</code> in Vercel env so all users see the same
        defaults.
      </p>
    </div>
  );
}
