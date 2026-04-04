import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { PrismaClient, TrafficBucketGranularity } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { getEnv } from '../config/env.js';
import { formatUtcDate, utcDayStart, utcHourStart, utcMonthStart } from '../lib/dates.js';
import { createVisitorId, visitorCookieName } from '../lib/visitor.js';
import { requireAuth, requireRoles } from '../plugins/auth.js';

const SITE_ANALYTICS_GUEST_WINDOW_DAYS = 30;
const SITE_ANALYTICS_ONLINE_WINDOW_MINUTES = 10;
const hourMs = 60 * 60 * 1000;
const dayMs = 24 * hourMs;

const viewSchema = z.object({
  articleId: z.string().min(1),
});

const activitySchema = z.object({
  path: z.string().trim().min(1).max(600),
  kind: z.enum(['pageview', 'heartbeat']).default('pageview'),
  articleId: z.string().trim().min(1).max(200).optional(),
});

const authorStatsQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(365).optional(),
});

type SiteAnalyticsDb = PrismaClient | Prisma.TransactionClient;

type BucketRow = {
  bucketStart: Date;
  pageViews: number;
  authenticatedPageViews: number;
  anonymousPageViews: number;
};

const normalizeTrackedPath = (rawValue: string) => {
  const value = rawValue.trim();

  try {
    const parsed = new URL(value, 'https://zeitgeist.local');
    const candidate = `${parsed.pathname}${parsed.search}`;
    if (!candidate.startsWith('/') || candidate.startsWith('//')) {
      return '/';
    }
    return candidate.slice(0, 600);
  } catch {
    return '/';
  }
};

const resolveVisitorId = (request: FastifyRequest, reply: FastifyReply) => {
  const env = getEnv();
  const isProd = env.NODE_ENV === 'production';
  const existingVisitorCookie = request.cookies[visitorCookieName];
  const visitorId = existingVisitorCookie || createVisitorId();

  if (!existingVisitorCookie) {
    // this cookie stores only a random identifier for dedup and active-presence tracking
    reply.setCookie(visitorCookieName, visitorId, {
      path: '/',
      sameSite: 'lax',
      secure: isProd,
      httpOnly: true,
      maxAge: env.ANALYTICS_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60,
    });
  }

  return visitorId;
};

const incrementSiteTrafficBucket = async (
  tx: SiteAnalyticsDb,
  granularity: TrafficBucketGranularity,
  bucketStart: Date,
  isAuthenticated: boolean,
) => {
  await tx.siteTrafficBucket.createMany({
    data: [{
      granularity,
      bucketStart,
      pageViews: 0,
      authenticatedPageViews: 0,
      anonymousPageViews: 0,
    }],
    skipDuplicates: true,
  });

  await tx.siteTrafficBucket.update({
    where: {
      granularity_bucketStart: {
        granularity,
        bucketStart,
      },
    },
    data: {
      pageViews: {
        increment: 1,
      },
      authenticatedPageViews: {
        increment: isAuthenticated ? 1 : 0,
      },
      anonymousPageViews: {
        increment: isAuthenticated ? 0 : 1,
      },
    },
  });
};

