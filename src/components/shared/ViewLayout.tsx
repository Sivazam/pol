'use client';

import React from 'react';
import { useAppStore } from '@/lib/store';
import { ChevronLeft, Activity, ChevronRight } from 'lucide-react';
import SidebarNav from '@/components/shared/SidebarNav';
import MobileMenuButton from '@/components/shared/MobileMenuButton';
import GlobalSearch from '@/components/shared/GlobalSearch';
import NotificationBanner from '@/components/shared/NotificationBanner';
import ThemeToggle from '@/components/shared/ThemeToggle';
import Breadcrumb from '@/components/shared/Breadcrumb';
import GovFooter from '@/components/shared/GovFooter';

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

  return (
    <div className="w-full min-h-screen bg-[#F0F4F8] flex flex-col">
      {/* Sidebar Navigation - fixed, positioned below tricolor+navbar */}
      <SidebarNav />

      {/* Tricolor Bar — full width */}
      <div className="tricolor-bar w-full" />

      {/* Top Nav - Navy gradient — full width, sticky */}
      <div className="sticky top-[3px] z-50 bg-gradient-to-r from-[#0F2B46] to-[#1E3A5F] shadow-md">
        <div className={`${maxWidth} mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <MobileMenuButton />
            {view !== 'dashboard' && (
              <>
                <button onClick={goBack} className="text-white/70 hover:text-white transition-colors text-sm flex items-center gap-1">
                  <ChevronLeft className="w-4 h-4" /><span className="hidden sm:inline">Back</span>
                </button>
                <div className="w-px h-6 bg-white/20" />
              </>
            )}
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: accentDotColor || '#D97706' }}
              />
              <span
                className="text-sm font-medium tracking-wide"
                style={{
                  fontFamily: 'var(--font-jetbrains)',
                  color: navTitleColor || 'white',
                }}
              >
                {navTitle || 'POLAVARAM R&R PORTAL'}
              </span>
              {navSubtitle && (
                <span className="text-sm font-medium text-white/60 hidden md:inline">{navSubtitle}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-white/50">
            <GlobalSearch />
            <span className="hidden md:inline">Government of Andhra Pradesh</span>
            <div className="flex items-center gap-1.5 text-emerald-400"><Activity className="w-3 h-3" /><span>LIVE</span></div>
            <ThemeToggle />
          </div>
        </div>
        {/* Notification Banner (only on dashboard) */}
        {view === 'dashboard' && <NotificationBanner />}
      </div>

      {/* Main Content Area — with left padding for sidebar on desktop */}
      <div className="flex-1 lg:pl-[52px]">
        {/* Breadcrumb */}
        {!hideBreadcrumb && (
          <div className={`${maxWidth} mx-auto px-4 sm:px-6 lg:px-8`}>
            {breadcrumb || <Breadcrumb />}
          </div>
        )}

        {/* Page content */}
        {children}
      </div>

      {/* Footer — with left padding for sidebar on desktop */}
      <GovFooter />
    </div>
  );
}
