import type { FastifyInstance, FastifyRequest } from 'fastify';
import { Prisma } from '@prisma/client';
import type { ArticleSection, SubmissionStatus } from '@prisma/client';
import { z } from 'zod';
import { getEnv } from '../config/env.js';
import { writeAuditLog } from '../lib/audit.js';
import { hasPdfMagicBytes, isPdfMime } from '../lib/pdf.js';
import {
  computeObjectSha256,
  createPresignedPutUrl,
  createStorageClient,
  createSubmissionStorageKey,
  getStoredObject,
  headStoredObject,
  putStoredObject,
  readObjectPrefix,
} from '../lib/storage.js';
import { requireAuth, requireCsrf } from '../plugins/auth.js';
import { normalizePage } from '../lib/pagination.js';
import { transitionFromAuthorResubmit, transitionFromUploadComplete } from '../lib/submission-workflow.js';

const createSubmissionSchema = z.object({
  title: z.string().trim().min(3).max(280),
  keywords: z.union([z.array(z.string().trim().min(1).max(80)), z.string().trim()]),
  abstract: z.string().trim().min(40).max(12000),
  requestedSection: z.enum(['journal', 'research', 'nova']).optional(),
  clientRequestId: z.string().trim().min(8).max(120).regex(/^[a-zA-Z0-9._:-]+$/).optional(),
});

const uploadInitSchema = z.object({
  originalName: z.string().trim().min(1).max(260).default('submission.pdf'),
});

const uploadCompleteSchema = z.object({
  storageKey: z.string().min(1),
  originalName: z.string().trim().min(1).max(260).default('submission.pdf'),
});

const uploadRelayQuerySchema = z.object({
  storageKey: z.string().min(1),
});

const meListQuerySchema = z.object({
  status: z.enum(['draft', 'submitted', 'in_review', 'needs_changes', 'resubmitted', 'approved', 'published', 'rejected']).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(50).optional(),
});

const sectionMap: Record<'journal' | 'research' | 'nova', ArticleSection> = {
  journal: 'JOURNAL',
  research: 'RESEARCH',
  nova: 'NOVA',
};

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

const storageUnavailableMessage = 'file storage is temporarily unavailable. please try again.';

const isStorageObjectMissingError = (error: unknown) => {
  const normalized = (typeof error === 'object' && error !== null
    ? error
    : {}) as {
    name?: string;
    Code?: string;
    code?: string;
    $metadata?: { httpStatusCode?: number };
  };

  const statusCode = normalized.$metadata?.httpStatusCode;
  const name = normalized.name ?? normalized.Code ?? normalized.code ?? '';

  return (
    statusCode === 404 ||
    name === 'NotFound' ||
    name === 'NoSuchKey' ||
    name === 'NoSuchBucket'
  );
};

const sendStorageUnavailable = (args: {
  requestId: string;
  requestLog: FastifyInstance['log'];
  reply: { code: (statusCode: number) => { send: (payload: unknown) => void } };
  submissionId: string;
  operation: 'upload_init' | 'upload_file' | 'upload_complete_head' | 'upload_complete_prefix' | 'upload_complete_hash' | 'download';
  error: unknown;
}) => {
  args.requestLog.error({
    requestId: args.requestId,
    submissionId: args.submissionId,
    operation: args.operation,
    err: args.error,
  }, 'submission storage operation failed');

  args.reply.code(503).send({
    error: 'storage_unavailable',
    message: storageUnavailableMessage,
  });
};

const pickFirstHeaderValue = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return value[0]?.trim() || undefined;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  return value.split(',')[0]?.trim() || undefined;
};

const buildAbsoluteApiUrl = (request: FastifyRequest, path: string) => {
  const protocol = pickFirstHeaderValue(request.headers['x-forwarded-proto']) ?? request.protocol;
  const host = pickFirstHeaderValue(request.headers['x-forwarded-host']) ?? request.headers.host ?? request.hostname;
  return `${protocol}://${host}${path}`;
};

