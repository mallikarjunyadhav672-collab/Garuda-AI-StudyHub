import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, storage } from './api';

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: 'user' | 'admin' | 'superadmin';
  examTarget?: string;
  isVerified: boolean;
  isPremium: boolean;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: { name: string; email: string; password: string; phone?: string; examTarget?: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (u: User) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(storage.getUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Validate the stored session on load
    const boot = async () => {
      if (storage.getAccess()) {
        try {
          // Wait until api base URL is determined (probes might run at startup)
          // apiReady resolves quickly if base is already known.
          try { await (api as any).apiReady || (api as any).apiReady; } catch {};
          const { data } = await api.get('/auth/me');
          setUser(data.data.user);
          storage.setSession(data.data.user, storage.getAccess()!, storage.getRefresh()!);
        } catch (err) {
          console.debug('[auth] boot failed', err);
          storage.clear();
          setUser(null);
        }
      }
      setLoading(false);
    };
    boot();
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    storage.setSession(data.data.user, data.data.accessToken, data.data.refreshToken);
    setUser(data.data.user);
    return data.data.user;
  };

  const register = async (payload: { name: string; email: string; password: string; phone?: string; examTarget?: string }) => {
    await api.post('/auth/register', payload);
    setUser(null);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout', { refreshToken: storage.getRefresh() });
    } catch {
      /* ignore */
    }
    storage.clear();
    setUser(null);
  };

  const updateUser = (u: User) => {
    setUser(u);
    const access = storage.getAccess();
    const refresh = storage.getRefresh();
    if (access && refresh) storage.setSession(u, access, refresh);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
