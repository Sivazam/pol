'use client';

import { useAppStore } from '@/lib/store';
import GlobeLanding from '@/components/globe/GlobeLanding';
import DashboardView from '@/components/dashboard/DashboardView';
import MandalView from '@/components/mandal/MandalView';

export default function Home() {
  const view = useAppStore((s) => s.view);

  return (
    <main className="w-full min-h-screen">
      {view === 'globe' && <GlobeLanding />}
      {view === 'dashboard' && <DashboardView />}
      {view === 'mandal' && <MandalView />}
    </main>
  );
}
