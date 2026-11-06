/**
 * Auth — Firebase Auth SDK + Firestore REST for the profile document.
 *
 * The role lives ONLY in users/{uid} in Firestore. It is never guessed.
 * - Sign-up writes the profile FIRST (REST, no read before the write),
 *   then reads it back to verify; if the verification read fails, the
 *   write is trusted and sign-up proceeds anyway.
 * - Sign-in reads the profile (REST). If it is missing and a role was
 *   saved at sign-up for this uid, the doc is repaired with that known
 *   role. If there is no doc and no known role, sign-in shows a clear
 *   on-screen error and does NOT create a PATIENT doc.
 * - Errors are never swallowed: every failure throws a real Error with
 *   its message, and pages display it on screen.
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  type User as FbUser,
} from 'firebase/auth';
import { isFirebaseConfigured, requireAuth } from './firebase';
import { restGet, restSet } from './firestoreRest';
import type { AppUser, UserRole } from './types';

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  timezone: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  configError: string | null;
  signUp: (
    email: string,
    password: string,
    displayName: string,
    role: 'PATIENT' | 'PSYCHIATRIST'
  ) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function toAuthUser(profile: AppUser): AuthUser {
  return {
    uid: profile.uid,
    email: profile.email,
    displayName: profile.displayName,
    role: profile.role,
    timezone: profile.timezone,
  };
}

function pendingRoleKey(uid: string): string {
  return `erkab-pending-role:${uid}`;
}

function savePendingRole(uid: string, role: UserRole): void {
  try {
    localStorage.setItem(pendingRoleKey(uid), role);
  } catch {
    /* storage unavailable — repair will not be possible */
  }
}

function getPendingRole(uid: string): UserRole | null {
  try {
    const r = localStorage.getItem(pendingRoleKey(uid));
    return r === 'PSYCHIATRIST' || r === 'PATIENT' || r === 'ADMIN'
      ? r
      : null;
  } catch {
    return null;
  }
}

function clearPendingRole(uid: string): void {
  try {
    localStorage.removeItem(pendingRoleKey(uid));
  } catch {
    /* ignore */
  }
}

async function writeProfile(
  uid: string,
  email: string,
  displayName: string,
  role: UserRole
): Promise<AppUser> {
  const t = new Date().toISOString();
  const profile: AppUser = {
    uid,
    email: email.toLowerCase(),
    displayName: displayName || email || 'User',
    role,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    status: 'active',
    createdAt: t,
    updatedAt: t,
  };
  // WRITE FIRST — no read before this write, ever.
  await restSet(`users/${uid}`, profile as unknown as Record<string, unknown>);
  return profile;
}

/** Read users/{uid} via REST. Null only when the doc really does not exist. */
async function fetchProfile(uid: string): Promise<AppUser | null> {
  const doc = await restGet<AppUser>(`users/${uid}`);
  if (!doc) return null;
  const { id: _id, ...rest } = doc;
  void _id;
  return rest as AppUser;
}

