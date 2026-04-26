import { PrismaClient } from '@prisma/client';
import { encryptPII, hashPII } from '../src/lib/crypto';

const db = new PrismaClient({ log: ['error'] });

// ═══════════════════════════════════════════════════════════════════════
// ANONYMIZED DATA — Polavaram Project Rehabilitation Portal
// Aligned with real SES and First Scheme data formats
// DO NOT use real PDF IDs, Aadhar, bank details, or ration card numbers
//
// All PII fields (Aadhaar, bank account/IFSC, voter ID, ration card,
// annual income, door no, member DOB) are AES-256-GCM encrypted at
// seed time using src/lib/crypto.ts. Aadhaar/voter ID also get a keyed
// HMAC-SHA-256 hash for searchable equality lookups without bulk decrypt.
// ═══════════════════════════════════════════════════════════════════════

// Helpers: encrypt-or-null  &  hash-or-null shorthand for readability.
const enc = (v: string | number | null | undefined): string | null =>
  v === null || v === undefined ? null : encryptPII(String(v));
const h = (v: string | null | undefined): string | null => hashPII(v ?? null);

const MANDALS = [
  { name: 'VR Puram', nameTelugu: 'వి.ఆర్.పురం', code: 'VRP', latitude: 17.560, longitude: 81.310, color: '#D97706' },
  { name: 'Chintoor', nameTelugu: 'చింతూరు', code: 'CHN', latitude: 17.730, longitude: 81.395, color: '#0D9488' },
  { name: 'Kunavaram', nameTelugu: 'కునవరం', code: 'KUN', latitude: 17.510, longitude: 81.235, color: '#EA580C' },
];

interface VillageDef {
  name: string;
  nameTelugu: string;
  code: string;
  latitude: number;
  longitude: number;
  familyCount: number;
}

const VILLAGES: Record<string, VillageDef[]> = {
  VRP: [
    { name: 'Sabariraigudem', nameTelugu: 'సబరిరాయిగూడెం', code: 'SAB', latitude: 17.595, longitude: 81.295, familyCount: 165 },
    { name: 'DT Gudem', nameTelugu: 'డి.టి గూడెం', code: 'DTG', latitude: 17.535, longitude: 81.320, familyCount: 260 },
    { name: 'Koppali', nameTelugu: 'కొప్పలి', code: 'KOP', latitude: 17.610, longitude: 81.310, familyCount: 93 },
    { name: 'Somulagudem', nameTelugu: 'సోములగూడెం', code: 'SOM', latitude: 17.555, longitude: 81.300, familyCount: 177 },
    { name: 'Kannaigudem', nameTelugu: 'కన్నాయిగూడెం', code: 'KAN', latitude: 17.580, longitude: 81.335, familyCount: 84 },
    { name: 'Rajupeta', nameTelugu: 'రాజుపేట', code: 'RJP', latitude: 17.515, longitude: 81.305, familyCount: 22 },
    { name: 'Gundugudem', nameTelugu: 'గుండుగూడెం', code: 'GUN', latitude: 17.600, longitude: 81.320, familyCount: 218 },
    { name: 'Prathipaka', nameTelugu: 'ప్రతిపాక', code: 'PRA', latitude: 17.545, longitude: 81.285, familyCount: 190 },
    { name: 'Ramavaram', nameTelugu: 'రామవరం', code: 'RAM', latitude: 17.575, longitude: 81.300, familyCount: 170 },
    { name: 'Ramavarapadu', nameTelugu: 'రామవరపాడు', code: 'RAP', latitude: 17.520, longitude: 81.318, familyCount: 261 },
    { name: 'AV Gudem', nameTelugu: 'ఎ.వి గూడెం', code: 'AVG', latitude: 17.585, longitude: 81.315, familyCount: 256 },
    { name: 'Waddigudem', nameTelugu: 'వడ్డిగూడెం', code: 'WAD', latitude: 17.540, longitude: 81.280, familyCount: 766 },
    { name: 'Choppali', nameTelugu: 'చొప్పలి', code: 'CHO', latitude: 17.568, longitude: 81.338, familyCount: 270 },
    { name: 'Rajupeta Colony', nameTelugu: 'రాజుపేట కాలనీ', code: 'RJC', latitude: 17.525, longitude: 81.295, familyCount: 713 },
    { name: 'Chintharegupalli', nameTelugu: 'చింతరేగుపల్లి', code: 'CRP', latitude: 17.570, longitude: 81.292, familyCount: 436 },
    { name: 'VR Puram', nameTelugu: 'వి.ఆర్.పురం', code: 'VPR', latitude: 17.560, longitude: 81.310, familyCount: 1705 },
  ],
  CHN: [
    { name: 'Ulumuru', nameTelugu: 'ఉలుమూరు', code: 'ULU', latitude: 17.775, longitude: 81.380, familyCount: 314 },
    { name: 'Chuturu', nameTelugu: 'చూతూరు', code: 'CHU', latitude: 17.720, longitude: 81.420, familyCount: 434 },
    { name: 'AG Koderu', nameTelugu: 'ఎ.జి కోడేరు', code: 'AGK', latitude: 17.760, longitude: 81.430, familyCount: 694 },
    { name: 'Mallithota', nameTelugu: 'మల్లితోట', code: 'MAL', latitude: 17.700, longitude: 81.400, familyCount: 453 },
    { name: 'Chintoor', nameTelugu: 'చింతూరు', code: 'CHT', latitude: 17.740, longitude: 81.405, familyCount: 1811 },
  ],
  KUN: [
    { name: 'Wolforedpeta', nameTelugu: 'వోల్ఫోరెడ్‌పేట', code: 'WOL', latitude: 17.535, longitude: 81.220, familyCount: 62 },
    { name: 'Kudalipadu', nameTelugu: 'కుడలిపాడు', code: 'KUD', latitude: 17.530, longitude: 81.240, familyCount: 226 },
    { name: 'Kondrajupeta', nameTelugu: 'కొండ్రాజుపేట', code: 'KRJ', latitude: 17.540, longitude: 81.225, familyCount: 279 },
    { name: 'Pandrajupalli', nameTelugu: 'పండ్రాజుపల్లి', code: 'PDP', latitude: 17.505, longitude: 81.212, familyCount: 342 },
    { name: 'Tekubaka', nameTelugu: 'టేకుబాక', code: 'TEK', latitude: 17.520, longitude: 81.235, familyCount: 238 },
    { name: 'Tekulaboru', nameTelugu: 'టేకులబోరు', code: 'TKB', latitude: 17.485, longitude: 81.222, familyCount: 1001 },
    { name: 'Peddarkuru', nameTelugu: 'పెద్దర్కూరు', code: 'PDK', latitude: 17.470, longitude: 81.228, familyCount: 505 },
    { name: 'S.Kothagudem', nameTelugu: 'ఎస్.కొత్తగూడెం', code: 'SKG', latitude: 17.515, longitude: 81.205, familyCount: 454 },
    { name: 'Kunavaram', nameTelugu: 'కునవరం', code: 'KNV', latitude: 17.495, longitude: 81.238, familyCount: 1362 },
  ],
};

