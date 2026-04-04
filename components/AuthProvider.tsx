"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { authStateReducer, initialAuthState, type AuthUser } from '@/services/auth/state';
import { backendRequest, getBackendBaseUrl, logBackendDebugOnce } from '@/services/backend/client';

export type AuthTwoFactorPurpose = 'login_2fa' | 'link_google';

export type AuthTwoFactorChallenge = {
  purpose: AuthTwoFactorPurpose;
  expiresAt: string;
  resendAvailableAt: string;
  emailHint: string;
  debugCode?: string;
};

export type AuthLoginResult =
  | {
    status: 'authenticated';
  }
  | {
    status: 'two-factor-required';
    challenge: AuthTwoFactorChallenge;
  };

export type AuthTwoFactorStatus =
  | {
    required: false;
  }
  | {
    required: true;
    purpose: AuthTwoFactorPurpose;
    expiresAt: string;
    resendAvailableAt: string;
    emailHint: string;
  };

type AuthContextValue = {
  user: AuthUser | null;
  csrfToken: string | null;
  loading: boolean;
  login: (email: string, password: string, callbackPath?: string) => Promise<AuthLoginResult>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  startGoogleSignIn: (callbackPath?: string) => Promise<void>;
  getLoginTwoFactorStatus: () => Promise<AuthTwoFactorStatus>;
  sendLoginTwoFactorCode: () => Promise<AuthTwoFactorChallenge>;
  verifyLoginTwoFactorCode: (code: string) => Promise<void>;
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

  const setSessionFromPayload = useCallback((payload: {
    user?: AuthUser;
    csrfToken?: string;
  }) => {
    if (!payload.user || !payload.csrfToken) {
      throw new Error('Не удалось выполнить вход.');
    }

    dispatch({
      type: 'set-session',
      user: payload.user,
      csrfToken: payload.csrfToken,
    });
  }, []);

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

  const login = useCallback(async (email: string, password: string, callbackPath?: string): Promise<AuthLoginResult> => {
    if (!getBackendBaseUrl()) {
      throw new Error(backendNotConfiguredMessage);
    }

    const payload = await backendRequest<{
      user?: AuthUser;
      csrfToken?: string;
      requiresTwoFactor?: boolean;
      twoFactor?: AuthTwoFactorChallenge;
    }>({
      path: '/api/auth/login',
      method: 'POST',
      body: { email, password, callbackPath },
    });

    if (payload.requiresTwoFactor) {
      if (!payload.twoFactor) {
        throw new Error('Не удалось получить параметры двухфакторной проверки.');
      }

      return {
        status: 'two-factor-required',
        challenge: payload.twoFactor,
      };
    }

    setSessionFromPayload(payload);
    return {
      status: 'authenticated',
    };
  }, [setSessionFromPayload]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    if (!getBackendBaseUrl()) {
      throw new Error(backendNotConfiguredMessage);
    }

    const payload = await backendRequest<{
      user?: AuthUser;
      csrfToken?: string;
    }>({
      path: '/api/auth/register',
      method: 'POST',
      body: { name, email, password },
    });

    setSessionFromPayload(payload);
  }, [setSessionFromPayload]);

  const startGoogleSignIn = useCallback(async (callbackPath?: string) => {
    if (!getBackendBaseUrl()) {
      throw new Error(backendNotConfiguredMessage);
    }

    const payload = await backendRequest<{
      url?: string;
    }>({
      path: '/api/auth/google/start',
      method: 'POST',
      body: { callbackPath },
    });

    if (!payload.url) {
      throw new Error('Не удалось запустить вход через Google.');
    }

    let googleAuthUrl: URL;
    try {
      googleAuthUrl = new URL(payload.url);
    } catch {
      throw new Error('Сервис вернул некорректный URL авторизации.');
    }

    if (googleAuthUrl.protocol !== 'https:' || googleAuthUrl.host !== 'accounts.google.com') {
      throw new Error('Сервис вернул недоверенный URL авторизации.');
    }

    window.location.assign(googleAuthUrl.toString());
  }, []);

  const getLoginTwoFactorStatus = useCallback(async (): Promise<AuthTwoFactorStatus> => {
    const payload = await backendRequest<{
      required: boolean;
      purpose?: AuthTwoFactorPurpose;
      expiresAt?: string;
      resendAvailableAt?: string;
      emailHint?: string;
    }>({
      path: '/api/auth/2fa/status',
      method: 'GET',
    });

    if (!payload.required) {
      return { required: false };
    }

    if (!payload.purpose || !payload.expiresAt || !payload.resendAvailableAt || !payload.emailHint) {
      throw new Error('Не удалось получить состояние двухфакторной проверки.');
    }

    return {
      required: true,
      purpose: payload.purpose,
      expiresAt: payload.expiresAt,
      resendAvailableAt: payload.resendAvailableAt,
      emailHint: payload.emailHint,
    };
  }, []);

  const sendLoginTwoFactorCode = useCallback(async (): Promise<AuthTwoFactorChallenge> => {
    const payload = await backendRequest<{
      required?: boolean;
      purpose?: AuthTwoFactorPurpose;
      expiresAt?: string;
      resendAvailableAt?: string;
      emailHint?: string;
      debugCode?: string;
    }>({
      path: '/api/auth/2fa/send',
      method: 'POST',
      body: {
        flow: 'login',
      },
    });

    if (!payload.required || !payload.purpose || !payload.expiresAt || !payload.resendAvailableAt || !payload.emailHint) {
      throw new Error('Не удалось отправить код подтверждения.');
    }

    return {
      purpose: payload.purpose,
      expiresAt: payload.expiresAt,
      resendAvailableAt: payload.resendAvailableAt,
      emailHint: payload.emailHint,
      ...(payload.debugCode ? { debugCode: payload.debugCode } : {}),
    };
  }, []);

  const verifyLoginTwoFactorCode = useCallback(async (code: string) => {
    const payload = await backendRequest<{
      user?: AuthUser;
      csrfToken?: string;
    }>({
      path: '/api/auth/2fa/verify',
      method: 'POST',
      body: {
        flow: 'login',
        code,
      },
    });

    setSessionFromPayload(payload);
  }, [setSessionFromPayload]);

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
    startGoogleSignIn,
    getLoginTwoFactorStatus,
    sendLoginTwoFactorCode,
    verifyLoginTwoFactorCode,
  }), [
    getLoginTwoFactorStatus,
    login,
    logout,
    refreshMe,
    register,
    sendLoginTwoFactorCode,
    startGoogleSignIn,
    state.csrfToken,
    state.loading,
    state.user,
    verifyLoginTwoFactorCode,
  ]);

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
