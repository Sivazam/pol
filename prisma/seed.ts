import { PrismaClient } from '@prisma/client';

const db = new PrismaClient({ log: ['error'] });

// ═══════════════════════════════════════════════════════════════════════
// REAL DATA — Polavaram Project Rehabilitation Portal
// Mandals: VR Puram, Chintoor, Kunavaram
// Grand Total: 13,961 families | First Scheme Eligible: 9,663
// ═══════════════════════════════════════════════════════════════════════

const MANDALS = [
  { name: 'VR Puram', nameTelugu: 'వి.ఆర్.పురం', code: 'VRP', latitude: 17.230, longitude: 81.460, color: '#D97706' },
  { name: 'Chintoor', nameTelugu: 'చింతూరు', code: 'CHN', latitude: 17.185, longitude: 81.390, color: '#0D9488' },
  { name: 'Kunavaram', nameTelugu: 'కునవరం', code: 'KUN', latitude: 17.110, longitude: 81.320, color: '#EA580C' },
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
    { name: 'Sabariraigudem', nameTelugu: 'సబరిరాయిగూడెం', code: 'SAB', latitude: 17.245, longitude: 81.445, familyCount: 165 },
    { name: 'DT Gudem', nameTelugu: 'డి.టి గూడెం', code: 'DTG', latitude: 17.215, longitude: 81.475, familyCount: 260 },
    { name: 'Koppali', nameTelugu: 'కొప్పలి', code: 'KOP', latitude: 17.250, longitude: 81.470, familyCount: 93 },
    { name: 'Somulagudem', nameTelugu: 'సోములగూడెం', code: 'SOM', latitude: 17.220, longitude: 81.445, familyCount: 177 },
    { name: 'Kannaigudem', nameTelugu: 'కన్నాయిగూడెం', code: 'KAN', latitude: 17.235, longitude: 81.485, familyCount: 84 },
    { name: 'Rajupeta', nameTelugu: 'రాజుపేట', code: 'RJP', latitude: 17.210, longitude: 81.450, familyCount: 22 },
    { name: 'Gundugudem', nameTelugu: 'గుండుగూడెం', code: 'GUN', latitude: 17.240, longitude: 81.490, familyCount: 218 },
    { name: 'Prathipaka', nameTelugu: 'ప్రతిపాక', code: 'PRA', latitude: 17.225, longitude: 81.435, familyCount: 190 },
    { name: 'Ramavaram', nameTelugu: 'రామవరం', code: 'RAM', latitude: 17.250, longitude: 81.455, familyCount: 170 },
    { name: 'Ramavarapadu', nameTelugu: 'రామవరపాడు', code: 'RAP', latitude: 17.205, longitude: 81.465, familyCount: 261 },
    { name: 'AV Gudem', nameTelugu: 'ఎ.వి గూడెం', code: 'AVG', latitude: 17.245, longitude: 81.480, familyCount: 256 },
    { name: 'Waddigudem', nameTelugu: 'వడ్డిగూడెం', code: 'WAD', latitude: 17.215, longitude: 81.430, familyCount: 766 },
    { name: 'Choppali', nameTelugu: 'చొప్పలి', code: 'CHO', latitude: 17.230, longitude: 81.500, familyCount: 270 },
    { name: 'Rajupeta Colony', nameTelugu: 'రాజుపేట కాలనీ', code: 'RJC', latitude: 17.220, longitude: 81.455, familyCount: 713 },
    { name: 'Chintharegupalli', nameTelugu: 'చింతరేగుపల్లి', code: 'CRP', latitude: 17.240, longitude: 81.440, familyCount: 436 },
    { name: 'VR Puram', nameTelugu: 'వి.ఆర్.పురం', code: 'VPR', latitude: 17.230, longitude: 81.460, familyCount: 1705 },
  ],
  CHN: [
    { name: 'Ulumuru', nameTelugu: 'ఉలుమూరు', code: 'ULU', latitude: 17.195, longitude: 81.380, familyCount: 314 },
    { name: 'Chuturu', nameTelugu: 'చూతూరు', code: 'CHU', latitude: 17.175, longitude: 81.400, familyCount: 434 },
    { name: 'AG Koderu', nameTelugu: 'ఎ.జి కోడేరు', code: 'AGK', latitude: 17.190, longitude: 81.405, familyCount: 694 },
    { name: 'Mallithota', nameTelugu: 'మల్లితోట', code: 'MAL', latitude: 17.170, longitude: 81.385, familyCount: 453 },
    { name: 'Chintoor', nameTelugu: 'చింతూరు', code: 'CHT', latitude: 17.185, longitude: 81.390, familyCount: 1811 },
  ],
  KUN: [
    { name: 'Wolforedpeta', nameTelugu: 'వోల్ఫోరెడ్‌పేట', code: 'WOL', latitude: 17.120, longitude: 81.310, familyCount: 62 },
    { name: 'Kudalipadu', nameTelugu: 'కుడలిపాడు', code: 'KUD', latitude: 17.100, longitude: 81.335, familyCount: 226 },
    { name: 'Kondrajupeta', nameTelugu: 'కొండ్రాజుపేట', code: 'KRJ', latitude: 17.125, longitude: 81.325, familyCount: 279 },
    { name: 'Pandrajupalli', nameTelugu: 'పండ్రాజుపల్లి', code: 'PDP', latitude: 17.095, longitude: 81.310, familyCount: 342 },
    { name: 'Tekubaka', nameTelugu: 'టేకుబాక', code: 'TEK', latitude: 17.115, longitude: 81.340, familyCount: 238 },
    { name: 'Tekulaboru', nameTelugu: 'టేకులబోరు', code: 'TKB', latitude: 17.105, longitude: 81.305, familyCount: 1001 },
    { name: 'Peddarkuru', nameTelugu: 'పెద్దర్కూరు', code: 'PDK', latitude: 17.130, longitude: 81.315, familyCount: 505 },
    { name: 'S.Kothagudem', nameTelugu: 'ఎస్.కొత్తగూడెం', code: 'SKG', latitude: 17.100, longitude: 81.325, familyCount: 454 },
    { name: 'Kunavaram', nameTelugu: 'కునవరం', code: 'KNV', latitude: 17.110, longitude: 81.320, familyCount: 1362 },
  ],
};

