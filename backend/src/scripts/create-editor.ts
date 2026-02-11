import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../lib/auth.js';

const prisma = new PrismaClient();

const run = async () => {
  const [, , email, name, password] = process.argv;

  if (!email || !name || !password) {
    throw new Error('usage: tsx src/scripts/create-editor.ts <email> <name> <password>');
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    create: {
      email: email.toLowerCase(),
      name,
      passwordHash,
      role: 'EDITOR',
    },
    update: {
      name,
      passwordHash,
      role: 'EDITOR',
    },
  });

  console.log(`editor ready: ${user.email}`);
};

run()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
