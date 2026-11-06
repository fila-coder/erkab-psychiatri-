import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './lib/auth';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HomePage } from './pages/Home';
import { FindPage } from './pages/Find';
import { SignInPage } from './pages/SignIn';
import { SignUpPage } from './pages/SignUp';
import { PatientPage } from './pages/Patient';
import { ProviderPage } from './pages/Provider';
import { AdminPage } from './pages/Admin';
import { AboutPage } from './pages/About';
import { FaqPage } from './pages/Faq';
import { TermsPage } from './pages/Terms';
import { PrivacyPage } from './pages/Privacy';
import { CancellationPage } from './pages/Cancellation';
import { EmergencyPage } from './pages/Emergency';
import { ContactPage } from './pages/Contact';
import { NotFoundPage } from './pages/NotFound';

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <main className="page container"><p>Loading…</p></main>;
  if (!user) return <Navigate to="/auth/sign-in" replace />;
  return <>{children}</>;
}

function RequireRole({
  roles,
  children,
}: {
  roles: Array<'PATIENT' | 'PSYCHIATRIST' | 'ADMIN'>;
  children: ReactNode;
}) {
  const { user, loading } = useAuth();
  if (loading) return <main className="page container"><p>Loading…</p></main>;
  if (!user) return <Navigate to="/auth/sign-in" replace />;
  if (!roles.includes(user.role)) {
    return (
      <main className="page container">
        <div className="card">
          <h1>Not available for your account</h1>
          <p>
            This page is for {roles.join(' or ')} accounts. Your account is
            a {user.role} account.
          </p>
        </div>
      </main>
    );
  }
  return <>{children}</>;
}

function AccountRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <main className="page container"><p>Loading…</p></main>;
  if (!user) return <Navigate to="/auth/sign-in" replace />;
  const to =
    user.role === 'PSYCHIATRIST'
      ? '/provider'
      : user.role === 'ADMIN'
        ? '/admin'
        : '/patient';
  return <Navigate to={to} replace />;
}

export default function App() {
  const { configError } = useAuth();
  return (
    <>
      <Header />
      {configError && (
        <div className="container" style={{ marginTop: 16 }}>
          <p className="error" role="alert">
            {configError}
          </p>
        </div>
      )}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/find" element={<FindPage />} />
        <Route path="/auth/sign-in" element={<SignInPage />} />
        <Route path="/auth/sign-up" element={<SignUpPage />} />
        <Route
          path="/patient"
          element={
            <RequireRole roles={['PATIENT']}>
              <PatientPage />
            </RequireRole>
          }
        />
        <Route
          path="/provider"
          element={
            <RequireRole roles={['PSYCHIATRIST']}>
              <ProviderPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireRole roles={['ADMIN']}>
              <AdminPage />
            </RequireRole>
          }
        />
        <Route
          path="/account"
          element={
            <RequireAuth>
              <AccountRedirect />
            </RequireAuth>
          }
        />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route
          path="/cancellation-policy"
          element={<CancellationPage />}
        />
        <Route path="/emergency" element={<EmergencyPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Footer />
    </>
  );
}
