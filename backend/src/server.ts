import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import { getEnv } from './config/env.js';
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
  app.register(registerArticleRoutes);
  app.register(registerBookmarkRoutes);
  app.register(registerReactionRoutes);
  app.register(registerAnalyticsRoutes);
  app.register(registerSubmissionRoutes);
  app.register(registerAdminRoutes);
  app.register(registerWebhookRoutes);

  return app;
};
