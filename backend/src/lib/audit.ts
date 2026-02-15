import type { Prisma, PrismaClient } from '@prisma/client';

type AuditWriter = PrismaClient | Prisma.TransactionClient;

export const writeAuditLog = async (args: {
  prisma: AuditWriter;
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
}) => {
  await args.prisma.auditLog.create({
    data: {
      actorUserId: args.actorUserId,
      action: args.action,
      entityType: args.entityType,
      entityId: args.entityId,
      metadata: args.metadata,
    },
  });
};
