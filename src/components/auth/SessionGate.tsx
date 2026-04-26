'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useAppStore } from '@/lib/store';

/**
 * SessionGate keeps the Zustand store in sync with the active NextAuth session.
 * Mounted once at the layout root. Renders nothing.
 *
 * - When a JWT is present, hydrates `sessionRole/email/name/mandalId` and flips
 *   `isAuthenticated` to true.
 * - When the JWT expires (30 min idle) or the user signs out, clears the
 *   session-derived store fields so PUBLIC-only views render.
 */
export default function SessionGate() {
  const { data, status } = useSession();
  const setSession = useAppStore((s) => s.setSession);
  const clearSession = useAppStore((s) => s.clearSession);

  useEffect(() => {
    if (status === 'authenticated' && data?.user) {
      const u = data.user as {
        role?: 'ADMIN' | 'OFFICER' | 'VIEWER';
        email?: string | null;
        name?: string | null;
        mandalId?: string | null;
      };
      setSession({
        role: u.role ?? 'VIEWER',
        email: u.email ?? null,
        name: u.name ?? null,
        mandalId: u.mandalId ?? null,
      });
    } else if (status === 'unauthenticated') {
      clearSession();
    }
  }, [status, data, setSession, clearSession]);

  return null;
}
