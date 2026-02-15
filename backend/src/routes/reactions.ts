import type { ReactionType } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { writeAuditLog } from '../lib/audit.js';
import { requireAuth, requireCsrf } from '../plugins/auth.js';

const paramsSchema = z.object({
  id: z.string().min(1),
});

const reactionSchema = z.object({
  type: z.enum(['like', 'insightful', 'celebrate']),
});

const reactionMap: Record<'like' | 'insightful' | 'celebrate', ReactionType> = {
  like: 'LIKE',
  insightful: 'INSIGHTFUL',
  celebrate: 'CELEBRATE',
};

const reactionToClient = (type: ReactionType): 'like' | 'insightful' | 'celebrate' => {
  if (type === 'INSIGHTFUL') {
    return 'insightful';
  }
  if (type === 'CELEBRATE') {
    return 'celebrate';
  }
  return 'like';
};

export const registerReactionRoutes = async (app: FastifyInstance) => {
  app.get('/api/articles/:id/reaction/me', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    if (!request.auth) {
      return;
    }

    const params = paramsSchema.safeParse(request.params);
    if (!params.success) {
      reply.code(400).send({ error: 'bad_request', message: 'invalid article id' });
      return;
    }

    const reaction = await app.prisma.reaction.findUnique({
      where: {
        userId_articleId: {
          userId: request.auth.userId,
          articleId: params.data.id,
        },
      },
      select: {
        type: true,
      },
    });

    reply.send({
      reaction: reaction ? reactionToClient(reaction.type) : null,
    });
  });

  app.post('/api/articles/:id/reaction', {
    preHandler: [requireAuth, requireCsrf],
  }, async (request, reply) => {
    if (!request.auth) {
      return;
    }

    const params = paramsSchema.safeParse(request.params);
    const body = reactionSchema.safeParse(request.body);

    if (!params.success || !body.success) {
      reply.code(400).send({ error: 'bad_request', message: 'invalid request payload' });
      return;
    }

    const article = await app.prisma.article.findUnique({
      where: {
        id: params.data.id,
      },
      select: {
        id: true,
      },
    });

    if (!article) {
      reply.code(404).send({ error: 'not_found', message: 'article not found' });
      return;
    }

    const type = reactionMap[body.data.type];

    const reaction = await app.prisma.reaction.upsert({
      where: {
        userId_articleId: {
          userId: request.auth.userId,
          articleId: article.id,
        },
      },
      create: {
        userId: request.auth.userId,
        articleId: article.id,
        type,
      },
      update: {
        type,
      },
      select: {
        type: true,
      },
    });

    await writeAuditLog({
      prisma: app.prisma,
      actorUserId: request.auth.userId,
      action: 'reaction.set',
      entityType: 'article',
      entityId: article.id,
      metadata: {
        type: reaction.type,
      },
    });

    reply.send({ reaction: reactionToClient(reaction.type) });
  });

  app.delete('/api/articles/:id/reaction', {
    preHandler: [requireAuth, requireCsrf],
  }, async (request, reply) => {
    if (!request.auth) {
      return;
    }

    const params = paramsSchema.safeParse(request.params);
    if (!params.success) {
      reply.code(400).send({ error: 'bad_request', message: 'invalid article id' });
      return;
    }

    await app.prisma.reaction.deleteMany({
      where: {
        userId: request.auth.userId,
        articleId: params.data.id,
      },
    });

    await writeAuditLog({
      prisma: app.prisma,
      actorUserId: request.auth.userId,
      action: 'reaction.clear',
      entityType: 'article',
      entityId: params.data.id,
    });

    reply.send({ ok: true });
  });
};
