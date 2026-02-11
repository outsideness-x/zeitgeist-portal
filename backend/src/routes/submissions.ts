import type { FastifyInstance } from 'fastify';
import type { Role, SubmissionStatus } from '@prisma/client';
import { z } from 'zod';
import { getEnv } from '../config/env.js';
import { writeAuditLog } from '../lib/audit.js';
import { hasPdfMagicBytes, isPdfMime } from '../lib/pdf.js';
import {
  computeObjectSha256,
  createPresignedGetUrl,
  createPresignedPutUrl,
  createStorageClient,
  createSubmissionStorageKey,
  headStoredObject,
  readObjectPrefix,
} from '../lib/storage.js';
import { requireAuth, requireCsrf, requireRoles } from '../plugins/auth.js';

const privilegedRoles: Role[] = ['ADMIN', 'EDITOR', 'REVIEWER'];

const createSubmissionSchema = z.object({
  title: z.string().trim().min(3).max(280),
  keywords: z.union([z.array(z.string().trim().min(1).max(80)), z.string().trim()]),
  abstract: z.string().trim().min(40).max(12000),
});

const uploadInitSchema = z.object({
  originalName: z.string().trim().min(1).max(260).default('submission.pdf'),
});

const uploadCompleteSchema = z.object({
  storageKey: z.string().min(1),
  originalName: z.string().trim().min(1).max(260).default('submission.pdf'),
});

const statusSchema = z.object({
  status: z.enum(['UPLOADED', 'IN_REVIEW', 'NEEDS_CHANGES', 'ACCEPTED', 'REJECTED']),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(50).optional(),
});

const normalizeKeywords = (raw: string[] | string) => {
  if (Array.isArray(raw)) {
    return raw.map((part) => part.trim()).filter(Boolean);
  }
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
};

const canAccessSubmission = (args: { role: Role; userId: string; authorUserId: string | null }) => {
  if (privilegedRoles.includes(args.role)) {
    return true;
  }
  return args.authorUserId === args.userId;
};

