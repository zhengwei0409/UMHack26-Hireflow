import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const candidates = await prisma.candidate.findMany({
    select: { id: true, fullName: true }
  });
  process.stdout.write(JSON.stringify(candidates) + '\n');
}

main().finally(() => prisma.$disconnect());