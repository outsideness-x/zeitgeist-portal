export const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000';

const parseErrorMessage = async (response: Response) => {
  try {
    const payload = (await response.json()) as { message?: string };
    return payload.message ?? `request failed with status ${response.status}`;
  } catch {
    return `request failed with status ${response.status}`;
  }
};

export const backendRequest = async <T>(args: {
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  csrfToken?: string | null;
}) => {
  const response = await fetch(`${backendBaseUrl}${args.path}`, {
    method: args.method ?? 'GET',
    credentials: 'include',
    headers: {
      ...(args.body ? { 'content-type': 'application/json' } : {}),
      ...(args.csrfToken ? { 'x-csrf-token': args.csrfToken } : {}),
    },
    body: args.body ? JSON.stringify(args.body) : undefined,
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return (await response.json()) as T;
};
