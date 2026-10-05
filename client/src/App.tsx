import { ReactNode } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import DocumentList from './components/DocumentList';
import EditorPage from './components/EditorPage';
import LoginPage from './components/LoginPage';
import { useAuth } from './context/AuthContext';

// pages that need a login
function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <p>Loading...</p>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  const { user, logout } = useAuth();

  return (
    <div className="app">
      <header className="navbar">
        <Link to="/" className="logo">
          SyncDoc
        </Link>
        {user && (
          <div className="user-box">
            <span className="dot" style={{ background: user.color }} />
            <span>{user.name}</span>
            <button type="button" className="secondary small" onClick={logout}>
              Log out
            </button>
          </div>
        )}
      </header>

      <main className="content">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <Protected>
                <DocumentList />
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
      </main>
    </div>
  );
}

export default App;
