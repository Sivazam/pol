'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, CheckCircle2, LandPlot, Megaphone, AlertCircle,
  Clock, X, Check, Trash2
} from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

/* ─── Notification Types ─── */
type NotificationType = 'rr_eligibility' | 'plot_allotment' | 'system' | 'deadline';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
}

/* ─── Type Config ─── */
const NOTIFICATION_TYPE_CONFIG: Record<NotificationType, { icon: React.ElementType; color: string; bg: string; dotColor: string }> = {
  rr_eligibility: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', dotColor: 'bg-green-500' },
  plot_allotment: { icon: LandPlot, color: 'text-teal-600', bg: 'bg-teal-50', dotColor: 'bg-teal-500' },
  system: { icon: Megaphone, color: 'text-amber-600', bg: 'bg-amber-50', dotColor: 'bg-amber-500' },
  deadline: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', dotColor: 'bg-red-500' },
};

/* ─── Relative Time Helper ─── */
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/* ─── Mock Notifications ─── */
const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1',
    type: 'rr_eligibility',
    title: 'R&R Eligibility Updated',
    description: 'Family PDF-2847 moved to Eligible status.',
    timestamp: new Date(Date.now() - 25 * 60000),
    read: false,
  },
  {
    id: 'n2',
    type: 'plot_allotment',
    title: 'New Plot Allotted',
    description: 'Plot P-89 at R&R Colony, Chintoor allotted to PDF-3102.',
    timestamp: new Date(Date.now() - 2 * 3600000),
    read: false,
  },
  {
    id: 'n3',
    type: 'system',
    title: 'Data Updated',
    description: 'Village survey data for 3 new villages in Kunavaram mandal has been imported.',
    timestamp: new Date(Date.now() - 4 * 3600000),
    read: false,
  },
  {
    id: 'n4',
    type: 'deadline',
    title: 'R&R Scheme Deadline Approaching',
    description: 'Phase 2 compensation claims deadline is March 31, 2025. 847 families pending.',
    timestamp: new Date(Date.now() - 6 * 3600000),
    read: false,
  },
  {
    id: 'n5',
    type: 'rr_eligibility',
    title: 'R&R Eligibility Updated',
    description: 'Family PDF-4210 moved to Eligible status.',
    timestamp: new Date(Date.now() - 12 * 3600000),
    read: false,
  },
  {
    id: 'n6',
    type: 'plot_allotment',
    title: 'Possession Given',
    description: 'Plot P-142 at R&R Colony, Rampachodavaram — possession given to PDF-2847.',
    timestamp: new Date(Date.now() - 1 * 86400000),
    read: true,
  },
  {
    id: 'n7',
    type: 'system',
    title: 'New Villages Added',
    description: '5 new sub-villages under VR Puram mandal have been added to the database.',
    timestamp: new Date(Date.now() - 1.5 * 86400000),
    read: true,
  },
  {
    id: 'n8',
    type: 'plot_allotment',
    title: 'New Plot Allotted',
    description: 'Plot P-234 at R&R Colony, Kunavaram allotted to PDF-1567.',
    timestamp: new Date(Date.now() - 2 * 86400000),
    read: true,
  },
  {
    id: 'n9',
    type: 'deadline',
    title: 'Documentation Deadline',
    description: 'Land title document submission deadline for Phase 1 families: Feb 15, 2025.',
    timestamp: new Date(Date.now() - 3 * 86400000),
    read: true,
  },
  {
    id: 'n10',
    type: 'rr_eligibility',
    title: 'R&R Eligibility Verification Complete',
    description: 'Batch verification of 42 families in Chintoor mandal completed successfully.',
    timestamp: new Date(Date.now() - 5 * 86400000),
    read: true,
  },
];

/* ═══════════════════════════════════════════════════════════════
   NOTIFICATION CENTER COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);
  const [open, setOpen] = useState(false);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const handleNotificationClick = (id: string) => {
    markAsRead(id);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <Bell className="w-4 h-4 text-slate-500 dark:text-white/70 hover:text-slate-700 dark:hover:text-white transition-colors" />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white px-1"
              style={{ fontFamily: 'var(--font-jetbrains)' }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[360px] sm:w-[400px] p-0 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl bg-white dark:bg-[#1E293B] overflow-hidden glass-notification-popover"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded-full" style={{ fontFamily: 'var(--font-jetbrains)' }}>
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[10px] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 font-medium px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1"
                  title="Mark all as read"
                >
                  <Check className="w-3 h-3" />
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-[10px] text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors flex items-center gap-1"
                  title="Clear all notifications"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear all
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Notification List */}
        <div className="max-h-96 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#CBD5E1 transparent' }}>
          {notifications.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                <Bell className="w-6 h-6 text-slate-300" />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">No notifications</p>
              <p className="text-xs text-slate-400 mt-1">You&apos;re all caught up!</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {notifications.map((notification) => {
                const typeConfig = NOTIFICATION_TYPE_CONFIG[notification.type];
                const IconComponent = typeConfig.icon;

                return (
                  <motion.div
                    key={notification.id}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => handleNotificationClick(notification.id)}
                    className="px-4 py-3 border-b border-slate-50 dark:border-slate-700/50 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group ${
                      !notification.read ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''
                    }"
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div className={`w-8 h-8 rounded-lg ${typeConfig.bg} flex items-center justify-center shrink-0`}>
                        <IconComponent className={`w-4 h-4 ${typeConfig.color}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-xs font-semibold ${!notification.read ? 'text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}>
                            {notification.title}
                          </p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {!notification.read && (
                              <div className={`w-2 h-2 rounded-full ${typeConfig.dotColor}`} />
                            )}
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                          {notification.description}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1" style={{ fontFamily: 'var(--font-jetbrains)' }}>
                          <Clock className="w-2.5 h-2.5" />
                          {getRelativeTime(notification.timestamp)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-center">
            <p className="text-[10px] text-slate-400">
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                : 'All notifications read'}
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
