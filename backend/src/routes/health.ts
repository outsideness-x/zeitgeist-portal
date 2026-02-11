import type { FastifyInstance } from 'fastify';

export const registerHealthRoutes = async (app: FastifyInstance) => {
  app.get('/api/health', async () => {
    return {
      ok: true,
      service: 'zeitgeist-backend',
      timestamp: new Date().toISOString(),
    };
  });
};