// ═══════════════════════════════════════════════════════════════════════
// NAMES — Anonymized realistic Telugu names
// ═══════════════════════════════════════════════════════════════════════

const MALE_NAMES = [
  'Rama Rao', 'Satyanarayana', 'Venkateswarlu', 'Raju', 'Krishnaiah',
  'Lakshman Rao', 'Narasimha Rao', 'Prasad', 'Mohan Rao', 'Suryanarayana',
  'Ravi', 'Srinivas', 'Gopal', 'Venkat', 'Ramesh',
  'Suresh', 'Mahesh', 'Rajesh', 'Santosh', 'Vijay',
  'Siva', 'Ganesh', 'Anand', 'Kishan', 'Balu',
  'Nageswara Rao', 'Subba Rao', 'Papa Rao', 'Buchchaiah', 'Koteswara Rao',
  'Peddi Raju', 'Chinna Raju', 'Bhadranna', 'Mallaiah', 'Ellaiah',
  'Tirupathaiah', 'Rangaiah', 'Somaiah', 'Veraiah', 'Ramaiah',
  'Ramana', 'Raghava', 'Hari', 'Devi Prasad', 'Samba Murthy',
  'Pardha Saradhi', 'Seshaiah', 'Brahmaiah', 'Giridhar', 'Ramanadham',
  'Venkata Ramana', 'Raghuram', 'Bhaskar', 'Nagendra', 'Ranganath',
  'Seshagiri', 'Venugopal', 'Ramakrishna', 'Bhimaraju', 'Somaraju',
];

const FEMALE_NAMES = [
  'Lakshmi', 'Saraswati', 'Parvathi', 'Seetha', 'Annapurna',
  'Durga', 'Rajeshwari', 'Lalitha', 'Savithri', 'Padmavathi',
  'Nagamani', 'Satyavathi', 'Adilakshmi', 'Ramulamma', 'Sarojini',
  'Bujjamma', 'Mangamma', 'Lachamma', 'Yellamma', 'Polamma',
  'Narsamma', 'Durgamma', 'Peddamma', 'Chinamma', 'Rangamma',
  'Somamma', 'Kondamma', 'Buddamma', 'Poshamma', 'Swarna',
  'Padma', 'Shanti', 'Uma', 'Kavitha', 'Jyothi',
  'Sujatha', 'Usha', 'Prameela', 'Chandramma', 'Kantamma',
  'Papamma', 'Laxmamma', 'Bhanumathi', 'Krishnaveni', 'Ramanamma',
  'Venkamma', 'Gouramma', 'Kameshwari', 'Jayamma', 'Eeramma',
  'Gangamma', 'Bhadrakali', 'Sode Mani', 'Karam Bhadrakali', 'Muthyalu',
];

