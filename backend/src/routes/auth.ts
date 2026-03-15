import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { getEnv } from '../config/env.js';
import {
  createCodeNonce,
  createCsrfToken,
  createNumericCode,
  createOpaqueToken,
  hashOneTimeCode,
  hashPassword,
  hashToken,
  secureCompareHash,
  verifyPassword,
} from '../lib/auth.js';
import { writeAuditLog } from '../lib/audit.js';
import { parseAllowedCorsOrigins } from '../lib/cors.js';
import { sendVerificationCodeEmail } from '../lib/email.js';
import { normalizeEmail } from '../lib/text.js';
import { requireAuth, requireCsrf, CSRF_COOKIE_NAME, PREAUTH_COOKIE_NAME, SESSION_COOKIE_NAME } from '../plugins/auth.js';

const registerBodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(128),
});

const loginBodySchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(128),
  callbackPath: z.string().trim().max(2048).optional(),
});

const googleStartBodySchema = z.object({
  callbackPath: z.string().trim().max(2048).optional(),
});

const googleCallbackQuerySchema = z.object({
  code: z.string().trim().min(1).optional(),
  state: z.string().trim().min(1).optional(),
  error: z.string().trim().min(1).optional(),
});

const googleTokenSchema = z.object({
  access_token: z.string().trim().min(1),
});

const googleProfileSchema = z.object({
  sub: z.string().trim().min(1),
  email: z.string().trim().email(),
  email_verified: z.union([z.boolean(), z.string()]).transform((value) => value === true || value === 'true'),
  name: z.string().trim().min(1).max(120).optional(),
});

const twoFactorFlowSchema = z.enum(['login', 'enable_2fa', 'disable_2fa']);

const twoFactorSendBodySchema = z.object({
  flow: twoFactorFlowSchema.optional(),
});

const twoFactorVerifyBodySchema = z.object({
  flow: twoFactorFlowSchema.optional(),
  code: z.string().trim().regex(/^\d{6}$/),
});

const avatarBodySchema = z.object({
  avatarDataUrl: z.union([
    z.string().trim().max(1_500_000).refine((value) => {
      if (!value.startsWith('data:image/')) {
        return false;
      }

      const separator = ';base64,';
      const separatorIndex = value.indexOf(separator);
      if (separatorIndex <= 5) {
        return false;
      }

      const mimeType = value.slice(5, separatorIndex).toLowerCase();
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(mimeType)) {
        return false;
      }

      const payload = value.slice(separatorIndex + separator.length);
      return payload.length > 0;
    }, 'invalid avatar payload'),
    z.null(),
  ]),
});

const authUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  avatarDataUrl: true,
  twoFactorEmailEnabled: true,
} satisfies Prisma.UserSelect;

type AuthUserPayload = Prisma.UserGetPayload<{ select: typeof authUserSelect }>;
type ActivePreAuthSession = Prisma.PreAuthSessionGetPayload<{
  include: {
    user: {
      select: typeof authUserSelect;
    };
  };
}>;

type OneTimeCodeContext = {
  userId: string;
  purpose: 'LOGIN_2FA' | 'LINK_GOOGLE' | 'ENABLE_2FA' | 'DISABLE_2FA';
  preAuthSessionId: string | null;
};

type PublicTwoFactorPurpose = 'login_2fa' | 'link_google' | 'enable_2fa' | 'disable_2fa';

type TwoFactorIssueResult =
  | {
    ok: true;
    purpose: PublicTwoFactorPurpose;
    expiresAt: Date;
    resendAvailableAt: Date;
    emailHint: string;
    debugCode?: string;
  }
  | {
    ok: false;
    statusCode: number;
    message: string;
    retryAfterSeconds?: number;
  };

type TwoFactorVerifyResult =
  | {
    ok: true;
  }
  | {
    ok: false;
    statusCode: number;
    message: string;
    retryAfterSeconds?: number;
  };

let missingUserHashPromise: Promise<string> | null = null;

const getMissingUserHash = () => {
  if (!missingUserHashPromise) {
    missingUserHashPromise = hashPassword('missing-user-password-placeholder');
  }
  return missingUserHashPromise;
};

const normalizeCallbackPath = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '/';
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return '/';
  }

  if (trimmed.includes('\n') || trimmed.includes('\r')) {
    return '/';
  }

  try {
    const parsed = new URL(trimmed, 'https://local.example');
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return '/';
  }
};

const buildAppRedirectUrl = (path: string, query?: Record<string, string>) => {
  const env = getEnv();
  const baseUrl = env.AUTH_APP_BASE_URL ?? env.BACKEND_CORS_ORIGIN;
  const redirectUrl = new URL(normalizeCallbackPath(path), baseUrl);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      redirectUrl.searchParams.set(key, value);
    });
  }

  return redirectUrl.toString();
};

const maskEmail = (email: string): string => {
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) {
    return '***';
  }

  if (localPart.length <= 2) {
    return `${localPart[0] ?? '*'}***@${domain}`;
  }

  return `${localPart.slice(0, 2)}***@${domain}`;
};

const toPublicTwoFactorPurpose = (purpose: OneTimeCodeContext['purpose']): PublicTwoFactorPurpose => {
  if (purpose === 'LOGIN_2FA') {
    return 'login_2fa';
  }
  if (purpose === 'LINK_GOOGLE') {
    return 'link_google';
  }
  if (purpose === 'ENABLE_2FA') {
    return 'enable_2fa';
  }
  return 'disable_2fa';
};

