import type { ArticleSection, ArticleSource } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getEnv } from '../config/env.js';
import { normalizePage } from '../lib/pagination.js';
import { createPresignedGetUrl, createStorageClient } from '../lib/storage.js';
import { requireAuth, requireRoles } from '../plugins/auth.js';

const ensureSchema = z.object({
  source: z.enum(['local', 'ghost']),
  externalId: z.string().trim().min(1).max(200).optional(),
  slug: z.string().trim().min(1).max(200).optional(),
  title: z.string().trim().min(1).max(280).optional(),
  excerpt: z.string().trim().max(2000).optional(),
  section: z.enum(['journal', 'research', 'nova']).optional(),
  canonicalPath: z.string().trim().min(1).max(300).refine((value) => value.startsWith('/article/'), {
    message: 'canonicalPath must start with /article/',
  }).optional(),
  featureImage: z.string().trim().max(2000).optional(),
});

const listQuerySchema = z.object({
  section: z.enum(['journal', 'research', 'nova']).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(50).optional(),
});

const sectionMap: Record<'journal' | 'research' | 'nova', ArticleSection> = {
  journal: 'JOURNAL',
  research: 'RESEARCH',
  nova: 'NOVA',
};

const sourceMap: Record<'local' | 'ghost', ArticleSource> = {
  local: 'LOCAL',
  ghost: 'GHOST',
};

const mapSectionFromDb = (section: ArticleSection): 'journal' | 'research' | 'nova' => {
  if (section === 'RESEARCH') {
    return 'research';
  }
  if (section === 'NOVA') {
    return 'nova';
  }
  return 'journal';
};

const normalizeFeatureImage = (rawValue?: string): string | undefined => {
  const value = rawValue?.trim();
  if (!value) {
    return undefined;
  }

  const candidate = value.startsWith('//') ? `https:${value}` : value;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    return undefined;
  }

  return undefined;
};

