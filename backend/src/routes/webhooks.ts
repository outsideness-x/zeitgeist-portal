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
    app.log.info({
      hasBody: request.body !== undefined,
      event: request.headers['x-ghost-event'] ?? null,
    }, 'received ghost webhook stub event');
    reply.code(202).send({ ok: true });
  });
};
