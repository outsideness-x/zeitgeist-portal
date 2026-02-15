import { z } from 'zod';

const optionalUrl = z.string().trim().optional().transform((value) => {
  if (!value) {
    return undefined;
  }
  return value;
}).pipe(z.string().url().optional());

const optionalString = z.string().trim().optional().transform((value) => {
  if (!value) {
    return undefined;
  }
  return value;
});

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  BACKEND_HOST: z.string().default('0.0.0.0'),
  BACKEND_PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  BACKEND_COOKIE_SECRET: z.string().min(32),
  BACKEND_CORS_ORIGIN: z.string().url().default('http://localhost:3000'),
  BACKEND_CORS_ORIGINS: optionalString,
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(168),
  CSRF_HEADER_NAME: z.string().default('x-csrf-token'),
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().min(1).default('us-east-1'),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_SIGNED_URL_EXPIRES_SECONDS: z.coerce.number().int().positive().default(300),
  UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(25 * 1024 * 1024),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  ANALYTICS_COOKIE_MAX_AGE_DAYS: z.coerce.number().int().positive().default(365),
  MAX_APPLAUSE_PER_USER_PER_ARTICLE: z.coerce.number().int().positive().default(50),
  CONTENT_PROVIDER: z.enum(['local', 'ghost']).default('local'),
  PUBLISH_PROVIDER: z.enum(['local', 'ghost']).default('local'),
  GHOST_CONTENT_API_URL: optionalUrl,
  GHOST_CONTENT_API_KEY: optionalString,
  GHOST_ADMIN_API_URL: optionalUrl,
  GHOST_ADMIN_API_KEY: optionalString,
});

let parsedEnv: z.infer<typeof envSchema> | null = null;

export const getEnv = () => {
  if (!parsedEnv) {
    parsedEnv = envSchema.parse(process.env);
  }
  return parsedEnv;
};

export type BackendEnv = z.infer<typeof envSchema>;
