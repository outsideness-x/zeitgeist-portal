import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getEnv } from '../config/env.js';
import { formatUtcDate, utcDayStart } from '../lib/dates.js';
import { createVisitorId, visitorCookieName } from '../lib/visitor.js';
import { requireAuth } from '../plugins/auth.js';

const viewSchema = z.object({
  articleId: z.string().min(1),
});

const authorStatsQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(365).optional(),
});

export const registerAnalyticsRoutes = async (app: FastifyInstance) => {
  const env = getEnv();

  app.post('/api/analytics/view', {
    config: {
      rateLimit: {
        max: 240,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    const parsed = viewSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400).send({ error: 'bad_request', message: parsed.error.issues[0]?.message ?? 'invalid request body' });
      return;
    }

    const article = await app.prisma.article.findUnique({
      where: {
        id: parsed.data.articleId,
      },
      select: {
        id: true,
      },
    });

    if (!article) {
      reply.code(404).send({ error: 'not_found', message: 'article not found' });
      return;
    }

    const date = utcDayStart();
    const isProd = env.NODE_ENV === 'production';

    const existingVisitorCookie = request.cookies[visitorCookieName];
    const visitorId = existingVisitorCookie || createVisitorId();

    if (!existingVisitorCookie) {
      // this cookie stores only a random identifier for daily dedup and avoids personal identifiers
      reply.setCookie(visitorCookieName, visitorId, {
        path: '/',
        sameSite: 'lax',
        secure: isProd,
        httpOnly: true,
        maxAge: env.ANALYTICS_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60,
      });
    }

    const stats = await app.prisma.$transaction(async (tx) => {
      await tx.articleDailyStats.createMany({
        data: [{
          articleId: article.id,
          date,
          views: 0,
          uniqueVisitors: 0,
        }],
        skipDuplicates: true,
      });

      // this dedup table guarantees unique visitors are incremented once per article per day
      const uniqueInsert = await tx.articleDailyVisitor.createMany({
        data: [{
          articleId: article.id,
          date,
          visitorId,
        }],
        skipDuplicates: true,
      });

      const uniqueIncrement = uniqueInsert.count > 0 ? 1 : 0;

      return tx.articleDailyStats.update({
        where: {
          articleId_date: {
            articleId: article.id,
            date,
          },
        },
        data: {
          views: {
            increment: 1,
          },
          uniqueVisitors: {
            increment: uniqueIncrement,
          },
        },
        select: {
          views: true,
          uniqueVisitors: true,
        },
      });
    });

    reply.send({
      articleId: article.id,
      date: formatUtcDate(date),
      views: stats.views,
      uniqueVisitors: stats.uniqueVisitors,
    });
  });

  app.get('/api/authors/me/stats', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    if (!request.auth) {
      return;
    }

    if (request.auth.role !== 'AUTHOR' && request.auth.role !== 'ADMIN') {
      reply.code(403).send({ error: 'forbidden', message: 'author role is required' });
      return;
    }

    const query = authorStatsQuerySchema.safeParse(request.query);
    if (!query.success) {
      reply.code(400).send({ error: 'bad_request', message: 'invalid query parameters' });
      return;
    }

    const days = query.data.days ?? 30;
    const from = utcDayStart(new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000));

    const articles = await app.prisma.article.findMany({
      where: {
        authorUserId: request.auth.userId,
      },
      select: {
        id: true,
        slug: true,
        title: true,
        section: true,
        publishedAt: true,
      },
      orderBy: {
        publishedAt: 'desc',
      },
    });

    if (articles.length === 0) {
      reply.send({
        periodDays: days,
        series: [],
        articles: [],
        topArticles: [],
      });
      return;
    }

    const articleIds = articles.map((article) => article.id);

    const [dailyStats, bookmarkCounts, reactionCounts] = await Promise.all([
      app.prisma.articleDailyStats.findMany({
        where: {
          articleId: {
            in: articleIds,
          },
          date: {
            gte: from,
          },
        },
        select: {
          articleId: true,
          date: true,
          views: true,
          uniqueVisitors: true,
        },
      }),
      app.prisma.bookmark.groupBy({
        by: ['articleId'],
        where: {
          articleId: {
            in: articleIds,
          },
        },
        _count: {
          articleId: true,
        },
      }),
      app.prisma.reaction.groupBy({
        by: ['articleId', 'type'],
        where: {
          articleId: {
            in: articleIds,
          },
        },
        _count: {
          type: true,
        },
      }),
    ]);

    const bookmarkMap = new Map<string, number>();
    bookmarkCounts.forEach((item) => {
      bookmarkMap.set(item.articleId, item._count.articleId);
    });

    const reactionMap = new Map<string, Record<string, number>>();
    reactionCounts.forEach((item) => {
      const current = reactionMap.get(item.articleId) ?? {};
      current[item.type.toLowerCase()] = item._count.type;
      reactionMap.set(item.articleId, current);
    });

    const totalsByArticle = new Map<string, { views: number; uniqueViews: number }>();
    const seriesByDate = new Map<string, { views: number; uniqueViews: number }>();

    dailyStats.forEach((row) => {
      const articleTotals = totalsByArticle.get(row.articleId) ?? { views: 0, uniqueViews: 0 };
      articleTotals.views += row.views;
      articleTotals.uniqueViews += row.uniqueVisitors;
      totalsByArticle.set(row.articleId, articleTotals);

      const dateKey = formatUtcDate(row.date);
      const dateTotals = seriesByDate.get(dateKey) ?? { views: 0, uniqueViews: 0 };
      dateTotals.views += row.views;
      dateTotals.uniqueViews += row.uniqueVisitors;
      seriesByDate.set(dateKey, dateTotals);
    });

    const series = Array.from(seriesByDate.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, totals]) => ({
        date,
        views: totals.views,
        uniqueViews: totals.uniqueViews,
      }));

    const articleStats = articles.map((article) => {
      const totals = totalsByArticle.get(article.id) ?? { views: 0, uniqueViews: 0 };
      return {
        articleId: article.id,
        slug: article.slug,
        title: article.title,
        section: article.section.toLowerCase(),
        publishedAt: article.publishedAt,
        lastPeriodViews: totals.views,
        lastPeriodUniqueViews: totals.uniqueViews,
        bookmarkCount: bookmarkMap.get(article.id) ?? 0,
        reactions: reactionMap.get(article.id) ?? {},
      };
    });

    const topArticles = [...articleStats]
      .sort((a, b) => b.lastPeriodViews - a.lastPeriodViews)
      .slice(0, 10)
      .map((article) => ({
        articleId: article.articleId,
        title: article.title,
        slug: article.slug,
        views: article.lastPeriodViews,
      }));

    reply.send({
      periodDays: days,
      series,
      articles: articleStats,
      topArticles,
    });
  });
};