const FATHER_NAMES = [
  'Karam Narayana', 'Dharmula Venkatarao', 'Sode Thamiah', 'Sode Pichaiah',
  'Karam Venkaiah', 'Rama Rao', 'Venkateswarlu', 'Narasimha Rao', 'Subba Rao',
  'Mallaiah', 'Ellaiah', 'Tirupathaiah', 'Rangaiah', 'Somaiah', 'Veraiah',
  'Pedda Raju', 'Chinna Raju', 'Bhadranna', 'Lakshman Rao', 'Prasad',
  'Mohan Rao', 'Suryanarayana', 'Gopal', 'Venkat', 'Ramesh Babu',
  'Koteswara Rao', 'Papa Rao', 'Buchchaiah', 'Samba Murthy', 'Raghava',
];

// ═══════════════════════════════════════════════════════════════════════
// CATEGORIES — Aligned with real SES data format
// ═══════════════════════════════════════════════════════════════════════

const CASTES = ['St', 'Sc', 'Bc', 'Oc'];
const CASTE_WEIGHTS = [50, 20, 20, 10]; // Tribal area: ST dominant

const SUB_CASTES: Record<string, string[]> = {
  'St': ['Koya', 'Kondareddy', 'Valmiki', 'Gond', 'Naikpod', 'Lambada'],
  'Sc': ['Mala', 'Madiga', 'Relli', 'Adi Andhra'],
  'Bc': ['Reddy', 'Kamma', 'Kapu', 'Yadava', 'Goud', 'Munnurukapu'],
  'Oc': ['Brahmin', 'Vysya', 'Kshatriya'],
};

const HOUSE_TYPES = ['Thatched', 'RCC', 'Kutcha', 'Semi-Pucca', 'Tiled'];
const HOUSE_WEIGHTS = [35, 15, 25, 15, 10];

const FARMER_CATEGORIES = ['Land less poor', 'Small farmer', 'Marginal farmer', 'Big farmer'];
const FARMER_WEIGHTS = [45, 25, 20, 10];

const OCCUPATIONS_MALE = ['Agriculture Labour', 'Daily Wage Worker', 'Farmer', 'Small Business', 'Driver', 'Carpenter', 'Mason', 'Fisherman'];
const OCCUPATIONS_FEMALE = ['Homemaker', 'Agriculture Labour', 'Daily Wage Worker', 'Beedi Roller', 'Small Business', 'Anganwadi Worker'];

const SCHOOL_RECORDS = ['Illiterate', 'SSC Mark list', 'Intermediate', 'Degree', 'Study Certificate', 'Transfer Certificate'];

const COLONY_NAMES = [
  'R&R Colony, VR Puram',
  'R&R Colony, Chintoor',
  'R&R Colony, Kunavaram',
  'R&R Colony Phase-1, Polavaram',
  'R&R Colony Phase-2, Polavaram',
  'Rehabilitation Center, Rampachodavaram',
  'R&R Colony Phase-3, Polavaram',
  'New Rehabilitation Colony, VR Puram',
];

const RR_UNITS = ['Yetapaka', 'Rampachodavaram', 'Chintoor'];

// ═══════════════════════════════════════════════════════════════════════
// SEEDED PRNG — Deterministic for reproducible data
// ═══════════════════════════════════════════════════════════════════════

let rSeed = 42;
function sRand(): number {
  rSeed = (rSeed * 16807) % 2147483647;
  return (rSeed - 1) / 2147483646;
}
function rInt(a: number, b: number): number {
  return Math.floor(sRand() * (b - a + 1)) + a;
}
function rFlt(a: number, b: number): number {
  return Math.round((sRand() * (b - a) + a) * 100) / 100;
}
function pick<T>(a: T[]): T {
  return a[Math.floor(sRand() * a.length)];
}
function weightedPick(options: string[], weights: number[]): string {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = sRand() * total;
  for (let i = 0; i < options.length; i++) {
    r -= weights[i];
    if (r <= 0) return options[i];
  }
  return options[options.length - 1];
}

// Generate anonymized PDF ID (format: PDF + 6 digits)
function pdfId(globalIndex: number): string {
  const num = ((globalIndex * 7919 + 100001) % 900000) + 100000;
  return `PDF${num}`;
}

// Generate anonymized HHSID
function hhsid(globalIndex: number): string {
  const part1 = ((globalIndex * 3571 + 10491) % 9000) + 1000;
  const part2 = ((globalIndex * 2099 + 20904) % 9000) + 1000;
  const part3 = ((globalIndex * 4253 + 42021) % 90000) + 10000;
  const part4 = ((globalIndex * 6277 + 87583) % 900000) + 100000;
  return `HH${part1}${part2}20210323${part3}${part4}`;
}

// Generate anonymized Aadhar number (masked)
function maskedAadhar(): string {
  return `${rInt(1000, 9999)}${rInt(1000, 9999)}${rInt(1000, 9999)}`;
}

// Generate anonymized ration card number
function rationCardNo(): string {
  const prefix = pick(['WAP', 'YAP', 'WYP', 'YWP']);
  return `${prefix}${rInt(2210, 2219)}${rInt(100, 999)}${rInt(100, 999)}`;
}

// Generate anonymized voter ID
function voterIdNo(): string {
  const prefix = pick(['UDD', 'YOP', 'KDP', 'RMP']);
  return `${prefix}${rInt(10, 99)}${rInt(1000, 9999)}`;
}

// Generate anonymized bank account
function bankAccountNo(): string {
  return String(rInt(10000000000, 99999999999));
}

