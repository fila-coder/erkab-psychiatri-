/**
 * Firebase initialisation — Auth SDK only.
 *
 * There is deliberately NO Firestore client SDK here: no
 * initializeFirestore, no getFirestore, no import from
 * 'firebase/firestore' anywhere in this app. The Firestore client SDK
 * hangs for 15+ seconds on every call on real phones in this
 * deployment, while Firebase Auth works fine. All Firestore access
 * goes through the plain REST API instead (see firestoreRest.ts),
 * which uses the same plain HTTPS transport as Auth.
 */
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  messagingSenderId: import.meta.env
    .VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

export const isFirebaseConfigured = Boolean(
  config.apiKey && config.projectId && config.appId
);

export const projectId: string = config.projectId || '';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

if (isFirebaseConfigured) {
  app = getApps().length ? getApps()[0]! : initializeApp(config);
  auth = getAuth(app);
}

export { app, auth };

export function requireAuth(): Auth {
  if (!auth) {
    throw new Error(
      'Firebase Auth is not configured. Set the VITE_FIREBASE_* env vars.'
    );
  }
  return auth;
}
