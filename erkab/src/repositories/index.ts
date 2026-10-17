/**
 * Repository factory.
 * - local: localStorage development adapter
 * - firebase: real Firebase adapter (requires env + deployed Functions for privileged ops)
 *
 * Never silently falls back from firebase to local.
 */

import { isFirebaseConfigured } from '../lib/firebase';
import { createLocalRepositories } from './localStore';
import { createFirebaseRepositories } from './firebaseRepos';
import type { DataRepositories } from './types';

let cached: DataRepositories | null = null;

export function getDataMode(): 'local' | 'firebase' {
  const mode = (import.meta.env.VITE_DATA_MODE as string | undefined)?.toLowerCase();
  if (mode === 'firebase') return 'firebase';
  return 'local';
}

export function getRepositories(): DataRepositories {
  if (cached) return cached;

  const mode = getDataMode();

  if (mode === 'firebase') {
    if (!isFirebaseConfigured) {
      throw new Error(
        'VITE_DATA_MODE=firebase but VITE_FIREBASE_* is incomplete. ' +
          'Set all Firebase web config values or use VITE_DATA_MODE=local. See FIREBASE_SETUP_FOR_OWNER.md.'
      );
    }
    cached = createFirebaseRepositories();
    return cached;
  }

  cached = createLocalRepositories();
  return cached;
}

export function resetRepositoryCache() {
  cached = null;
}

export type { DataRepositories } from './types';
