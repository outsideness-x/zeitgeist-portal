import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import { getEnv, type BackendEnv } from './config/env.js';
import { prismaPlugin } from './plugins/prisma.js';
import { authPlugin } from './plugins/auth.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerArticleRoutes } from './routes/articles.js';
import { registerBookmarkRoutes } from './routes/bookmarks.js';
import { registerReactionRoutes } from './routes/reactions.js';
import { registerAnalyticsRoutes } from './routes/analytics.js';
import { registerSubmissionRoutes } from './routes/submissions.js';
import { registerAdminRoutes } from './routes/admin.js';
import { registerWebhookRoutes } from './routes/webhooks.js';

const parseCorsOrigins = (env: BackendEnv) => {
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

export const buildServer = () => {
  const env = getEnv();
  const allowedCorsOrigins = parseCorsOrigins(env);

  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
    trustProxy: true,
  });

  app.register(sensible);
  app.register(cookie, {
    secret: env.BACKEND_COOKIE_SECRET,
  });

  app.register(cors, {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      callback(null, allowedCorsOrigins.includes(origin));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['content-type', env.CSRF_HEADER_NAME],
  });

  app.register(rateLimit, {
    global: true,
    max: env.RATE_LIMIT_MAX,
    timeWindow: `${env.RATE_LIMIT_WINDOW_SECONDS} second`,
  });

  app.register(prismaPlugin);
  app.register(authPlugin);

  app.register(registerHealthRoutes);
  app.register(registerAuthRoutes);
  app.register(registerArticleRoutes);
  app.register(registerBookmarkRoutes);
  app.register(registerReactionRoutes);
  app.register(registerAnalyticsRoutes);
  app.register(registerSubmissionRoutes);
  app.register(registerAdminRoutes);
  app.register(registerWebhookRoutes);

  app.setErrorHandler((error, request, reply) => {
    const normalizedError = (
      typeof error === 'object' && error !== null
        ? error
        : {}
    ) as { statusCode?: number; message?: string };

    const statusCode = normalizedError.statusCode && normalizedError.statusCode >= 400
      ? normalizedError.statusCode
      : 500;

    if (statusCode >= 500) {
      request.log.error({ err: error }, 'request failed');
      reply.code(500).send({
        error: 'internal_error',
        message: 'internal server error',
      });
      return;
    }

    reply.code(statusCode).send({
      error: 'request_error',
      message: normalizedError.message ?? 'request failed',
    });
  });

  return app;
};
