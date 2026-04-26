'use client';

import React, { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { ChevronLeft, Activity, Settings } from 'lucide-react';
import { useTheme } from 'next-themes';
import SidebarNav from '@/components/shared/SidebarNav';
import MobileMenuButton from '@/components/shared/MobileMenuButton';
import GlobalSearch from '@/components/shared/GlobalSearch';
import NotificationBanner from '@/components/shared/NotificationBanner';
import ThemeToggle from '@/components/shared/ThemeToggle';
import Breadcrumb from '@/components/shared/Breadcrumb';
import GovFooter from '@/components/shared/GovFooter';
import NotificationCenter from '@/components/shared/NotificationCenter';
import SettingsPanel from '@/components/shared/SettingsPanel';
import HelpCenter from '@/components/shared/HelpCenter';
import AIChatAssistant from '@/components/shared/AIChatAssistant';

interface ViewLayoutProps {
  children: React.ReactNode;
  /** Custom breadcrumb items. If not provided, default breadcrumb is used */
  breadcrumb?: React.ReactNode;
  /** Title shown in the top navbar. If not provided, shows "POLAVARAM R&R PORTAL" */
  navTitle?: string;
  /** Title color in the navbar */
  navTitleColor?: string;
  /** Accent dot color in navbar */
  accentDotColor?: string;
  /** Hide the breadcrumb */
  hideBreadcrumb?: boolean;
  /** Additional subtitle text in navbar */
  navSubtitle?: string;
  /** Max width class for content area */
  maxWidth?: string;
}

/**
 * Shared layout wrapper for all view pages.
 * Handles: tricolor bar, sticky top nav, sidebar, breadcrumb, content area with proper left padding, footer.
 * This ensures sidebar never overlaps content and navbar never collides with sidebar.
 */
export default function ViewLayout({
  children,
  breadcrumb,
  navTitle,
  navTitleColor,
  accentDotColor,
  hideBreadcrumb = false,
  navSubtitle,
  maxWidth = 'max-w-7xl',
}: ViewLayoutProps) {
  const goBack = useAppStore((s) => s.goBack);
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const setHelpCenterOpen = useAppStore((s) => s.setHelpCenterOpen);
  const setSettingsPanelOpen = useAppStore((s) => s.setSettingsPanelOpen);
  const { theme, setTheme } = useTheme();

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // ? opens Help Center (requires Shift key)
      if (e.key === '?' && e.shiftKey && !isInput) {
        e.preventDefault();
        setHelpCenterOpen(true);
        return;
      }

      // Don't process single-key shortcuts in input fields or with modifier keys
      if (isInput || e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key.toLowerCase()) {
        case 'd':
          e.preventDefault();
          setView('dashboard');
          break;
        case 'm':
          e.preventDefault();
          setView('mandal');
          break;
        case 'v':
          e.preventDefault();
          setView('village');
          break;
        case 'f':
          e.preventDefault();
          setView('family');
          break;
        case 'r':
          e.preventDefault();
          setView('reports');
          break;
        case 't':
          e.preventDefault();
          setTheme(theme === 'dark' ? 'light' : 'dark');
          break;
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [setView, setHelpCenterOpen, setTheme, theme]);

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] flex flex-col transition-colors duration-300 bg-transition">
      {/* Sidebar Navigation - fixed, positioned below tricolor+navbar */}
      <SidebarNav />

      {/* Tricolor Bar — full width */}
      <div className="tricolor-bar w-full" />

      {/* Top Nav - Clean white/light background — full width, sticky */}
      <div className="sticky top-[3px] z-50 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-sm border-b border-slate-200/60 dark:border-slate-700/60 shadow-sm lg:pl-[52px]">
        <div className={`${maxWidth} mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <MobileMenuButton />
            {view !== 'dashboard' && (
              <>
                <button onClick={goBack} className="text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-100 transition-colors text-sm flex items-center gap-1">
                  <ChevronLeft className="w-4 h-4" /><span className="hidden sm:inline">Back</span>
                </button>
                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
              </>
            )}
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-2 h-2 rounded-full animate-pulse shrink-0"
                style={{ backgroundColor: accentDotColor || '#D97706' }}
              />
              <span
                className="text-sm font-bold tracking-wide truncate text-[#1E3A5F] dark:text-slate-100"
                style={{
                  fontFamily: 'var(--font-jetbrains)',
                  fontWeight: 700,
                  color: navTitleColor || undefined,
                }}
              >
                {navTitle || 'POLAVARAM R&R PORTAL'}
              </span>
              {navSubtitle && (
                <span className="text-sm font-normal text-slate-400 dark:text-slate-500 hidden md:inline">{navSubtitle}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <GlobalSearch />
            <span className="hidden md:inline text-slate-400 dark:text-slate-500">Government of Andhra Pradesh</span>
            <NotificationCenter />
            <button
              onClick={() => setSettingsPanelOpen(true)}
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-white/20 hover:border-slate-300 dark:hover:border-slate-600 transition-all"
              aria-label="Open settings"
              title="Settings"
            >
              <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            </button>
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 pulse-ring"><Activity className="w-3 h-3" /><span className="notification-pulse font-semibold">LIVE</span></div>
            <ThemeToggle />
          </div>
        </div>
        {/* Notification Banner (only on dashboard) */}
        {view === 'dashboard' && <NotificationBanner />}
      </div>

      {/* Main Content Area — with left padding for sidebar on desktop */}
      <div className="flex-1 lg:pl-[52px] smooth-scroll">
        {/* Breadcrumb */}
        {!hideBreadcrumb && (
          <div className={`${maxWidth} mx-auto px-4 sm:px-6 lg:px-8 overflow-hidden`}>
            <div className="truncate">{breadcrumb || <Breadcrumb />}</div>
          </div>
        )}

        {/* Page content */}
        {children}
      </div>

      {/* AI Chat Assistant — floating button + chat panel */}
      <AIChatAssistant />

      {/* Help Center — floating button + drawer */}
      <HelpCenter />

      {/* Footer — with left padding for sidebar on desktop */}
      <GovFooter />

      {/* Settings Panel (slide-out) */}
      <SettingsPanel />
    </div>
  );
}
