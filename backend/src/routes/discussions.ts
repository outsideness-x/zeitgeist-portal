import { Prisma } from '@prisma/client';
import type { AdminNotificationType, DiscussionTargetType } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { writeAuditLog } from '../lib/audit.js';
import { normalizePage } from '../lib/pagination.js';
import { requireAuth, requireCsrf, requireRoles } from '../plugins/auth.js';

const MAX_DISCUSSION_DEPTH = 2;
const MAX_DISCUSSION_PAGE_SIZE = 20;
const MAX_NOTIFICATION_PAGE_SIZE = 50;
const MIN_DISCUSSION_TEXT_LENGTH = 2;
const MAX_DISCUSSION_TEXT_LENGTH = 4000;
const NOTIFICATION_PREVIEW_LENGTH = 180;
const PRODUCT_TARGET_ID_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,119})$/;

const listDiscussionQuerySchema = z.object({
  targetType: z.enum(['article', 'product']),
  targetId: z.string().trim().min(1).max(200),
  sort: z.enum(['newest', 'oldest']).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(MAX_DISCUSSION_PAGE_SIZE).optional(),
});

const createDiscussionBodySchema = z.object({
  targetType: z.enum(['article', 'product']),
  targetId: z.string().trim().min(1).max(200),
  parentId: z.string().trim().min(1).max(200).optional(),
  content: z.string().min(1).max(MAX_DISCUSSION_TEXT_LENGTH * 2),
});

const discussionIdParamsSchema = z.object({
  id: z.string().trim().min(1).max(200),
});

const listNotificationQuerySchema = z.object({
  unread: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(MAX_NOTIFICATION_PAGE_SIZE).optional(),
});

const targetTypeMap: Record<'article' | 'product', DiscussionTargetType> = {
  article: 'ARTICLE',
  product: 'PRODUCT',
};

const notificationTypeMap: Record<DiscussionTargetType, AdminNotificationType> = {
  ARTICLE: 'ARTICLE_COMMENT',
  PRODUCT: 'PRODUCT_REVIEW',
};

const discussionEntrySelect = {
  id: true,
  targetType: true,
  targetId: true,
  parentId: true,
  depth: true,
  content: true,
  isDeleted: true,
  deletedAt: true,
  likeCount: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: {
      id: true,
      name: true,
      avatarDataUrl: true,
    },
  },
} satisfies Prisma.DiscussionEntrySelect;

type DiscussionEntryRow = Prisma.DiscussionEntryGetPayload<{ select: typeof discussionEntrySelect }>;
type DiscussionDbClient = FastifyInstance['prisma'] | Prisma.TransactionClient;
type DiscussionTreeNode = {
  id: string;
  targetType: 'article' | 'product';
  targetId: string;
  parentId: string | null;
  depth: number;
  content: string | null;
  isDeleted: boolean;
  deletedAt: string | null;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    avatarDataUrl: string | null;
  };
  viewer: {
    liked: boolean;
    canDelete: boolean;
    canReply: boolean;
    canLike: boolean;
  };
  replies: DiscussionTreeNode[];
};

const normalizeDiscussionContent = (rawValue: string): string => {
  return rawValue
    .replace(/\r\n?/g, '\n')
    .replace(/\u0000/g, '')
    .trim();
};

const buildNotificationPreview = (content: string): string => {
  const compact = content.replace(/\s+/g, ' ').trim();
  if (compact.length <= NOTIFICATION_PREVIEW_LENGTH) {
    return compact;
  }

  return `${compact.slice(0, NOTIFICATION_PREVIEW_LENGTH - 1)}…`;
};

const mapTargetTypeToClient = (value: DiscussionTargetType): 'article' | 'product' => {
  if (value === 'PRODUCT') {
    return 'product';
  }

  return 'article';
};

const mapNotificationTypeToClient = (value: AdminNotificationType): 'article_comment' | 'product_review' => {
  if (value === 'PRODUCT_REVIEW') {
    return 'product_review';
  }

  return 'article_comment';
};

const normalizeTargetId = (targetType: DiscussionTargetType, targetId: string): string => {
  if (targetType === 'PRODUCT') {
    return targetId.trim().toLowerCase();
  }

  return targetId.trim();
};

