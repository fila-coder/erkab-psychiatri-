/**
 * "Verified by Erkab" seal — the platform's trust mark.
 * Pure CSS circle: gold outer ring, teal ring, check mark.
 * Presentational only; no logic.
 */
export function ErkabSeal({ size = 'md' }: { size?: 'md' | 'sm' }) {
  return (
    <span
      className={`seal seal--${size}`}
      role="img"
      aria-label="Verified by Erkab"
    >
      <span aria-hidden="true">✓</span>
    </span>
  );
}
