import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import { getEnv } from './config/env.js';
import { prismaPlugin } from './plugins/prisma.js';
import { authPlugin } from './plugins/auth.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerSubmissionRoutes } from './routes/submissions.js';
import { registerLibraryRoutes } from './routes/library.js';
import { registerWebhookRoutes } from './routes/webhooks.js';
import { registerHealthRoutes } from './routes/health.js';

export const buildServer = () => {
  const env = getEnv();

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
    origin: env.BACKEND_CORS_ORIGIN,
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
  app.register(registerSubmissionRoutes);
  app.register(registerLibraryRoutes);
  app.register(registerWebhookRoutes);

  return app;
};
