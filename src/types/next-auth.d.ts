import 'next-auth';
import 'next-auth/jwt';
import type { Role } from '@/lib/roles';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string | null;
      name: string | null;
      role: Role;
      mandalId: string | null;
    };
  }
  interface User {
    id: string;
    email: string;
    name: string | null;
    role: Role;
    mandalId: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string;
    email: string | null;
    name: string | null;
    role: Role;
    mandalId: string | null;
  }
}
