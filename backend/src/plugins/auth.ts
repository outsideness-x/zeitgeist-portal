import fp from 'fastify-plugin';
import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';
import type { Role } from '@prisma/client';
import { getEnv } from '../config/env.js';
import { hashToken } from '../lib/auth.js';

const SESSION_COOKIE_NAME = 'zg_session';
const CSRF_COOKIE_NAME = 'zg_csrf';

export const authPlugin = fp(async (app) => {
  const env = getEnv();

  app.addHook('onRequest', async (request, reply) => {
    request.auth = null;

    const token = request.cookies[SESSION_COOKIE_NAME];
    if (!token) {
      return;
    }

    const tokenHash = hashToken(token);

    // this loads auth context from db so all route guards rely on the same source of truth
    const session = await app.prisma.session.findFirst({
      where: {
        tokenHash,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });

    if (!session) {
      reply.clearCookie(SESSION_COOKIE_NAME, {
        path: '/',
      });
      reply.clearCookie(CSRF_COOKIE_NAME, {
        path: '/',
      });
      return;
    }

    request.auth = {
      userId: session.userId,
      role: session.user.role,
      sessionId: session.id,
      csrfToken: session.csrfToken,
    };
  });

  app.decorate('authConfig', {
    sessionCookieName: SESSION_COOKIE_NAME,
    csrfCookieName: CSRF_COOKIE_NAME,
    csrfHeaderName: env.CSRF_HEADER_NAME,
  });
});

export const requireAuth: preHandlerHookHandler = async (request, reply) => {
  if (!request.auth) {
    reply.code(401).send({
      error: 'unauthorized',
      message: 'authentication is required',
    });
    return;
  }
};

export const requireCsrf: preHandlerHookHandler = async (request, reply) => {
  if (!request.auth) {
    reply.code(401).send({
      error: 'unauthorized',
      message: 'authentication is required',
    });
    return;
  }

  const env = getEnv();
  const headerValue = request.headers[env.CSRF_HEADER_NAME] as string | undefined;
  const cookieValue = request.cookies.zg_csrf;

  // this enforces same-origin mutating requests when using cookie auth
  if (!headerValue || !cookieValue || headerValue !== cookieValue || headerValue !== request.auth.csrfToken) {
    reply.code(403).send({
      error: 'forbidden',
      message: 'csrf validation failed',
    });
  }
};

export const requireRoles = (...roles: Role[]): preHandlerHookHandler => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.auth) {
      reply.code(401).send({
        error: 'unauthorized',
        message: 'authentication is required',
      });
      return;
    }

    if (!roles.includes(request.auth.role)) {
      reply.code(403).send({
        error: 'forbidden',
        message: 'insufficient permissions',
      });
    }
  };
};
