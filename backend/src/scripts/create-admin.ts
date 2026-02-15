import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../lib/auth.js';

const prisma = new PrismaClient();

const run = async () => {
  const [, , email, name, password] = process.argv;

  if (!email || !name || !password) {
    throw new Error('usage: tsx src/scripts/create-admin.ts <email> <name> <password>');
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    create: {
      email: email.toLowerCase(),
      name,
      passwordHash,
      role: 'ADMIN',
    },
    update: {
      name,
      passwordHash,
      role: 'ADMIN',
    },
  });

  console.log(`admin ready: ${user.email}`);
};

run()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
