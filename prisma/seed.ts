import { PrismaClient } from '@prisma/client';

const db = new PrismaClient({ log: ['error'] });

const MANDALS = [
  { name: 'Polavaram', nameTelugu: 'పోలవరం', code: 'POL', latitude: 17.2473, longitude: 81.7119, color: '#F59E0B' },
  { name: 'Velairpad', nameTelugu: 'వేలేరుపాడు', code: 'VEL', latitude: 17.3012, longitude: 81.7845, color: '#14B8A6' },
  { name: 'Buttaigudem', nameTelugu: 'బుట్టాయిగూడెం', code: 'BUT', latitude: 17.1567, longitude: 81.7923, color: '#F97316' },
];

const VILLAGES: Record<string, Array<{ name: string; nameTelugu: string; code: string; latitude: number; longitude: number }>> = {
  POL: [
    { name: 'Konijerla', nameTelugu: 'కోనిజెర్ల', code: 'KON', latitude: 17.252, longitude: 81.705 },
    { name: 'Chintalapudi', nameTelugu: 'చింతలపూడి', code: 'CHI', latitude: 17.24, longitude: 81.72 },
    { name: 'Kukunoor', nameTelugu: 'కుక్కునూరు', code: 'KUK', latitude: 17.26, longitude: 81.698 },
    { name: 'Velerupadu', nameTelugu: 'వేలేరుపాడు', code: 'VRP', latitude: 17.235, longitude: 81.73 },
    { name: 'Gopavaram', nameTelugu: 'గోపావరం', code: 'GOP', latitude: 17.255, longitude: 81.715 },
  ],
  VEL: [
    { name: 'Velairpadu', nameTelugu: 'వేలేరుపాడు', code: 'VPR', latitude: 17.305, longitude: 81.78 },
    { name: 'Lankapalli', nameTelugu: 'లంకపల్లి', code: 'LAN', latitude: 17.295, longitude: 81.79 },
    { name: 'Koida', nameTelugu: 'కోయిడ', code: 'KOI', latitude: 17.31, longitude: 81.77 },
    { name: 'Gummadi', nameTelugu: 'గుమ్మడి', code: 'GUM', latitude: 17.288, longitude: 81.795 },
    { name: 'Purushottampalli', nameTelugu: 'పురుషోత్తంపల్లి', code: 'PUR', latitude: 17.32, longitude: 81.785 },
  ],
  BUT: [
    { name: 'Buttaigudem', nameTelugu: 'బుట్టాయిగూడెం', code: 'BTG', latitude: 17.158, longitude: 81.795 },
    { name: 'Jangareddygudem', nameTelugu: 'జంగారెడ్డిగూడెం', code: 'JAN', latitude: 17.15, longitude: 81.785 },
    { name: 'Koyyalagudem', nameTelugu: 'కొయ్యలగూడెం', code: 'KOY', latitude: 17.165, longitude: 81.8 },
    { name: 'Chintaluru', nameTelugu: 'చింతలూరు', code: 'CTR', latitude: 17.145, longitude: 81.79 },
    { name: 'Dwarakatirumala', nameTelugu: 'ద్వారకాతిరుమల', code: 'DWA', latitude: 17.17, longitude: 81.785 },
  ],
};

const HEAD_NAMES = [
  ['Ram Rao', 'రామారావు'], ['Satyanarayana', 'సత్యనారాయణ'], ['Venkateswarlu', 'వెంకటేశ్వర్లు'],
  ['Raju', 'రాజు'], ['Krishnaiah', 'కృష్ణయ్య'], ['Lakshman Rao', 'లక్ష్మణరావు'],
  ['Narasimha Rao', 'నరసింహారావు'], ['Prasad', 'ప్రసాద్'], ['Mohan Rao', 'మోహన్ రావు'],
  ['Suryanarayana', 'సూర్యనారాయణ'], ['Ravi', 'రవి'], ['Srinivas', 'శ్రీనివాస్'],
  ['Gopal', 'గోపాల్'], ['Venkat', 'వెంకట్'], ['Ramesh', 'రమేష్'],
  ['Suresh', 'సురేష్'], ['Mahesh', 'మహేష్'], ['Rajesh', 'రాజేష్'],
  ['Santosh', 'సంతోష్'], ['Vijay', 'విజయ్'], ['Siva', 'శివ'],
  ['Ganesh', 'గణేష్'], ['Anand', 'ఆనంద్'], ['Kishan', 'కిషన్'],
  ['Balu', 'బాలు'], ['Nageswara Rao', 'నాగేశ్వరరావు'], ['Subba Rao', 'సుబ్బారావు'],
  ['Papa Rao', 'పాపారావు'], ['Buchchaiah', 'బుచ్చయ్య'], ['Koteswara Rao', 'కోటేశ్వరరావు'],
  ['Peddi Raju', 'పెద్దిరాజు'], ['Chinna Raju', 'చిన్నరాజు'], ['Bhadranna', 'భద్రయ్య'],
  ['Mallaiah', 'మల్లయ్య'], ['Ellaiah', 'ఎల్లయ్య'], ['Tirupathaiah', 'తిరుపతయ్య'],
  ['Rangaiah', 'రంగయ్య'], ['Somaiah', 'సోమయ్య'], ['Veraiah', 'వీరయ్య'],
  ['Ramaiah', 'రామయ్య'], ['Ramana', 'రమణ'], ['Raghava', 'రాఘవ'],
  ['Hari', 'హరి'], ['Devi Prasad', 'దేవి ప్రసాద్'], ['Samba Murthy', 'శంభు మూర్తి'],
  ['Pardha Saradhi', 'పార్థ సరధి'], ['Seshaiah', 'శేషయ్య'], ['Brahmaiah', 'బ్రహ్మయ్య'],
  ['Giridhar', 'గిరిధర్'], ['Ramanadham', 'రమణాధం'],
];

