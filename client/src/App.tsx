import { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { DocumentsPage } from './pages/DocumentsPage';
import EditorPage from './components/EditorPage';
import { AuthPage } from './pages/AuthPage';
import { useAuth } from './context/AuthContext';

// Protected route wrapper
function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: 'var(--canvas)',
          color: 'var(--ink-secondary)',
          fontSize: '14px',
        }}
      >
        Loading workspace...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// Unauthenticated route wrapper (redirects to dashboard if already logged in)
function PublicOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnly>
            <AuthPage />
          </PublicOnly>
        }
      />
      <Route
        path="/"
        element={
          <Protected>
            <DocumentsPage />
          </Protected>
        }
      />
      <Route
        path="/doc/:id"
        element={
          <Protected>
            <EditorPage />
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
