import { Prisma } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { normalizePage } from '../lib/pagination.js';
import { writeAuditLog } from '../lib/audit.js';
import { requireAuth, requireCsrf } from '../plugins/auth.js';

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(50).optional(),
});

const toggleSchema = z.object({
  articleId: z.string().min(1),
});

const upsertSchema = z.object({
  articleId: z.string().min(1),
});

const statusQuerySchema = z.object({
  articleId: z.string().min(1),
});

const articleIdParamsSchema = z.object({
  articleId: z.string().min(1),
});

export const registerBookmarkRoutes = async (app: FastifyInstance) => {
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

  const readBookmarkCount = async (articleId: string) => {
    return app.prisma.bookmark.count({
      where: {
        articleId,
      },
    });
  };

  app.get('/api/me/bookmarks', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    if (!request.auth) {
      return;
    }

    const parsed = listQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      reply.code(400).send({ error: 'bad_request', message: 'invalid query parameters' });
      return;
    }

    const { page, pageSize, skip, take } = normalizePage(parsed.data.page, parsed.data.pageSize, 50);

    const [total, items] = await Promise.all([
      app.prisma.bookmark.count({
        where: {
          userId: request.auth.userId,
        },
      }),
      app.prisma.bookmark.findMany({
        where: {
          userId: request.auth.userId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take,
        include: {
          article: {
            select: {
              id: true,
              slug: true,
              source: true,
              title: true,
              excerpt: true,
              section: true,
              publishedAt: true,
              featureImage: true,
            },
          },
        },
      }),
    ]);

    reply.send({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  });

  app.get('/api/me/bookmarks/status', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    if (!request.auth) {
      return;
    }

    const parsed = statusQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      reply.code(400).send({ error: 'bad_request', message: 'invalid query parameters' });
      return;
    }

    const article = await ensureArticleExists(parsed.data.articleId);
    if (!article) {
      reply.code(404).send({ error: 'not_found', message: 'article not found' });
      return;
    }

    const bookmark = await app.prisma.bookmark.findUnique({
      where: {
        userId_articleId: {
          userId: request.auth.userId,
          articleId: parsed.data.articleId,
        },
      },
      select: {
        id: true,
      },
    });

    reply.send({
      articleId: parsed.data.articleId,
      bookmarked: Boolean(bookmark),
    });
  });

  app.post('/api/me/bookmarks', {
    preHandler: [requireAuth, requireCsrf],
  }, async (request, reply) => {
    if (!request.auth) {
      return;
    }

    const parsed = upsertSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400).send({ error: 'bad_request', message: parsed.error.issues[0]?.message ?? 'invalid request body' });
      return;
    }

    const { articleId } = parsed.data;
    const article = await ensureArticleExists(articleId);

    if (!article) {
      reply.code(404).send({ error: 'not_found', message: 'article not found' });
      return;
    }

    const existing = await app.prisma.bookmark.findUnique({
      where: {
        userId_articleId: {
          userId: request.auth.userId,
          articleId,
        },
      },
      select: {
        id: true,
      },
    });

    let createdBookmark = false;

    if (!existing) {
      try {
        await app.prisma.bookmark.create({
          data: {
            userId: request.auth.userId,
            articleId,
          },
        });
        createdBookmark = true;
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) {
          throw error;
        }
      }
    }

    if (createdBookmark) {
      await writeAuditLog({
        prisma: app.prisma,
        actorUserId: request.auth.userId,
        action: 'bookmark.add',
        entityType: 'article',
        entityId: articleId,
      });
    }

    const bookmarkCount = await readBookmarkCount(articleId);

    if (createdBookmark) {
      reply.code(201);
    }

    reply.send({
      articleId,
      bookmarked: true,
      bookmarkCount,
    });
  });

  app.delete('/api/me/bookmarks/:articleId', {
    preHandler: [requireAuth, requireCsrf],
  }, async (request, reply) => {
    if (!request.auth) {
      return;
    }

    const parsedParams = articleIdParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      reply.code(400).send({ error: 'bad_request', message: 'invalid article id' });
      return;
    }

    const { articleId } = parsedParams.data;
    const article = await ensureArticleExists(articleId);
    if (!article) {
      reply.code(404).send({ error: 'not_found', message: 'article not found' });
      return;
    }

    const deleted = await app.prisma.bookmark.deleteMany({
      where: {
        userId: request.auth.userId,
        articleId,
      },
    });

    if (deleted.count > 0) {
      await writeAuditLog({
        prisma: app.prisma,
        actorUserId: request.auth.userId,
        action: 'bookmark.remove',
        entityType: 'article',
        entityId: articleId,
      });
    }

    const bookmarkCount = await readBookmarkCount(articleId);

    reply.send({
      articleId,
      bookmarked: false,
      bookmarkCount,
    });
  });

  app.post('/api/me/bookmarks/toggle', {
    preHandler: [requireAuth, requireCsrf],
  }, async (request, reply) => {
    if (!request.auth) {
      return;
    }

    const parsed = toggleSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400).send({ error: 'bad_request', message: parsed.error.issues[0]?.message ?? 'invalid request body' });
      return;
    }

    const { articleId } = parsed.data;

    const article = await ensureArticleExists(articleId);

    if (!article) {
      reply.code(404).send({ error: 'not_found', message: 'article not found' });
      return;
    }

    const existing = await app.prisma.bookmark.findUnique({
      where: {
        userId_articleId: {
          userId: request.auth.userId,
          articleId,
        },
      },
      select: {
        id: true,
      },
    });

    let bookmarked = false;

    if (existing) {
      await app.prisma.bookmark.delete({
        where: {
          userId_articleId: {
            userId: request.auth.userId,
            articleId,
          },
        },
      });

      await writeAuditLog({
        prisma: app.prisma,
        actorUserId: request.auth.userId,
        action: 'bookmark.remove',
        entityType: 'article',
        entityId: articleId,
      });
    } else {
      await app.prisma.bookmark.create({
        data: {
          userId: request.auth.userId,
          articleId,
        },
      });

      bookmarked = true;

      await writeAuditLog({
        prisma: app.prisma,
        actorUserId: request.auth.userId,
        action: 'bookmark.add',
        entityType: 'article',
        entityId: articleId,
      });
    }

    const bookmarkCount = await readBookmarkCount(articleId);

    reply.send({ bookmarked, bookmarkCount });
  });
};
