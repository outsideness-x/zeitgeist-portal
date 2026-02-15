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
process.env.ANALYTICS_COOKIE_MAX_AGE_DAYS = process.env.ANALYTICS_COOKIE_MAX_AGE_DAYS ?? '365';
process.env.CONTENT_PROVIDER = process.env.CONTENT_PROVIDER ?? 'local';
process.env.PUBLISH_PROVIDER = process.env.PUBLISH_PROVIDER ?? 'local';

const canRun = Boolean(process.env.DATABASE_URL);

describe.skipIf(!canRun)('backend integration', () => {
  const app = buildServer();
  const request = supertest(app.server);

  beforeAll(async () => {
    await app.ready();

    // this cleanup keeps tests isolated while reusing one db in local environments
    await app.prisma.submissionPublication.deleteMany();
    await app.prisma.articleDailyVisitor.deleteMany();
    await app.prisma.articleDailyStats.deleteMany();
    await app.prisma.reaction.deleteMany();
    await app.prisma.bookmark.deleteMany();
    await app.prisma.reviewMessage.deleteMany();
    await app.prisma.submissionFile.deleteMany();
    await app.prisma.submission.deleteMany();
    await app.prisma.auditLog.deleteMany();
    await app.prisma.session.deleteMany();
    await app.prisma.article.deleteMany();
    await app.prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  const registerUser = async (email: string, name = 'tester') => {
    const registerResponse = await request.post('/api/auth/register').send({
      name,
      email,
      password: 'strongpassword123',
    });

    expect(registerResponse.status).toBe(201);

    return {
      user: registerResponse.body.user as { id: string; role: string; email: string },
      csrfToken: registerResponse.body.csrfToken as string,
      cookies: registerResponse.headers['set-cookie'] as string[],
    };
  };

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

    const loginResponse = await request.post('/api/auth/login').send({
      email,
      password: 'strongpassword123',
    });

    expect(loginResponse.status).toBe(200);

    const logoutResponse = await request
      .post('/api/auth/logout')
      .set('Cookie', cookies)
      .set('x-csrf-token', meResponse.body.csrfToken)
      .send({});

    expect(logoutResponse.status).toBe(200);
  });

  it('bookmark toggle and list flow works', async () => {
    const identity = await registerUser(`bookmark-${randomUUID()}@example.com`);

    const ensureResponse = await request.post('/api/articles/ensure').send({
      source: 'local',
      slug: `bookmark-article-${randomUUID()}`,
      title: 'bookmark article',
      excerpt: 'bookmark excerpt',
      section: 'journal',
    });

    expect(ensureResponse.status).toBe(200);
    const articleId = ensureResponse.body.articleId as string;

    const addResponse = await request
      .post('/api/me/bookmarks/toggle')
      .set('Cookie', identity.cookies)
      .set('x-csrf-token', identity.csrfToken)
      .send({ articleId });

    expect(addResponse.status).toBe(200);
    expect(addResponse.body.bookmarked).toBe(true);

    const listResponse = await request
      .get('/api/me/bookmarks?page=1&pageSize=20')
      .set('Cookie', identity.cookies);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.items.length).toBe(1);

    const removeResponse = await request
      .post('/api/me/bookmarks/toggle')
      .set('Cookie', identity.cookies)
      .set('x-csrf-token', identity.csrfToken)
      .send({ articleId });

    expect(removeResponse.status).toBe(200);
    expect(removeResponse.body.bookmarked).toBe(false);
  });

  it('reaction set update and clear flow works', async () => {
    const identity = await registerUser(`reaction-${randomUUID()}@example.com`);

    const ensureResponse = await request.post('/api/articles/ensure').send({
      source: 'local',
      slug: `reaction-article-${randomUUID()}`,
      title: 'reaction article',
      excerpt: 'reaction excerpt',
      section: 'journal',
    });

    const articleId = ensureResponse.body.articleId as string;

    const setLikeResponse = await request
      .post(`/api/articles/${articleId}/reaction`)
      .set('Cookie', identity.cookies)
      .set('x-csrf-token', identity.csrfToken)
      .send({ type: 'like' });

    expect(setLikeResponse.status).toBe(200);
    expect(setLikeResponse.body.reaction).toBe('like');

    const setInsightfulResponse = await request
      .post(`/api/articles/${articleId}/reaction`)
      .set('Cookie', identity.cookies)
      .set('x-csrf-token', identity.csrfToken)
      .send({ type: 'insightful' });

    expect(setInsightfulResponse.status).toBe(200);
    expect(setInsightfulResponse.body.reaction).toBe('insightful');

    const myReactionResponse = await request
      .get(`/api/articles/${articleId}/reaction/me`)
      .set('Cookie', identity.cookies);

    expect(myReactionResponse.status).toBe(200);
    expect(myReactionResponse.body.reaction).toBe('insightful');

    const clearResponse = await request
      .delete(`/api/articles/${articleId}/reaction`)
      .set('Cookie', identity.cookies)
      .set('x-csrf-token', identity.csrfToken);

    expect(clearResponse.status).toBe(200);

    const myReactionAfterClear = await request
      .get(`/api/articles/${articleId}/reaction/me`)
      .set('Cookie', identity.cookies);

    expect(myReactionAfterClear.status).toBe(200);
    expect(myReactionAfterClear.body.reaction).toBeNull();
  });

  it('analytics view increments and unique visitor dedup works for same visitor/day', async () => {
    const ensureResponse = await request.post('/api/articles/ensure').send({
      source: 'local',
      slug: `analytics-article-${randomUUID()}`,
      title: 'analytics article',
      excerpt: 'analytics excerpt',
      section: 'journal',
    });

    const articleId = ensureResponse.body.articleId as string;

    const firstView = await request
      .post('/api/analytics/view')
      .send({ articleId });

    expect(firstView.status).toBe(200);
    expect(firstView.body.views).toBe(1);
    expect(firstView.body.uniqueVisitors).toBe(1);

    const visitorCookie = (firstView.headers['set-cookie'] as string[]).find((item) => item.startsWith('zg_vid='));
    expect(visitorCookie).toBeTruthy();

    const secondView = await request
      .post('/api/analytics/view')
      .set('Cookie', visitorCookie ? [visitorCookie] : [])
      .send({ articleId });

    expect(secondView.status).toBe(200);
    expect(secondView.body.views).toBe(2);
    expect(secondView.body.uniqueVisitors).toBe(1);
  });

  it('submission create upload-init and upload-complete flow works', async () => {
    const identity = await registerUser(`author-${randomUUID()}@example.com`, 'author');

    const createSubmissionResponse = await request
      .post('/api/submissions')
      .set('Cookie', identity.cookies)
      .set('x-csrf-token', identity.csrfToken)
      .send({
        title: 'integration submission',
        keywords: 'history,archives',
        abstract: 'this abstract is long enough for validation and integration testing in this suite.',
        requestedSection: 'research',
      });

    expect(createSubmissionResponse.status).toBe(201);
    const submissionId = createSubmissionResponse.body.submission.id as string;

    const uploadInitResponse = await request
      .post(`/api/submissions/${submissionId}/upload/init`)
      .set('Cookie', identity.cookies)
      .set('x-csrf-token', identity.csrfToken)
      .send({ originalName: 'paper.pdf' });

    expect(uploadInitResponse.status).toBe(200);
    expect(uploadInitResponse.body.uploadUrl).toContain('presigned-put');

    const uploadCompleteResponse = await request
      .post(`/api/submissions/${submissionId}/upload/complete`)
      .set('Cookie', identity.cookies)
      .set('x-csrf-token', identity.csrfToken)
      .send({
        storageKey: uploadInitResponse.body.storageKey,
        originalName: 'paper.pdf',
      });

    expect(uploadCompleteResponse.status).toBe(200);
    expect(uploadCompleteResponse.body.file.mime).toBe('application/pdf');
    expect(uploadCompleteResponse.body.submission.status).toBe('SUBMITTED');

    const listResponse = await request
      .get('/api/submissions/me?page=1&pageSize=20')
      .set('Cookie', identity.cookies);

    expect(listResponse.status).toBe(200);
    expect(Array.isArray(listResponse.body.items)).toBe(true);
    expect(listResponse.body.items.length).toBe(1);
  });

  it('admin approve publishes and promotes author role', async () => {
    const authorIdentity = await registerUser(`candidate-${randomUUID()}@example.com`, 'candidate');

    const createSubmissionResponse = await request
      .post('/api/submissions')
      .set('Cookie', authorIdentity.cookies)
      .set('x-csrf-token', authorIdentity.csrfToken)
      .send({
        title: 'approval submission',
        keywords: 'workflow,test',
        abstract: 'this abstract validates admin approval and publication workflow in integration test coverage.',
      });

    expect(createSubmissionResponse.status).toBe(201);
    const submissionId = createSubmissionResponse.body.submission.id as string;

    const uploadInitResponse = await request
      .post(`/api/submissions/${submissionId}/upload/init`)
      .set('Cookie', authorIdentity.cookies)
      .set('x-csrf-token', authorIdentity.csrfToken)
      .send({ originalName: 'approval.pdf' });

    expect(uploadInitResponse.status).toBe(200);

    const uploadCompleteResponse = await request
      .post(`/api/submissions/${submissionId}/upload/complete`)
      .set('Cookie', authorIdentity.cookies)
      .set('x-csrf-token', authorIdentity.csrfToken)
      .send({
        storageKey: uploadInitResponse.body.storageKey,
        originalName: 'approval.pdf',
      });

    expect(uploadCompleteResponse.status).toBe(200);

    const adminIdentity = await registerUser(`admin-${randomUUID()}@example.com`, 'admin');

    await app.prisma.user.update({
      where: {
        id: adminIdentity.user.id,
      },
      data: {
        role: 'ADMIN',
      },
    });

    const approveResponse = await request
      .post(`/api/admin/submissions/${submissionId}/approve`)
      .set('Cookie', adminIdentity.cookies)
      .set('x-csrf-token', adminIdentity.csrfToken)
      .send({ section: 'research' });

    expect(approveResponse.status).toBe(200);
    expect(approveResponse.body.submission.status).toBe('PUBLISHED');
    expect(approveResponse.body.published.source).toBe('LOCAL');

    const promotedUser = await app.prisma.user.findUnique({
      where: {
        id: authorIdentity.user.id,
      },
      select: {
        role: true,
      },
    });

    expect(promotedUser?.role).toBe('AUTHOR');
  });

  it('parallel approve requests publish once and keep audit logs consistent', async () => {
    const authorIdentity = await registerUser(`parallel-${randomUUID()}@example.com`, 'parallel author');

    const createSubmissionResponse = await request
      .post('/api/submissions')
      .set('Cookie', authorIdentity.cookies)
      .set('x-csrf-token', authorIdentity.csrfToken)
      .send({
        title: 'parallel approval submission',
        keywords: 'parallel,approve',
        abstract: 'this abstract exists to validate concurrent admin approvals and idempotent publishing behavior.',
      });

    expect(createSubmissionResponse.status).toBe(201);
    const submissionId = createSubmissionResponse.body.submission.id as string;

    const uploadInitResponse = await request
      .post(`/api/submissions/${submissionId}/upload/init`)
      .set('Cookie', authorIdentity.cookies)
      .set('x-csrf-token', authorIdentity.csrfToken)
      .send({ originalName: 'parallel.pdf' });

    expect(uploadInitResponse.status).toBe(200);

    const uploadCompleteResponse = await request
      .post(`/api/submissions/${submissionId}/upload/complete`)
      .set('Cookie', authorIdentity.cookies)
      .set('x-csrf-token', authorIdentity.csrfToken)
      .send({
        storageKey: uploadInitResponse.body.storageKey,
        originalName: 'parallel.pdf',
      });

    expect(uploadCompleteResponse.status).toBe(200);

    const adminIdentity = await registerUser(`parallel-admin-${randomUUID()}@example.com`, 'parallel admin');

    await app.prisma.user.update({
      where: {
        id: adminIdentity.user.id,
      },
      data: {
        role: 'ADMIN',
      },
    });

    const approveRequests = await Promise.all([
      request
        .post(`/api/admin/submissions/${submissionId}/approve`)
        .set('Cookie', adminIdentity.cookies)
        .set('x-csrf-token', adminIdentity.csrfToken)
        .send({ section: 'research' }),
      request
        .post(`/api/admin/submissions/${submissionId}/approve`)
        .set('Cookie', adminIdentity.cookies)
        .set('x-csrf-token', adminIdentity.csrfToken)
        .send({ section: 'research' }),
    ]);

    const statusCodes = approveRequests.map((response) => response.status).sort((a, b) => a - b);
    expect(statusCodes).toEqual([200, 409]);

    const successResponse = approveRequests.find((response) => response.status === 200);
    const conflictResponse = approveRequests.find((response) => response.status === 409);

    expect(successResponse).toBeTruthy();
    expect(conflictResponse).toBeTruthy();
    expect(conflictResponse?.body.code).toBe('submission_already_published');

    const publicationCount = await app.prisma.submissionPublication.count({
      where: {
        submissionId,
      },
    });

    expect(publicationCount).toBe(1);

    const publishedArticlesCount = await app.prisma.article.count({
      where: {
        title: 'parallel approval submission',
      },
    });

    expect(publishedArticlesCount).toBe(1);

    const finalSubmission = await app.prisma.submission.findUnique({
      where: {
        id: submissionId,
      },
      select: {
        status: true,
        publishedArticleId: true,
      },
    });

    expect(finalSubmission?.status).toBe('PUBLISHED');
    expect(finalSubmission?.publishedArticleId).toBeTruthy();

    const [approveAuditCount, publishAuditCount] = await Promise.all([
      app.prisma.auditLog.count({
        where: {
          entityType: 'submission',
          entityId: submissionId,
          action: 'submission.approve',
        },
      }),
      app.prisma.auditLog.count({
        where: {
          entityType: 'submission',
          entityId: submissionId,
          action: 'submission.publish',
        },
      }),
    ]);

    expect(approveAuditCount).toBe(1);
    expect(publishAuditCount).toBe(1);
  });
});
