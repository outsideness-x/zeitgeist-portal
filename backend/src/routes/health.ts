import type { FastifyInstance } from 'fastify';

export const registerHealthRoutes = async (app: FastifyInstance) => {
  app.get('/api/health', async () => {
    return {
      ok: true,
      service: 'zeitgeist-backend',
      timestamp: new Date().toISOString(),
    };
  });

  app.get('/api/version', async (_request, reply) => {
    reply.header('cache-control', 'no-store');

    reply.send({
      service: 'zeitgeist-backend',
      commitHash: process.env.BUILD_COMMIT ?? 'unknown',
      buildTime: process.env.BUILD_TIME ?? 'unknown',
      buildRef: process.env.BUILD_REF ?? 'unknown',
      timestamp: new Date().toISOString(),
    });
  });
};
