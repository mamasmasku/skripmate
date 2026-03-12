import { useState, useCallback } from 'react';

const TOKEN_KEY = 'sm_token';
const USER_KEY  = 'sm_user';

export interface AuthUser {
  id:       string;
  username: string;
  role:     'free' | 'pro' | 'admin';
  credits:  number;
}

function readStorage<T>(key: string): T | null {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; }
  catch { return null; }
}

export function useAuth() {
  const [user,  setUser]  = useState<AuthUser | null>(() => readStorage<AuthUser>(USER_KEY));
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const login = useCallback(async (username: string, password: string) => {
    setIsLoading(true);
    setLoginError('');
    try {
      const res  = await fetch('/api/auth', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'login', username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Login gagal');

      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY,  JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      window.location.reload(); 
      return true;
    } catch (e: any) {
      setLoginError(e.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    window.location.reload();
  }, []);

  /** Update kredit di state + localStorage (setelah generate / beli kredit) */
  const updateCredits = useCallback((credits: number) => {
    setUser(prev => {
      if (!prev) return prev;
      const next = { ...prev, credits };
      localStorage.setItem(USER_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  /** Upgrade role di state (setelah beli kredit) */
  const upgradeRole = useCallback((role: 'pro' | 'admin') => {
    setUser(prev => {
      if (!prev) return prev;
      const next = { ...prev, role };
      localStorage.setItem(USER_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  /** Refresh data user dari server */
  const refreshUser = useCallback(async () => {
    const t = localStorage.getItem(TOKEN_KEY);
    if (!t) return;
    try {
      const res = await fetch('/api/auth', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${t}` },
        body:    JSON.stringify({ action: 'me' }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        setUser(data.user);
      } else {
        // Token expired atau tidak valid
        logout();
      }
    } catch {}
  }, [logout]);

  return { user, token, isLoading, loginError, login, logout, updateCredits, upgradeRole, refreshUser };
}