const ensureTargetExists = async (args: {
  app: FastifyInstance;
  targetType: DiscussionTargetType;
  targetId: string;
}): Promise<{ ok: true; targetId: string } | { ok: false; statusCode: number; message: string }> => {
  const normalizedTargetId = normalizeTargetId(args.targetType, args.targetId);

  if (args.targetType === 'PRODUCT') {
    if (!PRODUCT_TARGET_ID_PATTERN.test(normalizedTargetId)) {
      return {
        ok: false,
        statusCode: 400,
        message: 'invalid product target id',
      };
    }

    return {
      ok: true,
      targetId: normalizedTargetId,
    };
  }

  const article = await args.app.prisma.article.findUnique({
    where: {
      id: normalizedTargetId,
    },
    select: {
      id: true,
    },
  });

  if (!article) {
    return {
      ok: false,
      statusCode: 404,
      message: 'article not found',
    };
  }

  return {
    ok: true,
    targetId: article.id,
  };
};

const readLikeSummary = async (args: {
  db: DiscussionDbClient;
  entryId: string;
  userId: string;
}) => {
  const [entry, like] = await Promise.all([
    args.db.discussionEntry.findUnique({
      where: {
        id: args.entryId,
      },
      select: {
        id: true,
        likeCount: true,
      },
    }),
    args.db.discussionLike.findUnique({
      where: {
        entryId_userId: {
          entryId: args.entryId,
          userId: args.userId,
        },
      },
      select: {
        id: true,
      },
    }),
  ]);

  if (!entry) {
    return null;
  }

  return {
    likeCount: entry.likeCount,
    viewer: {
      liked: Boolean(like),
    },
  };
};

const createAdminNotifications = async (args: {
  tx: Prisma.TransactionClient;
  actorUserId: string;
  discussionEntryId: string;
  targetType: DiscussionTargetType;
  targetId: string;
  content: string;
}) => {
  const admins = await args.tx.user.findMany({
    where: {
      role: 'ADMIN',
    },
    select: {
      id: true,
    },
  });

  if (admins.length === 0) {
    return;
  }

  const textPreview = buildNotificationPreview(args.content);
  const type = notificationTypeMap[args.targetType];

  await args.tx.adminNotification.createMany({
    data: admins.map((admin) => ({
      recipientAdminUserId: admin.id,
      actorUserId: args.actorUserId,
      discussionEntryId: args.discussionEntryId,
      type,
      targetType: args.targetType,
      targetId: args.targetId,
      textPreview,
    })),
  });
};

const serializeDiscussionTree = (args: {
  entry: DiscussionEntryRow;
  childrenByParentId: Map<string, DiscussionEntryRow[]>;
  likedEntryIds: Set<string>;
  canDelete: boolean;
}): DiscussionTreeNode => {
  const children = args.childrenByParentId.get(args.entry.id) ?? [];

  return {
    id: args.entry.id,
    targetType: mapTargetTypeToClient(args.entry.targetType),
    targetId: args.entry.targetId,
    parentId: args.entry.parentId,
    depth: args.entry.depth,
    content: args.entry.isDeleted ? null : args.entry.content,
    isDeleted: args.entry.isDeleted,
    deletedAt: args.entry.deletedAt?.toISOString() ?? null,
    likeCount: args.entry.likeCount,
    createdAt: args.entry.createdAt.toISOString(),
    updatedAt: args.entry.updatedAt.toISOString(),
    author: {
      id: args.entry.author.id,
      name: args.entry.author.name,
      avatarDataUrl: args.entry.author.avatarDataUrl,
    },
    viewer: {
      liked: args.likedEntryIds.has(args.entry.id),
      canDelete: args.canDelete,
      canReply: args.entry.depth < MAX_DISCUSSION_DEPTH,
      canLike: !args.entry.isDeleted,
    },
    replies: children.map((child) => serializeDiscussionTree({
      entry: child,
      childrenByParentId: args.childrenByParentId,
      likedEntryIds: args.likedEntryIds,
      canDelete: args.canDelete,
    })),
  };
};

