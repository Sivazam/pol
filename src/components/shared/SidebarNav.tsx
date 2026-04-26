'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore, AppView } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Map, Building2, Users,
  X, ChevronRight, Home, LandPlot, BarChart3, GitCompare, Activity, MapPin, Upload, Shield,
} from 'lucide-react';
import { PROJECT_STATS } from '@/lib/constants';
import DataImportPanel from '@/components/shared/DataImportPanel';
import UserMenu from '@/components/auth/UserMenu';

interface NavItem {
  view: AppView;
  label: string;
  icon: React.ElementType;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Overview & Stats' },
  { view: 'mandal', label: 'Mandals', icon: Map, description: 'Mandals' },
  { view: 'village', label: 'Villages', icon: Building2, description: 'Villages' },
  { view: 'family', label: 'Families', icon: Users, description: 'Families' },
  { view: 'reports', label: 'Reports', icon: BarChart3, description: 'Analytics & Insights' },
  { view: 'compare', label: 'Compare', icon: GitCompare, description: 'Side-by-side Analysis' },
  { view: 'activity', label: 'Activity', icon: Activity, description: 'Recent Activity' },
  { view: 'map', label: 'Map', icon: MapPin, description: 'Interactive Map View' },
  { view: 'relocation', label: 'Relocation', icon: LandPlot, description: 'Plot Allotment' },
  { view: 'admin', label: 'Admin', icon: Shield, description: 'Admin Panel' },
];

