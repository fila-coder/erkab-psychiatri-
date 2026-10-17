/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { resetRepositoryCache, getRepositories, getDataMode } from '../../repositories';

const mem: Record<string, string> = {};
const ls = {
  getItem: (k: string) => mem[k] ?? null,
  setItem: (k: string, v: string) => {
    mem[k] = v;
  },
  removeItem: (k: string) => {
    delete mem[k];
  },
  clear: () => {
    Object.keys(mem).forEach((k) => delete mem[k]);
  },
};
// @ts-expect-error test shim
globalThis.localStorage = ls;
// @ts-expect-error test shim
globalThis.sessionStorage = ls;

import {
  bookAppointment,
  canBookProvider,
  cancelAppointment,
  validateSlotTimes,
} from '../booking';

describe('mode selection', () => {
  it('defaults to local', () => {
    expect(getDataMode()).toBe('local');
  });
});

describe('validateSlotTimes', () => {
  it('rejects malformed timestamps', () => {
    expect(validateSlotTimes('not-a-date', 'also-bad')).toMatch(/invalid/i);
  });
  it('rejects end before start', () => {
    const start = new Date(Date.now() + 48 * 3600e3).toISOString();
    const end = new Date(Date.now() + 24 * 3600e3).toISOString();
    expect(validateSlotTimes(start, end)).toMatch(/after start/i);
  });
  it('rejects past slots', () => {
    const start = new Date(Date.now() - 3600e3).toISOString();
    const end = new Date(Date.now() + 3600e3).toISOString();
    expect(validateSlotTimes(start, end)).toMatch(/past/i);
  });
  it('rejects wrong duration', () => {
    const start = new Date(Date.now() + 48 * 3600e3);
    start.setUTCMinutes(0, 0, 0);
    const end = new Date(start.getTime() + 30 * 60e3); // 30 min vs expected 50
    expect(validateSlotTimes(start.toISOString(), end.toISOString(), 50)).toMatch(
      /50 minutes/i
    );
  });
});

