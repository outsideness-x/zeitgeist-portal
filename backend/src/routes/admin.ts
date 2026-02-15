import { Prisma } from '@prisma/client';
import type { ArticleSection, SubmissionStatus } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { writeAuditLog } from '../lib/audit.js';
import { normalizePage } from '../lib/pagination.js';
import { createPublisher } from '../publishers/index.js';
import type { PublishSubmissionResult } from '../publishers/types.js';
import { assertTransition, canTransitionSubmission } from '../lib/submission-workflow.js';
import { requireAuth, requireCsrf, requireRoles } from '../plugins/auth.js';

const listQuerySchema = z.object({
  status: z.enum(['draft', 'submitted', 'in_review', 'needs_changes', 'resubmitted', 'approved', 'published', 'rejected']).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(50).optional(),
});

const requestChangesSchema = z.object({
  message: z.string().trim().min(3).max(4000),
});

const approveSchema = z.object({
  section: z.enum(['journal', 'research', 'nova']),
});

const rejectSchema = z.object({
  reason: z.string().trim().max(4000).optional(),
});

const statusMap: Record<string, SubmissionStatus> = {
  draft: 'DRAFT',
  submitted: 'SUBMITTED',
  in_review: 'IN_REVIEW',
  needs_changes: 'NEEDS_CHANGES',
  resubmitted: 'RESUBMITTED',
  approved: 'APPROVED',
  published: 'PUBLISHED',
  rejected: 'REJECTED',
};

const sectionMap: Record<'journal' | 'research' | 'nova', ArticleSection> = {
  journal: 'JOURNAL',
  research: 'RESEARCH',
  nova: 'NOVA',
};

const approveAllowedStatuses = new Set<SubmissionStatus>(['SUBMITTED', 'IN_REVIEW', 'RESUBMITTED']);
const movedForwardStatuses = new Set<SubmissionStatus>(['APPROVED', 'PUBLISHED', 'REJECTED']);

type LockedSubmissionRow = {
  id: string;
  status: SubmissionStatus;
  authorUserId: string;
  publishedArticleId: string | null;
};

type LockedAdminActionResult =
  | { kind: 'updated'; submission: { id: string; status: SubmissionStatus } }
  | { kind: 'not_found' }
  | { kind: 'conflict'; status: SubmissionStatus; message: string; code: 'submission_status_conflict' };

type ApproveActionResult =
  | {
    kind: 'success';
    submission: { id: string; status: SubmissionStatus; publishedArticleId: string | null };
    published: PublishSubmissionResult;
  }
  | {
    kind: 'not_found';
  }
  | {
    kind: 'already_published';
    status: SubmissionStatus;
    publication: {
      articleId: string;
      articleSlug: string;
      source: 'LOCAL' | 'GHOST';
      externalId: string | null;
      canonicalUrl: string | null;
    };
  }
  | {
    kind: 'conflict';
    status: SubmissionStatus;
    message: string;
    code: 'submission_status_conflict' | 'submission_missing_author' | 'submission_missing_file';
  };

const lockSubmissionForUpdate = async (tx: Prisma.TransactionClient, submissionId: string) => {
  // this row lock serializes concurrent admin actions for the same submission
  const rows = await tx.$queryRaw<LockedSubmissionRow[]>`
    select
      "id",
      "status",
      "authorUserId",
      "publishedArticleId"
    from "Submission"
    where "id" = ${submissionId}
    for update
  `;

  return rows[0] ?? null;
};