export const registerArticleRoutes = async (app: FastifyInstance) => {
  const env = getEnv();
  const storageClient = createStorageClient(env);

  app.post('/api/articles/ensure', {
    config: {
      rateLimit: {
        max: 120,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    const parsed = ensureSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400).send({ error: 'bad_request', message: parsed.error.issues[0]?.message ?? 'invalid request body' });
      return;
    }

    const body = parsed.data;
    const source = sourceMap[body.source];
    const section = body.section ? sectionMap[body.section] : 'JOURNAL';
    const resolvedSlug = (body.slug ?? body.externalId ?? '').trim();
    const normalizedFeatureImage = normalizeFeatureImage(body.featureImage);

    if (!resolvedSlug) {
      reply.code(400).send({ error: 'bad_request', message: 'slug or externalId is required' });
      return;
    }

    const canonicalPath = body.canonicalPath ?? `/article/${resolvedSlug}`;

    const createData = {
      source,
      externalId: body.externalId ?? null,
      slug: resolvedSlug,
      canonicalPath,
      title: body.title ?? resolvedSlug,
      excerpt: body.excerpt ?? '',
      section,
      featureImage: normalizedFeatureImage,
      publishedAt: new Date(),
    };

    const updateData = {
      slug: resolvedSlug,
      title: body.title ?? undefined,
      excerpt: body.excerpt ?? undefined,
      canonicalPath,
      section,
      featureImage: normalizedFeatureImage,
    };

    // this lazy upsert guarantees a stable internal article id before analytics or engagement writes
    const article = body.externalId
      ? await app.prisma.article.upsert({
        where: {
          source_externalId: {
            source,
            externalId: body.externalId,
          },
        },
        create: createData,
        update: updateData,
        select: {
          id: true,
          source: true,
          externalId: true,
          slug: true,
          section: true,
        },
      })
      : await app.prisma.article.upsert({
        where: {
          source_slug: {
            source,
            slug: resolvedSlug,
          },
        },
        create: createData,
        update: updateData,
        select: {
          id: true,
          source: true,
          externalId: true,
          slug: true,
          section: true,
        },
      });

    reply.send({
      articleId: article.id,
      article: {
        id: article.id,
        source: article.source.toLowerCase(),
        externalId: article.externalId,
        slug: article.slug,
        section: mapSectionFromDb(article.section),
      },
    });
  });

  app.get('/api/content/articles', async (request, reply) => {
    const parsed = listQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      reply.code(400).send({ error: 'bad_request', message: 'invalid query parameters' });
      return;
    }

    const { page, pageSize, skip, take } = normalizePage(parsed.data.page, parsed.data.pageSize, 50);
    const section = parsed.data.section ? sectionMap[parsed.data.section] : undefined;

    const where = {
      source: 'LOCAL' as ArticleSource,
      ...(section ? { section } : {}),
    };

    const [total, items] = await Promise.all([
      app.prisma.article.count({ where }),
      app.prisma.article.findMany({
        where,
        orderBy: {
          publishedAt: 'desc',
        },
        skip,
        take,
        include: {
          authorUser: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              bookmarks: true,
              reactions: true,
            },
          },
        },
      }),
    ]);

    reply.send({
      items: items.map((item) => ({
        id: item.id,
        internalArticleId: item.id,
        source: item.source.toLowerCase(),
        slug: item.slug,
        canonicalPath: item.canonicalPath,
        title: item.title,
        excerpt: item.excerpt,
        htmlContent: item.htmlContent,
        featureImage: item.featureImage,
        section: mapSectionFromDb(item.section),
        publishedAt: item.publishedAt,
        author: item.authorUser,
        bookmarkCount: item._count.bookmarks,
        reactionCount: item._count.reactions,
        pdfAvailable: Boolean(item.pdfStorageKey),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  });

  app.get('/api/content/articles/:slug', async (request, reply) => {
    const params = z.object({ slug: z.string().trim().min(1) }).safeParse(request.params);
    if (!params.success) {
      reply.code(400).send({ error: 'bad_request', message: 'invalid article slug' });
      return;
    }

    const item = await app.prisma.article.findUnique({
      where: {
        source_slug: {
          source: 'LOCAL',
          slug: params.data.slug,
        },
      },
      include: {
        authorUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!item) {
      reply.code(404).send({ error: 'not_found', message: 'article not found' });
      return;
    }

    reply.send({
      article: {
        id: item.id,
        internalArticleId: item.id,
        source: item.source.toLowerCase(),
        externalId: item.externalId,
        slug: item.slug,
        canonicalPath: item.canonicalPath,
        title: item.title,
        excerpt: item.excerpt,
        htmlContent: item.htmlContent,
        featureImage: item.featureImage,
        section: mapSectionFromDb(item.section),
        publishedAt: item.publishedAt,
        author: item.authorUser,
        pdfAvailable: Boolean(item.pdfStorageKey),
      },
    });
  });

  app.get('/api/articles/:id/engagement', async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).safeParse(request.params);
    if (!params.success) {
      reply.code(400).send({ error: 'bad_request', message: 'invalid article id' });
      return;
    }

    const article = await app.prisma.article.findUnique({
      where: { id: params.data.id },
      select: { id: true },
    });

    if (!article) {
      reply.code(404).send({ error: 'not_found', message: 'article not found' });
      return;
    }

    const [bookmarkCount, reactionCounts, stats] = await Promise.all([
      app.prisma.bookmark.count({ where: { articleId: article.id } }),
      app.prisma.reaction.groupBy({
        by: ['type'],
        where: { articleId: article.id },
        _count: {
          type: true,
        },
      }),
      app.prisma.articleDailyStats.aggregate({
        where: { articleId: article.id },
        _sum: {
          views: true,
          uniqueVisitors: true,
        },
      }),
    ]);

    reply.send({
      bookmarkCount,
      reactionCounts: reactionCounts.reduce<Record<string, number>>((acc, item) => {
        acc[item.type.toLowerCase()] = item._count.type;
        return acc;
      }, {}),
      totalViews: stats._sum.views ?? 0,
      totalUniqueVisitors: stats._sum.uniqueVisitors ?? 0,
    });
  });

  app.get('/api/articles/:id/bookmark/me', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    if (!request.auth) {
      return;
    }

    const params = z.object({ id: z.string().min(1) }).safeParse(request.params);
    if (!params.success) {
      reply.code(400).send({ error: 'bad_request', message: 'invalid article id' });
      return;
    }

    const bookmark = await app.prisma.bookmark.findUnique({
      where: {
        userId_articleId: {
          userId: request.auth.userId,
          articleId: params.data.id,
        },
      },
      select: {
        id: true,
      },
    });

    reply.send({ bookmarked: Boolean(bookmark) });
  });

  app.get('/api/articles/:id/download', {
    preHandler: [requireAuth, requireRoles('AUTHOR', 'ADMIN')],
  }, async (request, reply) => {
    if (!request.auth) {
      return;
    }

    const params = z.object({ id: z.string().min(1) }).safeParse(request.params);
    if (!params.success) {
      reply.code(400).send({ error: 'bad_request', message: 'invalid article id' });
      return;
    }

    const article = await app.prisma.article.findUnique({
      where: {
        id: params.data.id,
      },
      select: {
        id: true,
        pdfStorageKey: true,
        title: true,
      },
    });

    if (!article || !article.pdfStorageKey) {
      reply.code(404).send({ error: 'not_found', message: 'article pdf not found' });
      return;
    }

    // this endpoint returns only a short-lived signed url and does not proxy file bytes through the api
    const url = await createPresignedGetUrl({
      client: storageClient,
      bucket: env.S3_BUCKET,
      key: article.pdfStorageKey,
      expiresInSeconds: env.S3_SIGNED_URL_EXPIRES_SECONDS,
    });

    reply.send({
      url,
      expiresInSeconds: env.S3_SIGNED_URL_EXPIRES_SECONDS,
      article: {
        id: article.id,
        title: article.title,
      },
    });
  });
};
