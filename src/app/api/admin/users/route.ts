/**
 * Admin users API.
 *
 *   GET  /api/admin/users                 → list staff users (ADMIN only)
 *   POST /api/admin/users                 → provision a new user (ADMIN only)
 *   PATCH /api/admin/users  body: { id, action: 'deactivate'|'activate'|'reset-password'|'update-access' }
 *
 * No self-signup. Every account is admin-provisioned with a temporary password
 * and `mustChangePassword=true`. Passwords are bcrypt-hashed (12 rounds).
 * All mutations write to AuditLog.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { requireSession, requireRole, audit, toAuthErrorResponse } from '@/lib/server-auth';
import { rateLimit, clientIp } from '@/lib/rate-limit';

const ROLE_VALUES = ['ADMIN', 'OFFICER', 'VIEWER'] as const;

const CreateSchema = z.object({
  email: z.string().email().max(180).transform((s) => s.trim().toLowerCase()),
  name: z.string().min(2).max(120),
  role: z.enum(ROLE_VALUES),
  mandalId: z.string().min(1).optional().nullable(),
  // Temp password: at least 12 chars; admin must convey securely (out-of-band).
  tempPassword: z.string().min(12).max(128),
});

const PatchSchema = z.discriminatedUnion('action', [
  z.object({
    id: z.string().min(1),
    action: z.enum(['deactivate', 'activate']),
  }),
  z.object({
    id: z.string().min(1),
    action: z.literal('reset-password'),
    newTempPassword: z.string().min(12).max(128),
  }),
  z.object({
    id: z.string().min(1),
    action: z.literal('update-access'),
    role: z.enum(ROLE_VALUES),
    mandalId: z.string().min(1).optional().nullable(),
  }),
]);

function safeUser(u: {
  id: string; email: string; name: string | null; role: string;
  mandalId: string | null; isActive: boolean; mustChangePassword: boolean;
  lastLoginAt: Date | null; createdAt: Date; updatedAt: Date;
}) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    mandalId: u.mandalId,
    isActive: u.isActive,
    mustChangePassword: u.mustChangePassword,
    lastLoginAt: u.lastLoginAt,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireSession();
    requireRole(ctx, 'ADMIN');

    const users = await db.user.findMany({
      orderBy: [{ role: 'asc' }, { email: 'asc' }],
      select: {
        id: true, email: true, name: true, role: true, mandalId: true,
        isActive: true, mustChangePassword: true, lastLoginAt: true,
        createdAt: true, updatedAt: true,
      },
    });

    await audit({
      ctx, action: 'USERS_LIST', resourceType: 'USER',
      ip: clientIp(req), userAgent: req.headers.get('user-agent') ?? null,
      metadata: { count: users.length },
    });

    return NextResponse.json({ users: users.map(safeUser) });
  } catch (err) {
    return toAuthErrorResponse(err) ?? NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireSession();
    requireRole(ctx, 'ADMIN');

    const ip = clientIp(req);
    const rl = rateLimit('user-create', `${ctx.userId}:${ip}`, { max: 20, windowMs: 60_000 });
    if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: rl.headers });

    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', issues: parsed.error.issues }, { status: 400 });
    }

    const { email, name, role, mandalId, tempPassword } = parsed.data;

    if (role === 'OFFICER' && !mandalId) {
      return NextResponse.json({ error: 'OFFICER role requires mandalId' }, { status: 400 });
    }

    // Validate mandal exists
    if (mandalId) {
      const m = await db.mandal.findUnique({ where: { id: mandalId }, select: { id: true } });
      if (!m) return NextResponse.json({ error: 'Unknown mandalId' }, { status: 400 });
    }

    const exists = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (exists) return NextResponse.json({ error: 'Email already exists' }, { status: 409 });

    const hash = await bcrypt.hash(tempPassword, 12);
    const created = await db.user.create({
      data: {
        email, name, role, mandalId: role === 'OFFICER' ? mandalId : null,
        password: hash,
        isActive: true,
        mustChangePassword: true,
      },
      select: {
        id: true, email: true, name: true, role: true, mandalId: true,
        isActive: true, mustChangePassword: true, lastLoginAt: true,
        createdAt: true, updatedAt: true,
      },
    });

    await audit({
      ctx, action: 'USER_CREATE', resourceType: 'USER', resourceId: created.id,
      ip, userAgent: req.headers.get('user-agent') ?? null,
      metadata: { email, role, mandalId: created.mandalId },
    });

    return NextResponse.json({ user: safeUser(created) }, { status: 201 });
  } catch (err) {
    return toAuthErrorResponse(err) ?? NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await requireSession();
    requireRole(ctx, 'ADMIN');

    const body = await req.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', issues: parsed.error.issues }, { status: 400 });
    }

    const { id, action } = parsed.data;

    if (id === ctx.userId) {
      return NextResponse.json({ error: 'Cannot modify your own account here' }, { status: 400 });
    }

    const target = await db.user.findUnique({ where: { id }, select: { id: true, email: true } });
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (action === 'reset-password') {
      const hash = await bcrypt.hash(parsed.data.newTempPassword, 12);
      await db.user.update({
        where: { id },
        data: { password: hash, mustChangePassword: true },
      });
    } else if (action === 'update-access') {
      const { role, mandalId } = parsed.data;
      if (role === 'OFFICER' && !mandalId) {
        return NextResponse.json({ error: 'OFFICER role requires mandalId' }, { status: 400 });
      }

      if (mandalId) {
        const m = await db.mandal.findUnique({ where: { id: mandalId }, select: { id: true } });
        if (!m) return NextResponse.json({ error: 'Unknown mandalId' }, { status: 400 });
      }

      await db.user.update({
        where: { id },
        data: {
          role,
          mandalId: role === 'OFFICER' ? mandalId : null,
        },
      });
    } else {
      await db.user.update({
        where: { id },
        data: { isActive: action === 'activate' },
      });
    }

    await audit({
      ctx,
      action: action === 'reset-password' ? 'USER_PASSWORD_RESET'
            : action === 'update-access' ? 'USER_ACCESS_UPDATE'
            : action === 'activate' ? 'USER_ACTIVATE'
            : 'USER_DEACTIVATE',
      resourceType: 'USER', resourceId: id,
      ip: clientIp(req), userAgent: req.headers.get('user-agent') ?? null,
      metadata: action === 'update-access'
        ? { email: target.email, role: parsed.data.role, mandalId: parsed.data.role === 'OFFICER' ? (parsed.data.mandalId ?? null) : null }
        : { email: target.email },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toAuthErrorResponse(err) ?? NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