export const registerAdminRoutes = async (app: FastifyInstance) => {
  const publisher = createPublisher();

  app.get('/api/admin/submissions', {
    preHandler: [requireAuth, requireRoles('ADMIN')],
  }, async (request, reply) => {
    const query = listQuerySchema.safeParse(request.query);
    if (!query.success) {
      reply.code(400).send({ error: 'bad_request', message: 'invalid query parameters' });
      return;
    }

    const { page, pageSize, skip, take } = normalizePage(query.data.page, query.data.pageSize, 50);
    const status = query.data.status ? statusMap[query.data.status] : undefined;

    const where = {
      ...(status ? { status } : {}),
    };

    const [total, items] = await Promise.all([
      app.prisma.submission.count({ where }),
      app.prisma.submission.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          files: {
            orderBy: {
              version: 'desc',
            },
            take: 1,
          },
          reviewMessages: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 3,
            include: {
              admin: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: [
          {
            lastSubmittedAt: 'desc',
          },
          {
            createdAt: 'desc',
          },
        ],
        skip,
        take,
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

  app.get('/api/admin/submissions/:id', {
    preHandler: [requireAuth, requireRoles('ADMIN')],
  }, async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).safeParse(request.params);
    if (!params.success) {
      reply.code(400).send({ error: 'bad_request', message: 'invalid submission id' });
      return;
    }

    const submission = await app.prisma.submission.findUnique({
      where: {
        id: params.data.id,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        files: {
          orderBy: {
            version: 'desc',
          },
        },
        reviewMessages: {
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            admin: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        publishedArticle: {
          select: {
            id: true,
            title: true,
            slug: true,
            source: true,
            canonicalUrl: true,
          },
        },
      },
    });

    if (!submission) {
      reply.code(404).send({ error: 'not_found', message: 'submission not found' });
      return;
    }

    const auditLog = await app.prisma.auditLog.findMany({
      where: {
        entityType: 'submission',
        entityId: submission.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    });

    reply.send({ submission, auditLog });
  });

  app.post('/api/admin/submissions/:id/request-changes', {
    preHandler: [requireAuth, requireCsrf, requireRoles('ADMIN')],
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    if (!request.auth) {
      return;
    }

    const params = z.object({ id: z.string().min(1) }).safeParse(request.params);
    const body = requestChangesSchema.safeParse(request.body);

    if (!params.success || !body.success) {
      reply.code(400).send({ error: 'bad_request', message: 'invalid request payload' });
      return;
    }

    const actionResult = await app.prisma.$transaction<LockedAdminActionResult>(async (tx) => {
      const lockedSubmission = await lockSubmissionForUpdate(tx, params.data.id);

      if (!lockedSubmission) {
        return { kind: 'not_found' };
      }

      if (!canTransitionSubmission(lockedSubmission.status, 'NEEDS_CHANGES')) {
        return {
          kind: 'conflict',
          status: lockedSubmission.status,
          code: 'submission_status_conflict',
          message: 'request changes is not valid for current status',
        };
      }

      const updatedSubmission = await tx.submission.update({
        where: {
          id: lockedSubmission.id,
        },
        data: {
          status: 'NEEDS_CHANGES',
        },
        select: {
          id: true,
          status: true,
        },
      });

      await tx.reviewMessage.create({
        data: {
          submissionId: lockedSubmission.id,
          adminUserId: request.auth.userId,
          message: body.data.message,
        },
      });

      await writeAuditLog({
        prisma: tx,
        actorUserId: request.auth.userId,
        action: 'submission.request_changes',
        entityType: 'submission',
        entityId: lockedSubmission.id,
        metadata: {
          previousStatus: lockedSubmission.status,
          nextStatus: 'NEEDS_CHANGES',
        },
      });

      return {
        kind: 'updated',
        submission: updatedSubmission,
      };
    });

    if (actionResult.kind === 'not_found') {
      reply.code(404).send({ error: 'not_found', message: 'submission not found' });
      return;
    }

    if (actionResult.kind === 'conflict') {
      reply.code(409).send({
        error: 'conflict',
        code: actionResult.code,
        status: actionResult.status,
        message: actionResult.message,
      });
      return;
    }

    reply.send({ submission: actionResult.submission });
  });

  app.post('/api/admin/submissions/:id/approve', {
    preHandler: [requireAuth, requireCsrf, requireRoles('ADMIN')],
    config: {
      rateLimit: {
        max: 40,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    if (!request.auth) {
      return;
    }

    const params = z.object({ id: z.string().min(1) }).safeParse(request.params);
    const body = approveSchema.safeParse(request.body);

    if (!params.success || !body.success) {
      reply.code(400).send({ error: 'bad_request', message: 'invalid request payload' });
      return;
    }

    const section = sectionMap[body.data.section];

    const actionResult = await app.prisma.$transaction<ApproveActionResult>(async (tx) => {
      const lockedSubmission = await lockSubmissionForUpdate(tx, params.data.id);

      if (!lockedSubmission) {
        return { kind: 'not_found' };
      }

      const existingPublication = await tx.submissionPublication.findUnique({
        where: {
          submissionId: lockedSubmission.id,
        },
        include: {
          article: {
            select: {
              id: true,
              slug: true,
              source: true,
              externalId: true,
              canonicalUrl: true,
            },
          },
        },
      });

      // this idempotency guard short-circuits retries and prevents duplicate publishes
      if (existingPublication) {
        return {
          kind: 'already_published',
          status: lockedSubmission.status,
          publication: {
            articleId: existingPublication.article.id,
            articleSlug: existingPublication.article.slug,
            source: existingPublication.article.source,
            externalId: existingPublication.article.externalId,
            canonicalUrl: existingPublication.article.canonicalUrl,
          },
        };
      }

      if (movedForwardStatuses.has(lockedSubmission.status)) {
        return {
          kind: 'conflict',
          status: lockedSubmission.status,
          code: 'submission_status_conflict',
          message: 'submission already moved to a terminal editorial state',
        };
      }

      if (!approveAllowedStatuses.has(lockedSubmission.status)) {
        return {
          kind: 'conflict',
          status: lockedSubmission.status,
          code: 'submission_status_conflict',
          message: 'approve is not valid for current status',
        };
      }

      const submission = await tx.submission.findUnique({
        where: {
          id: lockedSubmission.id,
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          files: {
            orderBy: {
              version: 'desc',
            },
            take: 1,
          },
        },
      });

      if (!submission || !submission.author) {
        return {
          kind: 'conflict',
          status: lockedSubmission.status,
          code: 'submission_missing_author',
          message: 'submission author is missing',
        };
      }

      const latestFile = submission.files[0] ?? null;
      if (!latestFile) {
        return {
          kind: 'conflict',
          status: lockedSubmission.status,
          code: 'submission_missing_file',
          message: 'submission must have an uploaded file before approval',
        };
      }

      const published = await publisher.publishSubmission({
        submission,
        latestFile,
        author: submission.author,
        section,
        db: tx,
      });

      await tx.submissionPublication.create({
        data: {
          submissionId: submission.id,
          articleId: published.articleId,
        },
      });

      assertTransition(lockedSubmission.status, 'APPROVED');
      assertTransition('APPROVED', 'PUBLISHED');

      await tx.submission.update({
        where: {
          id: submission.id,
        },
        data: {
          status: 'APPROVED',
        },
      });

      const finalSubmission = await tx.submission.update({
        where: {
          id: submission.id,
        },
        data: {
          status: 'PUBLISHED',
          publishedArticleId: published.articleId,
          requestedSection: section,
        },
        select: {
          id: true,
          status: true,
          publishedArticleId: true,
        },
      });

      const author = await tx.user.findUnique({
        where: {
          id: submission.author.id,
        },
        select: {
          role: true,
        },
      });

      if (author?.role === 'READER') {
        await tx.user.update({
          where: {
            id: submission.author.id,
          },
          data: {
            role: 'AUTHOR',
          },
        });

        await writeAuditLog({
          prisma: tx,
          actorUserId: request.auth.userId,
          action: 'user.role_promotion',
          entityType: 'user',
          entityId: submission.author.id,
          metadata: {
            from: 'READER',
            to: 'AUTHOR',
            reason: 'first approved submission',
          },
        });
      }

      // these entries are written only in the successful publish path
      await writeAuditLog({
        prisma: tx,
        actorUserId: request.auth.userId,
        action: 'submission.approve',
        entityType: 'submission',
        entityId: submission.id,
        metadata: {
          previousStatus: lockedSubmission.status,
          nextStatus: 'APPROVED',
          section,
        },
      });

      await writeAuditLog({
        prisma: tx,
        actorUserId: request.auth.userId,
        action: 'submission.publish',
        entityType: 'submission',
        entityId: submission.id,
        metadata: {
          articleId: published.articleId,
          source: published.source,
          externalId: published.externalId,
          canonicalUrl: published.canonicalUrl,
        },
      });

      return {
        kind: 'success',
        submission: finalSubmission,
        published,
      };
    });

    if (actionResult.kind === 'not_found') {
      reply.code(404).send({ error: 'not_found', message: 'submission not found' });
      return;
    }

    if (actionResult.kind === 'already_published') {
      reply.code(409).send({
        error: 'conflict',
        code: 'submission_already_published',
        status: actionResult.status,
        message: 'submission is already published',
        publication: actionResult.publication,
      });
      return;
    }

    if (actionResult.kind === 'conflict') {
      reply.code(409).send({
        error: 'conflict',
        code: actionResult.code,
        status: actionResult.status,
        message: actionResult.message,
      });
      return;
    }

    reply.send({
      submission: actionResult.submission,
      published: actionResult.published,
    });
  });

  app.post('/api/admin/submissions/:id/reject', {
    preHandler: [requireAuth, requireCsrf, requireRoles('ADMIN')],
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    if (!request.auth) {
      return;
    }

    const params = z.object({ id: z.string().min(1) }).safeParse(request.params);
    const body = rejectSchema.safeParse(request.body);

    if (!params.success || !body.success) {
      reply.code(400).send({ error: 'bad_request', message: 'invalid request payload' });
      return;
    }

    const actionResult = await app.prisma.$transaction<LockedAdminActionResult>(async (tx) => {
      const lockedSubmission = await lockSubmissionForUpdate(tx, params.data.id);

      if (!lockedSubmission) {
        return { kind: 'not_found' };
      }

      if (!canTransitionSubmission(lockedSubmission.status, 'REJECTED')) {
        return {
          kind: 'conflict',
          status: lockedSubmission.status,
          code: 'submission_status_conflict',
          message: 'reject is not valid for current status',
        };
      }

      const updatedSubmission = await tx.submission.update({
        where: {
          id: lockedSubmission.id,
        },
        data: {
          status: 'REJECTED',
        },
        select: {
          id: true,
          status: true,
        },
      });

      await writeAuditLog({
        prisma: tx,
        actorUserId: request.auth.userId,
        action: 'submission.reject',
        entityType: 'submission',
        entityId: lockedSubmission.id,
        metadata: {
          previousStatus: lockedSubmission.status,
          nextStatus: 'REJECTED',
          reason: body.data.reason,
        },
      });

      return {
        kind: 'updated',
        submission: updatedSubmission,
      };
    });

    if (actionResult.kind === 'not_found') {
      reply.code(404).send({ error: 'not_found', message: 'submission not found' });
      return;
    }

    if (actionResult.kind === 'conflict') {
      reply.code(409).send({
        error: 'conflict',
        code: actionResult.code,
        status: actionResult.status,
        message: actionResult.message,
      });
      return;
    }

    reply.send({ submission: actionResult.submission });
  });
};
