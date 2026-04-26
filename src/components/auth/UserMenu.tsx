'use client';

import React, { useState } from 'react';
import { signOut } from 'next-auth/react';
import { useAppStore } from '@/lib/store';
import { LogIn, LogOut, ShieldCheck, User as UserIcon, ChevronUp } from 'lucide-react';

const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
  ADMIN: { label: 'Administrator', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  OFFICER: { label: 'Officer', cls: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  VIEWER: { label: 'Viewer', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  PUBLIC: { label: 'Public', cls: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
};

interface UserMenuProps {
  expanded: boolean;
}

/**
 * Sidebar footer block. Shows role + email when authenticated with a Sign Out
 * button; otherwise shows a Sign In trigger that switches to the Login view.
 */
export default function UserMenu({ expanded }: UserMenuProps) {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const role = useAppStore((s) => s.sessionRole);
  const email = useAppStore((s) => s.sessionEmail);
  const name = useAppStore((s) => s.sessionName);
  const setView = useAppStore((s) => s.setView);
  const clearSession = useAppStore((s) => s.clearSession);
  const [open, setOpen] = useState(false);

  const badge = ROLE_BADGE[role] ?? ROLE_BADGE.PUBLIC;

  const onSignOut = async () => {
    setOpen(false);
    clearSession();
    try {
      await signOut({ redirect: false });
    } catch {
      /* ignore */
    }
    setView('login');
  };

  if (!isAuthenticated) {
    return (
      <div className="px-1.5 pt-2 border-t border-white/10 shrink-0">
        <button
          onClick={() => setView('login')}
          className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg transition-all duration-200 text-white/60 hover:bg-white/8 hover:text-white/90"
          title="Sign In"
        >
          <LogIn className="w-[18px] h-[18px] shrink-0" />
          <span className={`text-xs font-medium whitespace-nowrap overflow-hidden transition-all duration-200 ${expanded ? 'opacity-100 max-w-[140px]' : 'opacity-0 max-w-0'}`}>
            Sign In
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="px-1.5 pt-2 border-t border-white/10 shrink-0 relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-2 py-2.5 rounded-lg transition-all duration-200 text-white/70 hover:bg-white/8 hover:text-white"
        title={email ?? 'Account'}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500/30 to-amber-600/30 border border-amber-400/30 flex items-center justify-center shrink-0">
          {role === 'ADMIN' ? (
            <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
          ) : (
            <UserIcon className="w-3.5 h-3.5 text-amber-300" />
          )}
        </div>
        <div className={`flex-1 min-w-0 text-left transition-all duration-200 ${expanded ? 'opacity-100 max-w-[140px]' : 'opacity-0 max-w-0 overflow-hidden'}`}>
          <p className="text-[11px] font-semibold text-white truncate leading-tight">{name ?? email ?? 'Signed in'}</p>
          <p className="text-[9px] text-white/50 truncate leading-tight">{badge.label}</p>
        </div>
        <ChevronUp className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-0' : 'rotate-180'} ${expanded ? 'opacity-100' : 'opacity-0'}`} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bottom-full left-2 right-2 mb-2 p-3 rounded-lg bg-[#0F2B46] border border-white/15 shadow-xl z-50"
          onMouseLeave={() => setOpen(false)}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${badge.cls}`}>
              {badge.label.toUpperCase()}
            </span>
          </div>
          {email && (
            <p className="text-[10px] text-white/60 break-all mb-2 leading-snug">{email}</p>
          )}
          <p className="text-[9px] text-white/40 mb-3 leading-snug">
            Session auto-expires after 30&nbsp;minutes of inactivity.
          </p>
          <button
            onClick={onSignOut}
            className="w-full flex items-center justify-center gap-2 px-2 py-2 rounded-md bg-red-500/15 hover:bg-red-500/25 text-red-300 hover:text-red-200 text-[11px] font-semibold transition-colors border border-red-500/30"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