// ═══════════════════════════════════════════════════════════════════════
// TELUGU NAMES — Comprehensive lists for realistic data
// ═══════════════════════════════════════════════════════════════════════

const HEAD_NAMES: [string, string][] = [
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
  ['Pardha Saradhi', 'పార్థసారధి'], ['Seshaiah', 'శేషయ్య'], ['Brahmaiah', 'బ్రహ్మయ్య'],
  ['Giridhar', 'గిరిధర్'], ['Ramanadham', 'రమణాధం'], ['Venkata Ramana', 'వెంకటరమణ'],
  ['Raghuram', 'రఘురామ్'], ['Bhaskar', 'భాస్కర్'], ['Nagendra', 'నాగేంద్ర'],
  ['Ranganath', 'రంగనాథ్'], ['Seshagiri', 'శేషగిరి'], ['Venugopal', 'వేణుగోపాల్'],
  ['Ramakrishna', 'రామకృష్ణ'], ['Bhimaraju', 'భీమరాజు'], ['Somaraju', 'సోమరాజు'],
  ['Gangaraju', 'గంగారాజు'], ['Kishtaiah', 'కిష్టయ్య'], ['Pochaiah', 'పోచయ్య'],
  ['Thathaiah', 'తాతయ్య'], ['Lingaiah', 'లింగయ్య'], ['Balaiah', 'బాలయ్య'],
  ['Kondaiah', 'కొండయ్య'], ['Polaiah', 'పోలయ్య'], ['Erraiah', 'ఎఱ్ఱయ్య'],
  ['Doraiah', 'దొరయ్య'], ['Chinaiah', 'చినయ్య'], ['Muthaiah', 'ముత్తయ్య'],
  ['Naganna', 'నాగన్న'], ['Gurranna', 'గుఱ్ఱన్న'], ['Somanna', 'సోమన్న'],
  ['Linganna', 'లింగన్న'], ['Peddanna', 'పెద్దన్న'], ['Chinna', 'చిన్న'],
  ['Bheemudu', 'భీముడు'], ['Ramudu', 'రాముడు'], ['Somulu', 'సోములు'],
  ['Narsimhulu', 'నరసింహులు'], ['Yellaiah', 'యెల్లయ్య'], ['Kamaiah', 'కామయ్య'],
  ['Durgaiah', 'దుర్గయ్య'], ['Kattaiah', 'కట్టయ్య'], ['Pentaiah', 'పెంటయ్య'],
  ['Maraiah', 'మారయ్య'], ['Ramaswamy', 'రామస్వామి'], ['Krishnamurthy', 'కృష్ణమూర్తి'],
  ['Venkataramana', 'వెంకటారమణ'], ['Lakshminarayana', 'లక్ష్మీనారాయణ'], ['Seetharamaiah', 'సీతారామయ్య'],
  ['Veerabhadra Rao', 'వీరభద్రరావు'], ['Ramanadha Rao', 'రమణాధరావు'], ['Venkatesh', 'వెంకటేష్'],
  ['Gangadhar', 'గంగాధర్'], ['Ram Babu', 'రామ్ బాబు'], ['Satyam', 'సత్యం'],
  ['Naga Raju', 'నాగరాజు'], ['Sambaiah', 'సాంబయ్య'], ['Pitchaiah', 'పిచ్చయ్య'],
  ['Kannaiah', 'కన్నయ్య'], ['Appa Rao', 'అప్పారావు'], ['Gopi', 'గోపి'],
  ['Kiran', 'కిరణ్'], ['Madhu', 'మధు'], ['Sudhakar', 'సుధాకర్'],
  ['Sreenu', 'శ్రీను'], ['Babu', 'బాబు'], ['Yadagiri', 'యాదగిరి'],
  ['Mallesham', 'మల్లేశం'], ['Kistappa', 'కిస్తప్ప'], ['Yellamanda', 'యెల్లమంద'],
  ['Bheema', 'భీమ'], ['Poshetti', 'పోషెట్టి'], ['Dharma', 'ధర్మ'],
  ['Narsimha', 'నరసింహ'], ['Venkanna', 'వెంకన్న'], ['Ranganna', 'రంగన్న'],
  ['Koteshwarlu', 'కోటేశ్వర్లు'], ['Pothuraju', 'పోతురాజు'], ['Sathibabu', 'సత్తిబాబు'],
  ['Muthyalu', 'ముత్యాలు'], ['Bikshapathi', 'బిక్షపతి'], ['Rambabu', 'రాంబాబు'],
  ['Sattaiah', 'సట్టయ్య'], ['Laxmana Rao', 'లక్ష్మణరావు'], ['Bayyappa', 'బయ్యప్ప'],
  ['Yadaiah', 'యాదయ్య'], ['Pullaiah', 'పుల్లయ్య'], ['Nookaiah', 'నూకయ్య'],
  ['Bodaiah', 'బొడయ్య'], ['Dubbakaiah', 'దుబ్బకయ్య'], ['Mothaiah', 'మొతయ్య'],
];

