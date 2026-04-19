import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10);

  const hr = await prisma.user.upsert({
    where: { email: 'hr@company.com' },
    update: {},
    create: {
      email: 'hr@company.com',
      password: hashedPassword,
      name: 'Jane HR',
      role: 'HR',
    },
  });

  console.log('Seeded HR user:', hr.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
