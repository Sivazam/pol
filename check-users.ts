import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const users = await db.user.findMany({
    select: { email: true, role: true, name: true },
  });

  if (users.length === 0) {
    console.log('❌ No users found. Run: npx prisma db seed');
  } else {
    console.log('✅ Seeded Users:');
    users.forEach((u) => {
      console.log(`   ${u.email} (${u.role}) - ${u.name}`);
    });
  }

  await db.$disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
