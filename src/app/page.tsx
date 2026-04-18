'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { AnimatePresence, motion } from 'framer-motion';
import dynamic from 'next/dynamic';

// Dynamic imports for code splitting
const GlobeLanding = dynamic(() => import('@/components/globe/GlobeLanding'), { ssr: false });
const DashboardView = dynamic(() => import('@/components/dashboard/DashboardView'));
const MandalView = dynamic(() => import('@/components/mandal/MandalView'));
const VillageView = dynamic(() => import('@/components/village/VillageView'));
const FamilyView = dynamic(() => import('@/components/family/FamilyView'));
const MemberView = dynamic(() => import('@/components/member/MemberView'));
const RelocationView = dynamic(() => import('@/components/relocation/RelocationView'));
const LoginView = dynamic(() => import('@/components/auth/LoginView'));

const viewComponents: Record<string, React.ComponentType> = {
  globe: GlobeLanding,
  dashboard: DashboardView,
  mandal: MandalView,
  village: VillageView,
  family: FamilyView,
  member: MemberView,
  relocation: RelocationView,
  login: LoginView,
};

export default function Home() {
  const view = useAppStore((s) => s.view);
  const selectedMandalId = useAppStore((s) => s.selectedMandalId);
  const selectedVillageId = useAppStore((s) => s.selectedVillageId);
  const selectedFamilyId = useAppStore((s) => s.selectedFamilyId);
  const ViewComponent = viewComponents[view] || GlobeLanding;
  const mainRef = useRef<HTMLElement>(null);

  // Build a composite key so navigating within the same view type (e.g., from "All Villages" list to a specific village)
  // causes the component to remount and reset its internal state
  const compositeKey = `${view}-${selectedMandalId || ''}-${selectedVillageId || ''}-${selectedFamilyId || ''}`;

  // Reset scroll position when view changes
  useEffect(() => {
    // Reset on document/html level
    const resetScroll = () => {
      window.scrollTo(0, 0);
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
      if (mainRef.current) mainRef.current.scrollTop = 0;
    };
    resetScroll();
    // Multiple delayed resets to overcome Framer Motion animation timing
    const timers = [
      setTimeout(resetScroll, 50),
      setTimeout(resetScroll, 150),
      setTimeout(resetScroll, 350),
      setTimeout(resetScroll, 500),
    ];
    return () => timers.forEach(clearTimeout);
  }, [view, selectedMandalId, selectedVillageId, selectedFamilyId]);

  return (
    <main ref={mainRef} className="w-full min-h-screen bg-[#F0F4F8]">
      <AnimatePresence mode="wait">
        <motion.div
          key={compositeKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full min-h-screen"
        >
          <ViewComponent />
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
