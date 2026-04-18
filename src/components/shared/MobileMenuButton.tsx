'use client';

import React from 'react';
import { useAppStore } from '@/lib/store';
import { X, Menu } from 'lucide-react';

export default function MobileMenuButton() {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  const view = useAppStore((s) => s.view);

  // Don't show on globe or login views
  if (view === 'globe' || view === 'login') return null;

  return (
    <button
      onClick={() => setSidebarOpen(!sidebarOpen)}
      className="lg:hidden text-white/70 hover:text-white transition-colors p-1"
      aria-label="Toggle navigation menu"
    >
      {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
    </button>
  );
}
