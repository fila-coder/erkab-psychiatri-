import { describe, it, expect } from 'vitest';
import { normalizeIso, parseIso, overlaps, validateSlotTimes } from '../booking';

describe('normalizeIso', () => {
  it('normalizes equivalent representations to the same canonical ISO', () => {
    const a = normalizeIso('2026-12-01T10:00:00.000Z');
    const b = normalizeIso('2026-12-01T10:00:00+00:00');
    const c = normalizeIso('2026-12-01T12:00:00+02:00'); // same instant as 10:00Z
    expect(a).toBeTruthy();
    expect(a).toBe(b);
    expect(a).toBe(c);
  });

  it('rejects invalid timestamps', () => {
    expect(normalizeIso('not-a-date')).toBeNull();
    expect(parseIso('')).toBeNull();
  });
});

describe('overlaps', () => {
  it('detects overlapping intervals with different starts', () => {
    expect(
      overlaps(
        '2026-12-01T10:00:00.000Z',
        '2026-12-01T10:50:00.000Z',
        '2026-12-01T10:30:00.000Z',
        '2026-12-01T11:20:00.000Z'
      )
    ).toBe(true);
  });

  it('allows adjacent non-overlapping intervals', () => {
    expect(
      overlaps(
        '2026-12-01T10:00:00.000Z',
        '2026-12-01T10:50:00.000Z',
        '2026-12-01T10:50:00.000Z',
        '2026-12-01T11:40:00.000Z'
      )
    ).toBe(false);
  });
});

describe('validateSlotTimes', () => {
  it('rejects end before start and past times', () => {
    expect(
      validateSlotTimes('2026-12-01T11:00:00.000Z', '2026-12-01T10:00:00.000Z')
    ).toMatch(/after start/i);
    expect(
      validateSlotTimes('2020-01-01T10:00:00.000Z', '2020-01-01T10:50:00.000Z')
    ).toMatch(/past/i);
  });
});
