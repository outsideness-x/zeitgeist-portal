import { afterEach, describe, expect, it, vi } from 'vitest';
import { authStateReducer, initialAuthState } from '../../services/auth/state.ts';
import { backendRequest } from '../../services/backend/client.ts';

const backendUrlEnvKey = 'NEXT_PUBLIC_BACKEND_URL';
const originalBackendUrl = process.env[backendUrlEnvKey];

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();

  if (typeof originalBackendUrl === 'string') {
    process.env[backendUrlEnvKey] = originalBackendUrl;
  } else {
    delete process.env[backendUrlEnvKey];
  }
});

describe('frontend auth reducer', () => {
  it('stores session payload and disables loading', () => {
    const user = {
      id: 'u-1',
      name: 'reader',
      email: 'reader@example.com',
      role: 'READER' as const,
      twoFactorEmailEnabled: false,
    };

    const nextState = authStateReducer(initialAuthState, {
      type: 'set-session',
      user,
      csrfToken: 'csrf-1',
    });

    expect(nextState.loading).toBe(false);
    expect(nextState.user).toEqual(user);
    expect(nextState.csrfToken).toBe('csrf-1');
  });

  it('returns stable reference for repeated clear session', () => {
    const cleared = authStateReducer(initialAuthState, { type: 'clear-session' });
    const clearedAgain = authStateReducer(cleared, { type: 'clear-session' });

    expect(clearedAgain).toBe(cleared);
    expect(clearedAgain.loading).toBe(false);
    expect(clearedAgain.user).toBeNull();
    expect(clearedAgain.csrfToken).toBeNull();
  });
});

describe('frontend backend client', () => {
  it('retries one time for get request on network failure', async () => {
    process.env[backendUrlEnvKey] = 'https://api.example.com';

    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      }));

    vi.stubGlobal('fetch', fetchMock);

    const payload = await backendRequest<{ ok: boolean }>({
      path: '/api/health',
      method: 'GET',
    });

    expect(payload).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws user-facing error for missing backend url', async () => {
    delete process.env[backendUrlEnvKey];

    await expect(backendRequest<{ ok: boolean }>({
      path: '/api/health',
      method: 'GET',
    })).rejects.toThrow('backend url is not configured');
  });

  it('throws server error payload message for non-ok responses', async () => {
    process.env[backendUrlEnvKey] = 'https://api.example.com';
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ message: 'invalid credentials' }), {
        status: 401,
        headers: {
          'content-type': 'application/json',
        },
      }),
    ));

    await expect(backendRequest<{ ok: boolean }>({
      path: '/api/auth/login',
      method: 'POST',
      body: { email: 'reader@example.com', password: 'wrong' },
    })).rejects.toThrow('Неверная почта или пароль.');
  });

  it('maps register credential processing errors to a user-facing auth hint', async () => {
    process.env[backendUrlEnvKey] = 'https://api.example.com';
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ message: 'unable to process credentials' }), {
        status: 400,
        headers: {
          'content-type': 'application/json',
        },
      }),
    ));

    await expect(backendRequest<{ ok: boolean }>({
      path: '/api/auth/register',
      method: 'POST',
      body: { name: 'alex', email: 'reader@example.com', password: 'password123' },
    })).rejects.toThrow('Не удалось создать аккаунт. Возможно, для этой почты уже есть аккаунт. Попробуйте войти.');
  });
});