const SPOUSE_NAMES = [
  ['Lakshmi', 'లక్ష్మి'], ['Saraswati', 'సరస్వతి'], ['Parvathi', 'పార్వతి'],
  ['Seetha', 'సీత'], ['Annapurna', 'అన్నపూర్ణ'], ['Durga', 'దుర్గ'],
  ['Rajeshwari', 'రాజేశ్వరి'], ['Lalitha', 'లలిత'], ['Savithri', 'సావిత్రి'], ['Padmavathi', 'పద్మావతి'],
];

const SON_NAMES = [
  ['Arun', 'అరుణ్'], ['Kiran', 'కిరణ్'], ['Sudheer', 'సుధీర్'], ['Madhu', 'మధు'],
  ['Prakash', 'ప్రకాష్'], ['Ajay', 'అజయ్'], ['Sanjay', 'సంజయ్'], ['Srinu', 'శ్రీను'],
  ['Naveen', 'నవీన్'], ['Harish', 'హరీష్'],
];

const DAUGHTER_NAMES = [
  ['Deepthi', 'దీప్తి'], ['Priya', 'ప్రియ'], ['Swathi', 'స్వాతి'], ['Latha', 'లత'],
  ['Shailaja', 'శైలజ'], ['Manju', 'మంజు'], ['Geetha', 'గీత'], ['Sujatha', 'సుజాత'],
  ['Padma', 'పద్మ'], ['Lavanya', 'లావణ్య'],
];

const CASTES = ['OC', 'BC-A', 'BC-B', 'BC-C', 'BC-D', 'BC-E', 'SC', 'ST'];
const HOUSE_TYPES = ['Pucca', 'Semi-Pucca', 'Kutcha'];
const OCCUPATIONS_MALE = ['Farmer', 'Agricultural Laborer', 'Daily Wage Worker', 'Small Business', 'Teacher', 'Driver', 'Carpenter', 'Mason'];
const COLONY_NAMES = ['R&R Colony Phase 1', 'R&R Colony Phase 2', 'Rehabilitation Center A', 'Rehabilitation Center B', 'R&R Colony Phase 3'];

let rSeed = 42;
function sRand(): number { rSeed = (rSeed * 16807) % 2147483647; return (rSeed - 1) / 2147483646; }
function pick<T>(a: T[]): T { return a[Math.floor(sRand() * a.length)]; }
function rInt(a: number, b: number): number { return Math.floor(sRand() * (b - a + 1)) + a; }
function rFlt(a: number, b: number): number { return Math.round((sRand() * (b - a) + a) * 100) / 100; }
function aadhar(): string { return `XXXX-XXXX-${rInt(1000, 9999)}`; }

