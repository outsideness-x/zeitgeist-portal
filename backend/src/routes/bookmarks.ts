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

export const registerBookmarkRoutes = async (app: FastifyInstance) => {
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

    const article = await app.prisma.article.findUnique({
      where: {
        id: articleId,
      },
      select: {
        id: true,
      },
    });

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

    const bookmarkCount = await app.prisma.bookmark.count({
      where: { articleId },
    });

    reply.send({ bookmarked, bookmarkCount });
  });
};
