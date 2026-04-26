/**
 * PII serialization helpers — decrypt + mask + role-filter in one pass.
 *
 * Every API response that touches Family/FamilyMember MUST go through these
 * so we never accidentally leak ciphertext or full PII to the wrong audience.
 */

import { decryptPII } from './crypto';
import { canSeeFullPII, canSeeMaskedPII, type SessionContext } from './roles';

/* ──────────────────────────────────────────────────────────────────
 * Masking helpers (apply to PLAINTEXT after decryption)
 * ────────────────────────────────────────────────────────────────── */

export function maskAadhar(value: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  if (digits.length < 4) return 'XXXX-XXXX-XXXX';
  const last4 = digits.slice(-4);
  return `XXXX-XXXX-${last4}`;
}

export function maskAccount(value: string | null): string | null {
  if (!value) return null;
  if (value.length <= 4) return '****';
  return `****${value.slice(-4)}`;
}

export function maskVoter(value: string | null): string | null {
  if (!value) return null;
  if (value.length <= 3) return '***';
  return `***${value.slice(-3)}`;
}

export function maskRation(value: string | null): string | null {
  if (!value) return null;
  if (value.length <= 4) return '****';
  return `****${value.slice(-4)}`;
}

export function maskIfsc(value: string | null): string | null {
  if (!value) return null;
  // IFSC is not strictly secret but pair with account makes it actionable; mask middle.
  if (value.length < 8) return value;
  return `${value.slice(0, 4)}****${value.slice(-2)}`;
}

export function maskDoor(value: string | null): string | null {
  if (!value) return null;
  // Door numbers can identify exact residence; show partial only.
  return value.length > 3 ? `${value.slice(0, 2)}***` : '***';
}

export function maskDob(value: string | null): string | null {
  if (!value) return null;
  // Keep year only.
  const year = value.match(/\b(19|20)\d{2}\b/)?.[0];
  return year ? `**/**/${year}` : '**/**/****';
}

/* ──────────────────────────────────────────────────────────────────
 * Decrypt-or-passthrough — handles legacy plaintext rows transparently.
 * ────────────────────────────────────────────────────────────────── */

