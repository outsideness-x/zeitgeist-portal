import { randomUUID } from 'node:crypto';
import supertest from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildServer } from '../src/server.js';

vi.mock('../src/lib/storage.js', () => {
  return {
    createStorageClient: () => ({}),
    createSubmissionStorageKey: (submissionId: string) => `submissions/${submissionId}/mock.pdf`,
    createPresignedPutUrl: async () => 'http://upload.local/presigned-put',
    createPresignedGetUrl: async () => 'http://download.local/presigned-get',
    headStoredObject: async () => ({
      ContentLength: 2048,
      ContentType: 'application/pdf',
    }),
    readObjectPrefix: async () => Buffer.from('%PDF-1.7'),
    computeObjectSha256: async () => 'sha256-mock-value',
  };
});

process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.BACKEND_HOST = process.env.BACKEND_HOST ?? '127.0.0.1';
process.env.BACKEND_PORT = process.env.BACKEND_PORT ?? '4001';
process.env.BACKEND_COOKIE_SECRET = process.env.BACKEND_COOKIE_SECRET ?? 'test-cookie-secret-value-with-enough-length';
process.env.BACKEND_CORS_ORIGIN = process.env.BACKEND_CORS_ORIGIN ?? 'http://localhost:3000';
process.env.SESSION_TTL_HOURS = process.env.SESSION_TTL_HOURS ?? '4';
process.env.CSRF_HEADER_NAME = process.env.CSRF_HEADER_NAME ?? 'x-csrf-token';
process.env.S3_ENDPOINT = process.env.S3_ENDPOINT ?? 'http://localhost:9000';
process.env.S3_REGION = process.env.S3_REGION ?? 'us-east-1';
process.env.S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID ?? 'minioadmin';
process.env.S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY ?? 'minioadmin';
process.env.S3_BUCKET = process.env.S3_BUCKET ?? 'zeitgeist';
process.env.S3_SIGNED_URL_EXPIRES_SECONDS = process.env.S3_SIGNED_URL_EXPIRES_SECONDS ?? '300';
process.env.UPLOAD_MAX_BYTES = process.env.UPLOAD_MAX_BYTES ?? '26214400';
process.env.RATE_LIMIT_MAX = process.env.RATE_LIMIT_MAX ?? '1000';
process.env.RATE_LIMIT_WINDOW_SECONDS = process.env.RATE_LIMIT_WINDOW_SECONDS ?? '60';

const canRun = Boolean(process.env.BACKEND_DATABASE_URL);

describe.skipIf(!canRun)('backend integration', () => {
  const app = buildServer();
  const request = supertest(app.server);

  beforeAll(async () => {
    await app.ready();

    // this cleanup keeps tests isolated while reusing one db in local environments
    await app.prisma.auditLog.deleteMany();
    await app.prisma.submissionFile.deleteMany();
    await app.prisma.submission.deleteMany();
    await app.prisma.libraryItem.deleteMany();
    await app.prisma.session.deleteMany();
    await app.prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('register login and me flow works', async () => {
    const email = `user-${randomUUID()}@example.com`;

    const registerResponse = await request.post('/api/auth/register').send({
      name: 'tester',
      email,
      password: 'strongpassword123',
    });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.user.email).toBe(email);

    const cookies = registerResponse.headers['set-cookie'];
    expect(cookies).toBeTruthy();

    const meResponse = await request
      .get('/api/auth/me')
      .set('Cookie', cookies);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.user.email).toBe(email);
    expect(typeof meResponse.body.csrfToken).toBe('string');

    const logoutResponse = await request
      .post('/api/auth/logout')
      .set('Cookie', cookies)
      .set('x-csrf-token', meResponse.body.csrfToken)
      .send({});

    expect(logoutResponse.status).toBe(200);
  });

  it('submission create upload-init and upload-complete flow works', async () => {
    const email = `author-${randomUUID()}@example.com`;

    const registerResponse = await request.post('/api/auth/register').send({
      name: 'author',
      email,
      password: 'strongpassword123',
    });

    const cookies = registerResponse.headers['set-cookie'];
    const csrfToken = registerResponse.body.csrfToken as string;

    const createSubmissionResponse = await request
      .post('/api/submissions')
      .set('Cookie', cookies)
      .set('x-csrf-token', csrfToken)
      .send({
        title: 'integration submission',
        keywords: 'history,archives',
        abstract: 'this abstract is long enough for validation and integration testing in this suite.',
      });

    expect(createSubmissionResponse.status).toBe(201);
    const submissionId = createSubmissionResponse.body.submission.id as string;

    const uploadInitResponse = await request
      .post(`/api/submissions/${submissionId}/upload/init`)
      .set('Cookie', cookies)
      .set('x-csrf-token', csrfToken)
      .send({ originalName: 'paper.pdf' });

    expect(uploadInitResponse.status).toBe(200);
    expect(uploadInitResponse.body.uploadUrl).toContain('presigned-put');

    const uploadCompleteResponse = await request
      .post(`/api/submissions/${submissionId}/upload/complete`)
      .set('Cookie', cookies)
      .set('x-csrf-token', csrfToken)
      .send({
        storageKey: uploadInitResponse.body.storageKey,
        originalName: 'paper.pdf',
      });

    expect(uploadCompleteResponse.status).toBe(200);
    expect(uploadCompleteResponse.body.file.mime).toBe('application/pdf');

    const listResponse = await request
      .get('/api/submissions')
      .set('Cookie', cookies);

    expect(listResponse.status).toBe(200);
    expect(Array.isArray(listResponse.body.items)).toBe(true);
  });
});
