/**
 * Role-based access control primitives.
 *
 * Roles:
 *  - ADMIN   : full read/write across all mandals; can manage users; sees all PII (audit-logged).
 *  - OFFICER : read/write within a single assigned mandal (User.mandalId); sees full PII for that mandal only.
 *  - VIEWER  : read-only across all mandals; PII shown masked (last-4 only).
 *  - PUBLIC  : unauthenticated; PII fields stripped from responses entirely.
 */

export type Role = 'ADMIN' | 'OFFICER' | 'VIEWER' | 'PUBLIC';

export const STAFF_ROLES: Role[] = ['ADMIN', 'OFFICER', 'VIEWER'];

export interface SessionContext {
  userId: string | null;
  role: Role;
  mandalId: string | null; // OFFICER scope; null for ADMIN/VIEWER/PUBLIC
  email: string | null;
}

export const PUBLIC_CONTEXT: SessionContext = {
  userId: null,
  role: 'PUBLIC',
  mandalId: null,
  email: null,
};

/** Whether the role is allowed to see fully-decrypted PII for the given target mandal. */
export function canSeeFullPII(ctx: SessionContext, targetMandalId: string | null): boolean {
  if (ctx.role === 'ADMIN') return true;
  if (ctx.role === 'OFFICER') {
    return ctx.mandalId !== null && ctx.mandalId === targetMandalId;
  }
  return false;
}

/** Whether the role is allowed to see masked PII (last-4 etc). */
export function canSeeMaskedPII(ctx: SessionContext): boolean {
  return ctx.role !== 'PUBLIC';
}

export function canMutateFamilies(role: Role): boolean {
  return role === 'ADMIN';
}

export function canDeleteFamilies(role: Role): boolean {
  return role === 'ADMIN';
}

export function canImport(role: Role): boolean {
  return role === 'ADMIN';
}

export function canExport(role: Role): boolean {
  return role === 'ADMIN' || role === 'OFFICER';
}

export function canManageUsers(role: Role): boolean {
  return role === 'ADMIN';
}

/** Officer-mandal scope guard — throws-style check returns boolean. */
export function isInScope(ctx: SessionContext, targetMandalId: string | null): boolean {
  if (ctx.role === 'ADMIN' || ctx.role === 'VIEWER') return true;
  if (ctx.role === 'OFFICER') {
    return ctx.mandalId !== null && ctx.mandalId === targetMandalId;
  }
  return false;
}