function safeDecrypt(blob: string | null | undefined): string | null {
  if (blob === null || blob === undefined || blob === '') return null;
  try {
    return decryptPII(blob);
  } catch (err) {
    // Tampered or wrong key — log server-side, return null to caller (never leak ciphertext).
    console.error('[pii] decrypt failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

/* ──────────────────────────────────────────────────────────────────
 * Family serializer
 * Accepts a Prisma Family row (with optional village/members/firstScheme/plotAllotment includes)
 * and returns a JSON-safe object with PII fields decrypted+masked-or-stripped per role.
 * ────────────────────────────────────────────────────────────────── */

interface FamilyRow {
  id: string;
  pdfId: string;
  hhsid: string | null;
  beneficiaryName: string;
  fathersName: string | null;
  husbandName: string | null;
  gender: string;
  villageId: string;
  village?: {
    id: string;
    name: string;
    nameTelugu: string | null;
    code: string;
    mandal?: {
      id: string;
      name: string;
      nameTelugu: string | null;
      code: string;
      color: string;
    } | null;
  } | null;
  sesNo: number | null;
  caste: string | null;
  subCaste: string | null;
  houseType: string | null;
  rrEligibility: string;
  aliveOrDied: string;
  maritalStatus: string | null;
  farmerCategory: string | null;
  bplApl: string | null;
  occupation: string | null;
  periodOfResidence: number | null;
  photoUploaded: boolean;
  residencePhoto: boolean;
  housingProvision: string | null;
  landForLand: string | null;
  landSurveyNo: string | null;
  landExtent: string | null;
  offerDevelopedLand: string | null;
  bankName: string | null;
  bankBranch: string | null;
  bankAccountActive: string | null;
  // Encrypted columns (any may be legacy plaintext during transition):
  doorNoEnc?: string | null;
  annualIncomeEnc?: string | null;
  rationCardNoEnc?: string | null;
  bankIfscEnc?: string | null;
  bankAccountNoEnc?: string | null;
  aadharNoEnc?: string | null;
  voterIdNoEnc?: string | null;
  members?: MemberRow[];
  firstScheme?: unknown;
  plotAllotment?: unknown;
  createdAt?: Date | string;
}

interface MemberRow {
  id: string;
  familyId: string;
  beneficiaryName: string;
  fathersName: string | null;
  husbandName: string | null;
  wifeBirthSurname: string | null;
  relation: string;
  gender: string;
  age: number;
  agePnLaAct: number | null;
  aliveOrDied: string;
  maritalStatus: string | null;
  caste: string | null;
  subCaste: string | null;
  schoolRecords: string | null;
  occupation: string | null;
  isPhysicallyHandicapped: string | null;
  isWidow: string | null;
  isDivorced: string | null;
  bankName: string | null;
  bankBranch: string | null;
  bankAccountActive: string | null;
  aadharNoEnc?: string | null;
  voterIdNoEnc?: string | null;
  bankAccountNoEnc?: string | null;
  bankIfscEnc?: string | null;
  dobSscTcEnc?: string | null;
}

export function serializeFamily(
  family: FamilyRow,
  ctx: SessionContext,
): Record<string, unknown> {
  const targetMandalId = family.village?.mandal?.id ?? null;
  const full = canSeeFullPII(ctx, targetMandalId);
  const anyPII = canSeeMaskedPII(ctx);

  const dec = {
    aadhar: safeDecrypt(family.aadharNoEnc),
    voter: safeDecrypt(family.voterIdNoEnc),
    account: safeDecrypt(family.bankAccountNoEnc),
    ifsc: safeDecrypt(family.bankIfscEnc),
    ration: safeDecrypt(family.rationCardNoEnc),
    income: safeDecrypt(family.annualIncomeEnc),
    door: safeDecrypt(family.doorNoEnc),
  };

  const piiBlock = anyPII
    ? {
        aadharNo: full ? dec.aadhar : maskAadhar(dec.aadhar),
        voterIdNo: full ? dec.voter : maskVoter(dec.voter),
        bankAccountNo: full ? dec.account : maskAccount(dec.account),
        bankIfsc: full ? dec.ifsc : maskIfsc(dec.ifsc),
        rationCardNo: full ? dec.ration : maskRation(dec.ration),
        annualIncome: full ? (dec.income ? Number(dec.income) : null) : null,
        doorNo: full ? dec.door : maskDoor(dec.door),
        _piiAccess: full ? 'full' : 'masked',
      }
    : { _piiAccess: 'none' as const };

  return {
    id: family.id,
    pdfId: family.pdfId,
    hhsid: family.hhsid,
    beneficiaryName: family.beneficiaryName,
    fathersName: family.fathersName,
    husbandName: family.husbandName,
    gender: family.gender,
    villageId: family.villageId,
    village: family.village,
    sesNo: family.sesNo,
    caste: family.caste,
    subCaste: family.subCaste,
    houseType: family.houseType,
    rrEligibility: family.rrEligibility,
    aliveOrDied: family.aliveOrDied,
    maritalStatus: family.maritalStatus,
    farmerCategory: family.farmerCategory,
    bplApl: family.bplApl,
    occupation: family.occupation,
    periodOfResidence: family.periodOfResidence,
    photoUploaded: family.photoUploaded,
    residencePhoto: family.residencePhoto,
    housingProvision: family.housingProvision,
    landForLand: family.landForLand,
    landSurveyNo: family.landSurveyNo,
    landExtent: family.landExtent,
    offerDevelopedLand: family.offerDevelopedLand,
    bankName: family.bankName,
    bankBranch: family.bankBranch,
    bankAccountActive: family.bankAccountActive,
    ...piiBlock,
    members: family.members?.map((m) => serializeMember(m, ctx, targetMandalId)),
    firstScheme: family.firstScheme,
    plotAllotment: family.plotAllotment,
    createdAt: family.createdAt,
  };
}

export function serializeMember(
  member: MemberRow,
  ctx: SessionContext,
  targetMandalId: string | null,
): Record<string, unknown> {
  const full = canSeeFullPII(ctx, targetMandalId);
  const anyPII = canSeeMaskedPII(ctx);

  const dec = {
    aadhar: safeDecrypt(member.aadharNoEnc),
    voter: safeDecrypt(member.voterIdNoEnc),
    account: safeDecrypt(member.bankAccountNoEnc),
    ifsc: safeDecrypt(member.bankIfscEnc),
    dob: safeDecrypt(member.dobSscTcEnc),
  };

  const piiBlock = anyPII
    ? {
        aadharNo: full ? dec.aadhar : maskAadhar(dec.aadhar),
        voterIdNo: full ? dec.voter : maskVoter(dec.voter),
        bankAccountNo: full ? dec.account : maskAccount(dec.account),
        bankIfsc: full ? dec.ifsc : maskIfsc(dec.ifsc),
        dobSscTc: full ? dec.dob : maskDob(dec.dob),
        _piiAccess: full ? 'full' : 'masked',
      }
    : { _piiAccess: 'none' as const };

  return {
    id: member.id,
    familyId: member.familyId,
    beneficiaryName: member.beneficiaryName,
    fathersName: member.fathersName,
    husbandName: member.husbandName,
    wifeBirthSurname: member.wifeBirthSurname,
    relation: member.relation,
    gender: member.gender,
    age: member.age,
    agePnLaAct: member.agePnLaAct,
    aliveOrDied: member.aliveOrDied,
    maritalStatus: member.maritalStatus,
    caste: member.caste,
    subCaste: member.subCaste,
    schoolRecords: member.schoolRecords,
    occupation: member.occupation,
    isPhysicallyHandicapped: member.isPhysicallyHandicapped,
    isWidow: member.isWidow,
    isDivorced: member.isDivorced,
    bankName: member.bankName,
    bankBranch: member.bankBranch,
    bankAccountActive: member.bankAccountActive,
    ...piiBlock,
  };
}