export default function SidebarNav() {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  const sessionRole = useAppStore((s) => s.sessionRole);
  const selectedMandalId = useAppStore((s) => s.selectedMandalId);
  const selectedVillageId = useAppStore((s) => s.selectedVillageId);
  const selectedFamilyId = useAppStore((s) => s.selectedFamilyId);
  const notificationBannerVisible = useAppStore((s) => s.notificationBannerVisible);
  const bookmarkedCount = useAppStore((s) => s.bookmarkedFamilies.length);

  // Fetch live stats for dynamic descriptions
  const [liveStats, setLiveStats] = useState<{ totalFamilies: number; totalMandals: number; totalVillages: number } | null>(null);

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(data => {
        const totalVillages = data.mandals?.reduce((sum: number, m: { villageCount: number }) => sum + m.villageCount, 0) ?? PROJECT_STATS.totalVillages;
        setLiveStats({ totalFamilies: data.totalFamilies, totalMandals: data.mandals?.length ?? PROJECT_STATS.totalMandals, totalVillages });
      })
      .catch(() => setLiveStats(null));
  }, []);

  // Build dynamic descriptions from fetched stats
  const navDescriptions: Record<string, string> = {
    mandal: `${liveStats?.totalMandals ?? PROJECT_STATS.totalMandals} Mandals`,
    village: `${liveStats?.totalVillages ?? PROJECT_STATS.totalVillages} Villages`,
    family: `${(liveStats?.totalFamilies ?? PROJECT_STATS.totalFamilies).toLocaleString()} Families`,
  };

  // Calculate sidebar top offset:
  // 3px tricolor + 56px nav = 59px (no banner)
  // 3px tricolor + 56px nav + 36px banner = 95px (with banner)
  // Banner only renders on dashboard view, so check both conditions
  const bannerActive = notificationBannerVisible && view === 'dashboard';
  const sidebarTop = bannerActive ? 95 : 59;
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const selectMandal = useAppStore((s) => s.selectMandal);
  const selectVillage = useAppStore((s) => s.selectVillage);
  const selectFamily = useAppStore((s) => s.selectFamily);

  // Don't show sidebar on globe or login views
  if (view === 'globe' || view === 'login') return null;

  // Hide ADMIN-only nav for non-admins.
  const visibleNavItems = NAV_ITEMS.filter((it) => it.view !== 'admin' || sessionRole === 'ADMIN');

  const handleNavClick = (navView: AppView) => {
    if (navView === 'dashboard') {
      setView('dashboard');
    } else if (navView === 'mandal') {
      // Clear mandal selection so MandalView shows the "All Mandals" list
      selectMandal(null);
      setView('mandal');
    } else if (navView === 'village') {
      // Clear village selection so VillageView shows the "All Villages" list
      selectVillage(null);
      setView('village');
    } else if (navView === 'family') {
      // Clear family selection so FamilyView shows the searchable list
      selectFamily(null, null);
      setView('family');
    } else if (navView === 'reports') {
      setView('reports');
    } else if (navView === 'compare') {
      setView('compare');
    } else if (navView === 'activity') {
      setView('activity');
    } else if (navView === 'map') {
      setView('map');
    } else if (navView === 'relocation') {
      // Always navigate to relocation view; RelocationView handles both cases
      setView('relocation');
    } else if (navView === 'admin') {
      setView('admin');
    } else {
      setView(navView);
    }
    setSidebarOpen(false);
  };

  // Determine which nav item should appear "active"
  const getIsActive = (navView: AppView): boolean => {
    if (navView === 'dashboard') return view === 'dashboard';
    if (navView === 'mandal') return view === 'mandal';
    if (navView === 'village') return view === 'village';
    if (navView === 'family') return view === 'family' || view === 'member';
    if (navView === 'reports') return view === 'reports';
    if (navView === 'compare') return view === 'compare';
    if (navView === 'activity') return view === 'activity';
    if (navView === 'map') return view === 'map';
    if (navView === 'relocation') return view === 'relocation';
    if (navView === 'admin') return view === 'admin';
    if (navView === 'login') return view === 'login';
    return false;
  };

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile slide-out drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 w-[270px] bg-gradient-to-b from-[#0F2B46] to-[#1E3A5F] z-50 lg:hidden shadow-2xl"
          >
            {/* Tricolor accent */}
            <div className="h-[3px] w-full shrink-0" style={{ background: 'linear-gradient(90deg, #FF9933 0%, #FF9933 33%, #FFFFFF 33%, #FFFFFF 66%, #138808 66%, #138808 100%)' }} />

            {/* Header */}
            <div className="px-5 py-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Home className="w-5 h-5 text-amber-400" />
                  <span className="text-sm font-bold text-white tracking-wide" style={{ fontFamily: 'var(--font-jetbrains)' }}>R&R PORTAL</span>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="text-white/50 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-[10px] text-white/40 mt-1.5 tracking-wider uppercase">Polavaram Rehabilitation</p>
            </div>

            {/* Navigation items */}
            <nav className="py-3 px-3 space-y-1">
              {visibleNavItems.map((item) => {
                const isActive = getIsActive(item.view);
                const Icon = item.icon;
                return (
                  <button
                    key={item.view}
                    onClick={() => handleNavClick(item.view)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200 ${
                      isActive
                        ? 'bg-amber-500/20 text-amber-300 border-l-2 border-amber-400 sidebar-nav-active'
                        : 'text-white/60 hover:bg-white/8 hover:text-white/90'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-amber-400' : ''}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${isActive ? 'text-amber-300' : ''}`}>{item.label}</p>
                      <p className="text-[10px] text-white/30">{navDescriptions[item.view] || item.description}</p>
                    </div>
                    {item.view === 'family' && bookmarkedCount > 0 && (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-red-500/80 text-white rounded-full min-w-[18px] text-center">
                        {bookmarkedCount}
                      </span>
                    )}
                    {isActive && <ChevronRight className="w-4 h-4 text-amber-400/60" />}
                  </button>
                );
              })}
            </nav>

            {/* Data Import trigger */}
            <div className="px-3 pt-2 border-t border-white/10 mt-2">
              <button
                onClick={() => setImportOpen(true)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left text-white/60 hover:bg-white/8 hover:text-white/90 transition-all"
              >
                <Upload className="w-5 h-5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Import</p>
                  <p className="text-[10px] text-white/30">Bulk Upload</p>
                </div>
              </button>
            </div>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
              <p className="text-[9px] text-white/30 tracking-wider uppercase text-center">Government of A.P.</p>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop sidebar - slim icon rail that sits BELOW the top navbar */}
      <aside
        className="hidden lg:flex fixed left-0 bottom-0 w-[52px] flex-col bg-gradient-to-b from-[#0F2B46] to-[#1E3A5F] z-30 border-r border-white/10 transition-all duration-300 hover:w-[200px] group"
        style={{ top: sidebarTop }}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => { setExpanded(false); setHoveredItem(null); }}
      >
        {/* Navigation items */}
        <nav className="flex-1 py-2 px-1.5 space-y-1 overflow-y-auto overflow-x-hidden">
          {visibleNavItems.map((item) => {
            const isActive = getIsActive(item.view);
            const Icon = item.icon;
            const isHovered = hoveredItem === item.view;
            return (
              <button
                key={item.view}
                onClick={() => handleNavClick(item.view)}
                onMouseEnter={() => setHoveredItem(item.view)}
                onMouseLeave={() => setHoveredItem(null)}
                className={`w-full flex items-center gap-3 px-2 py-2.5 rounded-lg transition-all duration-200 relative nav-underline ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-300 sidebar-nav-active'
                    : 'text-white/50 hover:bg-white/8 hover:text-white/80'
                }`}
                title={item.label}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-amber-400 rounded-r-full sidebar-active-indicator" />
                )}
                <Icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-amber-400' : ''}`} />
                <span className={`text-xs font-medium whitespace-nowrap overflow-hidden transition-all duration-200 ${
                  expanded ? 'opacity-100 max-w-[140px]' : 'opacity-0 max-w-0'
                }`}>
                  {item.label}
                </span>
                {/* Bookmark badge for families */}
                {item.view === 'family' && bookmarkedCount > 0 && expanded && (
                  <span className="ml-auto px-1.5 py-0.5 text-[9px] font-bold bg-red-500/80 text-white rounded-full min-w-[18px] text-center shrink-0">
                    {bookmarkedCount}
                  </span>
                )}
                {/* Collapsed bookmark indicator */}
                {item.view === 'family' && bookmarkedCount > 0 && !expanded && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
                {/* Tooltip for collapsed state */}
                {!expanded && isHovered && (
                  <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-[#0F2B46] text-white text-xs rounded-md shadow-lg whitespace-nowrap z-50 border border-white/10">
                    {item.label}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-[#0F2B46] rotate-45 border-l border-b border-white/10" />
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Data Import trigger */}
        <div className="px-1.5 pt-2 border-t border-white/10 shrink-0">
          <button
            onClick={() => setImportOpen(true)}
            className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg transition-all duration-200 text-white/50 hover:bg-white/8 hover:text-white/80 relative"
            title="Import Data"
            onMouseEnter={() => setHoveredItem('import')}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <Upload className="w-[18px] h-[18px] shrink-0" />
            <span className={`text-xs font-medium whitespace-nowrap overflow-hidden transition-all duration-200 ${
              expanded ? 'opacity-100 max-w-[140px]' : 'opacity-0 max-w-0'
            }`}>
              Import
            </span>
            {/* Tooltip for collapsed state */}
            {!expanded && hoveredItem === 'import' && (
              <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-[#0F2B46] text-white text-xs rounded-md shadow-lg whitespace-nowrap z-50 border border-white/10">
                Import
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-[#0F2B46] rotate-45 border-l border-b border-white/10" />
              </div>
            )}
          </button>
        </div>

        {/* Account / Sign in */}
        <UserMenu expanded={expanded} />

        {/* Bottom section */}
        <div className="p-2 border-t border-white/10 shrink-0">
          <div className="flex items-center justify-center py-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0 pulse-ring" />
            <span className="ml-2 text-[9px] text-white/30 whitespace-nowrap overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-200">LIVE</span>
          </div>
        </div>
      </aside>

      {/* Data Import Sheet - single instance */}
      <DataImportPanel open={importOpen} onOpenChange={setImportOpen} />
    </>
  );
}
