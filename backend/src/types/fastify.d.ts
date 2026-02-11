import type { PrismaClient, Role } from '@prisma/client';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }

  interface FastifyRequest {
    auth: {
      userId: string;
      role: Role;
      sessionId: string;
      csrfToken: string;
    } | null;
  }
}