describe('booking domain (local repository)', () => {
  beforeEach(async () => {
    ls.clear();
    resetRepositoryCache();
    await getRepositories().resetDemoData?.();
    resetRepositoryCache();
  });

  it('rejects unapproved providers', async () => {
    const pending = await getRepositories().psychiatrists.get('psy-pending-1');
    expect(pending).toBeTruthy();
    expect(canBookProvider(pending!, 'AE')).toMatch(/not currently bookable/i);
  });

  it('rejects jurisdiction mismatch', async () => {
    const p = await getRepositories().psychiatrists.get('psy-demo-1');
    expect(canBookProvider(p!, 'US')).toMatch(/not eligible/i);
  });

  it('allows eligible booking and prevents double-book', async () => {
    const start = new Date(Date.now() + 48 * 3600 * 1000);
    start.setUTCMinutes(0, 0, 0);
    const end = new Date(start.getTime() + 50 * 60 * 1000);

    const first = await bookAppointment({
      patientId: 'patient-demo',
      providerId: 'psy-demo-1',
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      timezone: 'Africa/Addis_Ababa',
    });
    expect(first.ok).toBe(true);

    const second = await bookAppointment({
      patientId: 'patient-demo',
      providerId: 'psy-demo-1',
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      timezone: 'Africa/Addis_Ababa',
    });
    expect(second.ok).toBe(false);
  });

  it('cancels pending appointments for the patient', async () => {
    const start = new Date(Date.now() + 72 * 3600 * 1000);
    start.setUTCMinutes(0, 0, 0);
    const end = new Date(start.getTime() + 50 * 60 * 1000);
    const res = await bookAppointment({
      patientId: 'patient-demo',
      providerId: 'psy-demo-1',
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      timezone: 'UTC',
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const cancel = await cancelAppointment(res.appointment.id, 'patient-demo');
    expect(cancel.ok).toBe(true);
    const appt = await getRepositories().appointments.get(res.appointment.id);
    expect(appt?.status).toBe('CANCELLED');
  });

  it('rejects cancel of already cancelled', async () => {
    const start = new Date(Date.now() + 80 * 3600 * 1000);
    start.setUTCMinutes(0, 0, 0);
    const end = new Date(start.getTime() + 50 * 60 * 1000);
    const res = await bookAppointment({
      patientId: 'patient-demo',
      providerId: 'psy-demo-1',
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      timezone: 'UTC',
    });
    if (!res.ok) throw new Error('book failed');
    await cancelAppointment(res.appointment.id, 'patient-demo');
    const again = await cancelAppointment(res.appointment.id, 'patient-demo');
    expect(again.ok).toBe(false);
  });

  it('persists appointments across repository cache reset', async () => {
    const start = new Date(Date.now() + 96 * 3600 * 1000);
    start.setUTCMinutes(0, 0, 0);
    const end = new Date(start.getTime() + 50 * 60 * 1000);
    const res = await bookAppointment({
      patientId: 'patient-demo',
      providerId: 'psy-demo-1',
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      timezone: 'UTC',
    });
    expect(res.ok).toBe(true);
    resetRepositoryCache();
    const list = await getRepositories().appointments.listByPatient('patient-demo');
    expect(
      list.some(
        (a) => a.id === (res as { ok: true; appointment: { id: string } }).appointment.id
      )
    ).toBe(true);
  });
});


  it('normalizes alternate timestamp formats to the same instant', async () => {
    const base = new Date(Date.now() + 48 * 3600 * 1000);
    base.setUTCMinutes(0, 0, 0);
    const end = new Date(base.getTime() + 50 * 60 * 1000);
    // space-separated form (still parseable by Date)
    const altStart = base.toISOString().replace('T', ' ').replace('Z', '+00:00');
    const first = await bookAppointment({
      patientId: 'patient-demo',
      providerId: 'psy-demo-1',
      startAt: base.toISOString(),
      endAt: end.toISOString(),
      timezone: 'UTC',
    });
    expect(first.ok).toBe(true);
    const second = await bookAppointment({
      patientId: 'patient-demo',
      providerId: 'psy-demo-1',
      startAt: altStart,
      endAt: end.toISOString(),
      timezone: 'UTC',
    });
    // After normalization both should target the same slot → second fails
    expect(second.ok).toBe(false);
  });

  it('rejects cancelled appointments from blocking re-book after cancel', async () => {
    const start = new Date(Date.now() + 120 * 3600 * 1000);
    start.setUTCMinutes(0, 0, 0);
    const end = new Date(start.getTime() + 50 * 60 * 1000);
    const res = await bookAppointment({
      patientId: 'patient-demo',
      providerId: 'psy-demo-1',
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      timezone: 'UTC',
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    await cancelAppointment(res.appointment.id, 'patient-demo');
    const again = await bookAppointment({
      patientId: 'patient-demo',
      providerId: 'psy-demo-1',
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      timezone: 'UTC',
    });
    expect(again.ok).toBe(true);
  });

describe('admin application decisions', () => {
  beforeEach(async () => {
    ls.clear();
    resetRepositoryCache();
    await getRepositories().resetDemoData?.();
    resetRepositoryCache();
  });

  it('approve fails without individual Trust Passport checks', async () => {
    await expect(
      getRepositories().psychiatrists.setStatus('psy-pending-1', 'ACTIVE', {
        actorId: 'admin-demo',
        reason: 'Documents reviewed in local test',
      })
    ).rejects.toThrow(/Trust Passport|checked/i);
  });

  it('approve succeeds after all categories are checked', async () => {
    const repo = getRepositories();
    const pending = await repo.psychiatrists.get('psy-pending-1');
    expect(pending).toBeTruthy();
    const checked = { status: 'checked' as const, reviewedAt: new Date().toISOString(), reviewerId: 'admin-demo' };
    pending!.trustPassport = {
      identity: { ...checked },
      licence: { ...checked },
      qualification: { ...checked },
      interview: { ...checked },
      overall: 'partial',
    };
    await repo.psychiatrists.upsert(pending!);
    await repo.psychiatrists.setStatus('psy-pending-1', 'ACTIVE', {
      actorId: 'admin-demo',
      reason: 'All categories checked',
    });
    const p = await repo.psychiatrists.get('psy-pending-1');
    expect(p?.status).toBe('ACTIVE');
    expect(p?.trustPassport.overall).toBe('verified');
  });

  it('reject requires leaving notes via setStatus reason', async () => {
    await getRepositories().psychiatrists.setStatus('psy-pending-1', 'REJECTED', {
      actorId: 'admin-demo',
      reason: 'Incomplete licence evidence',
    });
    const p = await getRepositories().psychiatrists.get('psy-pending-1');
    expect(p?.status).toBe('REJECTED');
    expect(p?.trustPassport.overall).toBe('unverified');
  });
});