const SPOUSE_NAMES: [string, string][] = [
  ['Lakshmi', 'లక్ష్మి'], ['Saraswati', 'సరస్వతి'], ['Parvathi', 'పార్వతి'],
  ['Seetha', 'సీత'], ['Annapurna', 'అన్నపూర్ణ'], ['Durga', 'దుర్గ'],
  ['Rajeshwari', 'రాజేశ్వరి'], ['Lalitha', 'లలిత'], ['Savithri', 'సావిత్రి'],
  ['Padmavathi', 'పద్మావతి'], ['Nagamani', 'నాగమణి'], ['Satyavathi', 'సత్యవతి'],
  ['Adilakshmi', 'ఆదిలక్ష్మి'], ['Ramulamma', 'రాములమ్మ'], ['Sarojini', 'సరోజిని'],
  ['Bujjamma', 'బుజ్జమ్మ'], ['Mangamma', 'మాంగమ్మ'], ['Lachamma', 'లచ్చమ్మ'],
  ['Yellamma', 'యెల్లమ్మ'], ['Polamma', 'పోలమ్మ'], ['Narsamma', 'నరసమ్మ'],
  ['Durgamma', 'దుర్గమ్మ'], ['Peddamma', 'పెద్దమ్మ'], ['Chinamma', 'చిన్నమ్మ'],
  ['Rangamma', 'రంగమ్మ'], ['Somamma', 'సోమమ్మ'], ['Kondamma', 'కొండమ్మ'],
  ['Buddamma', 'బుద్దమ్మ'], ['Poshamma', 'పోషమ్మ'], ['Swarna', 'స్వర్ణ'],
  ['Padma', 'పద్మ'], ['Shanti', 'శాంతి'], ['Uma', 'ఉమ'],
  ['Kavitha', 'కవిత'], ['Jyothi', 'జ్యోతి'], ['Sujatha', 'సుజాత'],
  ['Usha', 'ఉష'], ['Prameela', 'ప్రమీల'], ['Chandramma', 'చంద్రమ్మ'],
  ['Kantamma', 'కాంతమ్మ'], ['Papamma', 'పాపమ్మ'], ['Laxmamma', 'లక్ష్మమ్మ'],
  ['Bhanumathi', 'భానుమతి'], ['Krishnaveni', 'కృష్ణవేణి'], ['Ramanamma', 'రామానమ్మ'],
  ['Venkamma', 'వెంకమ్మ'], ['Gouramma', 'గౌరమ్మ'], ['Kameshwari', 'కామేశ్వరి'],
  ['Jayamma', 'జయమ్మ'], ['Eeramma', 'ఈరమ్మ'], ['Gangamma', 'గంగమ్మ'],
];

