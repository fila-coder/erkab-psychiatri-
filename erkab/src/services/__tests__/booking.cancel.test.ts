/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { resetRepositoryCache, getRepositories } from '../../repositories';

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

import { bookAppointment, cancelAppointment } from '../booking';

describe('booking cancel and slot release (local)', () => {
  beforeEach(async () => {
    ls.clear();
    resetRepositoryCache();
    await getRepositories().resetDemoData?.();
    resetRepositoryCache();
    // Publish an open slot for demo provider
    const start = new Date(Date.now() + 72 * 3600 * 1000);
    start.setUTCMinutes(0, 0, 0);
    const end = new Date(start.getTime() + 50 * 60 * 1000);
    const id = `psy-demo-1_${start.toISOString()}`;
    await getRepositories().availability!.publish({
      id,
      providerId: 'psy-demo-1',
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  it('books open slot then cancel releases it', async () => {
    const slots = await getRepositories().availability!.listOpenByProvider('psy-demo-1');
    expect(slots.length).toBeGreaterThan(0);
    const slot = slots[0]!;
    const res = await bookAppointment({
      patientId: 'patient-demo',
      providerId: 'psy-demo-1',
      startAt: slot.startAt,
      endAt: slot.endAt,
      timezone: 'UTC',
      availabilitySlotId: slot.id,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const cancel = await cancelAppointment(res.appointment.id, 'patient-demo');
    expect(cancel.ok).toBe(true);
    const openAgain = await getRepositories().availability!.listOpenByProvider('psy-demo-1');
    expect(openAgain.some((s) => s.id === slot.id)).toBe(true);
  });

  it('rejects booking without availabilitySlotId', async () => {
    const start = new Date(Date.now() + 96 * 3600 * 1000).toISOString();
    const end = new Date(Date.now() + 96 * 3600 * 1000 + 50 * 60 * 1000).toISOString();
    const res = await bookAppointment({
      patientId: 'patient-demo',
      providerId: 'psy-demo-1',
      startAt: start,
      endAt: end,
      timezone: 'UTC',
    });
    expect(res.ok).toBe(false);
  });
});
