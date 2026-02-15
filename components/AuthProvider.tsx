"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: 'READER' | 'AUTHOR' | 'ADMIN';
};

type AuthContextValue = {
  user: AuthUser | null;
  csrfToken: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000';

const parseErrorMessage = async (response: Response) => {
  const fallback = `request failed with status ${response.status}`;
  try {
    const payload = (await response.json()) as { message?: string };
    return payload.message ?? fallback;
  } catch {
    return fallback;
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    const response = await fetch(`${backendBaseUrl}/api/auth/me`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      setUser(null);
      setCsrfToken(null);
      return;
    }

    const payload = (await response.json()) as { user: AuthUser; csrfToken: string };
    setUser(payload.user);
    setCsrfToken(payload.csrfToken);
  }, []);

  useEffect(() => {
    // this bootstraps auth state once so header and protected pages share one source
    const run = async () => {
      try {
        await refreshMe();
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [refreshMe]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await fetch(`${backendBaseUrl}/api/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error(await parseErrorMessage(response));
    }

    const payload = (await response.json()) as { user: AuthUser; csrfToken: string };
    setUser(payload.user);
    setCsrfToken(payload.csrfToken);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const response = await fetch(`${backendBaseUrl}/api/auth/register`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ name, email, password }),
    });

    if (!response.ok) {
      throw new Error(await parseErrorMessage(response));
    }

    const payload = (await response.json()) as { user: AuthUser; csrfToken: string };
    setUser(payload.user);
    setCsrfToken(payload.csrfToken);
  }, []);

  const logout = useCallback(async () => {
    // csrf is required for mutating session endpoints that rely on cookies
    const response = await fetch(`${backendBaseUrl}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
        ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error(await parseErrorMessage(response));
    }

    setUser(null);
    setCsrfToken(null);
  }, [csrfToken]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    csrfToken,
    loading,
    login,
    register,
    logout,
    refreshMe,
  }), [csrfToken, loading, login, logout, refreshMe, register, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export type { AuthUser };
