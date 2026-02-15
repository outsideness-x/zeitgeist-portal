import { Prisma } from '@prisma/client';
import type { ReactionType } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { writeAuditLog } from '../lib/audit.js';
import { getEnv } from '../config/env.js';
import { requireAuth, requireCsrf } from '../plugins/auth.js';

const paramsSchema = z.object({
  id: z.string().min(1),
});

const articleIdParamsSchema = z.object({
  articleId: z.string().min(1),
});

const applauseBodySchema = z.object({
  delta: z.coerce.number().int().positive().max(250).optional(),
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
  const env = getEnv();
  const applauseCap = env.MAX_APPLAUSE_PER_USER_PER_ARTICLE;

  const ensureArticleExists = async (articleId: string) => {
    const article = await app.prisma.article.findUnique({
      where: {
        id: articleId,
      },
      select: {
        id: true,
      },
    });

    return article;
  };

  const readReactionSummary = async (args: {
    db: FastifyInstance['prisma'] | Prisma.TransactionClient;
    articleId: string;
    viewerUserId?: string;
  }) => {
    const aggregate = await args.db.articleReactionAggregate.findUnique({
      where: {
        articleId: args.articleId,
      },
      select: {
        likeCount: true,
        applauseCount: true,
      },
    });

    let liked = false;
    let applauseCountByMe = 0;

    if (args.viewerUserId) {
      const [likeRow, applauseRow] = await Promise.all([
        args.db.articleLike.findUnique({
          where: {
            articleId_userId: {
              articleId: args.articleId,
              userId: args.viewerUserId,
            },
          },
          select: {
            id: true,
          },
        }),
        args.db.articleApplause.findUnique({
          where: {
            articleId_userId: {
              articleId: args.articleId,
              userId: args.viewerUserId,
            },
          },
          select: {
            count: true,
          },
        }),
      ]);

      liked = Boolean(likeRow);
      applauseCountByMe = applauseRow?.count ?? 0;
    }

    return {
      likeCount: aggregate?.likeCount ?? 0,
      applauseCount: aggregate?.applauseCount ?? 0,
      viewer: {
        liked,
        applauseCountByMe,
      },
      cap: applauseCap,
    };
  };

  app.get('/api/articles/:articleId/reactions', async (request, reply) => {
    const params = articleIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      reply.code(400).send({ error: 'bad_request', message: 'invalid article id' });
      return;
    }

    const article = await ensureArticleExists(params.data.articleId);
    if (!article) {
      reply.code(404).send({ error: 'not_found', message: 'article not found' });
      return;
    }

    const summary = await readReactionSummary({
      db: app.prisma,
      articleId: article.id,
      viewerUserId: request.auth?.userId,
    });

    reply.send(summary);
  });

  app.post('/api/articles/:articleId/like', {
    preHandler: [requireAuth, requireCsrf],
    config: {
      rateLimit: {
        max: 120,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    if (!request.auth) {
      return;
    }

    const params = articleIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      reply.code(400).send({ error: 'bad_request', message: 'invalid article id' });
      return;
    }

    const article = await ensureArticleExists(params.data.articleId);
    if (!article) {
      reply.code(404).send({ error: 'not_found', message: 'article not found' });
      return;
    }

    const summary = await app.prisma.$transaction(async (tx) => {
      await tx.articleReactionAggregate.upsert({
        where: {
          articleId: article.id,
        },
        create: {
          articleId: article.id,
        },
        update: {},
      });

      let insertedLike = false;
      try {
        await tx.articleLike.create({
          data: {
            articleId: article.id,
            userId: request.auth.userId,
          },
        });
        insertedLike = true;
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) {
          throw error;
        }
      }

      if (insertedLike) {
        await tx.articleReactionAggregate.update({
          where: {
            articleId: article.id,
          },
          data: {
            likeCount: {
              increment: 1,
            },
          },
        });
      }

      return readReactionSummary({
        db: tx,
        articleId: article.id,
        viewerUserId: request.auth.userId,
      });
    });

    await writeAuditLog({
      prisma: app.prisma,
      actorUserId: request.auth.userId,
      action: 'article.like.set',
      entityType: 'article',
      entityId: article.id,
    });

    reply.send(summary);
  });

  app.delete('/api/articles/:articleId/like', {
    preHandler: [requireAuth, requireCsrf],
    config: {
      rateLimit: {
        max: 120,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    if (!request.auth) {
      return;
    }

    const params = articleIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      reply.code(400).send({ error: 'bad_request', message: 'invalid article id' });
      return;
    }

    const article = await ensureArticleExists(params.data.articleId);
    if (!article) {
      reply.code(404).send({ error: 'not_found', message: 'article not found' });
      return;
    }

    const summary = await app.prisma.$transaction(async (tx) => {
      await tx.articleReactionAggregate.upsert({
        where: {
          articleId: article.id,
        },
        create: {
          articleId: article.id,
        },
        update: {},
      });

      const deleted = await tx.articleLike.deleteMany({
        where: {
          articleId: article.id,
          userId: request.auth.userId,
        },
      });

      if (deleted.count > 0) {
        // this keeps aggregate values non-negative if data is repaired manually
        await tx.$executeRaw`
          update "ArticleReactionAggregate"
          set "likeCount" = greatest("likeCount" - ${deleted.count}, 0)
          where "articleId" = ${article.id}
        `;
      }

      return readReactionSummary({
        db: tx,
        articleId: article.id,
        viewerUserId: request.auth.userId,
      });
    });

    await writeAuditLog({
      prisma: app.prisma,
      actorUserId: request.auth.userId,
      action: 'article.like.clear',
      entityType: 'article',
      entityId: article.id,
    });

    reply.send(summary);
  });

  app.post('/api/articles/:articleId/applause', {
    preHandler: [requireAuth, requireCsrf],
    config: {
      rateLimit: {
        max: 240,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    if (!request.auth) {
      return;
    }

    const params = articleIdParamsSchema.safeParse(request.params);
    const body = applauseBodySchema.safeParse(request.body);

    if (!params.success || !body.success) {
      reply.code(400).send({ error: 'bad_request', message: 'invalid request payload' });
      return;
    }

    const article = await ensureArticleExists(params.data.articleId);
    if (!article) {
      reply.code(404).send({ error: 'not_found', message: 'article not found' });
      return;
    }

    const requestedDelta = body.data.delta ?? 1;

    const response = await app.prisma.$transaction(async (tx) => {
      await tx.articleReactionAggregate.upsert({
        where: {
          articleId: article.id,
        },
        create: {
          articleId: article.id,
        },
        update: {},
      });

      await tx.articleApplause.upsert({
        where: {
          articleId_userId: {
            articleId: article.id,
            userId: request.auth.userId,
          },
        },
        create: {
          articleId: article.id,
          userId: request.auth.userId,
          count: 0,
        },
        update: {},
      });

      // this row lock serializes applause updates for one user and one article
      const lockedRows = await tx.$queryRaw<Array<{ count: number }>>`
        select "count"
        from "ArticleApplause"
        where "articleId" = ${article.id}
          and "userId" = ${request.auth.userId}
        for update
      `;

      const currentCount = Number(lockedRows[0]?.count ?? 0);
      const allowedDelta = Math.max(0, Math.min(requestedDelta, applauseCap - currentCount));

      if (allowedDelta > 0) {
        await tx.articleApplause.update({
          where: {
            articleId_userId: {
              articleId: article.id,
              userId: request.auth.userId,
            },
          },
          data: {
            count: {
              increment: allowedDelta,
            },
          },
        });

        await tx.articleReactionAggregate.update({
          where: {
            articleId: article.id,
          },
          data: {
            applauseCount: {
              increment: allowedDelta,
            },
          },
        });
      }

      const summary = await readReactionSummary({
        db: tx,
        articleId: article.id,
        viewerUserId: request.auth.userId,
      });

      return {
        ...summary,
        requestedDelta,
        appliedDelta: allowedDelta,
      };
    });

    await writeAuditLog({
      prisma: app.prisma,
      actorUserId: request.auth.userId,
      action: 'article.applause.add',
      entityType: 'article',
      entityId: article.id,
      metadata: {
        requestedDelta: response.requestedDelta,
        appliedDelta: response.appliedDelta,
      },
    });

    reply.send(response);
  });

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
