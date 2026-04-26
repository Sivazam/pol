/**
 * PII column encryption — AES-256-GCM (NIST SP 800-38D).
 *
 * Format on disk (single string):
 *   v1:<iv-base64>:<authTag-base64>:<ciphertext-base64>
 *
 * - `v1` is a key-version tag so PII_ENC_KEY can be rotated non-breakingly:
 *   future code may understand both `v1:` and `v2:` prefixes during migration.
 * - 96-bit IV (random per record), 128-bit auth tag — GCM defaults.
 * - Authenticated: tag mismatch throws (data integrity guaranteed).
 *
 * Search index — HMAC-SHA-256 (deterministic, keyed). Stored alongside
 * ciphertext as `<field>Hash` so equality lookups (e.g. find by Aadhaar)
 * work without bulk decrypt. Keyed so an attacker with DB-only access
 * cannot run a rainbow-table attack on 12-digit Aadhaar numbers.
 *
 * Keys come from env (PII_ENC_KEY, PII_HASH_KEY) — base64, 32 bytes each.
 * Production: source from KMS / NIC NKMS / HashiCorp Vault.
 */

import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const KEY_VERSION = 'v1';

function loadKey(envName: string): Buffer {
  const raw = process.env[envName];
  if (!raw) {
    throw new Error(
      `[crypto] Missing ${envName}. Set in .env (32-byte base64). See .env.example.`,
    );
  }
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error(
      `[crypto] ${envName} must decode to exactly 32 bytes (got ${key.length}).`,
    );
  }
  return key;
}

let cachedEncKey: Buffer | null = null;
let cachedHashKey: Buffer | null = null;
function getEncKey(): Buffer {
  if (!cachedEncKey) cachedEncKey = loadKey('PII_ENC_KEY');
  return cachedEncKey;
}
function getHashKey(): Buffer {
  if (!cachedHashKey) cachedHashKey = loadKey('PII_HASH_KEY');
  return cachedHashKey;
}

/**
 * Encrypt a UTF-8 plaintext PII value.
 * Returns null for null/empty input (so callers can pass through optional fields).
 */
export function encryptPII(plaintext: string | null | undefined): string | null {
  if (plaintext === null || plaintext === undefined) return null;
  const trimmed = String(plaintext).trim();
  if (trimmed.length === 0) return null;

  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, getEncKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(trimmed, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${KEY_VERSION}:${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext.toString('base64')}`;
}

/**
 * Decrypt a stored PII blob. Returns null for null input.
 * Throws on malformed input or auth-tag mismatch (data tampering).
 */
export function decryptPII(blob: string | null | undefined): string | null {
  if (blob === null || blob === undefined) return null;
  if (typeof blob !== 'string' || blob.length === 0) return null;

  const parts = blob.split(':');
  if (parts.length !== 4) {
    // Legacy plaintext value (pre-encryption) — return as-is so old rows still display.
    // Callers that care about strict mode can check for the `v1:` prefix themselves.
    return blob;
  }
  const [version, ivB64, tagB64, ctB64] = parts;
  if (version !== KEY_VERSION) {
    throw new Error(`[crypto] Unsupported key version: ${version}`);
  }

  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const ct = Buffer.from(ctB64, 'base64');
  const decipher = createDecipheriv(ALGO, getEncKey(), iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ct), decipher.final()]);
  return plaintext.toString('utf8');
}

/**
 * Deterministic keyed hash for searchable PII.
 * Same input always yields same hash → use for equality lookups via DB index.
 */
export function hashPII(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (trimmed.length === 0) return null;
  return createHmac('sha256', getHashKey()).update(trimmed).digest('hex');
}

/** True if the blob has the v1 ciphertext shape. */
export function isEncrypted(blob: string | null | undefined): boolean {
  return typeof blob === 'string' && blob.startsWith(`${KEY_VERSION}:`);
}
