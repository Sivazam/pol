'use client';

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
  const ViewComponent = viewComponents[view] || GlobeLanding;

  return (
    <main className="w-full min-h-screen bg-[#0A0F1E]">
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="w-full min-h-screen"
        >
          <ViewComponent />
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
