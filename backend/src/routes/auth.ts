import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getEnv } from '../config/env.js';
import { createCsrfToken, createOpaqueToken, hashPassword, hashToken, verifyPassword } from '../lib/auth.js';
import { writeAuditLog } from '../lib/audit.js';
import { requireAuth, requireCsrf } from '../plugins/auth.js';
import { normalizeEmail } from '../lib/text.js';

const registerBodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(128),
});

const loginBodySchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(128),
});

let missingUserHashPromise: Promise<string> | null = null;

const getMissingUserHash = () => {
  if (!missingUserHashPromise) {
    missingUserHashPromise = hashPassword('missing-user-password-placeholder');
  }
  return missingUserHashPromise;
};

const setSessionCookies = (args: {
  reply: FastifyReply;
  sessionToken: string;
  csrfToken: string;
  expiresAt: Date;
}) => {
  const isProd = getEnv().NODE_ENV === 'production';

  // this cookie stores only an opaque token and keeps session state on the server
  args.reply.setCookie('zg_session', args.sessionToken, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    expires: args.expiresAt,
  });

  // this csrf cookie is readable by the client and must match the request header
  args.reply.setCookie('zg_csrf', args.csrfToken, {
    path: '/',
    httpOnly: false,
    sameSite: 'lax',
    secure: isProd,
    expires: args.expiresAt,
  });
};

const createSessionForUser = async (app: FastifyInstance, userId: string) => {
  const sessionToken = createOpaqueToken();
  const tokenHash = hashToken(sessionToken);
  const csrfToken = createCsrfToken();
  const expiresAt = new Date(Date.now() + getEnv().SESSION_TTL_HOURS * 60 * 60 * 1000);

  await app.prisma.session.create({
    data: {
      userId,
      tokenHash,
      csrfToken,
      expiresAt,
    },
  });

  return { sessionToken, csrfToken, expiresAt };
};

export const registerAuthRoutes = async (app: FastifyInstance) => {
  app.post('/api/auth/register', {
    config: {
      rateLimit: {
        max: 20,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    const parsed = registerBodySchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400).send({ error: 'bad_request', message: parsed.error.issues[0]?.message ?? 'invalid request body' });
      return;
    }

    const body = parsed.data;
    const normalizedEmail = normalizeEmail(body.email);

    const existingUser = await app.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    // this keeps auth failures generic so email presence cannot be inferred by response text
    if (existingUser) {
      reply.code(400).send({
        error: 'bad_request',
        message: 'unable to process credentials',
      });
      return;
    }

    const passwordHash = await hashPassword(body.password);
    const user = await app.prisma.user.create({
      data: {
        name: body.name,
        email: normalizedEmail,
        passwordHash,
        role: 'READER',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    const { sessionToken, csrfToken, expiresAt } = await createSessionForUser(app, user.id);

    await writeAuditLog({
      prisma: app.prisma,
      actorUserId: user.id,
      action: 'auth.register',
      entityType: 'user',
      entityId: user.id,
      metadata: { email: user.email },
    });

    setSessionCookies({ reply, sessionToken, csrfToken, expiresAt });

    reply.code(201).send({ user, csrfToken });
  });

  app.post('/api/auth/login', {
    config: {
      rateLimit: {
        max: 30,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    const parsed = loginBodySchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400).send({ error: 'bad_request', message: parsed.error.issues[0]?.message ?? 'invalid request body' });
      return;
    }

    const body = parsed.data;
    const normalizedEmail = normalizeEmail(body.email);

    const user = await app.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        passwordHash: true,
      },
    });

    const invalidCredentials = () => {
      reply.code(401).send({
        error: 'unauthorized',
        message: 'invalid credentials',
      });
    };

    if (!user) {
      const missingUserHash = await getMissingUserHash();
      await verifyPassword(missingUserHash, body.password);
      invalidCredentials();
      return;
    }

    const passwordOk = await verifyPassword(user.passwordHash, body.password);
    if (!passwordOk) {
      invalidCredentials();
      return;
    }

    const { sessionToken, csrfToken, expiresAt } = await createSessionForUser(app, user.id);

    await writeAuditLog({
      prisma: app.prisma,
      actorUserId: user.id,
      action: 'auth.login',
      entityType: 'session',
      metadata: { userId: user.id },
    });

    setSessionCookies({ reply, sessionToken, csrfToken, expiresAt });

    reply.send({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      csrfToken,
    });
  });

  app.post('/api/auth/logout', {
    preHandler: [requireAuth, requireCsrf],
  }, async (request, reply) => {
    if (!request.auth) {
      return;
    }

    await app.prisma.session.deleteMany({
      where: { id: request.auth.sessionId },
    });

    await writeAuditLog({
      prisma: app.prisma,
      actorUserId: request.auth.userId,
      action: 'auth.logout',
      entityType: 'session',
      entityId: request.auth.sessionId,
    });

    reply.clearCookie('zg_session', { path: '/' });
    reply.clearCookie('zg_csrf', { path: '/' });
    reply.send({ ok: true });
  });

  app.get('/api/auth/me', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    if (!request.auth) {
      return;
    }

    const user = await app.prisma.user.findUnique({
      where: { id: request.auth.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      reply.code(404).send({ error: 'not_found', message: 'user not found' });
      return;
    }

    reply.send({ user, csrfToken: request.auth.csrfToken });
  });
};
