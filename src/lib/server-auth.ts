/**
 * Server-side auth helpers used by every protected API route.
 *
 *   const ctx = await requireSession();
 *   await requireRole(ctx, 'ADMIN');
 *   await requireMandalScope(ctx, family.village.mandalId);
 *
 * Each helper throws a typed `AuthError` so route handlers can convert it
 * to a 401/403 response uniformly via `withAuth(handler)`.
 */

import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from './auth';
import {
  PUBLIC_CONTEXT,
  type Role,
  type SessionContext,
  isInScope,
} from './roles';
import { db } from './db';

// Re-export so route handlers can pull SessionContext from a single barrel.
export type { Role, SessionContext } from './roles';

export class AuthError extends Error {
  constructor(public status: 401 | 403, message: string) {
    super(message);
  }
}

export async function getSessionContext(): Promise<SessionContext> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session as { user?: unknown }).user) {
      return PUBLIC_CONTEXT;
    }
    const u = (session as unknown as {
      user: {
        id: string;
        email: string | null;
        role: Role;
        mandalId: string | null;
      };
    }).user;
    return {
      userId: u.id,
      email: u.email,
      role: u.role || 'VIEWER',
      mandalId: u.mandalId ?? null,
    };
  } catch (err) {
    console.error('[auth] getServerSession failed, falling back to PUBLIC context:', err);
    return PUBLIC_CONTEXT;
  }
}

export async function requireSession(): Promise<SessionContext> {
  const ctx = await getSessionContext();
  if (ctx.role === 'PUBLIC') {
    throw new AuthError(401, 'Authentication required');
  }
  return ctx;
}

export async function requireRole(
  ctx: SessionContext,
  ...allowed: Role[]
): Promise<void> {
  if (!allowed.includes(ctx.role)) {
    throw new AuthError(403, `Forbidden: requires one of ${allowed.join(', ')}`);
  }
}

export function requireMandalScope(
  ctx: SessionContext,
  targetMandalId: string | null,
): void {
  if (!isInScope(ctx, targetMandalId)) {
    throw new AuthError(403, 'Forbidden: out of mandal scope');
  }
}

/**
 * Wrap a route handler so any AuthError becomes a clean JSON 401/403.
 * Other thrown errors fall through to your normal try/catch.
 */
export function toAuthErrorResponse(err: unknown): NextResponse | null {
  if (err instanceof AuthError) {
    return NextResponse.json(
      { error: err.message, code: err.status },
      { status: err.status },
    );
  }
  return null;
}

/**
 * Write an audit log entry. Best-effort; never throws.
 * `metadata` is JSON-stringified so it works on SQLite (TEXT) and Postgres (jsonb).
 */
export async function audit(entry: {
  ctx: SessionContext;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: entry.ctx.userId,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId ?? null,
        ip: entry.ip ?? null,
        userAgent: entry.userAgent ?? null,
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
      },
    });
  } catch (err) {
    console.error('[audit] write failed:', err);
  }
}
