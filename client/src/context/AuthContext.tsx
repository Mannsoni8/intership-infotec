import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { api, getToken, setToken } from '../api';
import { AuthUser } from '../types';

interface AuthValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(getToken() !== null);

  // if there is a saved token, check that it is still valid
  useEffect(() => {
    if (!getToken()) return;
    api
      .me()
      .then((res) => setUser(res.user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  // the api tells us when the token expired
  useEffect(() => {
    window.addEventListener('syncdoc-auth-expired', logout);
    return () => window.removeEventListener('syncdoc-auth-expired', logout);
  }, [logout]);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      loading,
      logout,
      login: async (email, password) => {
        const res = await api.login(email, password);
        setToken(res.token);
        setUser(res.user);
      },
      register: async (name, email, password) => {
        const res = await api.register(name, email, password);
        setToken(res.token);
        setUser(res.user);
      },
    }),
    [user, loading, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
