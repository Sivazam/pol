'use client';

import React, { useState } from 'react';
import { useAppStore, AppView } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Map, Building2, Users, Search,
  LogIn, X, Menu, ChevronRight, Home, LandPlot,
} from 'lucide-react';

interface NavItem {
  view: AppView;
  label: string;
  icon: React.ElementType;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Overview & Stats' },
  { view: 'mandal', label: 'Mandals', icon: Map, description: '3 Mandals' },
  { view: 'village', label: 'Villages', icon: Building2, description: '30 Villages' },
  { view: 'family', label: 'Families', icon: Users, description: '13,961 Families' },
  { view: 'relocation', label: 'Relocation', icon: LandPlot, description: 'Plot Allotment' },
  { view: 'login', label: 'Admin', icon: LogIn, description: 'Secure Login' },
];

export default function SidebarNav() {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Don't show sidebar on globe or login views
  if (view === 'globe' || view === 'login') return null;

  const handleNavClick = (navView: AppView) => {
    setView(navView);
    setSidebarOpen(false);
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
            <div className="h-[3px] w-full" style={{ background: 'linear-gradient(90deg, #FF9933 0%, #FF9933 33%, #FFFFFF 33%, #FFFFFF 66%, #138808 66%, #138808 100%)' }} />

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
              {NAV_ITEMS.map((item) => {
                const isActive = view === item.view;
                const Icon = item.icon;
                return (
                  <button
                    key={item.view}
                    onClick={() => handleNavClick(item.view)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all ${
                      isActive
                        ? 'bg-amber-500/20 text-amber-300 border-l-2 border-amber-400'
                        : 'text-white/60 hover:bg-white/8 hover:text-white/90'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-amber-400' : ''}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${isActive ? 'text-amber-300' : ''}`}>{item.label}</p>
                      <p className="text-[10px] text-white/30">{item.description}</p>
                    </div>
                    {isActive && <ChevronRight className="w-4 h-4 text-amber-400/60" />}
                  </button>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
              <p className="text-[9px] text-white/30 tracking-wider uppercase text-center">Government of A.P.</p>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop sidebar - slim icon rail */}
      <aside
        className="hidden lg:flex fixed left-0 top-0 bottom-0 w-[52px] flex-col bg-gradient-to-b from-[#0F2B46] to-[#1E3A5F] z-40 border-r border-white/10 transition-all duration-300 hover:w-[200px] group"
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => { setExpanded(false); setHoveredItem(null); }}
      >
        {/* Tricolor accent */}
        <div className="h-[3px] w-full shrink-0" style={{ background: 'linear-gradient(90deg, #FF9933 0%, #FF9933 33%, #FFFFFF 33%, #FFFFFF 66%, #138808 66%, #138808 100%)' }} />

        {/* Logo area */}
        <div className="h-14 flex items-center justify-center border-b border-white/10 shrink-0">
          <Home className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="ml-3 text-xs font-bold text-white tracking-wider whitespace-nowrap overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-200" style={{ fontFamily: 'var(--font-jetbrains)' }}>
            R&R
          </span>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 py-2 px-1.5 space-y-1 overflow-y-auto overflow-x-hidden">
          {NAV_ITEMS.map((item) => {
            const isActive = view === item.view;
            const Icon = item.icon;
            const isHovered = hoveredItem === item.view;
            return (
              <button
                key={item.view}
                onClick={() => handleNavClick(item.view)}
                onMouseEnter={() => setHoveredItem(item.view)}
                onMouseLeave={() => setHoveredItem(null)}
                className={`w-full flex items-center gap-3 px-2 py-2.5 rounded-lg transition-all duration-200 relative ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-300'
                    : 'text-white/50 hover:bg-white/8 hover:text-white/80'
                }`}
                title={item.label}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-amber-400 rounded-r-full" />
                )}
                <Icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-amber-400' : ''}`} />
                <span className={`text-xs font-medium whitespace-nowrap overflow-hidden transition-all duration-200 ${
                  expanded ? 'opacity-100 max-w-[140px]' : 'opacity-0 max-w-0'
                }`}>
                  {item.label}
                </span>
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

        {/* Bottom section */}
        <div className="p-2 border-t border-white/10 shrink-0">
          <div className="flex items-center justify-center py-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="ml-2 text-[9px] text-white/30 whitespace-nowrap overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-200">LIVE</span>
          </div>
        </div>
      </aside>
    </>
  );
}
