/**
 * NextAuth.js v4 configuration.
 *
 * - Credentials provider against the `User` table (bcrypt password compare).
 * - JWT session (no DB session table needed — works on SQLite and Postgres).
 * - 30-minute idle expiry per government security policy.
 * - Session token carries `userId`, `role`, `mandalId` so middleware/routes
 *   can authorise without extra DB hits.
 * - Login rate-limited (per-IP) to defeat credential-stuffing.
 * - All login attempts written to AuditLog (success + failure).
 */

import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db } from './db';
import type { Role } from './roles';
import { rateLimit } from './rate-limit';

const SESSION_MAX_AGE_SEC = 30 * 60; // 30 minutes idle expiry

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        const email = (credentials?.email || '').trim().toLowerCase();
        const password = credentials?.password || '';
        const ip =
          (req?.headers?.['x-real-ip'] as string) ||
          (req?.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
          'unknown';
        const userAgent = (req?.headers?.['user-agent'] as string) || 'unknown';

        if (!email || !password) {
          await writeAuditSafe({
            action: 'LOGIN_FAILURE',
            ip,
            userAgent,
            metadata: { email, reason: 'missing-credentials' },
          });
          return null;
        }

        // Per-IP throttle: max 10 login attempts / minute. Defeats credential stuffing.
        const rl = rateLimit('login', `${ip}:${email}`, { max: 10, windowMs: 60_000 });
        if (!rl.ok) {
          await writeAuditSafe({
            action: 'LOGIN_FAILURE',
            ip,
            userAgent,
            metadata: { email, reason: 'rate-limited' },
          });
          return null;
        }

        const user = await db.user.findUnique({ where: { email } });
        if (!user || !user.isActive) {
          await writeAuditSafe({
            action: 'LOGIN_FAILURE',
            ip,
            userAgent,
            metadata: { email, reason: !user ? 'no-user' : 'inactive' },
          });
          return null;
        }

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) {
          await writeAuditSafe({
            action: 'LOGIN_FAILURE',
            userId: user.id,
            ip,
            userAgent,
            metadata: { email, reason: 'bad-password' },
          });
          return null;
        }

        // Update last-login (best-effort; ignore errors).
        try {
          await db.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          });
        } catch {
          /* noop */
        }

        await writeAuditSafe({
          action: 'LOGIN_SUCCESS',
          userId: user.id,
          ip,
          userAgent,
          metadata: { email },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as Role,
          mandalId: user.mandalId,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: SESSION_MAX_AGE_SEC,
    updateAge: 0, // re-sign on every request so idle expiry is enforced strictly
  },
  jwt: {
    maxAge: SESSION_MAX_AGE_SEC,
  },
  pages: {
    signIn: '/', // we use the in-app LoginView, not /api/auth/signin
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === 'production'
          ? '__Secure-next-auth.session-token'
          : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as unknown as {
          id: string;
          role: Role;
          mandalId: string | null;
          email: string | null;
          name: string | null;
        };
        token.userId = u.id;
        token.role = u.role;
        token.mandalId = u.mandalId;
        token.email = u.email;
        token.name = u.name;
      }
      return token;
    },
    async session({ session, token }) {
      // Expose only what the client needs.
      (session as unknown as Record<string, unknown>).user = {
        id: token.userId,
        email: token.email,
        name: token.name,
        role: token.role,
        mandalId: token.mandalId,
      };
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

async function writeAuditSafe(entry: {
  action: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await db.auditLog.create({
      data: {
        action: entry.action,
        userId: entry.userId ?? null,
        ip: entry.ip ?? null,
        userAgent: entry.userAgent ?? null,
        resourceType: 'AUTH',
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
      },
    });
  } catch (err) {
    console.error('[auth] audit log write failed:', err);
  }
}
