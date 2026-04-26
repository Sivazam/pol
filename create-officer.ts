import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const db = new PrismaClient();

async function main() {
  // Check if officer already exists
  const existing = await db.user.findUnique({
    where: { email: 'officer.vrpuram@polavaram.ap.gov.in' },
  });

  if (existing) {
    console.log('✅ Officer user already exists');
    return;
  }

  // Get VRP mandal
  const vrpMandal = await db.mandal.findUnique({
    where: { code: 'VRP' },
  });

  if (!vrpMandal) {
    console.log('❌ VRP Mandal not found. Run seed first to create mandals.');
    process.exit(1);
  }

  // Create officer user
  const pwd = process.env.SEED_OFFICER_PASSWORD || 'ChangeMe@2026';
  const hashedPwd = await bcryptjs.hash(pwd, 12);

  const officer = await db.user.create({
    data: {
      email: 'officer.vrpuram@polavaram.ap.gov.in',
      password: hashedPwd,
      name: 'VR Puram Mandal Officer',
      role: 'OFFICER',
      mandalId: vrpMandal.id,
      isActive: true,
      mustChangePassword: true,
    },
  });

  console.log('✅ Officer user created:');
  console.log(`   Email: ${officer.email}`);
  console.log(`   Role: ${officer.role}`);
  console.log(`   Password: ${pwd}`);

  await db.$disconnect();
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