export function friendlyAuthError(err: unknown): string {
  const e = err as { code?: string; message?: string };
  const code = e?.code || '';
  if (code === 'auth/email-already-in-use')
    return 'An account with this email already exists. Try signing in instead.';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password')
    return 'Email or password is incorrect. Try again or reset your password.';
  if (code === 'auth/user-not-found')
    return 'No account exists for this email. Please sign up first.';
  if (code === 'auth/weak-password')
    return 'Password is too weak. Use at least 8 characters.';
  if (code === 'auth/invalid-email')
    return 'That email address does not look valid.';
  if (code === 'auth/too-many-requests')
    return 'Too many attempts. Please wait a few minutes and try again.';
  if (code === 'auth/network-request-failed')
    return 'Network error. Check your connection and try again.';
  return e?.message || 'Something went wrong. Please try again.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setConfigError(
        'Firebase is not configured. Set the VITE_FIREBASE_* env vars.'
      );
      setLoading(false);
      return;
    }
    const auth = requireAuth();
    const unsub = onAuthStateChanged(auth, (fbUser: FbUser | null) => {
      if (!fbUser) {
        setUser(null);
        setLoading(false);
        return;
      }
      void (async () => {
        try {
          const profile = await fetchProfile(fbUser.uid);
          if (profile) {
            clearPendingRole(fbUser.uid);
            setUser(toAuthUser(profile));
            setLoading(false);
            return;
          }
          const pending = getPendingRole(fbUser.uid);
          if (pending) {
            const repaired = await writeProfile(
              fbUser.uid,
              fbUser.email || '',
              fbUser.displayName || '',
              pending
            );
            clearPendingRole(fbUser.uid);
            setUser(toAuthUser(repaired));
            setLoading(false);
            return;
          }
          // Doc missing and no known role: stay signed out of the app
          // (Auth session remains, but there is no profile to route by).
          // Pages show the "profile not found" error on sign-in.
          setUser(null);
          setLoading(false);
        } catch (err) {
          // A hanging/failed read must not silently sign the user in
          // with a guessed role, and must not sign them out either:
          // keep the failure visible by leaving loading off and user
          // null; the sign-in page will show the stored error.
          try {
            localStorage.setItem(
              'erkab-last-auth-error',
              JSON.stringify({
                step: 'onAuthStateChanged profile load',
                code: (err as { code?: string }).code || '(no code)',
                message: err instanceof Error ? err.message : String(err),
                at: new Date().toISOString(),
              })
            );
          } catch {
            /* ignore */
          }
          setUser(null);
          setLoading(false);
        }
      })();
    });
    return () => unsub();
  }, []);

  const refreshProfile = useCallback(async () => {
    const fb = requireAuth().currentUser;
    if (!fb) return;
    const profile = await fetchProfile(fb.uid);
    if (profile) setUser(toAuthUser(profile));
  }, []);

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      displayName: string,
      role: 'PATIENT' | 'PSYCHIATRIST'
    ) => {
      const auth = requireAuth();
      let cred;
      try {
        cred = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );
      } catch (e) {
        throw new Error(friendlyAuthError(e));
      }
      // Remember the chosen role under this uid BEFORE any profile
      // work, so a later sign-in can repair the doc if needed.
      savePendingRole(cred.user.uid, role);
      try {
        await updateProfile(cred.user, { displayName: displayName.trim() });
      } catch {
        /* non-fatal */
      }
      // WRITE FIRST, then verify. If the verification read fails, the
      // write is trusted and sign-up proceeds anyway.
      let profile: AppUser;
      try {
        profile = await writeProfile(
          cred.user.uid,
          email.trim(),
          displayName.trim(),
          role
        );
      } catch (err) {
        throw new Error(
          'Account could not be created: the profile could not be saved. ' +
            (err instanceof Error ? `(${err.message})` : '')
        );
      }
      try {
        const verified = await fetchProfile(cred.user.uid);
        if (verified) profile = verified;
      } catch {
        /* verification read failed — trust the write */
      }
      clearPendingRole(cred.user.uid);
      setUser(toAuthUser(profile));
      setLoading(false);
    },
    []
  );

  const signIn = useCallback(async (email: string, password: string) => {
    const auth = requireAuth();
    let cred;
    try {
      cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e) {
      throw new Error(friendlyAuthError(e));
    }
    let profile: AppUser | null = null;
    try {
      profile = await fetchProfile(cred.user.uid);
    } catch (err) {
      throw new Error(
        'Sign-in failed: the profile could not be loaded. ' +
          (err instanceof Error ? `(${err.message})` : '')
      );
    }
    if (!profile) {
      const pending = getPendingRole(cred.user.uid);
      if (pending) {
        try {
          profile = await writeProfile(
            cred.user.uid,
            cred.user.email || '',
            cred.user.displayName || '',
            pending
          );
          clearPendingRole(cred.user.uid);
        } catch (err) {
          throw new Error(
            'Sign-in failed: the profile could not be created. ' +
              (err instanceof Error ? `(${err.message})` : '')
          );
        }
      } else {
        throw new Error(
          'Your profile was not found — please sign up again or contact support.'
        );
      }
    }
    setUser(toAuthUser(profile));
    setLoading(false);
  }, []);

  const signOut = useCallback(async () => {
    await fbSignOut(requireAuth());
    setUser(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(requireAuth(), email.trim());
    } catch (e) {
      throw new Error(friendlyAuthError(e));
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        configError,
        signUp,
        signIn,
        signOut,
        resetPassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
