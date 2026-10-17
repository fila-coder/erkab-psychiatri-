import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { UserRole, AppUser } from '../types';
import {
  getRepositories,
  resetRepositoryCache,
  getDataMode,
} from '../repositories';
import { getSessionUid, setSessionUid } from '../repositories/localStore';
import { isFirebaseConfigured, auth as firebaseAuth } from '../lib/firebase';

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
  mode: 'local' | 'firebase';
  configError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
    role: 'PATIENT' | 'PSYCHIATRIST'
  ) => Promise<void>;
  signOut: () => Promise<void>;
  resetDemoData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function toAuthUser(u: AppUser): AuthUser {
  return {
    uid: u.uid,
    email: u.email,
    displayName: u.displayName,
    role: u.role,
    timezone: u.timezone,
  };
}

/**
 * Spark-compatible role resolution:
 * Role comes from Firestore users/{uid}.role only.
 * ADMIN is set by the project owner in Firebase Console (rules block client writes to role).
 * Custom claims are NOT required and are ignored for authorization UI.
 */
function roleFromProfile(profile: AppUser | null): UserRole {
  if (!profile) return 'PATIENT';
  if (profile.role === 'ADMIN') return 'ADMIN';
  if (profile.role === 'PSYCHIATRIST') return 'PSYCHIATRIST';
  return 'PATIENT';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const requestedMode = getDataMode();

  useEffect(() => {
    let cancelled = false;
    let unsub: (() => void) | undefined;

    (async () => {
      try {
        if (requestedMode === 'firebase') {
          if (!isFirebaseConfigured || !firebaseAuth) {
            throw new Error(
              'VITE_DATA_MODE=firebase but Firebase is not configured. Set all VITE_FIREBASE_* values, or use VITE_DATA_MODE=local.'
            );
          }
          getRepositories();

          const { onAuthStateChanged } = await import('firebase/auth');
          unsub = onAuthStateChanged(firebaseAuth, async (fbUser) => {
            if (cancelled) return;
            if (!fbUser) {
              setUser(null);
              setLoading(false);
              return;
            }
            try {
              const profile = await getRepositories().users.getById(fbUser.uid);
              const role = roleFromProfile(profile);
              setUser({
                uid: fbUser.uid,
                email: fbUser.email || profile?.email || '',
                displayName:
                  fbUser.displayName || profile?.displayName || fbUser.email || '',
                role,
                timezone:
                  profile?.timezone ||
                  Intl.DateTimeFormat().resolvedOptions().timeZone,
              });
            } catch (e) {
              setConfigError(e instanceof Error ? e.message : 'Auth profile error');
              setUser(null);
            }
            setLoading(false);
          });
          return;
        }

        // Local mode
        const repo = getRepositories();
        if (repo.mode !== 'local') {
          throw new Error('Expected local repository in local mode.');
        }
        const uid = getSessionUid();
        if (uid) {
          const u = await repo.users.getById(uid);
          if (!cancelled && u && u.status === 'active') {
            setUser(toAuthUser(u));
          }
        }
        if (!cancelled) setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setConfigError(err instanceof Error ? err.message : 'Configuration error');
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [requestedMode]);

  const signIn = useCallback(async (email: string, password: string) => {
    const mode = getDataMode();
    if (mode === 'firebase') {
      if (!isFirebaseConfigured || !firebaseAuth) {
        throw new Error('Firebase Auth is not configured.');
      }
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
      return;
    }
    const repo = getRepositories();
    const u = await repo.users.verifyPassword(email.trim(), password);
    if (!u) throw new Error('Invalid email or password.');
    if (u.status !== 'active') throw new Error('This account is suspended.');
    setSessionUid(u.uid);
    setUser(toAuthUser(u));
  }, []);

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      displayName: string,
      role: 'PATIENT' | 'PSYCHIATRIST'
    ) => {
      if (role !== 'PATIENT' && role !== 'PSYCHIATRIST') {
        throw new Error('Invalid registration role.');
      }
      const mode = getDataMode();
      const t = new Date().toISOString();

      if (mode === 'firebase') {
        if (!isFirebaseConfigured || !firebaseAuth) {
          throw new Error('Firebase Auth is not configured.');
        }
        const { createUserWithEmailAndPassword, updateProfile } = await import(
          'firebase/auth'
        );
        const cred = await createUserWithEmailAndPassword(
          firebaseAuth,
          email.trim(),
          password
        );
        try {
          await updateProfile(cred.user, { displayName: displayName.trim() });
          const repo = getRepositories();
          const u: AppUser = {
            uid: cred.user.uid,
            email: email.trim().toLowerCase(),
            displayName: displayName.trim(),
            role,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            status: 'active',
            createdAt: t,
            updatedAt: t,
          };
          await repo.users.create(u, password);
          if (role === 'PATIENT') {
            await repo.patients.upsert({ uid: u.uid, jurisdiction: '', updatedAt: t });
          } else {
            await repo.psychiatrists.upsert({
              uid: u.uid,
              status: 'DRAFT',
              professionalName: displayName.trim(),
              bio: '',
              specialties: [],
              languages: [],
              jurisdictions: [],
              sessionDurationMin: 50,
              price: { amount: 0, currency: 'USD' },
              trustPassport: {
                identity: { status: 'pending' },
                licence: { status: 'pending' },
                qualification: { status: 'pending' },
                interview: { status: 'pending' },
                overall: 'unverified',
              },
              cancellationPolicy: '',
              updatedAt: t,
            });
          }
        } catch (profileErr) {
          try {
            await cred.user.delete();
          } catch {
            /* best-effort */
          }
          throw new Error(
            'Account profile could not be created. Please try again. ' +
              (profileErr instanceof Error ? profileErr.message : '')
          );
        }
        return;
      }

      const repo = getRepositories();
      const uid = `user-${Date.now()}`;
      const u: AppUser = {
        uid,
        email: email.trim().toLowerCase(),
        displayName: displayName.trim(),
        role,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        status: 'active',
        createdAt: t,
        updatedAt: t,
      };
      await repo.users.create(u, password);
      if (role === 'PATIENT') {
        await repo.patients.upsert({ uid, jurisdiction: '', updatedAt: t });
      } else {
        await repo.psychiatrists.upsert({
          uid,
          status: 'DRAFT',
          professionalName: displayName.trim(),
          bio: '',
          specialties: [],
          languages: [],
          jurisdictions: [],
          sessionDurationMin: 50,
          price: { amount: 0, currency: 'USD' },
          trustPassport: {
            identity: { status: 'pending' },
            licence: { status: 'pending' },
            qualification: { status: 'pending' },
            interview: { status: 'pending' },
            overall: 'unverified',
          },
          cancellationPolicy: '',
          updatedAt: t,
        });
      }
      setSessionUid(uid);
      setUser(toAuthUser(u));
    },
    []
  );

  const signOut = useCallback(async () => {
    if (getDataMode() === 'firebase' && firebaseAuth) {
      const { signOut: fbSignOut } = await import('firebase/auth');
      await fbSignOut(firebaseAuth);
    }
    setSessionUid(null);
    setUser(null);
  }, []);

  const resetDemoData = useCallback(async () => {
    if (getDataMode() !== 'local') {
      throw new Error('resetDemoData is only available in local development mode.');
    }
    const repo = getRepositories();
    if (repo.resetDemoData) await repo.resetDemoData();
    resetRepositoryCache();
    setSessionUid(null);
    setUser(null);
  }, []);

  const mode: 'local' | 'firebase' =
    requestedMode === 'firebase' && !configError ? 'firebase' : 'local';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        mode: configError && requestedMode === 'firebase' ? 'firebase' : mode,
        configError,
        signIn,
        signUp,
        signOut,
        resetDemoData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
