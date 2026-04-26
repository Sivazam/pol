'use client';

import { SessionProvider } from 'next-auth/react';
import React from 'react';

export default function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  // refetchInterval=0: rely on idle expiry from JWT (30 min). refetchOnWindowFocus retains UX freshness.
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus>
      {children}
    </SessionProvider>
  );
}
