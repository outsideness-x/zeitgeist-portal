import type { Prisma, PrismaClient } from '@prisma/client';

export const writeAuditLog = async (args: {
  prisma: PrismaClient;
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
