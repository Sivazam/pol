'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { AnimatePresence, motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { Spinner } from '@/components/ui/spinner';
import ErrorBoundary from '@/components/shared/ErrorBoundary';

// Dynamic imports for code splitting - GlobeLanding is now lightweight CSS-only
const GlobeLanding = dynamic(() => import('@/components/globe/GlobeLanding'), {
  ssr: false,
  loading: () => <LoadingScreen />,
});
const DashboardView = dynamic(() => import('@/components/dashboard/DashboardView'), {
  loading: () => <LoadingScreen />,
});
const MandalView = dynamic(() => import('@/components/mandal/MandalView'), {
  loading: () => <LoadingScreen />,
});
const VillageView = dynamic(() => import('@/components/village/VillageView'), {
  loading: () => <LoadingScreen />,
});
const FamilyView = dynamic(() => import('@/components/family/FamilyView'), {
  loading: () => <LoadingScreen />,
});
const MemberView = dynamic(() => import('@/components/member/MemberView'), {
  loading: () => <LoadingScreen />,
});
const RelocationView = dynamic(() => import('@/components/relocation/RelocationView'), {
  loading: () => <LoadingScreen />,
});
const ReportsView = dynamic(() => import('@/components/reports/ReportsView'), {
  loading: () => <LoadingScreen />,
});
const LoginView = dynamic(() => import('@/components/auth/LoginView'), {
  loading: () => <LoadingScreen />,
});
const ComparisonView = dynamic(() => import('@/components/compare/ComparisonView'), {
  loading: () => <LoadingScreen />,
});
const ActivityView = dynamic(() => import('@/components/activity/ActivityView'), {
  loading: () => <LoadingScreen />,
});
const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => <LoadingScreen />,
});
const AdminView = dynamic(() => import('@/components/admin/AdminView'), {
  loading: () => <LoadingScreen />,
});

function LoadingScreen() {
  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] flex items-center justify-center transition-colors duration-300">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-slate-200 border-t-[#1E3A5F] rounded-full animate-spin" />
        <p className="text-slate-400 text-sm tracking-widest uppercase" style={{ fontFamily: 'var(--font-jetbrains)' }}>Loading...</p>
      </div>
    </div>
  );
}

const viewComponents: Record<string, React.ComponentType> = {
  globe: GlobeLanding,
  dashboard: DashboardView,
  mandal: MandalView,
  village: VillageView,
  family: FamilyView,
  member: MemberView,
  relocation: RelocationView,
  reports: ReportsView,
  compare: ComparisonView,
  activity: ActivityView,
  map: MapView,
  admin: AdminView,
  login: LoginView,
};

export default function Home() {
  const view = useAppStore((s) => s.view);
  const selectedMandalId = useAppStore((s) => s.selectedMandalId);
  const selectedVillageId = useAppStore((s) => s.selectedVillageId);
  const selectedFamilyId = useAppStore((s) => s.selectedFamilyId);
  const ViewComponent = viewComponents[view] || DashboardView;
  const mainRef = useRef<HTMLElement>(null);

  // Build a composite key so navigating within the same view type causes the component to remount
  const compositeKey = `${view}-${selectedMandalId || ''}-${selectedVillageId || ''}-${selectedFamilyId || ''}`;

  // Reset scroll position when view changes
  useEffect(() => {
    const resetScroll = () => {
      window.scrollTo(0, 0);
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
      if (mainRef.current) mainRef.current.scrollTop = 0;
    };
    resetScroll();
    const timers = [
      setTimeout(resetScroll, 50),
      setTimeout(resetScroll, 150),
      setTimeout(resetScroll, 350),
    ];
    return () => timers.forEach(clearTimeout);
  }, [view, selectedMandalId, selectedVillageId, selectedFamilyId]);

  return (
    <main
      ref={mainRef}
      className={view === 'globe'
        ? 'w-full min-h-screen bg-[#06111f] transition-colors duration-300'
        : 'w-full min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] transition-colors duration-300'}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={compositeKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full min-h-screen bg-inherit"
        >
          <ErrorBoundary>
            <ViewComponent />
          </ErrorBoundary>
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
