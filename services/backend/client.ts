const backendUnavailableMessage = 'service is temporarily unavailable. please try again.';
const backendNotConfiguredMessage = 'backend url is not configured';
const requestTimeoutMs = 12_000;
const retryDelayMs = 300;
const devLogCache = new Set<string>();

const mapUserFacingBackendErrorMessage = (path: string, message: string): string => {
  const normalizedMessage = message.trim().toLowerCase();

  if (path === '/api/auth/login' && normalizedMessage === 'invalid credentials') {
    return 'Неверная почта или пароль.';
  }

  if (path === '/api/auth/register' && normalizedMessage === 'unable to process credentials') {
    return 'Не удалось создать аккаунт. Возможно, для этой почты уже есть аккаунт. Попробуйте войти.';
  }

  return message;
};

export const getBackendBaseUrl = (): string => {
  return process.env.NEXT_PUBLIC_BACKEND_URL?.trim() ?? '';
};

export const isBackendNetworkError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  if (error.name === 'AbortError') {
    return true;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('network request failed') ||
    message.includes('fetch failed') ||
    message.includes('load failed')
  );
};

export const normalizeBackendRequestError = (error: unknown): Error => {
  if (isBackendNetworkError(error)) {
    return new Error(backendUnavailableMessage);
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error('request failed');
};

export const parseBackendErrorMessage = async (response: Response): Promise<string> => {
  const fallback = `request failed with status ${response.status}`;
  const contentType = response.headers.get('content-type') ?? '';

  try {
    if (contentType.includes('application/json')) {
      const payload = (await response.json()) as { message?: unknown };
      if (typeof payload.message === 'string' && payload.message.trim().length > 0) {
        return payload.message;
      }
      return fallback;
    }

    const text = (await response.text()).trim();
    return text.length > 0 ? text : fallback;
  } catch {
    return fallback;
  }
};

export const logBackendDebugOnce = (key: string, details: unknown): void => {
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  if (devLogCache.has(key)) {
    return;
  }

  devLogCache.add(key);
  console.warn(`[backend] ${key}`, details);
};

const sleep = async (durationMs: number): Promise<void> => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, durationMs);
  });
};

const shouldRetry = (method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', error: unknown): boolean => {
  return method === 'GET' && isBackendNetworkError(error);
};

export const backendRequest = async <T>(args: {
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  csrfToken?: string | null;
}) => {
  const backendBaseUrl = getBackendBaseUrl();
  if (!backendBaseUrl) {
    throw new Error(backendNotConfiguredMessage);
  }

  const method = args.method ?? 'GET';
  const maxAttempts = method === 'GET' ? 2 : 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, requestTimeoutMs);

    try {
      const response = await fetch(`${backendBaseUrl}${args.path}`, {
        method,
        credentials: 'include',
        headers: {
          ...(args.body ? { 'content-type': 'application/json' } : {}),
          ...(args.csrfToken ? { 'x-csrf-token': args.csrfToken } : {}),
        },
        body: args.body ? JSON.stringify(args.body) : undefined,
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(mapUserFacingBackendErrorMessage(args.path, await parseBackendErrorMessage(response)));
      }

      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return undefined as T;
      }

      return (await response.json()) as T;
    } catch (error) {
      const normalizedError = normalizeBackendRequestError(error);
      if (attempt < maxAttempts && shouldRetry(method, error)) {
        await sleep(retryDelayMs * attempt);
        continue;
      }

      logBackendDebugOnce(`${method} ${args.path} ${normalizedError.message}`, {
        name: error instanceof Error ? error.name : 'unknown',
      });
      throw normalizedError;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error('request failed');
};
