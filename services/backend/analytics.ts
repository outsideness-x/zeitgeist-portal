import { getBackendBaseUrl } from './client';

export type AnalyticsActivityPayload = {
  path: string;
  kind?: 'pageview' | 'heartbeat';
  articleId?: string;
};

export const postAnalyticsActivity = async (payload: AnalyticsActivityPayload) => {
  const backendBaseUrl = getBackendBaseUrl();
  if (!backendBaseUrl) {
    return null;
  }

  try {
    const response = await fetch(`${backendBaseUrl}/api/analytics/activity`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
      keepalive: payload.kind === 'heartbeat',
    });

    if (!response.ok) {
      return null;
    }

    return response.json().catch(() => null);
  } catch {
    return null;
  }
};
