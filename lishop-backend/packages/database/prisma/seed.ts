import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Admin user
  const adminHash = await bcrypt.hash('Admin@12345', 10);
  await prisma.user.upsert({
    where: { email: 'admin@lishop.vn' },
    update: {},
    create: {
      email: 'admin@lishop.vn',
      passwordHash: adminHash,
      firstName: 'Admin',
      lastName: 'Lishop',
      role: UserRole.ADMIN,
      emailVerified: true,
    },
  });

  // Root categories
  const categories = ['Electronics', 'Fashion', 'Home & Living', 'Sports', 'Books'];
  for (const name of categories) {
    await prisma.category.upsert({
      where: { slug: name.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-') },
      update: {},
      create: {
        name,
        slug: name.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-'),
      },
    });
  }

  console.warn('Seed complete');
}

main().finally(() => prisma.$disconnect());
