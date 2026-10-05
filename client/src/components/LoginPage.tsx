import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const { user, login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'login') await login(email, password);
      else await register(name, email, password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h1>{mode === 'login' ? 'Log in' : 'Create account'}</h1>

      {mode === 'register' && (
        <label>
          Name
          <input value={name} maxLength={30} minLength={2} required onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </label>
      )}
      <label>
        Email
        <input type="email" value={email} maxLength={254} required onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </label>
      <label>
        Password
        <input
          type="password"
          value={password}
          minLength={mode === 'register' ? 8 : undefined}
          maxLength={72}
          required
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />
      </label>
      {mode === 'register' && <p className="muted">At least 8 characters.</p>}

      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={busy}>
        {busy ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Sign up'}
      </button>

      <p className="muted">
        {mode === 'login' ? 'New here? ' : 'Already have an account? '}
        <button type="button" className="link-button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Create an account' : 'Log in'}
        </button>
      </p>
    </form>
  );
}

export default LoginPage;