const preAuthPurposeToCodePurpose = (purpose: ActivePreAuthSession['purpose']): OneTimeCodeContext['purpose'] => {
  if (purpose === 'LOGIN_2FA') {
    return 'LOGIN_2FA';
  }
  return 'LINK_GOOGLE';
};

const getClientMetadata = (request: FastifyRequest) => {
  return {
    ip: request.ip,
    userAgent: typeof request.headers['user-agent'] === 'string'
      ? request.headers['user-agent'].slice(0, 1024)
      : null,
  };
};

const setSessionCookies = (args: {
  reply: FastifyReply;
  sessionToken: string;
  csrfToken: string;
  expiresAt: Date;
}) => {
  const isProd = getEnv().NODE_ENV === 'production';

  // this cookie stores only an opaque token and keeps session state on the server
  args.reply.setCookie(SESSION_COOKIE_NAME, args.sessionToken, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    expires: args.expiresAt,
  });

  // this csrf cookie is readable by the client and must match the request header
  args.reply.setCookie(CSRF_COOKIE_NAME, args.csrfToken, {
    path: '/',
    httpOnly: false,
    sameSite: 'lax',
    secure: isProd,
    expires: args.expiresAt,
  });
};

const setPreAuthCookie = (args: {
  reply: FastifyReply;
  token: string;
  expiresAt: Date;
}) => {
  const isProd = getEnv().NODE_ENV === 'production';

  args.reply.setCookie(PREAUTH_COOKIE_NAME, args.token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    expires: args.expiresAt,
  });
};

const clearPreAuthCookie = (reply: FastifyReply) => {
  reply.clearCookie(PREAUTH_COOKIE_NAME, { path: '/' });
};