export const registerSubmissionRoutes = async (app: FastifyInstance) => {
  const env = getEnv();
  const storageClient = createStorageClient(env);

  app.post('/api/submissions', {
    preHandler: [requireAuth, requireCsrf],
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

    const submission = await app.prisma.submission.create({
      data: {
        title: parsed.data.title,
        keywords,
        abstract: parsed.data.abstract,
        authorUserId: request.auth.userId,
        status: 'DRAFT',
      },
    });

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

    reply.code(201).send({
      submission,
    });
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
      },
    });

    if (!submission) {
      reply.code(404).send({ error: 'not_found', message: 'submission not found' });
      return;
    }

    // this permission gate prevents users from uploading files into submissions they do not own
    if (!canAccessSubmission({ role: request.auth.role, userId: request.auth.userId, authorUserId: submission.authorUserId })) {
      reply.code(403).send({ error: 'forbidden', message: 'insufficient permissions' });
      return;
    }

    const storageKey = createSubmissionStorageKey(submission.id);
    const uploadUrl = await createPresignedPutUrl({
      client: storageClient,
      bucket: env.S3_BUCKET,
      key: storageKey,
      expiresInSeconds: env.S3_SIGNED_URL_EXPIRES_SECONDS,
      contentType: 'application/pdf',
    });

    await app.prisma.submission.update({
      where: { id: submission.id },
      data: {
        status: 'UPLOADING',
      },
    });

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
      },
    });

    if (!submission) {
      reply.code(404).send({ error: 'not_found', message: 'submission not found' });
      return;
    }

    if (!canAccessSubmission({ role: request.auth.role, userId: request.auth.userId, authorUserId: submission.authorUserId })) {
      reply.code(403).send({ error: 'forbidden', message: 'insufficient permissions' });
      return;
    }

    if (!body.data.storageKey.startsWith(`submissions/${submission.id}/`)) {
      reply.code(400).send({ error: 'bad_request', message: 'storage key does not match submission scope' });
      return;
    }

    const head = await headStoredObject({
      client: storageClient,
      bucket: env.S3_BUCKET,
      key: body.data.storageKey,
    }).catch(() => null);

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

    const prefix = await readObjectPrefix({
      client: storageClient,
      bucket: env.S3_BUCKET,
      key: body.data.storageKey,
      bytes: 8,
    });

    if (!hasPdfMagicBytes(prefix)) {
      reply.code(400).send({ error: 'bad_request', message: 'file signature validation failed' });
      return;
    }

    const sha256 = await computeObjectSha256({
      client: storageClient,
      bucket: env.S3_BUCKET,
      key: body.data.storageKey,
    });

    const result = await app.prisma.$transaction(async (tx) => {
      const file = await tx.submissionFile.create({
        data: {
          submissionId: submission.id,
          storageKey: body.data.storageKey,
          sizeBytes,
          sha256,
          mime,
          originalName: body.data.originalName,
        },
      });

      const updatedSubmission = await tx.submission.update({
        where: { id: submission.id },
        data: {
          status: 'UPLOADED',
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
      },
    });

    reply.send({
      submission: result.submission,
      file: result.file,
    });
  });

  app.get('/api/submissions', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    if (!request.auth) {
      return;
    }

    const parsedQuery = listQuerySchema.safeParse(request.query);
    if (!parsedQuery.success) {
      reply.code(400).send({ error: 'bad_request', message: 'invalid query parameters' });
      return;
    }

    const page = parsedQuery.data.page ?? 1;
    const pageSize = parsedQuery.data.pageSize ?? 20;

    const where = privilegedRoles.includes(request.auth.role)
      ? {}
      : { authorUserId: request.auth.userId };

    const [total, items] = await Promise.all([
      app.prisma.submission.count({ where }),
      app.prisma.submission.findMany({
        where,
        include: {
          files: {
            orderBy: { uploadedAt: 'desc' },
            take: 1,
          },
          author: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
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

  app.get('/api/submissions/:id', {
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
          orderBy: { uploadedAt: 'desc' },
        },
        author: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    if (!submission) {
      reply.code(404).send({ error: 'not_found', message: 'submission not found' });
      return;
    }

    if (!canAccessSubmission({ role: request.auth.role, userId: request.auth.userId, authorUserId: submission.authorUserId })) {
      reply.code(403).send({ error: 'forbidden', message: 'insufficient permissions' });
      return;
    }

    reply.send({ submission });
  });

  app.post('/api/submissions/:id/status', {
    preHandler: [requireAuth, requireCsrf, requireRoles('EDITOR', 'REVIEWER', 'ADMIN')],
  }, async (request, reply) => {
    if (!request.auth) {
      return;
    }

    const params = z.object({ id: z.string().min(1) }).safeParse(request.params);
    const body = statusSchema.safeParse(request.body);

    if (!params.success || !body.success) {
      reply.code(400).send({ error: 'bad_request', message: 'invalid request payload' });
      return;
    }

    const submission = await app.prisma.submission.update({
      where: { id: params.data.id },
      data: {
        status: body.data.status as SubmissionStatus,
      },
    }).catch(() => null);

    if (!submission) {
      reply.code(404).send({ error: 'not_found', message: 'submission not found' });
      return;
    }

    await writeAuditLog({
      prisma: app.prisma,
      actorUserId: request.auth.userId,
      action: 'submission.status_update',
      entityType: 'submission',
      entityId: submission.id,
      metadata: {
        status: submission.status,
      },
    });

    reply.send({ submission });
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
          orderBy: { uploadedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!submission) {
      reply.code(404).send({ error: 'not_found', message: 'submission not found' });
      return;
    }

    if (!canAccessSubmission({ role: request.auth.role, userId: request.auth.userId, authorUserId: submission.authorUserId })) {
      reply.code(403).send({ error: 'forbidden', message: 'insufficient permissions' });
      return;
    }

    const file = submission.files[0];
    if (!file) {
      reply.code(404).send({ error: 'not_found', message: 'file not found' });
      return;
    }

    // this endpoint only returns a short-lived signed url and never proxies file content through the api
    const url = await createPresignedGetUrl({
      client: storageClient,
      bucket: env.S3_BUCKET,
      key: file.storageKey,
      expiresInSeconds: env.S3_SIGNED_URL_EXPIRES_SECONDS,
    });

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
};