// Generate anonymized IFSC
function bankIfsc(): string {
  const bank = pick(['SBIN', 'APGVB', 'IOBA', 'UBIN']);
  return `${bank}0${rInt(100, 999)}${rInt(100, 999)}`;
}

// R&R Eligibility: ~70% Eligible, ~30% Ineligible
function getRrEligibility(globalIndex: number): string {
  const mod = globalIndex % 100;
  if (mod < 70) return 'Eligible';
  return 'Ineligible';
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN SEED FUNCTION
// ═══════════════════════════════════════════════════════════════════════

async function main() {
  console.log('🌱 Seeding Polavaram Project Rehabilitation Portal...');
  console.log('   Aligned with real SES and First Scheme data formats');
  console.log('');

  // ── Clean Slate ──
  console.log('🧹 Cleaning existing data...');
  await db.auditLog.deleteMany();
  await db.plotAllotment.deleteMany();
  await db.firstScheme.deleteMany();
  await db.familyMember.deleteMany();
  await db.family.deleteMany();
  await db.village.deleteMany();
  await db.user.deleteMany();
  await db.mandal.deleteMany();
  console.log('   ✓ All tables cleared');

  // ── Mandals (created first so OFFICER seed user can be scoped) ──
  const mIds: Record<string, string> = {};
  for (const m of MANDALS) {
    const r = await db.mandal.create({ data: m });
    mIds[m.code] = r.id;
  }
  console.log(`   ✓ ${MANDALS.length} Mandals created`);

  // ── Seed staff users (passwords from env, must be rotated on first login) ──
  const bcrypt = await import('bcryptjs');
  const adminPwd = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe@2026';
  const officerPwd = process.env.SEED_OFFICER_PASSWORD || 'ChangeMe@2026';

  await db.user.create({
    data: {
      email: 'admin@polavaram.ap.gov.in',
      password: await bcrypt.hash(adminPwd, 12),
      name: 'District Admin',
      role: 'ADMIN',
      isActive: true,
      mustChangePassword: true,
    },
  });
  await db.user.create({
    data: {
      email: 'officer.vrpuram@polavaram.ap.gov.in',
      password: await bcrypt.hash(officerPwd, 12),
      name: 'VR Puram Mandal Officer',
      role: 'OFFICER',
      mandalId: mIds['VRP'],
      isActive: true,
      mustChangePassword: true,
    },
  });
  console.log('   ✓ Staff users seeded:');
  console.log(`       admin@polavaram.ap.gov.in            (ADMIN)   pwd: ${adminPwd}`);
  console.log(`       officer.vrpuram@polavaram.ap.gov.in  (OFFICER) pwd: ${officerPwd}`);
  console.log('       ⚠  Both must change password on first login.');

  // ── Villages ──
  const vIds: Record<string, string> = {};
  for (const [mc, vs] of Object.entries(VILLAGES)) {
    for (const v of vs) {
      const r = await db.village.create({
        data: {
          name: v.name,
          nameTelugu: v.nameTelugu,
          code: v.code,
          latitude: v.latitude,
          longitude: v.longitude,
          totalFamilies: v.familyCount,
          mandalId: mIds[mc],
        },
      });
      vIds[`${mc}-${v.code}`] = r.id;
    }
  }
  console.log(`   ✓ 30 Villages created`);

  // ── Families, Members, FirstScheme, and Plots ──
  console.log('\n📋 Creating families with SES and First Scheme data...');

  let globalFamilyIndex = 0;
  let totalFamilies = 0;
  let totalMembers = 0;
  let totalFirstScheme = 0;
  let totalPlots = 0;

  for (const [mc, vs] of Object.entries(VILLAGES)) {
    const mandal = MANDALS.find(m => m.code === mc)!;
    console.log(`\n  📌 ${mandal.name} Mandal:`);

    for (const v of vs) {
      const vid = vIds[`${mc}-${v.code}`];
      const fc = v.familyCount;

      // ── Create Families ──
      const fData: Array<{
        pdfId: string;
        hhsid: string;
        beneficiaryName: string;
        fathersName: string;
        husbandName: string;
        gender: string;
        villageId: string;
        sesNo: number;
        caste: string;
        subCaste: string;
        houseType: string;
        doorNoEnc: string | null;
        annualIncomeEnc: string | null;
        farmerCategory: string;
        bplApl: string;
        rationCardNoEnc: string | null;
        occupation: string;
        rrEligibility: string;
        aliveOrDied: string;
        maritalStatus: string;
        bankName: string;
        bankBranch: string;
        bankIfscEnc: string | null;
        bankAccountNoEnc: string | null;
        bankAccountActive: string;
        aadharNoEnc: string | null;
        aadharNoHash: string | null;
        voterIdNoEnc: string | null;
        voterIdNoHash: string | null;
        periodOfResidence: number;
        photoUploaded: boolean;
        residencePhoto: boolean;
        housingProvision: string | null;
        landForLand: string;
        landSurveyNo: string;
        landExtent: string;
        offerDevelopedLand: string;
      }> = [];

      for (let i = 0; i < fc; i++) {
        const ni = globalFamilyIndex % MALE_NAMES.length;
        const rrEligibility = getRrEligibility(globalFamilyIndex);
        const caste = weightedPick(CASTES, CASTE_WEIGHTS);
        const subCaste = pick(SUB_CASTES[caste] || ['General']);
        const isMaleHead = sRand() < 0.85; // 85% male heads
        const headName = isMaleHead ? MALE_NAMES[ni] : FEMALE_NAMES[globalFamilyIndex % FEMALE_NAMES.length];
        const fName = isMaleHead ? FATHER_NAMES[globalFamilyIndex % FATHER_NAMES.length] : FATHER_NAMES[(globalFamilyIndex + 5) % FATHER_NAMES.length];
        const hName = !isMaleHead ? MALE_NAMES[(globalFamilyIndex + 3) % MALE_NAMES.length] : 'NA';
        const bankActive = sRand() < 0.9 ? 'Yes' : 'No';
        const hasPhoto = sRand() < 0.85;
        const hasHousing = rrEligibility === 'Eligible' && sRand() < 0.6;

        const aadharPlain = maskedAadhar();
        const voterPlain = voterIdNo();

        fData.push({
          pdfId: pdfId(globalFamilyIndex),
          hhsid: hhsid(globalFamilyIndex),
          beneficiaryName: headName,
          fathersName: fName,
          husbandName: hName,
          gender: isMaleHead ? 'Male' : 'Female',
          villageId: vid,
          sesNo: i + 1,
          caste,
          subCaste,
          houseType: weightedPick(HOUSE_TYPES, HOUSE_WEIGHTS),
          doorNoEnc: enc(`${rInt(1, 20)}-${rInt(1, 999)}/${rInt(1, 5)}, ${rInt(100, 999)}`),
          annualIncomeEnc: enc(rInt(6000, 80000)),
          farmerCategory: weightedPick(FARMER_CATEGORIES, FARMER_WEIGHTS),
          bplApl: sRand() < 0.7 ? 'BPL' : 'APL',
          rationCardNoEnc: enc(rationCardNo()),
          occupation: isMaleHead ? pick(OCCUPATIONS_MALE) : pick(OCCUPATIONS_FEMALE),
          rrEligibility,
          aliveOrDied: sRand() < 0.95 ? 'Alive' : 'Died',
          maritalStatus: sRand() < 0.85 ? 'Married' : (sRand() < 0.5 ? 'Single' : 'Widow'),
          bankName: pick(['State Bank Of India', 'Andhra Pradesh Grameena Vikas Bank', 'Indian Bank', 'Union Bank Of India']),
          bankBranch: pick(['Tekulaboru', 'Chintoor', 'VR Puram', 'Kunavaram', 'Rampachodavaram']),
          bankIfscEnc: enc(bankIfsc()),
          bankAccountNoEnc: enc(bankAccountNo()),
          bankAccountActive: bankActive,
          aadharNoEnc: enc(aadharPlain),
          aadharNoHash: h(aadharPlain),
          voterIdNoEnc: enc(voterPlain),
          voterIdNoHash: h(voterPlain),
          periodOfResidence: rInt(5, 50),
          photoUploaded: hasPhoto,
          residencePhoto: hasPhoto && sRand() < 0.8,
          housingProvision: hasHousing ? 'IAY/NTR housing unit will be provided' : null,
          landForLand: sRand() < 0.1 ? 'Eligible' : 'NA',
          landSurveyNo: sRand() < 0.1 ? `${rInt(100, 999)}/${rInt(1, 20)}` : 'NA',
          landExtent: sRand() < 0.1 ? `${rFlt(0.5, 5)} Ac` : 'NA',
          offerDevelopedLand: sRand() < 0.05 ? 'Yes' : 'NA',
        });
        globalFamilyIndex++;
      }

      await db.family.createMany({ data: fData });

      // ── Query Families Back ──
      const fams = await db.family.findMany({
        where: { villageId: vid },
        select: { id: true, pdfId: true, rrEligibility: true, beneficiaryName: true, gender: true, caste: true, subCaste: true, occupation: true },
        orderBy: { pdfId: 'asc' },
      });

      // ── Create Members, FirstScheme, and Plots ──
      const mData: Array<{
        familyId: string;
        beneficiaryName: string;
        fathersName: string | null;
        husbandName: string | null;
        wifeBirthSurname: string | null;
        relation: string;
        age: number;
        agePnLaAct: number | null;
        gender: string;
        aliveOrDied: string;
        maritalStatus: string | null;
        caste: string | null;
        subCaste: string | null;
        schoolRecords: string | null;
        dobSscTcEnc: string | null;
        occupation: string | null;
        aadharNoEnc: string | null;
        aadharNoHash: string | null;
        voterIdNoEnc: string | null;
        voterIdNoHash: string | null;
        isPhysicallyHandicapped: string | null;
        isWidow: string | null;
        isDivorced: string | null;
        bankName: string | null;
        bankBranch: string | null;
        bankIfscEnc: string | null;
        bankAccountNoEnc: string | null;
        bankAccountActive: string | null;
      }> = [];

      const fsData: Array<{
        familyId: string;
        rrUnit: string;
        sesNo: number;
        ageAsOnDate: number;
        community: string;
        profession: string;
        extentOfLandAcCts: number | null;
        structureValue: number;
        residingPreceding3Years: string;
        schemeProposedHouseOneTime: string;
        extentLandToLandAcr: number | null;
        developedLandUrban20pct: string;
        choiceAnnuityEmploymentOneTime: number;
        subsistenceAllowance: number;
        scStAdditionalAllowance: number;
        transportCharges: number;
        cattleShedPettyShop: string;
        artisanSmallTraderGrant: number | null;
        oneTimeResettlementAllowance: number;
        totalCompensation: number;
        remarks: string | null;
      }> = [];

      const pData: Array<{
        familyId: string;
        plotNumber: string;
        colonyName: string;
        latitude: number | null;
        longitude: number | null;
        areaSqYards: number;
        allotmentStatus: string;
        allotmentDate: Date | null;
      }> = [];

      let localIdx = 0;

      for (const f of fams) {
        const hi = localIdx % MALE_NAMES.length;
        const headAge = rInt(25, 70);
        const casteVal = f.caste || 'St';
        const communityMap: Record<string, string> = { 'St': 'ST', 'Sc': 'SC', 'Bc': 'BC', 'Oc': 'OC' };
        const community = communityMap[casteVal] || 'ST';

        // Head of Family
        {
          const headAadhar = maskedAadhar();
          const headVoter = voterIdNo();
          const headDob = sRand() < 0.3 ? 'Illiterate' : `${rInt(1, 28)}/${rInt(1, 12)}/${rInt(1960, 2005)}`;
          mData.push({
            familyId: f.id,
            beneficiaryName: f.beneficiaryName,
            fathersName: f.gender === 'Male' ? FATHER_NAMES[localIdx % FATHER_NAMES.length] : null,
            husbandName: f.gender === 'Female' ? MALE_NAMES[(localIdx + 3) % MALE_NAMES.length] : null,
            wifeBirthSurname: f.gender === 'Female' ? FEMALE_NAMES[(localIdx + 7) % FEMALE_NAMES.length] : null,
            relation: 'Head',
            age: headAge,
            agePnLaAct: rInt(Math.max(18, headAge - 5), headAge),
            gender: f.gender,
            aliveOrDied: f.gender === 'Male' ? 'Alive' : 'Alive',
            maritalStatus: sRand() < 0.85 ? 'Married' : 'Single',
            caste: casteVal,
            subCaste: f.subCaste,
            schoolRecords: pick(SCHOOL_RECORDS),
            dobSscTcEnc: enc(headDob),
            occupation: f.occupation || 'Agriculture Labour',
            aadharNoEnc: enc(headAadhar),
            aadharNoHash: h(headAadhar),
            voterIdNoEnc: enc(headVoter),
            voterIdNoHash: h(headVoter),
            isPhysicallyHandicapped: sRand() < 0.03 ? 'Yes' : 'No',
            isWidow: 'NA',
            isDivorced: 'NA',
            bankName: pick(['State Bank Of India', 'Andhra Pradesh Grameena Vikas Bank', 'Indian Bank']),
            bankBranch: pick(['Tekulaboru', 'Chintoor', 'VR Puram']),
            bankIfscEnc: enc(bankIfsc()),
            bankAccountNoEnc: enc(bankAccountNo()),
            bankAccountActive: sRand() < 0.9 ? 'Yes' : 'No',
          });
        }

        // Spouse (80% of families)
        if (sRand() < 0.80) {
          const spouseGender = f.gender === 'Male' ? 'Female' : 'Male';
          const spouseAge = rInt(Math.max(20, headAge - 8), Math.min(65, headAge + 2));
          const spouseName = spouseGender === 'Female' 
            ? FEMALE_NAMES[(localIdx + 1) % FEMALE_NAMES.length]
            : MALE_NAMES[(localIdx + 2) % MALE_NAMES.length];
          const spouseRelation = spouseGender === 'Female' ? 'Wife' : 'Husband';

          const spouseAadhar = maskedAadhar();
          const spouseVoter = voterIdNo();
          const spouseDob = sRand() < 0.4 ? 'Illiterate' : `${rInt(1, 28)}/${rInt(1, 12)}/${rInt(1960, 2005)}`;
          mData.push({
            familyId: f.id,
            beneficiaryName: spouseName,
            fathersName: FATHER_NAMES[(localIdx + 3) % FATHER_NAMES.length],
            husbandName: spouseGender === 'Female' ? f.beneficiaryName : null,
            wifeBirthSurname: spouseGender === 'Female' ? FEMALE_NAMES[(localIdx + 5) % FEMALE_NAMES.length] : null,
            relation: spouseRelation,
            age: spouseAge,
            agePnLaAct: rInt(Math.max(18, spouseAge - 4), spouseAge),
            gender: spouseGender,
            aliveOrDied: 'Alive',
            maritalStatus: 'Married',
            caste: casteVal,
            subCaste: f.subCaste,
            schoolRecords: pick(SCHOOL_RECORDS),
            dobSscTcEnc: enc(spouseDob),
            occupation: spouseGender === 'Female' ? pick(OCCUPATIONS_FEMALE) : pick(OCCUPATIONS_MALE),
            aadharNoEnc: enc(spouseAadhar),
            aadharNoHash: h(spouseAadhar),
            voterIdNoEnc: enc(spouseVoter),
            voterIdNoHash: h(spouseVoter),
            isPhysicallyHandicapped: 'No',
            isWidow: 'NA',
            isDivorced: 'NA',
            bankName: pick(['State Bank Of India', 'Andhra Pradesh Grameena Vikas Bank']),
            bankBranch: pick(['Tekulaboru', 'Chintoor']),
            bankIfscEnc: enc(bankIfsc()),
            bankAccountNoEnc: enc(bankAccountNo()),
            bankAccountActive: sRand() < 0.85 ? 'Yes' : 'No',
          });
        }

        // First Child (50%)
        if (sRand() < 0.50) {
          const male = sRand() < 0.55;
          const childAge = rInt(5, 30);
          const cAadhar = childAge >= 5 ? maskedAadhar() : null;
          const cVoter = childAge >= 18 ? voterIdNo() : null;
          mData.push({
            familyId: f.id,
            beneficiaryName: male ? MALE_NAMES[(localIdx + 4) % MALE_NAMES.length] : FEMALE_NAMES[(localIdx + 6) % FEMALE_NAMES.length],
            fathersName: f.gender === 'Male' ? f.beneficiaryName : null,
            husbandName: null,
            wifeBirthSurname: null,
            relation: male ? 'Son' : 'Daughter',
            age: childAge,
            agePnLaAct: childAge >= 18 ? rInt(Math.max(18, childAge - 3), childAge) : null,
            gender: male ? 'Male' : 'Female',
            aliveOrDied: 'Alive',
            maritalStatus: childAge >= 20 ? 'Married' : 'Single',
            caste: casteVal,
            subCaste: f.subCaste,
            schoolRecords: pick(SCHOOL_RECORDS),
            dobSscTcEnc: enc(`${rInt(1, 28)}/${rInt(1, 12)}/${rInt(1995, 2020)}`),
            occupation: childAge < 18 ? 'Student' : (male ? pick(OCCUPATIONS_MALE) : pick(OCCUPATIONS_FEMALE)),
            aadharNoEnc: enc(cAadhar),
            aadharNoHash: h(cAadhar),
            voterIdNoEnc: enc(cVoter),
            voterIdNoHash: h(cVoter),
            isPhysicallyHandicapped: 'No',
            isWidow: 'NA',
            isDivorced: 'NA',
            bankName: childAge >= 18 ? pick(['State Bank Of India', 'Andhra Pradesh Grameena Vikas Bank']) : null,
            bankBranch: childAge >= 18 ? pick(['Tekulaboru', 'Chintoor']) : null,
            bankIfscEnc: childAge >= 18 ? enc(bankIfsc()) : null,
            bankAccountNoEnc: childAge >= 18 ? enc(bankAccountNo()) : null,
            bankAccountActive: childAge >= 18 ? 'Yes' : null,
          });
        }

        // Second Child (30%)
        if (sRand() < 0.30) {
          const male = sRand() < 0.55;
          const childAge = rInt(3, 25);
          mData.push({
            familyId: f.id,
            beneficiaryName: male ? MALE_NAMES[(localIdx + 8) % MALE_NAMES.length] : FEMALE_NAMES[(localIdx + 9) % FEMALE_NAMES.length],
            fathersName: f.gender === 'Male' ? f.beneficiaryName : null,
            husbandName: null,
            wifeBirthSurname: null,
            relation: male ? 'Son' : 'Daughter',
            age: childAge,
            agePnLaAct: childAge >= 18 ? rInt(Math.max(18, childAge - 3), childAge) : null,
            gender: male ? 'Male' : 'Female',
            aliveOrDied: 'Alive',
            maritalStatus: childAge >= 20 ? 'Married' : 'Single',
            caste: casteVal,
            subCaste: f.subCaste,
            schoolRecords: pick(SCHOOL_RECORDS),
            dobSscTcEnc: enc(`${rInt(1, 28)}/${rInt(1, 12)}/${rInt(1998, 2022)}`),
            occupation: childAge < 18 ? 'Student' : (male ? pick(OCCUPATIONS_MALE) : pick(OCCUPATIONS_FEMALE)),
            aadharNoEnc: childAge >= 5 ? enc(maskedAadhar()) : null,
            aadharNoHash: null,
            voterIdNoEnc: childAge >= 18 ? enc(voterIdNo()) : null,
            voterIdNoHash: null,
            isPhysicallyHandicapped: 'No',
            isWidow: 'NA',
            isDivorced: 'NA',
            bankName: null,
            bankBranch: null,
            bankIfscEnc: null,
            bankAccountNoEnc: null,
            bankAccountActive: null,
          });
        }

        // ── First Scheme for Eligible families ──
        if (f.rrEligibility === 'Eligible') {
          const hasLand = sRand() < 0.2;
          const structureValue = rInt(40000, 250000);
          const choiceAnnuity = rInt(400000, 600000);
          const subsistence = 36000;
          const scStAllow = (community === 'ST' || community === 'SC') ? 50000 : 0;
          const transport = 50000;
          const resettlement = 50000;
          const cattleShedVal = sRand() < 0.15 ? String(rInt(15000, 25000)) : 'No';
          const artisanGrant = sRand() < 0.1 ? rInt(10000, 25000) : null;
          const total = structureValue + choiceAnnuity + subsistence + scStAllow + transport + resettlement + (cattleShedVal !== 'No' ? parseInt(cattleShedVal) : 0) + (artisanGrant || 0);

          fsData.push({
            familyId: f.id,
            rrUnit: pick(RR_UNITS),
            sesNo: localIdx + 1,
            ageAsOnDate: rInt(Math.max(18, headAge - 5), headAge),
            community,
            profession: f.occupation || 'Agriculture Labour',
            extentOfLandAcCts: hasLand ? rFlt(0.5, 5) : null,
            structureValue,
            residingPreceding3Years: 'Yes',
            schemeProposedHouseOneTime: sRand() < 0.8 ? 'proposed for House' : 'proposed for One Time',
            extentLandToLandAcr: hasLand ? rFlt(0.5, 3) : null,
            developedLandUrban20pct: sRand() < 0.1 ? 'Yes' : 'No',
            choiceAnnuityEmploymentOneTime: choiceAnnuity,
            subsistenceAllowance: subsistence,
            scStAdditionalAllowance: scStAllow,
            transportCharges: transport,
            cattleShedPettyShop: cattleShedVal,
            artisanSmallTraderGrant: artisanGrant,
            oneTimeResettlementAllowance: resettlement,
            totalCompensation: total,
            remarks: null,
          });

          // ── Plot Allotment for some eligible families ──
          if (sRand() < 0.45) {
            const plotRand = sRand();
            let plotStatus: string;
            if (plotRand < 0.30) plotStatus = 'PENDING';
            else if (plotRand < 0.70) plotStatus = 'ALLOTTED';
            else plotStatus = 'POSSESSION_GIVEN';

            const hasCoords = plotStatus !== 'PENDING' || sRand() < 0.2;
            pData.push({
              familyId: f.id,
              plotNumber: `RRC-${mc}-${rInt(1, 999)}`,
              colonyName: pick(COLONY_NAMES),
              latitude: hasCoords ? mandal.latitude + rFlt(-0.02, 0.02) : null,
              longitude: hasCoords ? mandal.longitude + rFlt(-0.02, 0.02) : null,
              areaSqYards: rFlt(150, 500),
              allotmentStatus: plotStatus,
              allotmentDate: plotStatus !== 'PENDING' ? new Date(2024, rInt(0, 11), rInt(1, 28)) : null,
            });
          }
        }

        localIdx++;
      }

      // Batch insert members
      if (mData.length > 0) {
        await db.familyMember.createMany({ data: mData });
        totalMembers += mData.length;
      }

      // Batch insert first scheme
      if (fsData.length > 0) {
        await db.firstScheme.createMany({ data: fsData });
        totalFirstScheme += fsData.length;
      }

      // Batch insert plots
      if (pData.length > 0) {
        await db.plotAllotment.createMany({ data: pData });
        totalPlots += pData.length;
      }

      totalFamilies += fc;
      console.log(`    ✓ ${v.name}: ${fc} families, ${mData.length} members, ${fsData.length} first scheme, ${pData.length} plots`);
    }
  }

  // ── Final Summary ──
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('📊 SEED COMPLETE — Polavaram Rehabilitation Portal');
  console.log('════════════════════════════════════════════════════════════');

  const dbCounts = await Promise.all([
    db.mandal.count(),
    db.village.count(),
    db.family.count(),
    db.familyMember.count(),
    db.firstScheme.count(),
    db.plotAllotment.count(),
  ]);

  console.log(`  Mandals:           ${dbCounts[0]} (expected: 3)`);
  console.log(`  Villages:         ${dbCounts[1]} (expected: 30)`);
  console.log(`  Families:      ${dbCounts[2]}`);
  console.log(`  Members:      ${dbCounts[3]}`);
  console.log(`  First Scheme: ${dbCounts[4]}`);
  console.log(`  Plot Allotments: ${dbCounts[5]}`);

  // Verify eligibility distribution
  const eligibleCount = await db.family.count({ where: { rrEligibility: 'Eligible' } });
  const ineligibleCount = await db.family.count({ where: { rrEligibility: 'Ineligible' } });
  console.log(`  R&R Eligible:   ${eligibleCount} (${(eligibleCount / dbCounts[2] * 100).toFixed(1)}%)`);
  console.log(`  R&R Ineligible: ${ineligibleCount} (${(ineligibleCount / dbCounts[2] * 100).toFixed(1)}%)`);

  // Verify caste distribution
  for (const c of CASTES) {
    const count = await db.family.count({ where: { caste: c } });
    console.log(`  Caste ${c.toUpperCase()}: ${count} (${(count / dbCounts[2] * 100).toFixed(1)}%)`);
  }

  console.log('════════════════════════════════════════════════════════════');
  console.log('🎉 Seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
