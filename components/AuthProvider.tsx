"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { authStateReducer, initialAuthState, type AuthUser } from '@/services/auth/state';
import { backendRequest, getBackendBaseUrl, logBackendDebugOnce } from '@/services/backend/client';

type AuthContextValue = {
  user: AuthUser | null;
  csrfToken: string | null;
  loading: boolean;
  login: (email: string, password: string, callbackPath?: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const backendNotConfiguredMessage = 'backend url is not configured';

const isAuthRequiredError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes('authentication is required') || message.includes('unauthorized');
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(authStateReducer, initialAuthState);
  const didRefreshOnMountRef = useRef(false);

  const refreshMe = useCallback(async () => {
    if (!getBackendBaseUrl()) {
      dispatch({ type: 'clear-session' });
      return;
    }

    try {
      const payload = await backendRequest<{ user: AuthUser; csrfToken: string }>({
        path: '/api/auth/me',
      });
      dispatch({
        type: 'set-session',
        user: payload.user,
        csrfToken: payload.csrfToken,
      });
    } catch (error) {
      if (!isAuthRequiredError(error)) {
        logBackendDebugOnce('auth.refresh failed', {
          message: error instanceof Error ? error.message : 'unknown error',
        });
      }
      dispatch({ type: 'clear-session' });
    }
  }, []);

  useEffect(() => {
    if (didRefreshOnMountRef.current) {
      return;
    }

    // this guard keeps strict mode from issuing duplicate bootstrap calls
    didRefreshOnMountRef.current = true;
    void refreshMe();
  }, [refreshMe]);

  const login = useCallback(async (email: string, password: string, callbackPath?: string) => {
    if (!getBackendBaseUrl()) {
      throw new Error(backendNotConfiguredMessage);
    }

    const payload = await backendRequest<{
      user?: AuthUser;
      csrfToken?: string;
    }>({
      path: '/api/auth/login',
      method: 'POST',
      body: { email, password, callbackPath },
    });

    if (!payload.user || !payload.csrfToken) {
      throw new Error('Не удалось выполнить вход.');
    }

    dispatch({
      type: 'set-session',
      user: payload.user,
      csrfToken: payload.csrfToken,
    });
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    if (!getBackendBaseUrl()) {
      throw new Error(backendNotConfiguredMessage);
    }

    const payload = await backendRequest<{ user: AuthUser; csrfToken: string }>({
      path: '/api/auth/register',
      method: 'POST',
      body: { name, email, password },
    });

    dispatch({
      type: 'set-session',
      user: payload.user,
      csrfToken: payload.csrfToken,
    });
  }, []);

  const logout = useCallback(async () => {
    if (!getBackendBaseUrl()) {
      dispatch({ type: 'clear-session' });
      return;
    }

    try {
      // csrf is required for mutating session endpoints that rely on cookies
      await backendRequest<{ ok: true }>({
        path: '/api/auth/logout',
        method: 'POST',
        csrfToken: state.csrfToken,
        body: {},
      });
    } catch (error) {
      dispatch({ type: 'clear-session' });
      throw error;
    }

    dispatch({ type: 'clear-session' });
  }, [state.csrfToken]);

  const value = useMemo<AuthContextValue>(() => ({
    user: state.user,
    csrfToken: state.csrfToken,
    loading: state.loading,
    login,
    register,
    logout,
    refreshMe,
  }), [login, logout, refreshMe, register, state.csrfToken, state.loading, state.user]);

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
