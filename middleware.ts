/**
 * Edge middleware — gates protected API routes.
 *
 * Uses NextAuth's JWT helper (Edge-runtime safe — no DB calls).
 * The two-audience model: PUBLIC may hit aggregate / map / geojson APIs;
 * STAFF (any signed-in role) is required for anything that touches family
 * detail, members, admin, import, export, chat, or PDF generation.
 *
 * Per-route role checks (ADMIN-only mutations, OFFICER mandal scope) are
 * enforced inside the handlers via requireRole / requireMandalScope.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// API path prefixes that REQUIRE an authenticated session.
const PROTECTED_PREFIXES = [
  '/api/family/', // /api/family/[pdfId] and /api/family/[pdfId]/pdf
  '/api/member/',
  '/api/relocation/',
  '/api/admin/',
  '/api/import',
  '/api/export',
  '/api/chat',
  '/api/users', // future user-management endpoints
];

// Sub-paths under /api that are explicitly public (override the above for catch-all matches).
const PUBLIC_API_PREFIXES = [
  '/api/auth/', // NextAuth itself
  '/api/stats',
  '/api/mandals',
  '/api/villages',
  '/api/village/',
  '/api/map',
  '/api/geojson/',
  '/api/compare',
  '/api/reports',
  '/api/activity',
  '/api/families', // already field-filtered (no PII) — stays public for dashboard
  '/api/search', // results are scrubbed of PII at handler level
];

function isProtected(pathname: string): boolean {
  if (PUBLIC_API_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))) {
    return false;
  }
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith('/api/')) return NextResponse.next();
  if (!isProtected(pathname)) return NextResponse.next();

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    return NextResponse.json(
      { error: 'Authentication required', code: 401 },
      { status: 401 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
