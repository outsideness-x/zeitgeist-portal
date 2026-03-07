import type { BackendEnv } from '../config/env.js';

export const parseAllowedCorsOrigins = (env: BackendEnv): string[] => {
  const rawOrigins = [
    env.BACKEND_CORS_ORIGIN,
    ...(env.BACKEND_CORS_ORIGINS?.split(',').map((value) => value.trim()).filter(Boolean) ?? []),
  ];

  const deduped = Array.from(new Set(rawOrigins));

  deduped.forEach((origin) => {
    void new URL(origin);
  });

  return deduped;
};

export const isAllowedCorsOrigin = (env: BackendEnv, origin: string): boolean => {
  return parseAllowedCorsOrigins(env).includes(origin);
};
