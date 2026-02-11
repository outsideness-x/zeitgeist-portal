import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getEnv } from '../config/env.js';
import { writeAuditLog } from '../lib/audit.js';
import { isPdfMime } from '../lib/pdf.js';
import { createPresignedGetUrl, createStorageClient, headStoredObject } from '../lib/storage.js';
import { requireAuth, requireCsrf, requireRoles } from '../plugins/auth.js';

const createLibrarySchema = z.object({
  title: z.string().trim().min(2).max(280),
  author: z.string().trim().min(2).max(280),
  description: z.string().trim().min(8).max(5000),
  storageKey: z.string().trim().min(1),
  publishedYear: z.string().trim().min(2).max(16),
  language: z.string().trim().min(2).max(80),
});

export const registerLibraryRoutes = async (app: FastifyInstance) => {
  const env = getEnv();
  const storageClient = createStorageClient(env);

  app.get('/api/library', {
    preHandler: [requireAuth],
  }, async (_request, reply) => {
    const items = await app.prisma.libraryItem.findMany({
      orderBy: { createdAt: 'desc' },
    });

    reply.send({ items });
  });

  app.post('/api/library', {
    preHandler: [requireAuth, requireCsrf, requireRoles('EDITOR', 'ADMIN')],
  }, async (request, reply) => {
    if (!request.auth) {
      return;
    }

    const parsed = createLibrarySchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400).send({ error: 'bad_request', message: parsed.error.issues[0]?.message ?? 'invalid request body' });
      return;
    }

    const head = await headStoredObject({
      client: storageClient,
      bucket: env.S3_BUCKET,
      key: parsed.data.storageKey,
    }).catch(() => null);

    if (!head) {
      reply.code(400).send({ error: 'bad_request', message: 'storage object not found' });
      return;
    }

    if (!isPdfMime(head.ContentType)) {
      reply.code(400).send({ error: 'bad_request', message: 'library item must point to a pdf object' });
      return;
    }

    const sizeBytes = Number(head.ContentLength ?? 0);
    if (sizeBytes <= 0 || sizeBytes > env.UPLOAD_MAX_BYTES) {
      reply.code(400).send({ error: 'bad_request', message: 'library object size is invalid' });
      return;
    }

    const item = await app.prisma.libraryItem.create({
      data: {
        title: parsed.data.title,
        author: parsed.data.author,
        description: parsed.data.description,
        storageKey: parsed.data.storageKey,
        mime: head.ContentType ?? 'application/pdf',
        sizeBytes,
        publishedYear: parsed.data.publishedYear,
        language: parsed.data.language,
        createdById: request.auth.userId,
      },
    });

    await writeAuditLog({
      prisma: app.prisma,
      actorUserId: request.auth.userId,
      action: 'library.create',
      entityType: 'library_item',
      entityId: item.id,
      metadata: {
        storageKey: item.storageKey,
      },
    });

    reply.code(201).send({ item });
  });

  app.get('/api/library/:id/download', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    if (!request.auth) {
      return;
    }

    const params = z.object({ id: z.string().min(1) }).safeParse(request.params);
    if (!params.success) {
      reply.code(400).send({ error: 'bad_request', message: 'invalid library id' });
      return;
    }

    const item = await app.prisma.libraryItem.findUnique({
      where: { id: params.data.id },
    });

    if (!item) {
      reply.code(404).send({ error: 'not_found', message: 'library item not found' });
      return;
    }

    const url = await createPresignedGetUrl({
      client: storageClient,
      bucket: env.S3_BUCKET,
      key: item.storageKey,
      expiresInSeconds: env.S3_SIGNED_URL_EXPIRES_SECONDS,
    });

    await writeAuditLog({
      prisma: app.prisma,
      actorUserId: request.auth.userId,
      action: 'library.download',
      entityType: 'library_item',
      entityId: item.id,
    });

    reply.send({
      url,
      expiresInSeconds: env.S3_SIGNED_URL_EXPIRES_SECONDS,
      item: {
        id: item.id,
        title: item.title,
        sizeBytes: item.sizeBytes,
        mime: item.mime,
      },
    });
  });
};