export const registerDiscussionRoutes = async (app: FastifyInstance) => {
  app.get('/api/discussions', async (request, reply) => {
    const query = listDiscussionQuerySchema.safeParse(request.query);
    if (!query.success) {
      reply.code(400).send({ error: 'bad_request', message: 'invalid query parameters' });
      return;
    }

    const targetType = targetTypeMap[query.data.targetType];
    const targetCheck = await ensureTargetExists({
      app,
      targetType,
      targetId: query.data.targetId,
    });

    if (!targetCheck.ok) {
      reply.code(targetCheck.statusCode).send({ error: 'request_error', message: targetCheck.message });
      return;
    }

    const sort = query.data.sort ?? 'newest';
    const orderDirection = sort === 'oldest' ? 'asc' : 'desc';
    const { page, pageSize, skip, take } = normalizePage(query.data.page, query.data.pageSize, MAX_DISCUSSION_PAGE_SIZE);

    const where = {
      targetType,
      targetId: targetCheck.targetId,
      parentId: null,
    } satisfies Prisma.DiscussionEntryWhereInput;

    const [total, roots] = await Promise.all([
      app.prisma.discussionEntry.count({ where }),
      app.prisma.discussionEntry.findMany({
        where,
        select: discussionEntrySelect,
        orderBy: [
          {
            createdAt: orderDirection,
          },
          {
            id: 'asc',
          },
        ],
        skip,
        take,
      }),
    ]);

    if (roots.length === 0) {
      reply.send({
        items: [],
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        sort,
        maxDepth: MAX_DISCUSSION_DEPTH,
      });
      return;
    }

    const nestedEntries: DiscussionEntryRow[] = [];
    let parentIds = roots.map((item) => item.id);

    for (let level = 1; level <= MAX_DISCUSSION_DEPTH; level += 1) {
      if (parentIds.length === 0) {
        break;
      }

      const children = await app.prisma.discussionEntry.findMany({
        where: {
          parentId: {
            in: parentIds,
          },
        },
        select: discussionEntrySelect,
        orderBy: [
          {
            createdAt: 'asc',
          },
          {
            id: 'asc',
          },
        ],
      });

      if (children.length === 0) {
        break;
      }

      nestedEntries.push(...children);
      parentIds = children.map((item) => item.id);
    }

    const allEntries = [...roots, ...nestedEntries];
    const allEntryIds = allEntries.map((item) => item.id);

    const likedRows = request.auth && allEntryIds.length > 0
      ? await app.prisma.discussionLike.findMany({
        where: {
          userId: request.auth.userId,
          entryId: {
            in: allEntryIds,
          },
        },
        select: {
          entryId: true,
        },
      })
      : [];

    const likedEntryIds = new Set(likedRows.map((row) => row.entryId));
    const canDelete = request.auth?.role === 'ADMIN';
    const childrenByParentId = new Map<string, DiscussionEntryRow[]>();

    for (const item of nestedEntries) {
      const parentId = item.parentId;
      if (!parentId) {
        continue;
      }

      const currentItems = childrenByParentId.get(parentId) ?? [];
      currentItems.push(item);
      childrenByParentId.set(parentId, currentItems);
    }

    reply.send({
      items: roots.map((entry) => serializeDiscussionTree({
        entry,
        childrenByParentId,
        likedEntryIds,
        canDelete,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      sort,
      maxDepth: MAX_DISCUSSION_DEPTH,
    });
  });

  app.post('/api/discussions', {
    preHandler: [requireAuth, requireCsrf],
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    const auth = request.auth;
    if (!auth) {
      return;
    }

    const body = createDiscussionBodySchema.safeParse(request.body);
    if (!body.success) {
      reply.code(400).send({ error: 'bad_request', message: 'invalid request payload' });
      return;
    }

    const targetType = targetTypeMap[body.data.targetType];
    const targetCheck = await ensureTargetExists({
      app,
      targetType,
      targetId: body.data.targetId,
    });

    if (!targetCheck.ok) {
      reply.code(targetCheck.statusCode).send({ error: 'request_error', message: targetCheck.message });
      return;
    }

    const normalizedContent = normalizeDiscussionContent(body.data.content);
    if (normalizedContent.length < MIN_DISCUSSION_TEXT_LENGTH || normalizedContent.length > MAX_DISCUSSION_TEXT_LENGTH) {
      reply.code(400).send({
        error: 'bad_request',
        message: `content length must be between ${MIN_DISCUSSION_TEXT_LENGTH} and ${MAX_DISCUSSION_TEXT_LENGTH} characters`,
      });
      return;
    }

    const parentId = body.data.parentId ?? null;

    const actionResult = await app.prisma.$transaction(async (tx) => {
      let depth = 0;

      if (parentId) {
        const parentEntry = await tx.discussionEntry.findUnique({
          where: {
            id: parentId,
          },
          select: {
            id: true,
            targetType: true,
            targetId: true,
            depth: true,
          },
        });

        if (!parentEntry) {
          return {
            kind: 'parent_not_found' as const,
          };
        }

        if (parentEntry.targetType !== targetType || parentEntry.targetId !== targetCheck.targetId) {
          return {
            kind: 'parent_mismatch' as const,
          };
        }

        if (parentEntry.depth >= MAX_DISCUSSION_DEPTH) {
          return {
            kind: 'depth_limit' as const,
          };
        }

        depth = parentEntry.depth + 1;
      }

      const possibleDuplicate = await tx.discussionEntry.findFirst({
        where: {
          targetType,
          targetId: targetCheck.targetId,
          parentId,
          authorUserId: auth.userId,
          content: normalizedContent,
          createdAt: {
            gt: new Date(Date.now() - 15_000),
          },
        },
        select: {
          id: true,
        },
      });

      if (possibleDuplicate) {
        return {
          kind: 'duplicate_recent' as const,
        };
      }

      const createdEntry = await tx.discussionEntry.create({
        data: {
          targetType,
          targetId: targetCheck.targetId,
          parentId,
          depth,
          authorUserId: auth.userId,
          content: normalizedContent,
        },
        select: discussionEntrySelect,
      });

      await createAdminNotifications({
        tx,
        actorUserId: auth.userId,
        discussionEntryId: createdEntry.id,
        targetType,
        targetId: targetCheck.targetId,
        content: normalizedContent,
      });

      return {
        kind: 'created' as const,
        entry: createdEntry,
      };
    });

    if (actionResult.kind === 'parent_not_found') {
      reply.code(404).send({ error: 'not_found', message: 'parent discussion entry not found' });
      return;
    }

    if (actionResult.kind === 'parent_mismatch') {
      reply.code(400).send({ error: 'bad_request', message: 'parent discussion entry does not match the target' });
      return;
    }

    if (actionResult.kind === 'depth_limit') {
      reply.code(400).send({ error: 'bad_request', message: 'maximum reply depth reached' });
      return;
    }

    if (actionResult.kind === 'duplicate_recent') {
      reply.code(409).send({ error: 'conflict', message: 'duplicate discussion entry detected' });
      return;
    }

    await writeAuditLog({
      prisma: app.prisma,
      actorUserId: auth.userId,
      action: 'discussion.create',
      entityType: 'discussion_entry',
      entityId: actionResult.entry.id,
      metadata: {
        targetType: actionResult.entry.targetType,
        targetId: actionResult.entry.targetId,
        parentId: actionResult.entry.parentId,
      },
    });

    reply.code(201).send({
      entry: serializeDiscussionTree({
        entry: actionResult.entry,
        childrenByParentId: new Map(),
        likedEntryIds: new Set(),
        canDelete: auth.role === 'ADMIN',
      }),
    });
  });

  app.post('/api/discussions/:id/like', {
    preHandler: [requireAuth, requireCsrf],
    config: {
      rateLimit: {
        max: 180,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    const auth = request.auth;
    if (!auth) {
      return;
    }

    const params = discussionIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      reply.code(400).send({ error: 'bad_request', message: 'invalid discussion entry id' });
      return;
    }

    const actionResult = await app.prisma.$transaction(async (tx) => {
      const entry = await tx.discussionEntry.findUnique({
        where: {
          id: params.data.id,
        },
        select: {
          id: true,
          targetType: true,
          targetId: true,
          isDeleted: true,
        },
      });

      if (!entry) {
        return { kind: 'not_found' as const };
      }

      if (entry.isDeleted) {
        return { kind: 'deleted' as const };
      }

      const inserted = await tx.discussionLike.createMany({
        data: [{
          entryId: entry.id,
          userId: auth.userId,
        }],
        skipDuplicates: true,
      });

      if (inserted.count > 0) {
        await tx.discussionEntry.update({
          where: {
            id: entry.id,
          },
          data: {
            likeCount: {
              increment: 1,
            },
          },
        });
      }

      const summary = await readLikeSummary({
        db: tx,
        entryId: entry.id,
        userId: auth.userId,
      });

      return {
        kind: 'ok' as const,
        entry,
        summary,
      };
    });

    if (actionResult.kind === 'not_found') {
      reply.code(404).send({ error: 'not_found', message: 'discussion entry not found' });
      return;
    }

    if (actionResult.kind === 'deleted') {
      reply.code(409).send({ error: 'conflict', message: 'discussion entry is deleted' });
      return;
    }

    if (!actionResult.summary) {
      reply.code(404).send({ error: 'not_found', message: 'discussion entry not found' });
      return;
    }

    await writeAuditLog({
      prisma: app.prisma,
      actorUserId: auth.userId,
      action: 'discussion.like.set',
      entityType: 'discussion_entry',
      entityId: actionResult.entry.id,
      metadata: {
        targetType: actionResult.entry.targetType,
        targetId: actionResult.entry.targetId,
      },
    });

    reply.send(actionResult.summary);
  });

  app.delete('/api/discussions/:id/like', {
    preHandler: [requireAuth, requireCsrf],
    config: {
      rateLimit: {
        max: 180,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    const auth = request.auth;
    if (!auth) {
      return;
    }

    const params = discussionIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      reply.code(400).send({ error: 'bad_request', message: 'invalid discussion entry id' });
      return;
    }

    const actionResult = await app.prisma.$transaction(async (tx) => {
      const entry = await tx.discussionEntry.findUnique({
        where: {
          id: params.data.id,
        },
        select: {
          id: true,
          targetType: true,
          targetId: true,
          isDeleted: true,
        },
      });

      if (!entry) {
        return { kind: 'not_found' as const };
      }

      if (entry.isDeleted) {
        return { kind: 'deleted' as const };
      }

      const deleted = await tx.discussionLike.deleteMany({
        where: {
          entryId: entry.id,
          userId: auth.userId,
        },
      });

      if (deleted.count > 0) {
        await tx.$executeRaw`
          UPDATE "DiscussionEntry"
          SET "likeCount" = GREATEST("likeCount" - ${deleted.count}, 0)
          WHERE "id" = ${entry.id}
        `;
      }

      const summary = await readLikeSummary({
        db: tx,
        entryId: entry.id,
        userId: auth.userId,
      });

      return {
        kind: 'ok' as const,
        entry,
        summary,
      };
    });

    if (actionResult.kind === 'not_found') {
      reply.code(404).send({ error: 'not_found', message: 'discussion entry not found' });
      return;
    }

    if (actionResult.kind === 'deleted') {
      reply.code(409).send({ error: 'conflict', message: 'discussion entry is deleted' });
      return;
    }

    if (!actionResult.summary) {
      reply.code(404).send({ error: 'not_found', message: 'discussion entry not found' });
      return;
    }

    await writeAuditLog({
      prisma: app.prisma,
      actorUserId: auth.userId,
      action: 'discussion.like.clear',
      entityType: 'discussion_entry',
      entityId: actionResult.entry.id,
      metadata: {
        targetType: actionResult.entry.targetType,
        targetId: actionResult.entry.targetId,
      },
    });

    reply.send(actionResult.summary);
  });

  app.delete('/api/admin/discussions/:id', {
    preHandler: [requireAuth, requireCsrf, requireRoles('ADMIN')],
    config: {
      rateLimit: {
        max: 80,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    const auth = request.auth;
    if (!auth) {
      return;
    }

    const params = discussionIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      reply.code(400).send({ error: 'bad_request', message: 'invalid discussion entry id' });
      return;
    }

    const actionResult = await app.prisma.$transaction(async (tx) => {
      const entry = await tx.discussionEntry.findUnique({
        where: {
          id: params.data.id,
        },
        select: {
          id: true,
          targetType: true,
          targetId: true,
          isDeleted: true,
        },
      });

      if (!entry) {
        return { kind: 'not_found' as const };
      }

      if (entry.isDeleted) {
        return {
          kind: 'already_deleted' as const,
          entry,
        };
      }

      await tx.discussionLike.deleteMany({
        where: {
          entryId: entry.id,
        },
      });

      const updatedEntry = await tx.discussionEntry.update({
        where: {
          id: entry.id,
        },
        data: {
          content: '',
          isDeleted: true,
          deletedAt: new Date(),
          likeCount: 0,
        },
        select: {
          id: true,
          targetType: true,
          targetId: true,
          isDeleted: true,
        },
      });

      return {
        kind: 'deleted' as const,
        entry: updatedEntry,
      };
    });

    if (actionResult.kind === 'not_found') {
      reply.code(404).send({ error: 'not_found', message: 'discussion entry not found' });
      return;
    }

    await writeAuditLog({
      prisma: app.prisma,
      actorUserId: auth.userId,
      action: 'discussion.admin_delete',
      entityType: 'discussion_entry',
      entityId: actionResult.entry.id,
      metadata: {
        targetType: actionResult.entry.targetType,
        targetId: actionResult.entry.targetId,
        mode: 'soft_delete',
      },
    });

    reply.send({
      ok: true,
      alreadyDeleted: actionResult.kind === 'already_deleted',
      entryId: actionResult.entry.id,
    });
  });

  app.get('/api/admin/notifications', {
    preHandler: [requireAuth, requireRoles('ADMIN')],
  }, async (request, reply) => {
    const auth = request.auth;
    if (!auth) {
      return;
    }

    const query = listNotificationQuerySchema.safeParse(request.query);
    if (!query.success) {
      reply.code(400).send({ error: 'bad_request', message: 'invalid query parameters' });
      return;
    }

    const unreadOnly = query.data.unread === 'true';
    const { page, pageSize, skip, take } = normalizePage(query.data.page, query.data.pageSize, MAX_NOTIFICATION_PAGE_SIZE);

    const where = {
      recipientAdminUserId: auth.userId,
      ...(unreadOnly ? { isRead: false } : {}),
    } satisfies Prisma.AdminNotificationWhereInput;

    const [total, unreadCount, items] = await Promise.all([
      app.prisma.adminNotification.count({ where }),
      app.prisma.adminNotification.count({
        where: {
          recipientAdminUserId: auth.userId,
          isRead: false,
        },
      }),
      app.prisma.adminNotification.findMany({
        where,
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              avatarDataUrl: true,
            },
          },
        },
        orderBy: [
          {
            createdAt: 'desc',
          },
          {
            id: 'desc',
          },
        ],
        skip,
        take,
      }),
    ]);

    const articleTargetIds = [...new Set(
      items
        .filter((item) => item.targetType === 'ARTICLE')
        .map((item) => item.targetId),
    )];

    const relatedArticles = articleTargetIds.length > 0
      ? await app.prisma.article.findMany({
        where: {
          id: {
            in: articleTargetIds,
          },
        },
        select: {
          id: true,
          title: true,
          canonicalPath: true,
        },
      })
      : [];

    const articleById = new Map(relatedArticles.map((article) => [article.id, article]));

    reply.send({
      items: items.map((item) => {
        const targetType = mapTargetTypeToClient(item.targetType);
        const article = targetType === 'article' ? articleById.get(item.targetId) : null;
        const path = targetType === 'article'
          ? (article?.canonicalPath ?? `/article/${item.targetId}`)
          : `/products/${item.targetId}`;
        const title = targetType === 'article'
          ? (article?.title ?? 'Статья')
          : item.targetId;

        return {
          id: item.id,
          type: mapNotificationTypeToClient(item.type),
          isRead: item.isRead,
          readAt: item.readAt?.toISOString() ?? null,
          createdAt: item.createdAt.toISOString(),
          preview: item.textPreview,
          discussionEntryId: item.discussionEntryId,
          actor: item.actor
            ? {
              id: item.actor.id,
              name: item.actor.name,
              avatarDataUrl: item.actor.avatarDataUrl,
            }
            : null,
          target: {
            type: targetType,
            id: item.targetId,
            title,
            path,
          },
        };
      }),
      total,
      unreadCount,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  });

  app.post('/api/admin/notifications/:id/read', {
    preHandler: [requireAuth, requireCsrf, requireRoles('ADMIN')],
    config: {
      rateLimit: {
        max: 120,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    const auth = request.auth;
    if (!auth) {
      return;
    }

    const params = discussionIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      reply.code(400).send({ error: 'bad_request', message: 'invalid notification id' });
      return;
    }

    const updated = await app.prisma.adminNotification.updateMany({
      where: {
        id: params.data.id,
        recipientAdminUserId: auth.userId,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    if (updated.count === 0) {
      reply.code(404).send({ error: 'not_found', message: 'notification not found' });
      return;
    }

    reply.send({ ok: true });
  });

  app.post('/api/admin/notifications/read-all', {
    preHandler: [requireAuth, requireCsrf, requireRoles('ADMIN')],
    config: {
      rateLimit: {
        max: 30,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    const auth = request.auth;
    if (!auth) {
      return;
    }

    const updated = await app.prisma.adminNotification.updateMany({
      where: {
        recipientAdminUserId: auth.userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    reply.send({
      ok: true,
      updatedCount: updated.count,
    });
  });
};
