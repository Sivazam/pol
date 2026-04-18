'use client';

import { useAppStore } from '@/lib/store';
import GlobeLanding from '@/components/globe/GlobeLanding';

export default function Home() {
  const view = useAppStore((s) => s.view);

  return (
    <main className="w-full min-h-screen">
      {view === 'globe' && <GlobeLanding />}
      {view === 'dashboard' && (
        <div className="w-full min-h-screen bg-[#0A0F1E] flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-400 mt-2">Loading portal modules...</p>
          </div>
        </div>
      )}
    </main>
  );
}
