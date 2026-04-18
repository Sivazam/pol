'use client';

import React from 'react';
import { X, Bell } from 'lucide-react';
import { useAppStore } from '@/lib/store';

const ANNOUNCEMENTS = [
  '📢 SES verification drive ongoing across all 3 mandals — families pending verification',
  '📋 New plot allotments announced for rehabilitation colonies — check status now',
  '✅ Plot possession process continues for approved families across all mandals',
  '🏛️ Polavaram R&R Portal — Official portal of Government of Andhra Pradesh',
  '📊 Rehabilitation progress updated — 13,961 families tracked across 3 mandals and 30 villages',
];

export default function NotificationBanner() {
  const notificationBannerVisible = useAppStore((s) => s.notificationBannerVisible);
  const setNotificationBannerVisible = useAppStore((s) => s.setNotificationBannerVisible);

  if (!notificationBannerVisible) return null;

  return (
    <div className="w-full bg-amber-50 border-b border-amber-200 relative overflow-hidden no-print">
      <div className="max-w-7xl mx-auto flex items-center h-9">
        {/* Left accent with bell icon */}
        <div className="flex items-center gap-2 px-3 shrink-0 border-r border-amber-200">
          <Bell className="w-3.5 h-3.5 text-amber-600" />
          <span className="text-[10px] font-semibold text-amber-700 tracking-wider uppercase" style={{ fontFamily: 'var(--font-jetbrains)' }}>
            Updates
          </span>
        </div>

        {/* Scrolling announcement */}
        <div className="flex-1 overflow-hidden relative">
          <div className="flex whitespace-nowrap" style={{ animation: 'marquee 40s linear infinite' }}>
            <span className="text-xs text-amber-800 mx-8">
              {ANNOUNCEMENTS.join('     •     ')}
            </span>
            <span className="text-xs text-amber-800 mx-8">
              {ANNOUNCEMENTS.join('     •     ')}
            </span>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={() => setNotificationBannerVisible(false)}
          className="px-3 h-full flex items-center hover:bg-amber-100 transition-colors shrink-0"
          aria-label="Dismiss notification"
        >
          <X className="w-3.5 h-3.5 text-amber-600" />
        </button>
      </div>
    </div>
  );
}