const createSessionForUser = async (app: FastifyInstance, userId: string, request?: FastifyRequest) => {
  const existingToken = request?.cookies[SESSION_COOKIE_NAME];
  if (existingToken) {
    await app.prisma.session.deleteMany({
      where: {
        tokenHash: hashToken(existingToken),
      },
    });
  }

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

const createPreAuthSession = async (args: {
  app: FastifyInstance;
  reply: FastifyReply;
  userId: string;
  purpose: 'LOGIN_2FA' | 'LINK_GOOGLE';
  redirectPath: string;
  request: FastifyRequest;
  provider?: 'GOOGLE';
  providerAccountId?: string;
  providerEmail?: string;
  providerEmailVerified?: boolean;
}): Promise<ActivePreAuthSession> => {
  const env = getEnv();
  const expiresAt = new Date(Date.now() + env.PREAUTH_TTL_MINUTES * 60 * 1000);
  const token = createOpaqueToken();

  const metadata = getClientMetadata(args.request);

  const preAuth = await args.app.prisma.preAuthSession.create({
    data: {
      userId: args.userId,
      purpose: args.purpose,
      redirectPath: normalizeCallbackPath(args.redirectPath),
      tokenHash: hashToken(token),
      expiresAt,
      provider: args.provider ?? null,
      providerAccountId: args.providerAccountId ?? null,
      providerEmail: args.providerEmail ?? null,
      providerEmailVerified: args.providerEmailVerified ?? null,
      ip: metadata.ip,
      userAgent: metadata.userAgent,
    },
    include: {
      user: {
        select: authUserSelect,
      },
    },
  });

  setPreAuthCookie({
    reply: args.reply,
    token,
    expiresAt,
  });

  return preAuth;
};

const getCodeContextWhere = (context: OneTimeCodeContext) => {
  return {
    userId: context.userId,
    purpose: context.purpose,
    preAuthSessionId: context.preAuthSessionId,
  };
};

const loadActivePreAuthSession = async (
  app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<ActivePreAuthSession | null> => {
  const token = request.cookies[PREAUTH_COOKIE_NAME];
  if (!token) {
    return null;
  }

  const session = await app.prisma.preAuthSession.findFirst({
    where: {
      tokenHash: hashToken(token),
      consumedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      user: {
        select: authUserSelect,
      },
    },
  });

  if (!session) {
    clearPreAuthCookie(reply);
    return null;
  }

  return session;
};

const getChallengeEmailForPreAuth = (preAuth: ActivePreAuthSession): string => {
  if (preAuth.purpose === 'LINK_GOOGLE' && preAuth.providerEmail) {
    return normalizeEmail(preAuth.providerEmail);
  }

  return preAuth.user.email;
};

const issueTwoFactorCode = async (args: {
  app: FastifyInstance;
  request: FastifyRequest;
  context: OneTimeCodeContext;
  destinationEmail: string;
}): Promise<TwoFactorIssueResult> => {
  const env = getEnv();
  const now = new Date();
  const codeWhere = getCodeContextWhere(args.context);

  const activeCode = await args.app.prisma.oneTimeCode.findFirst({
    where: {
      ...codeWhere,
      consumedAt: null,
      expiresAt: {
        gt: now,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (activeCode?.blockedUntil && activeCode.blockedUntil > now) {
    const retryAfterSeconds = Math.ceil((activeCode.blockedUntil.getTime() - now.getTime()) / 1000);
    return {
      ok: false,
      statusCode: 429,
      message: 'too many verification attempts',
      retryAfterSeconds,
    };
  }

  if (activeCode) {
    const resendAvailableAt = new Date(activeCode.lastSentAt.getTime() + env.TWO_FACTOR_RESEND_COOLDOWN_SECONDS * 1000);
    if (resendAvailableAt > now) {
      const retryAfterSeconds = Math.ceil((resendAvailableAt.getTime() - now.getTime()) / 1000);
      return {
        ok: false,
        statusCode: 429,
        message: 'please wait before requesting another code',
        retryAfterSeconds,
      };
    }

    if (activeCode.resendCount >= env.TWO_FACTOR_MAX_RESENDS) {
      return {
        ok: false,
        statusCode: 429,
        message: 'resend limit reached for this code',
      };
    }
  }

  const code = createNumericCode(6);
  const nonce = createCodeNonce();
  const codeHash = hashOneTimeCode({
    userId: args.context.userId,
    purpose: args.context.purpose,
    nonce,
    code,
  });

  const expiresAt = new Date(now.getTime() + env.TWO_FACTOR_CODE_TTL_MINUTES * 60 * 1000);
  const resendAvailableAt = new Date(now.getTime() + env.TWO_FACTOR_RESEND_COOLDOWN_SECONDS * 1000);
  const metadata = getClientMetadata(args.request);

  let codeRecord: { id: string; expiresAt: Date };

  if (activeCode) {
    codeRecord = await args.app.prisma.oneTimeCode.update({
      where: {
        id: activeCode.id,
      },
      data: {
        codeHash,
        nonce,
        expiresAt,
        attempts: 0,
        blockedUntil: null,
        lastSentAt: now,
        resendCount: {
          increment: 1,
        },
        ip: metadata.ip,
        userAgent: metadata.userAgent,
      },
      select: {
        id: true,
        expiresAt: true,
      },
    });
  } else {
    await args.app.prisma.oneTimeCode.updateMany({
      where: {
        ...codeWhere,
        consumedAt: null,
      },
      data: {
        consumedAt: now,
      },
    });

    codeRecord = await args.app.prisma.oneTimeCode.create({
      data: {
        ...codeWhere,
        codeHash,
        nonce,
        expiresAt,
        maxAttempts: env.TWO_FACTOR_MAX_ATTEMPTS,
        lastSentAt: now,
        ip: metadata.ip,
        userAgent: metadata.userAgent,
      },
      select: {
        id: true,
        expiresAt: true,
      },
    });
  }

  const exposeTwoFactorDebugCode = env.AUTH_EXPOSE_TEST_2FA_CODE;
  let deliveryFailed = false;

  try {
    await sendVerificationCodeEmail({
      to: args.destinationEmail,
      code,
      expiresInMinutes: env.TWO_FACTOR_CODE_TTL_MINUTES,
    });
  } catch (error) {
    if (exposeTwoFactorDebugCode) {
      deliveryFailed = true;
      args.request.log.warn({
        action: 'auth.2fa.send',
        userId: args.context.userId,
        purpose: args.context.purpose,
        reason: error instanceof Error ? error.message : 'unknown email delivery error',
      }, 'email delivery failed; using debug 2fa code fallback');
    } else {
      await args.app.prisma.oneTimeCode.update({
        where: {
          id: codeRecord.id,
        },
        data: {
          consumedAt: new Date(),
        },
      });

      return {
        ok: false,
        statusCode: 503,
        message: 'unable to deliver verification code',
      };
    }
  }

  const debugCode = exposeTwoFactorDebugCode ? code : undefined;
  if (deliveryFailed) {
    args.request.log.warn({
      action: 'auth.2fa.send',
      userId: args.context.userId,
      purpose: args.context.purpose,
    }, '2fa code is exposed via debug fallback');
  }

  return {
    ok: true,
    purpose: toPublicTwoFactorPurpose(args.context.purpose),
    expiresAt,
    resendAvailableAt,
    emailHint: maskEmail(args.destinationEmail),
    ...(debugCode ? { debugCode } : {}),
  };
};

const verifyTwoFactorCode = async (args: {
  app: FastifyInstance;
  context: OneTimeCodeContext;
  inputCode: string;
}): Promise<TwoFactorVerifyResult> => {
  const env = getEnv();
  const now = new Date();

  const codeRecord = await args.app.prisma.oneTimeCode.findFirst({
    where: {
      ...getCodeContextWhere(args.context),
      consumedAt: null,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!codeRecord || codeRecord.expiresAt <= now) {
    return {
      ok: false,
      statusCode: 400,
      message: 'verification code expired',
    };
  }

  if (codeRecord.blockedUntil && codeRecord.blockedUntil > now) {
    return {
      ok: false,
      statusCode: 429,
      message: 'too many verification attempts',
      retryAfterSeconds: Math.ceil((codeRecord.blockedUntil.getTime() - now.getTime()) / 1000),
    };
  }

  const candidateHash = hashOneTimeCode({
    userId: args.context.userId,
    purpose: args.context.purpose,
    nonce: codeRecord.nonce,
    code: args.inputCode,
  });

  if (!secureCompareHash(codeRecord.codeHash, candidateHash)) {
    const nextAttempts = codeRecord.attempts + 1;
    const lockUntil = nextAttempts >= codeRecord.maxAttempts
      ? new Date(now.getTime() + env.TWO_FACTOR_LOCK_MINUTES * 60 * 1000)
      : null;

    await args.app.prisma.oneTimeCode.update({
      where: {
        id: codeRecord.id,
      },
      data: {
        attempts: {
          increment: 1,
        },
        blockedUntil: lockUntil,
      },
    });

    if (lockUntil) {
      return {
        ok: false,
        statusCode: 429,
        message: 'too many verification attempts',
        retryAfterSeconds: Math.ceil((lockUntil.getTime() - now.getTime()) / 1000),
      };
    }

    return {
      ok: false,
      statusCode: 400,
      message: 'invalid verification code',
    };
  }

  await args.app.prisma.oneTimeCode.update({
    where: {
      id: codeRecord.id,
    },
    data: {
      consumedAt: now,
      attempts: {
        increment: 1,
      },
      blockedUntil: null,
    },
  });

  return {
    ok: true,
  };
};

const ensureAuthAndCsrf = async (request: FastifyRequest, reply: FastifyReply): Promise<boolean> => {
  if (!request.auth) {
    reply.code(401).send({
      error: 'unauthorized',
      message: 'authentication is required',
    });
    return false;
  }

  const env = getEnv();
  const headerValue = request.headers[env.CSRF_HEADER_NAME] as string | undefined;
  const cookieValue = request.cookies[CSRF_COOKIE_NAME];

  if (!headerValue || !cookieValue || headerValue !== cookieValue || headerValue !== request.auth.csrfToken) {
    reply.code(403).send({
      error: 'forbidden',
      message: 'csrf validation failed',
    });
    return false;
  }

  return !reply.sent;
};

const sendTwoFactorForPreAuth = async (args: {
  app: FastifyInstance;
  request: FastifyRequest;
  preAuth: ActivePreAuthSession;
}): Promise<TwoFactorIssueResult> => {
  return issueTwoFactorCode({
    app: args.app,
    request: args.request,
    context: {
      userId: args.preAuth.userId,
      preAuthSessionId: args.preAuth.id,
      purpose: preAuthPurposeToCodePurpose(args.preAuth.purpose),
    },
    destinationEmail: getChallengeEmailForPreAuth(args.preAuth),
  });
};

const getTwoFactorStatusFromPreAuth = async (args: {
  app: FastifyInstance;
  preAuth: ActivePreAuthSession;
}): Promise<{
  required: true;
  purpose: 'login_2fa' | 'link_google';
  expiresAt: string;
  resendAvailableAt: string;
  emailHint: string;
}> => {
  const env = getEnv();
  const now = new Date();

  const codePurpose = preAuthPurposeToCodePurpose(args.preAuth.purpose);
  const activeCode = await args.app.prisma.oneTimeCode.findFirst({
    where: {
      userId: args.preAuth.userId,
      preAuthSessionId: args.preAuth.id,
      purpose: codePurpose,
      consumedAt: null,
      expiresAt: {
        gt: now,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const resendAvailableAt = activeCode
    ? new Date(activeCode.lastSentAt.getTime() + env.TWO_FACTOR_RESEND_COOLDOWN_SECONDS * 1000)
    : now;

  return {
    required: true,
    purpose: codePurpose === 'LOGIN_2FA' ? 'login_2fa' : 'link_google',
    expiresAt: args.preAuth.expiresAt.toISOString(),
    resendAvailableAt: resendAvailableAt.toISOString(),
    emailHint: maskEmail(getChallengeEmailForPreAuth(args.preAuth)),
  };
};

const createGoogleAuthorizationUrl = (state: string): string => {
  const env = getEnv();

  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI) {
    throw new Error('google oauth is not configured');
  }

  const query = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: env.GOOGLE_OAUTH_SCOPES,
    access_type: 'online',
    include_granted_scopes: 'true',
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${query.toString()}`;
};

const exchangeGoogleCodeForProfile = async (code: string): Promise<{
  providerAccountId: string;
  email: string;
  emailVerified: boolean;
  name?: string;
}> => {
  const env = getEnv();

  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI) {
    throw new Error('google oauth is not configured');
  }

  const tokenPayload = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    code,
    grant_type: 'authorization_code',
    redirect_uri: env.GOOGLE_REDIRECT_URI,
  });

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: tokenPayload,
  });

  if (!tokenResponse.ok) {
    throw new Error(`google token exchange failed: ${tokenResponse.status}`);
  }

  const tokenJson = googleTokenSchema.parse(await tokenResponse.json());

  const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: {
      authorization: `Bearer ${tokenJson.access_token}`,
    },
  });

  if (!profileResponse.ok) {
    throw new Error(`google userinfo failed: ${profileResponse.status}`);
  }

  const profile = googleProfileSchema.parse(await profileResponse.json());

  const normalized = {
    providerAccountId: profile.sub,
    email: profile.email,
    emailVerified: profile.email_verified,
    ...(profile.name ? { name: profile.name } : {}),
  };

  return normalized;
};

const ensureGoogleLinkIsSafe = async (args: {
  app: FastifyInstance;
  userId: string;
  providerAccountId: string;
  email: string;
}): Promise<{ ok: true } | { ok: false; statusCode: number; message: string }> => {
  const existingByProviderAccount = await args.app.prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: 'GOOGLE',
        providerAccountId: args.providerAccountId,
      },
    },
    select: {
      userId: true,
    },
  });

  if (existingByProviderAccount && existingByProviderAccount.userId !== args.userId) {
    return {
      ok: false,
      statusCode: 409,
      message: 'google account is already linked to another user',
    };
  }

  const existingByUserProvider = await args.app.prisma.account.findUnique({
    where: {
      userId_provider: {
        userId: args.userId,
        provider: 'GOOGLE',
      },
    },
    select: {
      providerAccountId: true,
    },
  });

  if (existingByUserProvider && existingByUserProvider.providerAccountId !== args.providerAccountId) {
    return {
      ok: false,
      statusCode: 409,
      message: 'a different google account is already linked',
    };
  }

  if (!existingByProviderAccount) {
    await args.app.prisma.account.create({
      data: {
        userId: args.userId,
        provider: 'GOOGLE',
        providerAccountId: args.providerAccountId,
        email: normalizeEmail(args.email),
      },
    });
  } else {
    await args.app.prisma.account.update({
      where: {
        provider_providerAccountId: {
          provider: 'GOOGLE',
          providerAccountId: args.providerAccountId,
        },
      },
      data: {
        email: normalizeEmail(args.email),
      },
    });
  }

  return {
    ok: true,
  };
};

const ensureTrustedOrigin = (args: {
  request: FastifyRequest;
  reply: FastifyReply;
  allowedOrigins: Set<string>;
}): boolean => {
  const origin = args.request.headers.origin;
  if (!origin) {
    return true;
  }

  if (!args.allowedOrigins.has(origin)) {
    args.reply.code(403).send({
      error: 'forbidden',
      message: 'origin is not allowed',
    });
    return false;
  }

  return true;
};

const sendSessionPayload = async (args: {
  app: FastifyInstance;
  reply: FastifyReply;
  request: FastifyRequest;
  user: AuthUserPayload;
}) => {
  const { sessionToken, csrfToken, expiresAt } = await createSessionForUser(args.app, args.user.id, args.request);

  setSessionCookies({
    reply: args.reply,
    sessionToken,
    csrfToken,
    expiresAt,
  });

  clearPreAuthCookie(args.reply);

  args.reply.send({
    user: args.user,
    csrfToken,
  });
};

export const registerAuthRoutes = async (app: FastifyInstance) => {
  const env = getEnv();
  const allowedOrigins = new Set(parseAllowedCorsOrigins(env));

  app.post('/api/auth/register', {
    config: {
      rateLimit: {
        max: 20,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    if (!ensureTrustedOrigin({ request, reply, allowedOrigins })) {
      return;
    }

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
      select: authUserSelect,
    });

    await writeAuditLog({
      prisma: app.prisma,
      actorUserId: user.id,
      action: 'auth.register',
      entityType: 'user',
      entityId: user.id,
      metadata: { email: user.email },
    });

    await sendSessionPayload({
      app,
      request,
      reply,
      user,
    });
  });

  app.post('/api/auth/login', {
    config: {
      rateLimit: {
        max: 30,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    if (!ensureTrustedOrigin({ request, reply, allowedOrigins })) {
      return;
    }

    const parsed = loginBodySchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400).send({ error: 'bad_request', message: parsed.error.issues[0]?.message ?? 'invalid request body' });
      return;
    }

    const body = parsed.data;
    const normalizedEmail = normalizeEmail(body.email);
    const callbackPath = normalizeCallbackPath(body.callbackPath);

    const user = await app.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        ...authUserSelect,
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

    if (user.twoFactorEmailEnabled) {
      const preAuth = await createPreAuthSession({
        app,
        reply,
        request,
        userId: user.id,
        purpose: 'LOGIN_2FA',
        redirectPath: callbackPath,
      });

      const challenge = await sendTwoFactorForPreAuth({
        app,
        request,
        preAuth,
      });

      if (challenge.ok === false) {
        clearPreAuthCookie(reply);
        reply.code(challenge.statusCode).send({
          error: challenge.statusCode === 429 ? 'rate_limited' : 'request_error',
          message: challenge.message,
          retryAfterSeconds: challenge.retryAfterSeconds,
        });
        return;
      }

      reply.send({
        requiresTwoFactor: true,
        twoFactor: {
          purpose: challenge.purpose,
          expiresAt: challenge.expiresAt.toISOString(),
          resendAvailableAt: challenge.resendAvailableAt.toISOString(),
          emailHint: challenge.emailHint,
        },
        debugCode: challenge.debugCode,
      });
      return;
    }

    await writeAuditLog({
      prisma: app.prisma,
      actorUserId: user.id,
      action: 'auth.login',
      entityType: 'session',
      metadata: { userId: user.id },
    });

    await sendSessionPayload({
      app,
      reply,
      request,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarDataUrl: user.avatarDataUrl,
        twoFactorEmailEnabled: user.twoFactorEmailEnabled,
      },
    });
  });

  app.post('/api/auth/google/start', {
    config: {
      rateLimit: {
        max: 20,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    if (!ensureTrustedOrigin({ request, reply, allowedOrigins })) {
      return;
    }

    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI) {
      reply.code(503).send({
        error: 'service_unavailable',
        message: 'google sign-in is not configured',
      });
      return;
    }

    const parsed = googleStartBodySchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400).send({
        error: 'bad_request',
        message: 'invalid request body',
      });
      return;
    }

    const callbackPath = normalizeCallbackPath(parsed.data.callbackPath);
    const state = createOpaqueToken();
    const stateHash = hashToken(state);
    const expiresAt = new Date(Date.now() + env.OAUTH_STATE_TTL_MINUTES * 60 * 1000);
    const metadata = getClientMetadata(request);

    await app.prisma.oAuthState.create({
      data: {
        stateHash,
        redirectPath: callbackPath,
        expiresAt,
        ip: metadata.ip,
        userAgent: metadata.userAgent,
      },
    });

    reply.send({
      url: createGoogleAuthorizationUrl(state),
    });
  });

  app.get('/api/auth/google/callback', {
    config: {
      rateLimit: {
        max: 40,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    const parsed = googleCallbackQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      reply.redirect(buildAppRedirectUrl('/', { auth_error: 'oauth_invalid_request' }));
      return;
    }

    const query = parsed.data;

    if (query.error) {
      reply.redirect(buildAppRedirectUrl('/', { auth_error: 'oauth_access_denied' }));
      return;
    }

    if (!query.code || !query.state) {
      reply.redirect(buildAppRedirectUrl('/', { auth_error: 'oauth_invalid_request' }));
      return;
    }

    const oauthState = await app.prisma.oAuthState.findFirst({
      where: {
        stateHash: hashToken(query.state),
        consumedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!oauthState) {
      reply.redirect(buildAppRedirectUrl('/', { auth_error: 'oauth_state_invalid' }));
      return;
    }

    await app.prisma.oAuthState.update({
      where: {
        id: oauthState.id,
      },
      data: {
        consumedAt: new Date(),
      },
    });

    const callbackPath = normalizeCallbackPath(oauthState.redirectPath);

    let googleProfile: Awaited<ReturnType<typeof exchangeGoogleCodeForProfile>>;
    try {
      googleProfile = await exchangeGoogleCodeForProfile(query.code);
    } catch {
      reply.redirect(buildAppRedirectUrl(callbackPath, { auth_error: 'oauth_exchange_failed' }));
      return;
    }

    if (!googleProfile.emailVerified) {
      reply.redirect(buildAppRedirectUrl(callbackPath, { auth_error: 'oauth_email_not_verified' }));
      return;
    }

    const normalizedEmail = normalizeEmail(googleProfile.email);

    const linkedAccount = await app.prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: 'GOOGLE',
          providerAccountId: googleProfile.providerAccountId,
        },
      },
      include: {
        user: {
          select: authUserSelect,
        },
      },
    });

    let user = linkedAccount?.user ?? null;

    if (!user) {
      const existingUser = await app.prisma.user.findUnique({
        where: {
          email: normalizedEmail,
        },
        select: authUserSelect,
      });

      if (existingUser) {
        const preAuth = await createPreAuthSession({
          app,
          reply,
          request,
          userId: existingUser.id,
          purpose: 'LINK_GOOGLE',
          redirectPath: callbackPath,
          provider: 'GOOGLE',
          providerAccountId: googleProfile.providerAccountId,
          providerEmail: normalizedEmail,
          providerEmailVerified: true,
        });

        const challenge = await sendTwoFactorForPreAuth({
          app,
          request,
          preAuth,
        });

        if (challenge.ok === false) {
          clearPreAuthCookie(reply);
          reply.redirect(buildAppRedirectUrl(callbackPath, { auth_error: '2fa_delivery_failed' }));
          return;
        }

        reply.redirect(buildAppRedirectUrl(callbackPath, { auth: '2fa' }));
        return;
      }

      const fallbackName = googleProfile.name ?? normalizedEmail.split('@')[0] ?? 'reader';
      const trimmedName = fallbackName.trim();
      const safeName = (trimmedName.length >= 2 ? trimmedName : 'reader').slice(0, 120);

      const randomPasswordHash = await hashPassword(createOpaqueToken());

      user = await app.prisma.user.create({
        data: {
          name: safeName,
          email: normalizedEmail,
          passwordHash: randomPasswordHash,
          role: 'READER',
        },
        select: authUserSelect,
      });

      await app.prisma.account.create({
        data: {
          userId: user.id,
          provider: 'GOOGLE',
          providerAccountId: googleProfile.providerAccountId,
          email: normalizedEmail,
        },
      });

      await writeAuditLog({
        prisma: app.prisma,
        actorUserId: user.id,
        action: 'auth.google.register',
        entityType: 'user',
        entityId: user.id,
        metadata: {
          email: user.email,
        },
      });
    }

    if (user.twoFactorEmailEnabled) {
      const preAuth = await createPreAuthSession({
        app,
        reply,
        request,
        userId: user.id,
        purpose: 'LOGIN_2FA',
        redirectPath: callbackPath,
      });

      const challenge = await sendTwoFactorForPreAuth({
        app,
        request,
        preAuth,
      });

      if (challenge.ok === false) {
        clearPreAuthCookie(reply);
        reply.redirect(buildAppRedirectUrl(callbackPath, { auth_error: '2fa_delivery_failed' }));
        return;
      }

      reply.redirect(buildAppRedirectUrl(callbackPath, { auth: '2fa' }));
      return;
    }

    const { sessionToken, csrfToken, expiresAt } = await createSessionForUser(app, user.id, request);

    setSessionCookies({
      reply,
      sessionToken,
      csrfToken,
      expiresAt,
    });
    clearPreAuthCookie(reply);

    await writeAuditLog({
      prisma: app.prisma,
      actorUserId: user.id,
      action: 'auth.google.login',
      entityType: 'session',
      metadata: { userId: user.id },
    });

    reply.redirect(buildAppRedirectUrl(callbackPath));
  });

  app.get('/api/auth/2fa/status', {
    config: {
      rateLimit: {
        max: 120,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    const preAuth = await loadActivePreAuthSession(app, request, reply);
    if (!preAuth) {
      reply.send({
        required: false,
      });
      return;
    }

    reply.send(await getTwoFactorStatusFromPreAuth({ app, preAuth }));
  });

  const handleTwoFactorSend = async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = twoFactorSendBodySchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400).send({
        error: 'bad_request',
        message: 'invalid request body',
      });
      return;
    }

    const flow = parsed.data.flow ?? 'login';

    if (flow === 'login') {
      const preAuth = await loadActivePreAuthSession(app, request, reply);
      if (!preAuth) {
        reply.code(400).send({
          error: 'bad_request',
          message: 'two-factor challenge is not active',
        });
        return;
      }

      const challenge = await sendTwoFactorForPreAuth({
        app,
        request,
        preAuth,
      });

      if (challenge.ok === false) {
        reply.code(challenge.statusCode).send({
          error: challenge.statusCode === 429 ? 'rate_limited' : 'request_error',
          message: challenge.message,
          retryAfterSeconds: challenge.retryAfterSeconds,
        });
        return;
      }

      reply.send({
        required: true,
        purpose: challenge.purpose,
        expiresAt: challenge.expiresAt.toISOString(),
        resendAvailableAt: challenge.resendAvailableAt.toISOString(),
        emailHint: challenge.emailHint,
        debugCode: challenge.debugCode,
      });
      return;
    }

    if (!await ensureAuthAndCsrf(request, reply)) {
      return;
    }

    if (!request.auth) {
      return;
    }

    const user = await app.prisma.user.findUnique({
      where: {
        id: request.auth.userId,
      },
      select: {
        id: true,
        email: true,
        twoFactorEmailEnabled: true,
      },
    });

    if (!user) {
      reply.code(404).send({
        error: 'not_found',
        message: 'user not found',
      });
      return;
    }

    if (flow === 'enable_2fa' && user.twoFactorEmailEnabled) {
      reply.code(400).send({
        error: 'bad_request',
        message: '2fa is already enabled',
      });
      return;
    }

    if (flow === 'disable_2fa' && !user.twoFactorEmailEnabled) {
      reply.code(400).send({
        error: 'bad_request',
        message: '2fa is already disabled',
      });
      return;
    }

    const context: OneTimeCodeContext = {
      userId: user.id,
      preAuthSessionId: null,
      purpose: flow === 'enable_2fa' ? 'ENABLE_2FA' : 'DISABLE_2FA',
    };

    const challenge = await issueTwoFactorCode({
      app,
      request,
      context,
      destinationEmail: user.email,
    });

    if (challenge.ok === false) {
      reply.code(challenge.statusCode).send({
        error: challenge.statusCode === 429 ? 'rate_limited' : 'request_error',
        message: challenge.message,
        retryAfterSeconds: challenge.retryAfterSeconds,
      });
      return;
    }

    reply.send({
      required: true,
      purpose: challenge.purpose,
      expiresAt: challenge.expiresAt.toISOString(),
      resendAvailableAt: challenge.resendAvailableAt.toISOString(),
      emailHint: challenge.emailHint,
      debugCode: challenge.debugCode,
    });
  };

  app.post('/api/auth/2fa/send', {
    config: {
      rateLimit: {
        max: 30,
        timeWindow: '10 minute',
      },
    },
  }, handleTwoFactorSend);

  app.post('/api/auth/2fa/resend', {
    config: {
      rateLimit: {
        max: 30,
        timeWindow: '10 minute',
      },
    },
  }, handleTwoFactorSend);

  app.post('/api/auth/2fa/verify', {
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '10 minute',
      },
    },
  }, async (request, reply) => {
    const parsed = twoFactorVerifyBodySchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400).send({
        error: 'bad_request',
        message: 'invalid request body',
      });
      return;
    }

    const flow = parsed.data.flow ?? 'login';

    if (flow === 'login') {
      const preAuth = await loadActivePreAuthSession(app, request, reply);
      if (!preAuth) {
        reply.code(400).send({
          error: 'bad_request',
          message: 'two-factor challenge is not active',
        });
        return;
      }

      const codePurpose = preAuthPurposeToCodePurpose(preAuth.purpose);

      const verification = await verifyTwoFactorCode({
        app,
        context: {
          userId: preAuth.userId,
          preAuthSessionId: preAuth.id,
          purpose: codePurpose,
        },
        inputCode: parsed.data.code,
      });

      if (verification.ok === false) {
        reply.code(verification.statusCode).send({
          error: verification.statusCode === 429 ? 'rate_limited' : 'bad_request',
          message: verification.message,
          retryAfterSeconds: verification.retryAfterSeconds,
        });
        return;
      }

      if (preAuth.purpose === 'LINK_GOOGLE') {
        if (
          preAuth.provider !== 'GOOGLE' ||
          !preAuth.providerAccountId ||
          !preAuth.providerEmail ||
          preAuth.providerEmailVerified !== true
        ) {
          clearPreAuthCookie(reply);
          reply.code(400).send({
            error: 'bad_request',
            message: 'google linking challenge is invalid',
          });
          return;
        }

        const linkResult = await ensureGoogleLinkIsSafe({
          app,
          userId: preAuth.userId,
          providerAccountId: preAuth.providerAccountId,
          email: preAuth.providerEmail,
        });

        if (linkResult.ok === false) {
          clearPreAuthCookie(reply);
          reply.code(linkResult.statusCode).send({
            error: 'conflict',
            message: linkResult.message,
          });
          return;
        }

        await writeAuditLog({
          prisma: app.prisma,
          actorUserId: preAuth.userId,
          action: 'auth.google.link',
          entityType: 'account',
          metadata: {
            provider: 'GOOGLE',
          },
        });
      }

      await app.prisma.preAuthSession.update({
        where: {
          id: preAuth.id,
        },
        data: {
          consumedAt: new Date(),
        },
      });

      clearPreAuthCookie(reply);

      await writeAuditLog({
        prisma: app.prisma,
        actorUserId: preAuth.userId,
        action: 'auth.2fa.verify',
        entityType: 'pre_auth_session',
        entityId: preAuth.id,
      });

      await sendSessionPayload({
        app,
        reply,
        request,
        user: preAuth.user,
      });
      return;
    }

    if (!await ensureAuthAndCsrf(request, reply)) {
      return;
    }

    if (!request.auth) {
      return;
    }

    const user = await app.prisma.user.findUnique({
      where: {
        id: request.auth.userId,
      },
      select: {
        id: true,
        twoFactorEmailEnabled: true,
      },
    });

    if (!user) {
      reply.code(404).send({
        error: 'not_found',
        message: 'user not found',
      });
      return;
    }

    if (flow === 'enable_2fa' && user.twoFactorEmailEnabled) {
      reply.code(400).send({
        error: 'bad_request',
        message: '2fa is already enabled',
      });
      return;
    }

    if (flow === 'disable_2fa' && !user.twoFactorEmailEnabled) {
      reply.code(400).send({
        error: 'bad_request',
        message: '2fa is already disabled',
      });
      return;
    }

    const context: OneTimeCodeContext = {
      userId: user.id,
      preAuthSessionId: null,
      purpose: flow === 'enable_2fa' ? 'ENABLE_2FA' : 'DISABLE_2FA',
    };

    const verification = await verifyTwoFactorCode({
      app,
      context,
      inputCode: parsed.data.code,
    });

    if (verification.ok === false) {
      reply.code(verification.statusCode).send({
        error: verification.statusCode === 429 ? 'rate_limited' : 'bad_request',
        message: verification.message,
        retryAfterSeconds: verification.retryAfterSeconds,
      });
      return;
    }

    const twoFactorEnabled = flow === 'enable_2fa';

    await app.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        twoFactorEmailEnabled: twoFactorEnabled,
        twoFactorEmailVerifiedAt: twoFactorEnabled ? new Date() : null,
      },
    });

    await writeAuditLog({
      prisma: app.prisma,
      actorUserId: user.id,
      action: twoFactorEnabled ? 'auth.2fa.enable' : 'auth.2fa.disable',
      entityType: 'user',
      entityId: user.id,
    });

    reply.send({
      ok: true,
      twoFactorEmailEnabled: twoFactorEnabled,
    });
  });

  app.post('/api/auth/logout', {
    preHandler: [requireCsrf],
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

    reply.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    reply.clearCookie(CSRF_COOKIE_NAME, { path: '/' });
    clearPreAuthCookie(reply);
    reply.send({ ok: true });
  });

  app.put('/api/auth/avatar', {
    preHandler: [requireCsrf],
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

    const parsed = avatarBodySchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400).send({
        error: 'bad_request',
        message: parsed.error.issues[0]?.message ?? 'invalid request body',
      });
      return;
    }

    const user = await app.prisma.user.update({
      where: {
        id: request.auth.userId,
      },
      data: {
        avatarDataUrl: parsed.data.avatarDataUrl,
      },
      select: authUserSelect,
    });

    await writeAuditLog({
      prisma: app.prisma,
      actorUserId: user.id,
      action: 'auth.avatar.update',
      entityType: 'user',
      entityId: user.id,
      metadata: {
        hasAvatar: Boolean(user.avatarDataUrl),
      },
    });

    reply.send({ user });
  });

  app.get('/api/auth/me', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    if (!request.auth) {
      return;
    }

    const user = await app.prisma.user.findUnique({
      where: { id: request.auth.userId },
      select: authUserSelect,
    });

    if (!user) {
      reply.code(404).send({ error: 'not_found', message: 'user not found' });
      return;
    }

    reply.send({ user, csrfToken: request.auth.csrfToken });
  });
};