const SON_NAMES: [string, string][] = [
  ['Arun', 'అరుణ్'], ['Kiran', 'కిరణ్'], ['Sudheer', 'సుధీర్'], ['Madhu', 'మధు'],
  ['Prakash', 'ప్రకాష్'], ['Ajay', 'అజయ్'], ['Sanjay', 'సంజయ్'], ['Srinu', 'శ్రీను'],
  ['Naveen', 'నవీన్'], ['Harish', 'హరీష్'], ['Naresh', 'నరేష్'], ['Suresh', 'సురేష్'],
  ['Ramesh', 'రమేష్'], ['Mahesh', 'మహేష్'], ['Rajesh', 'రాజేష్'], ['Santosh', 'సంతోష్'],
  ['Vijay', 'విజయ్'], ['Siva', 'శివ'], ['Ganesh', 'గణేష్'], ['Anand', 'ఆనంద్'],
  ['Sagar', 'సాగర్'], ['Ravi Teja', 'రవి తేజ'], ['Pavan', 'పవన్'], ['Balaji', 'బాలాజీ'],
  ['Venkat', 'వెంకట్'], ['Raghav', 'రాఘవ్'], ['Shyam', 'శ్యామ్'], ['Mukesh', 'ముకేష్'],
  ['Rakesh', 'రాకేష్'], ['Sridhar', 'శ్రీధర్'], ['Nagendra', 'నాగేంద్ర'], ['Srinivas', 'శ్రీనివాస్'],
  ['Rambabu', 'రాంబాబు'], ['Sathish', 'సతీష్'], ['Raju', 'రాజు'], ['Prabhakar', 'ప్రభాకర్'],
  ['Samba', 'సాంబ'], ['Raghu', 'రఘు'], ['Giri', 'గిరి'], ['Malli', 'మల్లి'],
  ['Konda', 'కొండ'], ['Soma', 'సోమ'], ['Bheemu', 'భీము'], ['Lachhu', 'లచ్చు'],
];

