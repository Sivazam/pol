import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import { decryptPII, encryptPII, hashPII } from '../src/lib/crypto';

const db = new PrismaClient({ log: ['error'] });
const BATCH_SIZE = 250;

function syntheticAadhaar(seed: string): string {
  const hex = createHash('sha256').update(seed).digest('hex');
  let digits = '';

  for (const ch of hex) {
    digits += (parseInt(ch, 16) % 10).toString();
  }

  const base = digits.padEnd(12, '0').slice(0, 12);
  const firstDigit = String((Number(base[0] ?? '0') % 8) + 2);
  return `${firstDigit}${base.slice(1)}`;
}

function resolveAadhaar(existingEncrypted: string | null, seed: string): string {
  const decrypted = decryptPII(existingEncrypted);
  if (decrypted) {
    return decrypted;
  }

  return syntheticAadhaar(seed);
}

async function backfillFamilies(): Promise<number> {
  let updated = 0;

  while (true) {
    const rows = await db.family.findMany({
      where: {
        OR: [
          { aadharNoEnc: null },
          { aadharNoEnc: { not: null }, aadharNoHash: null },
        ],
      },
      select: {
        id: true,
        pdfId: true,
        aadharNoEnc: true,
      },
      orderBy: { id: 'asc' },
      take: BATCH_SIZE,
    });

    if (rows.length === 0) {
      return updated;
    }

    await db.$transaction(
      rows.map((row) => {
        const plaintext = resolveAadhaar(row.aadharNoEnc, `family:${row.pdfId}:${row.id}`);
        return db.family.update({
          where: { id: row.id },
          data: {
            ...(row.aadharNoEnc ? {} : { aadharNoEnc: encryptPII(plaintext) }),
            aadharNoHash: hashPII(plaintext),
          },
        });
      }),
    );

    updated += rows.length;
  }
}

async function backfillMembers(): Promise<number> {
  let updated = 0;

  while (true) {
    const rows = await db.familyMember.findMany({
      where: {
        OR: [
          { age: { gte: 5 }, aadharNoEnc: null },
          { aadharNoEnc: { not: null }, aadharNoHash: null },
        ],
      },
      select: {
        id: true,
        familyId: true,
        relation: true,
        age: true,
        aadharNoEnc: true,
      },
      orderBy: { id: 'asc' },
      take: BATCH_SIZE,
    });

    if (rows.length === 0) {
      return updated;
    }

    await db.$transaction(
      rows.map((row) => {
        const plaintext = resolveAadhaar(
          row.aadharNoEnc,
          `member:${row.familyId}:${row.relation}:${row.age}:${row.id}`,
        );
        return db.familyMember.update({
          where: { id: row.id },
          data: {
            ...(row.aadharNoEnc ? {} : { aadharNoEnc: encryptPII(plaintext) }),
            aadharNoHash: hashPII(plaintext),
          },
        });
      }),
    );

    updated += rows.length;
  }
}

async function main() {
  const before = {
    familiesMissingAadhaar: await db.family.count({ where: { aadharNoEnc: null } }),
    membersMissingAadhaarEligible: await db.familyMember.count({
      where: { age: { gte: 5 }, aadharNoEnc: null },
    }),
    familiesMissingHash: await db.family.count({
      where: { aadharNoEnc: { not: null }, aadharNoHash: null },
    }),
    membersMissingHash: await db.familyMember.count({
      where: { aadharNoEnc: { not: null }, aadharNoHash: null },
    }),
  };

  console.log('Aadhaar backfill starting...');
  console.log(JSON.stringify(before, null, 2));

  const updatedFamilies = await backfillFamilies();
  const updatedMembers = await backfillMembers();

  const after = {
    familiesMissingAadhaar: await db.family.count({ where: { aadharNoEnc: null } }),
    membersMissingAadhaarEligible: await db.familyMember.count({
      where: { age: { gte: 5 }, aadharNoEnc: null },
    }),
    familiesMissingHash: await db.family.count({
      where: { aadharNoEnc: { not: null }, aadharNoHash: null },
    }),
    membersMissingHash: await db.familyMember.count({
      where: { aadharNoEnc: { not: null }, aadharNoHash: null },
    }),
  };

  console.log(`Updated families: ${updatedFamilies}`);
  console.log(`Updated members: ${updatedMembers}`);
  console.log(JSON.stringify(after, null, 2));
}

main()
  .catch((err) => {
    console.error('Aadhaar backfill failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });