import React, { useState } from 'react';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import './AuthPage.css';

export const AuthPage: React.FC = () => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await register(name.trim(), email.trim(), password);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card animate-fade-in">
        <div className="auth-header">
          <div className="auth-logo-badge">
            <span className="auth-logo-text">S</span>
          </div>
          <h1 className="auth-title">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="auth-subtitle">
            {mode === 'login'
              ? 'Enter your credentials to access your document workspace.'
              : 'Collaborate in real-time with your team on living documents.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form-body">
          {mode === 'register' && (
            <Input
              label="Full Name"
              type="text"
              placeholder="Alex Morgan"
              value={name}
              minLength={2}
              maxLength={30}
              required
              autoComplete="name"
              onChange={(e) => setName(e.target.value)}
            />
          )}

          <Input
            label="Email Address"
            type="email"
            placeholder="name@company.com"
            value={email}
            maxLength={254}
            required
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
          />

          <div className="password-input-group">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              minLength={mode === 'register' ? 8 : undefined}
              maxLength={72}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="toggle-password-btn"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {mode === 'register' && (
            <p className="auth-hint">Password must contain at least 8 characters.</p>
          )}

          {error && <div className="auth-error-banner">{error}</div>}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={busy}
            icon={<ArrowRight size={18} />}
            className="auth-submit-btn"
          >
            {busy ? 'Processing...' : mode === 'login' ? 'Sign in to workspace' : 'Create workspace account'}
          </Button>
        </form>

        <div className="auth-footer">
          <p className="auth-footer-text">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
            <button
              type="button"
              className="auth-switch-link"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError('');
              }}
            >
              {mode === 'login' ? 'Create one now' : 'Sign in instead'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
