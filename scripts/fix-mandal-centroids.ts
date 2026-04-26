import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
const updates = [
  { code: 'VRP', latitude: 17.581, longitude: 81.398 },
  { code: 'CHN', latitude: 17.756, longitude: 81.447 },
  { code: 'KUN', latitude: 17.655, longitude: 81.251 },
];
async function main() {
  for (const u of updates) {
    await db.mandal.update({ where: { code: u.code }, data: { latitude: u.latitude, longitude: u.longitude } });
    console.log('updated', u.code);
  }
  await db.$disconnect();
}
main();