async function main() {
  console.log('🌱 Seeding...');

  await db.newPlot.deleteMany();
  await db.familyMember.deleteMany();
  await db.family.deleteMany();
  await db.village.deleteMany();
  await db.mandal.deleteMany();
  await db.user.deleteMany();

  // Admin
  const bcrypt = await import('bcryptjs');
  await db.user.create({ data: { email: 'admin@polavaram.ap.gov.in', password: await bcrypt.hash('admin123', 10), name: 'District Admin', role: 'ADMIN' } });

  // Mandals
  const mIds: Record<string, string> = {};
  for (const m of MANDALS) {
    const r = await db.mandal.create({ data: m });
    mIds[m.code] = r.id;
  }

  // Villages
  const vIds: Record<string, string> = {};
  for (const [mc, vs] of Object.entries(VILLAGES)) {
    for (const v of vs) {
      const r = await db.village.create({ data: { ...v, mandalId: mIds[mc], totalFamilies: 50 } });
      vIds[`${mc}-${v.code}`] = r.id;
    }
  }

  // Families + Members + Plots
  const FPP = 50; // families per village
  let fi = 0;
  for (const [mc, vs] of Object.entries(VILLAGES)) {
    const md = MANDALS.find(m => m.code === mc)!;
    for (const v of vs) {
      const vid = vIds[`${mc}-${v.code}`];
      const fData: any[] = [];
      for (let i = 0; i < FPP; i++) {
        const ni = fi % HEAD_NAMES.length;
        const sesArr = ['SURVEYED', 'SURVEYED', 'SURVEYED', 'VERIFIED', 'VERIFIED', 'VERIFIED', 'APPROVED', 'APPROVED', 'REJECTED'];
        fData.push({
          pdfNumber: `PDF-${mc}-${v.code}-${String(i + 1).padStart(4, '0')}`,
          headName: HEAD_NAMES[ni][0],
          headNameTelugu: HEAD_NAMES[ni][1],
          villageId: vid,
          caste: CASTES[fi % 8],
          landAcres: rFlt(0.5, 8),
          houseType: HOUSE_TYPES[fi % 3],
          sesStatus: sesArr[fi % 9],
          firstSchemeEligible: fi % 3 === 0,
        });
        fi++;
      }
      await db.family.createMany({ data: fData });

      const fams = await db.family.findMany({ where: { villageId: vid }, select: { id: true, sesStatus: true, firstSchemeEligible: true }, orderBy: { pdfNumber: 'asc' } });

      const mData: any[] = [];
      const pData: any[] = [];
      let mi = 0;

      for (const f of fams) {
        const ni = mi % HEAD_NAMES.length;
        const si = mi % SPOUSE_NAMES.length;
        const ha = rInt(35, 65);
        const mc2 = rInt(3, 6);

        mData.push({ familyId: f.id, name: HEAD_NAMES[ni][0], nameTelugu: HEAD_NAMES[ni][1], relation: 'Head', age: ha, gender: 'Male', aadhar: aadhar(), occupation: pick(OCCUPATIONS_MALE), isMinor: false });
        mData.push({ familyId: f.id, name: SPOUSE_NAMES[si][0], nameTelugu: SPOUSE_NAMES[si][1], relation: 'Spouse', age: rInt(Math.max(30, ha - 8), Math.min(55, ha + 2)), gender: 'Female', aadhar: aadhar(), occupation: 'Homemaker', isMinor: false });

        for (let c = 0; c < mc2 - 2; c++) {
          const male = sRand() < 0.55;
          const ca = rInt(5, 30);
          const names = male ? SON_NAMES : DAUGHTER_NAMES;
          const cn = names[c % names.length];
          mData.push({ familyId: f.id, name: cn[0], nameTelugu: cn[1], relation: male ? 'Son' : 'Daughter', age: ca, gender: male ? 'Male' : 'Female', aadhar: ca >= 18 ? aadhar() : null, occupation: ca < 18 ? 'Student' : (male ? pick(OCCUPATIONS_MALE) : 'Homemaker'), isMinor: ca < 18 });
        }

        if (f.sesStatus === 'APPROVED' && mi % 3 !== 2) {
          const as = ['PENDING', 'ALLOTTED', 'POSSESSION_GIVEN'][mi % 3];
          const hc = as !== 'PENDING' || mi % 5 === 0;
          pData.push({
            familyId: f.id, plotNumber: `RRC-${mc}-${rInt(1, 500)}`, colonyName: COLONY_NAMES[mi % 5],
            latitude: hc ? md.latitude + rFlt(-0.02, 0.02) : null,
            longitude: hc ? md.longitude + rFlt(-0.02, 0.02) : null,
            areaSqYards: rFlt(150, 500), allotmentStatus: as,
            allotmentDate: as !== 'PENDING' ? new Date(2024, rInt(0, 11), rInt(1, 28)) : null,
          });
        }
        mi++;
      }

      await db.familyMember.createMany({ data: mData });
      if (pData.length > 0) await db.newPlot.createMany({ data: pData });
    }
  }

  const counts = await Promise.all([db.family.count(), db.familyMember.count(), db.newPlot.count(), db.village.count(), db.mandal.count()]);
  console.log(`✅ ${counts[4]} Mandals, ${counts[3]} Villages, ${counts[0]} Families, ${counts[1]} Members, ${counts[2]} Plots`);
  console.log('🎉 Done!');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
