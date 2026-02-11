import type { FastifyInstance } from 'fastify';

export const registerWebhookRoutes = async (app: FastifyInstance) => {
  app.post('/api/webhooks/ghost', {
    config: {
      rateLimit: {
        max: 30,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    // this endpoint is intentionally a safe stub until ghost webhook handling is enabled
    app.log.info({ payload: request.body }, 'received ghost webhook stub event');
    reply.code(202).send({ ok: true });
  });
};
