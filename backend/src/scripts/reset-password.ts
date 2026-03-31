import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../lib/auth.js';
import { normalizeEmail } from '../lib/text.js';

const prisma = new PrismaClient();

const run = async () => {
  const [, , email, password] = process.argv;

  if (!email || !password) {
    throw new Error('usage: tsx src/scripts/reset-password.ts <email> <new-password>');
  }

  const normalizedEmail = normalizeEmail(email);
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      email: true,
    },
  });

  if (!user) {
    throw new Error(`user not found: ${normalizedEmail}`);
  }

  const passwordHash = await hashPassword(password);

  const [, revokedSessions, clearedPreAuthSessions] = await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    }),
    prisma.session.deleteMany({
      where: { userId: user.id },
    }),
    prisma.preAuthSession.deleteMany({
      where: { userId: user.id },
    }),
  ]);

  console.log(
    `password updated: ${user.email}; revoked sessions: ${revokedSessions.count}; cleared pre-auth sessions: ${clearedPreAuthSessions.count}`,
  );
};

run()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