const DAUGHTER_NAMES: [string, string][] = [
  ['Deepthi', 'దీప్తి'], ['Priya', 'ప్రియ'], ['Swathi', 'స్వాతి'], ['Latha', 'లత'],
  ['Shailaja', 'శైలజ'], ['Manju', 'మంజు'], ['Geetha', 'గీత'], ['Sujatha', 'సుజాత'],
  ['Padma', 'పద్మ'], ['Lavanya', 'లావణ్య'], ['Kavitha', 'కవిత'], ['Jyothi', 'జ్యోతి'],
  ['Usha', 'ఉష'], ['Sridevi', 'శ్రీదేవి'], ['Bhavani', 'భవాని'], ['Durga', 'దుర్గ'],
  ['Aruna', 'అరుణ'], ['Sunitha', 'సునీత'], ['Prasanna', 'ప్రసన్న'], ['Kumari', 'కుమారి'],
  ['Vanitha', 'వనిత'], ['Nagamani', 'నాగమణి'], ['Saritha', 'సరిత'], ['Rani', 'రాణి'],
  ['Lakshmi', 'లక్ష్మి'], ['Bhanu', 'భాను'], ['Manga', 'మాంగ'], ['Eshwari', 'ఈశ్వరి'],
  ['Parvathi', 'పార్వతి'], ['Anasuya', 'అనసూయ'], ['Anitha', 'అనిత'], ['Rajani', 'రాజని'],
  ['Yasodha', 'యశోద'], ['Sampoornamma', 'సంపూర్ణమ్మ'], ['Nirmala', 'నిర్మల'], ['Vijaya', 'విజయ'],
  ['Kamala', 'కమల'], ['Seshamma', 'శేషమ్మ'], ['Lachhimma', 'లచ్చిమ్మ'], ['Gangamma', 'గంగమ్మ'],
];

// ═══════════════════════════════════════════════════════════════════════
// CATEGORIES AND CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const CASTES = ['OC', 'BC-A', 'BC-B', 'BC-C', 'BC-D', 'SC', 'ST'];
const CASTE_WEIGHTS = [15, 12, 8, 5, 10, 15, 35]; // Tribal area: ST dominant

const HOUSE_TYPES = ['Kutcha', 'Semi-Pucca', 'Pucca'];
const HOUSE_WEIGHTS = [40, 35, 25]; // Rural tribal area: Kutcha common

const OCCUPATIONS_MALE = ['Farmer', 'Agricultural Laborer', 'Daily Wage Worker', 'Small Business', 'Teacher', 'Driver', 'Carpenter', 'Mason'];
const OCCUPATIONS_FEMALE = ['Homemaker', 'Agricultural Laborer', 'Daily Wage Worker', 'Beedi Roller', 'Small Business', 'Anganwadi Worker'];

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
function aadhar(): string {
  return `XXXX-XXXX-${rInt(1000, 9999)}`;
}

// SES status: 30% SURVEYED, 35% VERIFIED, 25% APPROVED, 10% REJECTED
function getSesStatus(globalIndex: number): string {
  const mod = globalIndex % 100;
  if (mod < 30) return 'SURVEYED';
  if (mod < 65) return 'VERIFIED';
  if (mod < 90) return 'APPROVED';
  return 'REJECTED';
}