const toAsciiFileName = (value: string, fallback = 'submission.pdf') => {
  const normalized = value
    .trim()
    .replace(/["\\]/g, '_')
    .replace(/[^\x20-\x7E]/g, '_');

  if (normalized.length === 0) {
    return fallback;
  }

  return normalized;
};

const normalizeKeywords = (raw: string[] | string) => {
  if (Array.isArray(raw)) {
    return raw.map((part) => part.trim()).filter(Boolean);
  }
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
};

const isCreatePayloadMatch = (args: {
  existing: {
    title: string;
    keywords: string[];
    abstract: string;
    requestedSection: ArticleSection | null;
  };
  incoming: {
    title: string;
    keywords: string[];
    abstract: string;
    requestedSection: ArticleSection | null;
  };
}) => {
  if (
    args.existing.title !== args.incoming.title ||
    args.existing.abstract !== args.incoming.abstract ||
    args.existing.requestedSection !== args.incoming.requestedSection
  ) {
    return false;
  }

  if (args.existing.keywords.length !== args.incoming.keywords.length) {
    return false;
  }

  return args.existing.keywords.every((keyword, index) => keyword === args.incoming.keywords[index]);
};

const assertCanAccessSubmission = (args: {
  authUserId: string;
  authRole: 'READER' | 'AUTHOR' | 'ADMIN';
  authorUserId: string;
}) => {
  if (args.authRole === 'ADMIN') {
    return true;
  }
  return args.authUserId === args.authorUserId;
};

export const registerSubmissionRoutes = async (app: FastifyInstance) => {
  const env = getEnv();
  const storageClient = createStorageClient(env);

  app.post('/api/submissions', {
    preHandler: [requireAuth, requireCsrf],
    config: {
      rateLimit: {
        max: 30,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    if (!request.auth) {
      return;
    }

    const parsed = createSubmissionSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400).send({ error: 'bad_request', message: parsed.error.issues[0]?.message ?? 'invalid request body' });
      return;
    }

    const keywords = normalizeKeywords(parsed.data.keywords);
    const requestedSection = parsed.data.requestedSection ? sectionMap[parsed.data.requestedSection] : null;
    const clientRequestId = parsed.data.clientRequestId?.trim() || null;

    const createInput = {
      title: parsed.data.title,
      keywords,
      abstract: parsed.data.abstract,
      requestedSection,
    };

    const findByIdempotencyKey = async () => {
      if (!clientRequestId) {
        return null;
      }

      return app.prisma.submission.findUnique({
        where: {
          authorUserId_clientRequestId: {
            authorUserId: request.auth.userId,
            clientRequestId,
          },
        },
      });
    };

    const existingByKey = await findByIdempotencyKey();

    if (existingByKey) {
      if (!isCreatePayloadMatch({ existing: existingByKey, incoming: createInput })) {
        reply.code(409).send({
          error: 'conflict',
          code: 'idempotency_key_reuse',
          message: 'idempotency key was already used with a different payload',
        });
        return;
      }

      reply.send({
        submission: existingByKey,
        idempotent: true,
      });
      return;
    }

    let submission;
    try {
      submission = await app.prisma.submission.create({
        data: {
          title: createInput.title,
          keywords: createInput.keywords,
          abstract: createInput.abstract,
          requestedSection: createInput.requestedSection,
          authorUserId: request.auth.userId,
          clientRequestId,
          status: 'DRAFT',
        },
      });
    } catch (error) {
      // this handles concurrent retries that race on the same author+request key
      const isIdempotencyRace = (
        clientRequestId &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      );

      if (!isIdempotencyRace) {
        throw error;
      }

      const racedSubmission = await findByIdempotencyKey();
      if (!racedSubmission) {
        throw error;
      }

      if (!isCreatePayloadMatch({ existing: racedSubmission, incoming: createInput })) {
        reply.code(409).send({
          error: 'conflict',
          code: 'idempotency_key_reuse',
          message: 'idempotency key was already used with a different payload',
        });
        return;
      }

      reply.send({
        submission: racedSubmission,
        idempotent: true,
      });
      return;
    }

    await writeAuditLog({
      prisma: app.prisma,
      actorUserId: request.auth.userId,
      action: 'submission.create',
      entityType: 'submission',
      entityId: submission.id,
      metadata: {
        keywordsCount: keywords.length,
      },
    });

    reply.code(201).send({ submission });
  });

  app.post('/api/submissions/:id/upload/init', {
    preHandler: [requireAuth, requireCsrf],
    config: {
      rateLimit: {
        max: 20,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    if (!request.auth) {
      return;
    }

    const params = z.object({ id: z.string().min(1) }).safeParse(request.params);
    const body = uploadInitSchema.safeParse(request.body);

    if (!params.success || !body.success) {
      reply.code(400).send({ error: 'bad_request', message: 'invalid request payload' });
      return;
    }

    const submission = await app.prisma.submission.findUnique({
      where: { id: params.data.id },
      select: {
        id: true,
        authorUserId: true,
        status: true,
      },
    });

    if (!submission) {
      reply.code(404).send({ error: 'not_found', message: 'submission not found' });
      return;
    }

    if (!assertCanAccessSubmission({
      authUserId: request.auth.userId,
      authRole: request.auth.role,
      authorUserId: submission.authorUserId,
    })) {
      reply.code(403).send({ error: 'forbidden', message: 'insufficient permissions' });
      return;
    }

    if (submission.status === 'REJECTED' || submission.status === 'APPROVED' || submission.status === 'PUBLISHED') {
      reply.code(409).send({ error: 'conflict', message: 'upload is not allowed for current submission status' });
      return;
    }

    const storageKey = createSubmissionStorageKey(submission.id);

    let uploadUrl: string;
    try {
      uploadUrl = await createPresignedPutUrl({
        client: storageClient,
        bucket: env.S3_BUCKET,
        key: storageKey,
        expiresInSeconds: env.S3_SIGNED_URL_EXPIRES_SECONDS,
        contentType: 'application/pdf',
      });
    } catch (error) {
      sendStorageUnavailable({
        requestId: request.id,
        requestLog: request.log,
        reply,
        submissionId: submission.id,
        operation: 'upload_init',
        error,
      });
      return;
    }

    await writeAuditLog({
      prisma: app.prisma,
      actorUserId: request.auth.userId,
      action: 'submission.upload_init',
      entityType: 'submission',
      entityId: submission.id,
      metadata: {
        storageKey,
        originalName: body.data.originalName,
      },
    });

    reply.send({
      submissionId: submission.id,
      storageKey,
      uploadUrl,
      expiresInSeconds: env.S3_SIGNED_URL_EXPIRES_SECONDS,
      requiredContentType: 'application/pdf',
    });
  });

  app.post('/api/submissions/:id/upload/file', {
    preHandler: [requireAuth, requireCsrf],
    config: {
      rateLimit: {
        max: 20,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    if (!request.auth) {
      return;
    }

    const params = z.object({ id: z.string().min(1) }).safeParse(request.params);
    const query = uploadRelayQuerySchema.safeParse(request.query);

    if (!params.success || !query.success) {
      reply.code(400).send({ error: 'bad_request', message: 'invalid upload parameters' });
      return;
    }

    const submission = await app.prisma.submission.findUnique({
      where: { id: params.data.id },
      select: {
        id: true,
        authorUserId: true,
        status: true,
      },
    });

    if (!submission) {
      reply.code(404).send({ error: 'not_found', message: 'submission not found' });
      return;
    }

    if (!assertCanAccessSubmission({
      authUserId: request.auth.userId,
      authRole: request.auth.role,
      authorUserId: submission.authorUserId,
    })) {
      reply.code(403).send({ error: 'forbidden', message: 'insufficient permissions' });
      return;
    }

    if (submission.status === 'REJECTED' || submission.status === 'APPROVED' || submission.status === 'PUBLISHED') {
      reply.code(409).send({ error: 'conflict', message: 'upload is not allowed for current submission status' });
      return;
    }

    if (!query.data.storageKey.startsWith(`submissions/${submission.id}/`)) {
      reply.code(400).send({ error: 'bad_request', message: 'storage key does not match submission scope' });
      return;
    }

    const [requestMime = ''] = (request.headers['content-type'] ?? '').split(';', 1);
    const requestContentType = requestMime.trim();
    if (!isPdfMime(requestContentType)) {
      reply.code(400).send({ error: 'bad_request', message: 'only pdf uploads are allowed' });
      return;
    }

    const body = request.body;
    const fileBuffer = Buffer.isBuffer(body) ? body : Buffer.alloc(0);
    const sizeBytes = fileBuffer.byteLength;

    if (sizeBytes <= 0) {
      reply.code(400).send({ error: 'bad_request', message: 'uploaded file is empty' });
      return;
    }

    if (sizeBytes > env.UPLOAD_MAX_BYTES) {
      reply.code(413).send({ error: 'payload_too_large', message: 'uploaded file exceeds size limit' });
      return;
    }

    if (!hasPdfMagicBytes(fileBuffer.subarray(0, 8))) {
      reply.code(400).send({ error: 'bad_request', message: 'file signature validation failed' });
      return;
    }

    try {
      await putStoredObject({
        client: storageClient,
        bucket: env.S3_BUCKET,
        key: query.data.storageKey,
        body: fileBuffer,
        contentType: 'application/pdf',
      });
    } catch (error) {
      sendStorageUnavailable({
        requestId: request.id,
        requestLog: request.log,
        reply,
        submissionId: submission.id,
        operation: 'upload_file',
        error,
      });
      return;
    }

    request.log.info({
      requestId: request.id,
      submissionId: submission.id,
      storageKey: query.data.storageKey,
      sizeBytes,
    }, 'submission pdf uploaded via backend relay');

    await writeAuditLog({
      prisma: app.prisma,
      actorUserId: request.auth.userId,
      action: 'submission.upload_file',
      entityType: 'submission',
      entityId: submission.id,
      metadata: {
        storageKey: query.data.storageKey,
        sizeBytes,
      },
    });

    reply.code(201).send({
      ok: true,
      storageKey: query.data.storageKey,
      sizeBytes,
    });
  });

  app.post('/api/submissions/:id/upload/complete', {
    preHandler: [requireAuth, requireCsrf],
  }, async (request, reply) => {
    if (!request.auth) {
      return;
    }

    const params = z.object({ id: z.string().min(1) }).safeParse(request.params);
    const body = uploadCompleteSchema.safeParse(request.body);

    if (!params.success || !body.success) {
      reply.code(400).send({ error: 'bad_request', message: 'invalid request payload' });
      return;
    }

    const submission = await app.prisma.submission.findUnique({
      where: { id: params.data.id },
      select: {
        id: true,
        authorUserId: true,
        status: true,
      },
    });

    if (!submission) {
      reply.code(404).send({ error: 'not_found', message: 'submission not found' });
      return;
    }

    if (!assertCanAccessSubmission({
      authUserId: request.auth.userId,
      authRole: request.auth.role,
      authorUserId: submission.authorUserId,
    })) {
      reply.code(403).send({ error: 'forbidden', message: 'insufficient permissions' });
      return;
    }

    if (!body.data.storageKey.startsWith(`submissions/${submission.id}/`)) {
      reply.code(400).send({ error: 'bad_request', message: 'storage key does not match submission scope' });
      return;
    }

    const existingFile = await app.prisma.submissionFile.findUnique({
      where: {
        storageKey: body.data.storageKey,
      },
    });

    if (existingFile) {
      if (existingFile.submissionId !== submission.id) {
        reply.code(400).send({ error: 'bad_request', message: 'storage key does not match submission scope' });
        return;
      }

      const currentSubmission = await app.prisma.submission.findUnique({
        where: {
          id: submission.id,
        },
      });

      if (!currentSubmission) {
        reply.code(404).send({ error: 'not_found', message: 'submission not found' });
        return;
      }

      reply.send({
        submission: currentSubmission,
        file: existingFile,
        idempotent: true,
      });
      return;
    }

    let head;
    try {
      head = await headStoredObject({
        client: storageClient,
        bucket: env.S3_BUCKET,
        key: body.data.storageKey,
      });
    } catch (error) {
      if (isStorageObjectMissingError(error)) {
        reply.code(400).send({ error: 'bad_request', message: 'uploaded object not found' });
        return;
      }

      sendStorageUnavailable({
        requestId: request.id,
        requestLog: request.log,
        reply,
        submissionId: submission.id,
        operation: 'upload_complete_head',
        error,
      });
      return;
    }

    if (!head) {
      reply.code(400).send({ error: 'bad_request', message: 'uploaded object not found' });
      return;
    }

    const sizeBytes = Number(head.ContentLength ?? 0);
    const mime = head.ContentType ?? 'application/octet-stream';

    if (sizeBytes <= 0 || sizeBytes > env.UPLOAD_MAX_BYTES) {
      reply.code(400).send({ error: 'bad_request', message: 'uploaded file size is invalid' });
      return;
    }

    // this blocks content-type spoofing by checking both metadata and file signature
    if (!isPdfMime(mime)) {
      reply.code(400).send({ error: 'bad_request', message: 'uploaded file is not a pdf' });
      return;
    }

    let prefix: Buffer;
    try {
      prefix = await readObjectPrefix({
        client: storageClient,
        bucket: env.S3_BUCKET,
        key: body.data.storageKey,
        bytes: 8,
      });
    } catch (error) {
      if (isStorageObjectMissingError(error)) {
        reply.code(400).send({ error: 'bad_request', message: 'uploaded object not found' });
        return;
      }

      sendStorageUnavailable({
        requestId: request.id,
        requestLog: request.log,
        reply,
        submissionId: submission.id,
        operation: 'upload_complete_prefix',
        error,
      });
      return;
    }

    if (!hasPdfMagicBytes(prefix)) {
      reply.code(400).send({ error: 'bad_request', message: 'file signature validation failed' });
      return;
    }

    let sha256: string;
    try {
      sha256 = await computeObjectSha256({
        client: storageClient,
        bucket: env.S3_BUCKET,
        key: body.data.storageKey,
      });
    } catch (error) {
      if (isStorageObjectMissingError(error)) {
        reply.code(400).send({ error: 'bad_request', message: 'uploaded object not found' });
        return;
      }

      sendStorageUnavailable({
        requestId: request.id,
        requestLog: request.log,
        reply,
        submissionId: submission.id,
        operation: 'upload_complete_hash',
        error,
      });
      return;
    }

    let nextStatus: SubmissionStatus;
    try {
      nextStatus = transitionFromUploadComplete(submission.status);
    } catch {
      reply.code(409).send({ error: 'conflict', message: 'upload is not allowed for current submission status' });
      return;
    }

    const result = await app.prisma.$transaction(async (tx) => {
      const lastVersion = await tx.submissionFile.aggregate({
        where: {
          submissionId: submission.id,
        },
        _max: {
          version: true,
        },
      });

      const version = (lastVersion._max.version ?? 0) + 1;

      const file = await tx.submissionFile.create({
        data: {
          submissionId: submission.id,
          storageKey: body.data.storageKey,
          sizeBytes,
          sha256,
          mime,
          originalName: body.data.originalName,
          version,
        },
      });

      const updatedSubmission = await tx.submission.update({
        where: { id: submission.id },
        data: {
          status: nextStatus,
          lastSubmittedAt: new Date(),
        },
      });

      return { file, submission: updatedSubmission };
    });

    await writeAuditLog({
      prisma: app.prisma,
      actorUserId: request.auth.userId,
      action: 'submission.upload_complete',
      entityType: 'submission',
      entityId: submission.id,
      metadata: {
        storageKey: result.file.storageKey,
        sizeBytes: result.file.sizeBytes,
        version: result.file.version,
        nextStatus,
      },
    });

    await writeAuditLog({
      prisma: app.prisma,
      actorUserId: request.auth.userId,
      action: nextStatus === 'RESUBMITTED' ? 'submission.resubmitted' : 'submission.submitted',
      entityType: 'submission',
      entityId: submission.id,
    });

    reply.send({
      submission: result.submission,
      file: result.file,
    });
  });

  app.get('/api/submissions/me', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    if (!request.auth) {
      return;
    }

    const parsedQuery = meListQuerySchema.safeParse(request.query);
    if (!parsedQuery.success) {
      reply.code(400).send({ error: 'bad_request', message: 'invalid query parameters' });
      return;
    }

    const { page, pageSize, skip, take } = normalizePage(parsedQuery.data.page, parsedQuery.data.pageSize, 50);
    const status = parsedQuery.data.status ? statusMap[parsedQuery.data.status] : undefined;

    const where = {
      authorUserId: request.auth.userId,
      ...(status ? { status } : {}),
    };

    const [total, items] = await Promise.all([
      app.prisma.submission.count({ where }),
      app.prisma.submission.findMany({
        where,
        include: {
          files: {
            orderBy: { version: 'desc' },
            take: 1,
          },
          reviewMessages: {
            orderBy: { createdAt: 'desc' },
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
              slug: true,
              title: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
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

  app.get('/api/submissions/me/:id', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    if (!request.auth) {
      return;
    }

    const params = z.object({ id: z.string().min(1) }).safeParse(request.params);
    if (!params.success) {
      reply.code(400).send({ error: 'bad_request', message: 'invalid submission id' });
      return;
    }

    const submission = await app.prisma.submission.findUnique({
      where: { id: params.data.id },
      include: {
        files: {
          orderBy: { version: 'desc' },
        },
        reviewMessages: {
          orderBy: { createdAt: 'desc' },
          include: {
            admin: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        },
        publishedArticle: {
          select: {
            id: true,
            slug: true,
            title: true,
            source: true,
          },
        },
      },
    });

    if (!submission) {
      reply.code(404).send({ error: 'not_found', message: 'submission not found' });
      return;
    }

    if (submission.authorUserId !== request.auth.userId) {
      reply.code(403).send({ error: 'forbidden', message: 'insufficient permissions' });
      return;
    }

    reply.send({ submission });
  });

  app.post('/api/submissions/:id/resubmit', {
    preHandler: [requireAuth, requireCsrf],
  }, async (request, reply) => {
    if (!request.auth) {
      return;
    }

    const params = z.object({ id: z.string().min(1) }).safeParse(request.params);
    if (!params.success) {
      reply.code(400).send({ error: 'bad_request', message: 'invalid submission id' });
      return;
    }

    const submission = await app.prisma.submission.findUnique({
      where: {
        id: params.data.id,
      },
      select: {
        id: true,
        authorUserId: true,
        status: true,
      },
    });

    if (!submission) {
      reply.code(404).send({ error: 'not_found', message: 'submission not found' });
      return;
    }

    if (submission.authorUserId !== request.auth.userId) {
      reply.code(403).send({ error: 'forbidden', message: 'insufficient permissions' });
      return;
    }

    const latestFile = await app.prisma.submissionFile.findFirst({
      where: {
        submissionId: submission.id,
      },
      orderBy: {
        version: 'desc',
      },
      select: {
        id: true,
      },
    });

    if (!latestFile) {
      reply.code(409).send({ error: 'conflict', message: 'resubmit requires an uploaded file' });
      return;
    }

    let nextStatus: SubmissionStatus;
    try {
      nextStatus = transitionFromAuthorResubmit(submission.status);
    } catch {
      reply.code(409).send({ error: 'conflict', message: 'resubmit is not allowed for current submission status' });
      return;
    }

    const updatedSubmission = await app.prisma.submission.update({
      where: {
        id: submission.id,
      },
      data: {
        status: nextStatus,
        lastSubmittedAt: new Date(),
      },
    });

    await writeAuditLog({
      prisma: app.prisma,
      actorUserId: request.auth.userId,
      action: nextStatus === 'RESUBMITTED' ? 'submission.resubmitted' : 'submission.submitted',
      entityType: 'submission',
      entityId: submission.id,
      metadata: {
        previousStatus: submission.status,
        nextStatus,
      },
    });

    reply.send({ submission: updatedSubmission });
  });

  app.get('/api/submissions/:id/download', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    if (!request.auth) {
      return;
    }

    const params = z.object({ id: z.string().min(1) }).safeParse(request.params);
    if (!params.success) {
      reply.code(400).send({ error: 'bad_request', message: 'invalid submission id' });
      return;
    }

    const submission = await app.prisma.submission.findUnique({
      where: { id: params.data.id },
      include: {
        files: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!submission) {
      reply.code(404).send({ error: 'not_found', message: 'submission not found' });
      return;
    }

    const canAccess = request.auth.role === 'ADMIN' || submission.authorUserId === request.auth.userId;

    if (!canAccess) {
      reply.code(403).send({ error: 'forbidden', message: 'insufficient permissions' });
      return;
    }

    const file = submission.files[0];
    if (!file) {
      reply.code(404).send({ error: 'not_found', message: 'file not found' });
      return;
    }

    const url = buildAbsoluteApiUrl(request, `/api/submissions/${submission.id}/download/file`);

    await writeAuditLog({
      prisma: app.prisma,
      actorUserId: request.auth.userId,
      action: 'submission.download',
      entityType: 'submission',
      entityId: submission.id,
      metadata: {
        fileId: file.id,
        storageKey: file.storageKey,
      },
    });

    reply.send({
      url,
      expiresInSeconds: env.S3_SIGNED_URL_EXPIRES_SECONDS,
      file: {
        sizeBytes: file.sizeBytes,
        mime: file.mime,
        originalName: file.originalName,
      },
    });
  });

  app.get('/api/submissions/:id/download/file', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    if (!request.auth) {
      return;
    }

    const params = z.object({ id: z.string().min(1) }).safeParse(request.params);
    if (!params.success) {
      reply.code(400).send({ error: 'bad_request', message: 'invalid submission id' });
      return;
    }

    const submission = await app.prisma.submission.findUnique({
      where: { id: params.data.id },
      include: {
        files: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!submission) {
      reply.code(404).send({ error: 'not_found', message: 'submission not found' });
      return;
    }

    const canAccess = request.auth.role === 'ADMIN' || submission.authorUserId === request.auth.userId;

    if (!canAccess) {
      reply.code(403).send({ error: 'forbidden', message: 'insufficient permissions' });
      return;
    }

    const file = submission.files[0];
    if (!file) {
      reply.code(404).send({ error: 'not_found', message: 'file not found' });
      return;
    }

    let objectResult;
    try {
      objectResult = await getStoredObject({
        client: storageClient,
        bucket: env.S3_BUCKET,
        key: file.storageKey,
      });
    } catch (error) {
      if (isStorageObjectMissingError(error)) {
        reply.code(404).send({ error: 'not_found', message: 'file not found' });
        return;
      }

      sendStorageUnavailable({
        requestId: request.id,
        requestLog: request.log,
        reply,
        submissionId: submission.id,
        operation: 'download',
        error,
      });
      return;
    }

    if (!objectResult.Body) {
      reply.code(404).send({ error: 'not_found', message: 'file not found' });
      return;
    }

    const contentType = objectResult.ContentType ?? file.mime ?? 'application/pdf';
    const contentLength = Number(objectResult.ContentLength ?? file.sizeBytes);
    const fallbackFileName = toAsciiFileName(file.originalName, 'submission.pdf');
    const encodedFileName = encodeURIComponent(file.originalName);

    reply.header('content-type', contentType);
    if (Number.isFinite(contentLength) && contentLength > 0) {
      reply.header('content-length', String(contentLength));
    }
    reply.header('content-disposition', `attachment; filename="${fallbackFileName}"; filename*=UTF-8''${encodedFileName}`);

    return reply.send(objectResult.Body as unknown as NodeJS.ReadableStream);
  });
};
