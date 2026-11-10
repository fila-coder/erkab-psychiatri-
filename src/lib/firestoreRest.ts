/**
 * Firestore access through the plain REST API (fetch only).
 *
 * Why: the Firestore client SDK (getDoc / setDoc / getDocs) hangs for
 * 15+ seconds with no error on real phones in this deployment, while
 * Firebase Auth — which uses plain HTTPS — works fine. The SDK uses a
 * streaming connection that never answers here. REST uses the same
 * plain HTTPS transport as Auth, with the same signed-in user's ID
 * token and the same Firestore security rules.
 *
 * Rules of this module:
 * - NEVER import anything from 'firebase/firestore'.
 * - GET returns 404 when a document does not exist: that is null,
 *   not an error.
 * - PATCH creates a document when it does not exist (setDoc semantics).
 * - Every call has a 20-second AbortController timeout and throws a
 *   real error (with the HTTP status) instead of hanging silently.
 */

import { projectId, requireAuth } from './firebase';

const REST_TIMEOUT_MS = 20000;
const BASE = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

export type RestValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { timestampValue: string }
  | { nullValue: null }
  | { arrayValue: { values: RestValue[] } }
  | { mapValue: { fields: RestFields } };

export type RestFields = Record<string, RestValue>;

export type PlainValue = unknown;

/** Encode a plain JS value to a Firestore REST value. */
export function encodeValue(value: unknown): RestValue | null {
  if (value === undefined) return null;
  if (value === null) return { nullValue: null };
  if (typeof value === 'string') {
    // ISO timestamps are stored as timestampValue when the key looks
    // like a timestamp field; callers pass Date objects as ISO strings
    // via encodeFields below, so strings stay stringValue here.
    return { stringValue: value };
  }
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (typeof value === 'boolean') return { booleanValue: value };
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value
          .map(encodeValue)
          .filter((v): v is RestValue => v !== null),
      },
    };
  }
  if (typeof value !== 'object') return null;
  const fields: RestFields = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const encoded = encodeValue(v);
    if (encoded !== null) fields[k] = encoded;
  }
  return { mapValue: { fields } };
}

/** Encode a flat record, honouring *_at / *At timestamp keys. */
export function encodeFields(data: Record<string, unknown>): RestFields {
  const fields: RestFields = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (
      typeof value === 'string' &&
      (key === 'createdAt' ||
        key === 'updatedAt' ||
        key === 'completedAt' ||
        key === 'verificationDate' ||
        key === 'at')
    ) {
      fields[key] = { timestampValue: new Date(value).toISOString() };
    } else {
      const encoded = encodeValue(value);
      if (encoded !== null) fields[key] = encoded;
    }
  }
  return fields;
}

/** Decode a Firestore REST value back to a plain JS value. */
export function decodeValue(value: RestValue): unknown {
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('nullValue' in value) return null;
  if ('arrayValue' in value) {
    return (value.arrayValue.values || []).map(decodeValue);
  }
  if ('mapValue' in value) {
    return decodeFields(value.mapValue.fields || {});
  }
  return null;
}

export function decodeFields(fields: RestFields): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    out[key] = decodeValue(value);
  }
  return out;
}

async function idToken(): Promise<string | null> {
  const user = requireAuth().currentUser;
  if (!user) return null;
  return user.getIdToken();
}