// First Scheme Eligible: exactly 9,663 out of 13,961 (~69.2%)
// Distributed proportionally across all mandals (Bresenham-like approach)
// This ensures each mandal gets a fair share, not just the first ones
const TOTAL_FAMILIES_TARGET = 13961;
const FIRST_SCHEME_TARGET = 9663;
function isFirstSchemeEligible(globalIndex: number): boolean {
  return Math.floor(((globalIndex + 1) * FIRST_SCHEME_TARGET) / TOTAL_FAMILIES_TARGET) >
         Math.floor((globalIndex * FIRST_SCHEME_TARGET) / TOTAL_FAMILIES_TARGET);
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN SEED FUNCTION
// ═══════════════════════════════════════════════════════════════════════

async function main() {
  console.log('🌱 Seeding Polavaram Project Rehabilitation Portal...');
  console.log('   Target: 13,961 families across 3 mandals, 30 villages');
  console.log('   First Scheme Eligible: 9,663');
  console.log('');

  // ── Clean Slate ──
  console.log('🧹 Cleaning existing data...');
  await db.newPlot.deleteMany();
  await db.familyMember.deleteMany();
  await db.family.deleteMany();
  await db.village.deleteMany();
  await db.mandal.deleteMany();
  await db.user.deleteMany();
  console.log('   ✓ All tables cleared');

  // ── Admin User ──
  const bcrypt = await import('bcryptjs');
  await db.user.create({
    data: {
      email: 'admin@polavaram.ap.gov.in',
      password: await bcrypt.hash('admin123', 10),
      name: 'District Admin',
      role: 'ADMIN',
    },
  });
  console.log('   ✓ Admin user created');

  // ── Mandals ──
  const mIds: Record<string, string> = {};
  for (const m of MANDALS) {
    const r = await db.mandal.create({ data: m });
    mIds[m.code] = r.id;
  }
  console.log(`   ✓ ${MANDALS.length} Mandals created`);

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

  // ── Families, Members, and Plots ──
  console.log('\n📋 Creating families, members, and plots...');

  let globalFamilyIndex = 0;
  let totalFamilies = 0;
  let totalMembers = 0;
  let totalPlots = 0;

  for (const [mc, vs] of Object.entries(VILLAGES)) {
    const mandal = MANDALS.find(m => m.code === mc)!;
    console.log(`\n  📌 ${mandal.name} Mandal:`);

    for (const v of vs) {
      const vid = vIds[`${mc}-${v.code}`];
      const fc = v.familyCount;

      // ── Create Families ──
      const fData: Array<{
        pdfNumber: string;
        headName: string;
        headNameTelugu: string;
        villageId: string;
        caste: string;
        landAcres: number;
        houseType: string;
        sesStatus: string;
        firstSchemeEligible: boolean;
      }> = [];

      for (let i = 0; i < fc; i++) {
        const ni = globalFamilyIndex % HEAD_NAMES.length;
        const sesStatus = getSesStatus(globalFamilyIndex);
        const firstSchemeEligible = isFirstSchemeEligible(globalFamilyIndex);

        fData.push({
          pdfNumber: `PDF-${mc}-${v.code}-${String(i + 1).padStart(4, '0')}`,
          headName: HEAD_NAMES[ni][0],
          headNameTelugu: HEAD_NAMES[ni][1],
          villageId: vid,
          caste: weightedPick(CASTES, CASTE_WEIGHTS),
          landAcres: rFlt(0.5, 15),
          houseType: weightedPick(HOUSE_TYPES, HOUSE_WEIGHTS),
          sesStatus,
          firstSchemeEligible,
        });
        globalFamilyIndex++;
      }

      await db.family.createMany({ data: fData });

      // ── Query Families Back ──
      const fams = await db.family.findMany({
        where: { villageId: vid },
        select: { id: true, sesStatus: true, firstSchemeEligible: true },
        orderBy: { pdfNumber: 'asc' },
      });

      // ── Create Members & Plots ──
      const mData: Array<{
        familyId: string;
        name: string;
        nameTelugu: string;
        relation: string;
        age: number;
        gender: string;
        aadhar: string | null;
        occupation: string;
        isMinor: boolean;
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
        const hi = localIdx % HEAD_NAMES.length;
        const si = localIdx % SPOUSE_NAMES.length;
        const headAge = rInt(30, 65);

        // Head of Family
        mData.push({
          familyId: f.id,
          name: HEAD_NAMES[hi][0],
          nameTelugu: HEAD_NAMES[hi][1],
          relation: 'Head',
          age: headAge,
          gender: 'Male',
          aadhar: aadhar(),
          occupation: pick(OCCUPATIONS_MALE),
          isMinor: false,
        });

        // Spouse (80% of families)
        if (sRand() < 0.80) {
          const spouseAge = rInt(Math.max(25, headAge - 8), Math.min(60, headAge + 2));
          mData.push({
            familyId: f.id,
            name: SPOUSE_NAMES[si][0],
            nameTelugu: SPOUSE_NAMES[si][1],
            relation: 'Spouse',
            age: spouseAge,
            gender: 'Female',
            aadhar: aadhar(),
            occupation: 'Homemaker',
            isMinor: false,
          });
        }

        // First Child (50% of families)
        if (sRand() < 0.50) {
          const male = sRand() < 0.55;
          const childAge = rInt(5, 30);
          const names = male ? SON_NAMES : DAUGHTER_NAMES;
          const cn = names[localIdx % names.length];
          mData.push({
            familyId: f.id,
            name: cn[0],
            nameTelugu: cn[1],
            relation: male ? 'Son' : 'Daughter',
            age: childAge,
            gender: male ? 'Male' : 'Female',
            aadhar: childAge >= 18 ? aadhar() : null,
            occupation: childAge < 18 ? 'Student' : (male ? pick(OCCUPATIONS_MALE) : pick(OCCUPATIONS_FEMALE)),
            isMinor: childAge < 18,
          });
        }

        // Second Child (30% of families)
        if (sRand() < 0.30) {
          const male = sRand() < 0.55;
          const childAge = rInt(3, 25);
          const names = male ? SON_NAMES : DAUGHTER_NAMES;
          const cn = names[(localIdx + 1) % names.length];
          mData.push({
            familyId: f.id,
            name: cn[0],
            nameTelugu: cn[1],
            relation: male ? 'Son' : 'Daughter',
            age: childAge,
            gender: male ? 'Male' : 'Female',
            aadhar: childAge >= 18 ? aadhar() : null,
            occupation: childAge < 18 ? 'Student' : (male ? pick(OCCUPATIONS_MALE) : pick(OCCUPATIONS_FEMALE)),
            isMinor: childAge < 18,
          });
        }

        // ── Create Plot for APPROVED/VERIFIED families ──
        if (f.sesStatus === 'APPROVED' && sRand() < 0.90) {
          // APPROVED families: 90% get plots
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
        } else if (f.sesStatus === 'VERIFIED' && sRand() < 0.30) {
          // VERIFIED families: 30% have plots in pipeline
          pData.push({
            familyId: f.id,
            plotNumber: `RRC-${mc}-${rInt(1, 999)}`,
            colonyName: pick(COLONY_NAMES),
            latitude: null,
            longitude: null,
            areaSqYards: rFlt(150, 500),
            allotmentStatus: 'PENDING',
            allotmentDate: null,
          });
        }

        localIdx++;
      }

      // Batch insert members
      if (mData.length > 0) {
        await db.familyMember.createMany({ data: mData });
        totalMembers += mData.length;
      }

      // Batch insert plots
      if (pData.length > 0) {
        await db.newPlot.createMany({ data: pData });
        totalPlots += pData.length;
      }

      totalFamilies += fc;
      console.log(`    ✓ ${v.name}: ${fc} families, ${mData.length} members, ${pData.length} plots`);
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
    db.newPlot.count(),
  ]);

  console.log(`  Mandals:           ${dbCounts[0]} (expected: 3)`);
  console.log(`  Villages:         ${dbCounts[1]} (expected: 30)`);
  console.log(`  Families:      ${dbCounts[2]} (expected: 13,961)`);
  console.log(`  Members:      ${dbCounts[3]}`);
  console.log(`  Plots:          ${dbCounts[4]}`);

  // Verify eligible count
  const eligibleCount = await db.family.count({ where: { firstSchemeEligible: true } });
  console.log(`  First Scheme:   ${eligibleCount} (expected: ~9,663)`);

  // Verify SES distribution
  const sesCounts = await Promise.all([
    db.family.count({ where: { sesStatus: 'SURVEYED' } }),
    db.family.count({ where: { sesStatus: 'VERIFIED' } }),
    db.family.count({ where: { sesStatus: 'APPROVED' } }),
    db.family.count({ where: { sesStatus: 'REJECTED' } }),
  ]);
  console.log(`  SES: SURVEYED=${sesCounts[0]} VERIFIED=${sesCounts[1]} APPROVED=${sesCounts[2]} REJECTED=${sesCounts[3]}`);

  // Verify per-mandal totals
  for (const m of MANDALS) {
    const mandalVillages = VILLAGES[m.code];
    const expectedFamilies = mandalVillages.reduce((s, v) => s + v.familyCount, 0);
    const villageIds = mandalVillages.map(v => vIds[`${m.code}-${v.code}`]);
    const actualFamilies = await db.family.count({ where: { villageId: { in: villageIds } } });
    console.log(`  ${m.name}: ${actualFamilies} families (expected: ${expectedFamilies})`);
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