const recordArticleView = async (tx: SiteAnalyticsDb, articleId: string, visitorId: string, date: Date) => {
  await tx.articleDailyStats.createMany({
    data: [{
      articleId,
      date,
      views: 0,
      uniqueVisitors: 0,
    }],
    skipDuplicates: true,
  });

  // this dedup table guarantees unique visitors are incremented once per article per day
  const uniqueInsert = await tx.articleDailyVisitor.createMany({
    data: [{
      articleId,
      date,
      visitorId,
    }],
    skipDuplicates: true,
  });

  const uniqueIncrement = uniqueInsert.count > 0 ? 1 : 0;

  return tx.articleDailyStats.update({
    where: {
      articleId_date: {
        articleId,
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
};

const recordSiteActivity = async (args: {
  tx: SiteAnalyticsDb;
  visitorId: string;
  userId: string | null;
  trackedPath: string;
  kind: 'pageview' | 'heartbeat';
  articleId?: string;
  now: Date;
}) => {
  const { tx, visitorId, userId, trackedPath, kind, articleId, now } = args;
  const isAuthenticated = Boolean(userId);
  const dayStart = utcDayStart(now);

  await tx.siteVisitor.upsert({
    where: {
      visitorId,
    },
    update: {
      userId,
      lastSeenAt: now,
      lastPath: trackedPath,
    },
    create: {
      visitorId,
      userId,
      firstSeenAt: now,
      lastSeenAt: now,
      lastPath: trackedPath,
    },
  });

  if (kind !== 'pageview') {
    return {
      article: null,
    };
  }

  await Promise.all([
    incrementSiteTrafficBucket(tx, 'HOUR', utcHourStart(now), isAuthenticated),
    incrementSiteTrafficBucket(tx, 'DAY', dayStart, isAuthenticated),
    tx.siteDailyVisitor.createMany({
      data: [{
        date: dayStart,
        visitorId,
        userId,
        isAuthenticated,
      }],
      skipDuplicates: true,
    }),
  ]);

  const articleStats = articleId
    ? await recordArticleView(tx, articleId, visitorId, dayStart)
    : null;

  return {
    article: articleStats,
  };
};

const buildTrafficSeries = (args: {
  rows: BucketRow[];
  from: Date;
  intervals: number;
  stepMs: number;
}) => {
  const rowByKey = new Map(args.rows.map((row) => [row.bucketStart.toISOString(), row]));

  return Array.from({ length: args.intervals }, (_value, index) => {
    const bucketStart = new Date(args.from.getTime() + (index * args.stepMs));
    const row = rowByKey.get(bucketStart.toISOString());

    return {
      bucketStart: bucketStart.toISOString(),
      pageViews: row?.pageViews ?? 0,
      authenticatedPageViews: row?.authenticatedPageViews ?? 0,
      anonymousPageViews: row?.anonymousPageViews ?? 0,
    };
  });
};

const toCount = (rows: Array<{ count: bigint }>) => {
  return Number(rows[0]?.count ?? 0n);
};

export const registerAnalyticsRoutes = async (app: FastifyInstance) => {
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

    const visitorId = resolveVisitorId(request, reply);
    const date = utcDayStart();

    const stats = await app.prisma.$transaction((tx) => {
      return recordArticleView(tx, article.id, visitorId, date);
    });

    reply.send({
      articleId: article.id,
      date: formatUtcDate(date),
      views: stats.views,
      uniqueVisitors: stats.uniqueVisitors,
    });
  });

  app.post('/api/analytics/activity', {
    config: {
      rateLimit: {
        max: 360,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    const parsed = activitySchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400).send({ error: 'bad_request', message: parsed.error.issues[0]?.message ?? 'invalid request body' });
      return;
    }

    const trackedPath = normalizeTrackedPath(parsed.data.path);
    const visitorId = resolveVisitorId(request, reply);

    const article = parsed.data.articleId
      ? await app.prisma.article.findUnique({
        where: {
          id: parsed.data.articleId,
        },
        select: {
          id: true,
        },
      })
      : null;

    if (parsed.data.articleId && !article) {
      reply.code(404).send({ error: 'not_found', message: 'article not found' });
      return;
    }

    const now = new Date();
    const result = await app.prisma.$transaction((tx) => {
      return recordSiteActivity({
        tx,
        visitorId,
        userId: request.auth?.userId ?? null,
        trackedPath,
        kind: parsed.data.kind,
        ...(article ? { articleId: article.id } : {}),
        now,
      });
    });

    reply.send({
      ok: true,
      trackedAt: now.toISOString(),
      article: article && result.article
        ? {
          articleId: article.id,
          views: result.article.views,
          uniqueVisitors: result.article.uniqueVisitors,
        }
        : null,
    });
  });

  app.get('/api/admin/analytics/dashboard', {
    preHandler: [requireAuth, requireRoles('ADMIN')],
  }, async (_request, reply) => {
    const now = new Date();
    const currentHourStart = utcHourStart(now);
    const currentDayStart = utcDayStart(now);
    const currentMonthStart = utcMonthStart(now);
    const previousMonthStart = utcMonthStart(new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth() - 1,
      1,
    )));
    const previousMonthDays = Math.round((currentMonthStart.getTime() - previousMonthStart.getTime()) / dayMs);
    const onlineSince = new Date(now.getTime() - (SITE_ANALYTICS_ONLINE_WINDOW_MINUTES * 60 * 1000));
    const guestWindowStart = new Date(currentDayStart.getTime() - ((SITE_ANALYTICS_GUEST_WINDOW_DAYS - 1) * dayMs));
    const daySeriesStart = new Date(currentHourStart.getTime() - (23 * hourMs));
    const weekSeriesStart = new Date(currentDayStart.getTime() - (6 * dayMs));
    const monthSeriesStart = new Date(currentDayStart.getTime() - (29 * dayMs));

    const [registeredUsers, anonymousVisitors, registeredOnline, anonymousOnline, hourlyBuckets, dailyBuckets] = await Promise.all([
      app.prisma.user.count(),
      app.prisma.$queryRaw<Array<{ count: bigint }>>`
        select count(distinct "visitorId")::bigint as count
        from "SiteDailyVisitor"
        where "isAuthenticated" = false
          and "date" >= ${guestWindowStart}
      `.then(toCount),
      app.prisma.$queryRaw<Array<{ count: bigint }>>`
        select count(distinct "userId")::bigint as count
        from "SiteVisitor"
        where "userId" is not null
          and "lastSeenAt" >= ${onlineSince}
      `.then(toCount),
      app.prisma.siteVisitor.count({
        where: {
          userId: null,
          lastSeenAt: {
            gte: onlineSince,
          },
        },
      }),
      app.prisma.siteTrafficBucket.findMany({
        where: {
          granularity: 'HOUR',
          bucketStart: {
            gte: daySeriesStart,
          },
        },
        select: {
          bucketStart: true,
          pageViews: true,
          authenticatedPageViews: true,
          anonymousPageViews: true,
        },
        orderBy: {
          bucketStart: 'asc',
        },
      }),
      app.prisma.siteTrafficBucket.findMany({
        where: {
          granularity: 'DAY',
          bucketStart: {
            gte: previousMonthStart,
          },
        },
        select: {
          bucketStart: true,
          pageViews: true,
          authenticatedPageViews: true,
          anonymousPageViews: true,
        },
        orderBy: {
          bucketStart: 'asc',
        },
      }),
    ]);

    reply.send({
      generatedAt: now.toISOString(),
      onlineWindowMinutes: SITE_ANALYTICS_ONLINE_WINDOW_MINUTES,
      anonymousVisitorWindowDays: SITE_ANALYTICS_GUEST_WINDOW_DAYS,
      totals: {
        registeredUsers,
        anonymousVisitors,
        registeredOnline,
        anonymousOnline,
      },
      series: {
        day: buildTrafficSeries({
          rows: hourlyBuckets,
          from: daySeriesStart,
          intervals: 24,
          stepMs: hourMs,
        }),
        week: buildTrafficSeries({
          rows: dailyBuckets.filter((row) => row.bucketStart >= weekSeriesStart),
          from: weekSeriesStart,
          intervals: 7,
          stepMs: dayMs,
        }),
        month: buildTrafficSeries({
          rows: dailyBuckets.filter((row) => row.bucketStart >= monthSeriesStart),
          from: monthSeriesStart,
          intervals: 30,
          stepMs: dayMs,
        }),
        previousMonth: buildTrafficSeries({
          rows: dailyBuckets.filter((row) => row.bucketStart >= previousMonthStart && row.bucketStart < currentMonthStart),
          from: previousMonthStart,
          intervals: previousMonthDays,
          stepMs: dayMs,
        }),
      },
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
    const from = utcDayStart(new Date(Date.now() - ((days - 1) * dayMs)));

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