async function restFetch(
  path: string,
  init: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REST_TIMEOUT_MS);
  try {
    return await fetch(`${BASE}/${path}`, { ...init, signal: controller.signal });
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new Error(
        `Firestore request timed out after ${REST_TIMEOUT_MS / 1000}s (${path}). Check your connection and try again.`
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function authHeaders(token: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/**
 * Read one document. Returns null when it does not exist (HTTP 404).
 * Pass requireAuth = false for public reads (e.g. psychiatristPublic).
 */
export async function restGet<T>(
  path: string,
  opts: { requireAuth?: boolean } = {}
): Promise<(T & { id: string }) | null> {
  const token = opts.requireAuth === false ? null : await idToken();
  const res = await restFetch(path, { headers: authHeaders(token) });
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Firestore read failed (HTTP ${res.status}) for ${path}. ${text}`.trim()
    );
  }
  const body = (await res.json()) as { fields?: RestFields; name?: string };
  const id = path.split('/').pop() || '';
  return { ...(decodeFields(body.fields || {}) as unknown as T), id };
}

/**
 * Create or replace one document (setDoc semantics). PATCH creates the
 * document when it does not exist.
 */
export async function restSet(path: string, data: object): Promise<void> {
  const token = await idToken();
  const res = await restFetch(path, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ fields: encodeFields(data as Record<string, unknown>) }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Firestore write failed (HTTP ${res.status}) for ${path}. ${text}`.trim()
    );
  }
}

/** Create a document with a server-generated id (collection POST). */
export async function restAdd(
  collectionPath: string,
  data: object
): Promise<string> {
  const token = await idToken();
  const res = await restFetch(collectionPath, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ fields: encodeFields(data as Record<string, unknown>) }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Firestore write failed (HTTP ${res.status}) for ${collectionPath}. ${text}`.trim()
    );
  }
  const body = (await res.json()) as { name?: string };
  return (body.name || '').split('/').pop() || '';
}

/** Delete one document. */
export async function restDelete(path: string): Promise<void> {
  const token = await idToken();
  const res = await restFetch(path, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Firestore delete failed (HTTP ${res.status}) for ${path}. ${text}`.trim()
    );
  }
}

/**
 * List documents in a collection (up to 100). Filtering is done by the
 * caller — collections in this app are small, and a server-side query
 * would need composite indexes. Returns decoded documents with ids.
 */
export async function restList<T>(
  collectionPath: string,
  opts: { requireAuth?: boolean } = {}
): Promise<Array<T & { id: string }>> {
  const token = opts.requireAuth === false ? null : await idToken();
  const res = await restFetch(`${collectionPath}?pageSize=100`, {
    headers: authHeaders(token),
  });
  if (res.status === 404) return [];
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Firestore list failed (HTTP ${res.status}) for ${collectionPath}. ${text}`.trim()
    );
  }
  const body = (await res.json()) as {
    documents?: Array<{ fields?: RestFields; name?: string }>;
  };
  return (body.documents || []).map((d) => {
    const id = (d.name || '').split('/').pop() || '';
    return { ...(decodeFields(d.fields || {}) as unknown as T), id };
  });
}

/**
 * Server-side filtered query (runQuery) — list only the documents
 * where one field equals one value.
 *
 * Why this exists: an unfiltered list asks Firestore for EVERY
 * document in the collection, so the security rules must allow the
 * caller to read every one of them. For owner-scoped collections
 * such as appointments (readable only by that appointment's patient,
 * provider or an admin) an unfiltered list is therefore denied with
 * 403 PERMISSION_DENIED even when the collection is empty — and the
 * page that lists them never loads. A filtered query only ever
 * returns documents the caller is allowed to read, so the same rules
 * allow it. A single-field equality filter needs no composite index.
 */
export async function restQuery<T>(
  collectionId: string,
  fieldPath: string,
  value: string
): Promise<Array<T & { id: string }>> {
  const token = await idToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${BASE}:runQuery`, {
      method: 'POST',
      headers: authHeaders(token),
      signal: controller.signal,
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId }],
          where: {
            fieldFilter: {
              field: { fieldPath },
              op: 'EQUAL',
              value: { stringValue: value },
            },
          },
        },
      }),
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new Error(
        `Firestore query timed out after ${REST_TIMEOUT_MS / 1000}s (${collectionId} where ${fieldPath} == ${value}). Check your connection and try again.`
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Firestore query failed (HTTP ${res.status}) for ${collectionId} where ${fieldPath} == ${value}. ${text}`.trim()
    );
  }
  const body = (await res.json()) as Array<{
    document?: { fields?: RestFields; name?: string };
  }>;
  return (body || [])
    .filter((entry) => entry.document)
    .map((entry) => {
      const d = entry.document!;
      const id = (d.name || '').split('/').pop() || '';
      return { ...(decodeFields(d.fields || {}) as unknown as T), id };
    });
}
