'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, CheckCircle2, ArrowRight, Clock, Filter,
  BadgeCheck, MapPinned, UserPlus, ChevronDown,
  Calendar, BarChart3, RefreshCw,
} from 'lucide-react';
import ViewLayout from '@/components/shared/ViewLayout';

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  relatedEntityId: string;
  relatedEntityType: string;
  severity: string;
  mandalCode: string;
}

interface ActivitySummary {
  total: number;
  thisWeek: number;
  today: number;
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bgColor: string; borderColor: string }> = {
  STATUS: { label: 'Status Change', icon: BadgeCheck, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-900/30', borderColor: 'border-amber-200 dark:border-amber-700' },
  ALLOTMENT: { label: 'Plot Allotment', icon: MapPinned, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-900/30', borderColor: 'border-emerald-200 dark:border-emerald-700' },
  REGISTRATION: { label: 'Registration', icon: UserPlus, color: 'text-teal-600 dark:text-teal-400', bgColor: 'bg-teal-50 dark:bg-teal-900/30', borderColor: 'border-teal-200 dark:border-teal-700' },
};

const SEVERITY_CONFIG: Record<string, { dotColor: string; lineColor: string }> = {
  success: { dotColor: 'bg-emerald-500', lineColor: 'bg-emerald-200 dark:bg-emerald-800' },
  warning: { dotColor: 'bg-amber-500', lineColor: 'bg-amber-200 dark:bg-amber-800' },
  info: { dotColor: 'bg-teal-500', lineColor: 'bg-teal-200 dark:bg-teal-800' },
};

const MANDAL_OPTIONS = [
  { value: '', label: 'All Mandals' },
  { value: 'VRP', label: 'VR Puram' },
  { value: 'CHN', label: 'Chintoor' },
  { value: 'KUN', label: 'Kunavaram' },
];

function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function ActivityView() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [summary, setSummary] = useState<ActivitySummary>({ total: 0, thisWeek: 0, today: 0 });
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<string>('');
  const [activeMandal, setActiveMandal] = useState<string>('');
  const [limit, setLimit] = useState(50);
  const animationsEnabled = useAppStore((s) => s.animationsEnabled);
  const navigateToFamily = useAppStore((s) => s.navigateToFamily);
  const selectFamily = useAppStore((s) => s.selectFamily);
  const setView = useAppStore((s) => s.setView);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', limit.toString());
      if (activeType) params.set('type', activeType);
      if (activeMandal) params.set('mandalCode', activeMandal);

      const res = await fetch(`/api/activity?${params.toString()}`);
      const data = await res.json();
      setActivities(data.activities || []);
      setSummary(data.summary || { total: 0, thisWeek: 0, today: 0 });
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [limit, activeType, activeMandal]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const handleEntityClick = (entityId: string, entityType: string) => {
    if (entityType === 'family') {
      navigateToFamily(entityId, '');
    }
  };

  const typeFilters = [
    { value: '', label: 'All', icon: Activity },
    { value: 'STATUS', label: 'Status', icon: TYPE_CONFIG.STATUS.icon },
    { value: 'ALLOTMENT', label: 'Allotment', icon: TYPE_CONFIG.ALLOTMENT.icon },
    { value: 'REGISTRATION', label: 'Registration', icon: TYPE_CONFIG.REGISTRATION.icon },
  ];

  return (
    <ViewLayout navTitle="ACTIVITY TIMELINE" navSubtitle="Recent Events">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total', value: summary.total, icon: BarChart3, color: 'text-[#1E3A5F] dark:text-amber-400', bg: 'bg-[#1E3A5F]/10 dark:bg-amber-900/20', border: 'border-[#1E3A5F]/20 dark:border-amber-700/30' },
            { label: 'This Week', value: summary.thisWeek, icon: Calendar, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-700/30' },
            { label: 'Today', value: summary.today, icon: Clock, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-700/30' },
          ].map((card) => (
            <motion.div
              key={card.label}
              initial={animationsEnabled ? { opacity: 0, y: 20 } : undefined}
              animate={animationsEnabled ? { opacity: 1, y: 0 } : undefined}
              transition={{ duration: 0.4 }}
              className={`rounded-xl border ${card.border} bg-white dark:bg-[#1E293B] p-4 sm:p-5 shadow-sm`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-md ${card.bg}`}><card.icon className={`w-3.5 h-3.5 ${card.color}`} /></div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{card.label}</span>
              </div>
              <p className={`text-xl sm:text-2xl font-bold ${card.color}`} style={{ fontFamily: 'var(--font-jetbrains)' }}>
                {card.value.toLocaleString()}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Type filter buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-1" />
            {typeFilters.map((filter) => {
              const isActive = activeType === filter.value;
              return (
                <button
                  key={filter.value}
                  onClick={() => setActiveType(filter.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#1E3A5F] dark:bg-amber-600 text-white shadow-sm'
                      : 'bg-white dark:bg-[#1E293B] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <filter.icon className="w-3 h-3" />
                  {filter.label}
                </button>
              );
            })}
          </div>

          {/* Mandal filter dropdown */}
          <div className="flex items-center gap-2 ml-auto">
            <select
              value={activeMandal}
              onChange={(e) => setActiveMandal(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 dark:focus:ring-amber-500/20"
            >
              {MANDAL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              onClick={fetchActivities}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Timeline */}
        <div className="relative">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex items-start gap-4 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
                  <div className="flex-1">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-16">
              <Activity className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400 text-sm">No activities found</p>
              <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="relative">
              {/* Vertical timeline line */}
              <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />

              <AnimatePresence mode="popLayout">
                {activities.map((activity, index) => {
                  const typeConfig = TYPE_CONFIG[activity.type] || TYPE_CONFIG.REGISTRATION;
                  const severityConfig = SEVERITY_CONFIG[activity.severity] || SEVERITY_CONFIG.info;
                  const IconComp = typeConfig.icon;

                  return (
                    <motion.div
                      key={activity.id}
                      initial={animationsEnabled ? { opacity: 0, x: -20 } : undefined}
                      animate={animationsEnabled ? { opacity: 1, x: 0 } : undefined}
                      transition={animationsEnabled ? { duration: 0.3, delay: Math.min(index * 0.03, 1) } : undefined}
                      className="relative flex items-start gap-4 pl-1 py-2.5"
                    >
                      {/* Timeline dot */}
                      <div className="relative z-10 flex items-center justify-center w-[30px] h-[30px] rounded-full border-2 border-white dark:border-[#1E293B] shrink-0"
                        style={{ backgroundColor: severityConfig.dotColor }}
                      >
                        <IconComp className="w-3.5 h-3.5 text-white" />
                      </div>

                      {/* Content card */}
                      <div className={`flex-1 min-w-0 rounded-lg border ${typeConfig.borderColor} ${typeConfig.bgColor} p-3 sm:p-4 transition-all hover:shadow-md`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            {/* Type badge */}
                            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md ${typeConfig.color} bg-white/60 dark:bg-slate-800/60 mb-1.5`}>
                              <IconComp className="w-2.5 h-2.5" />
                              {typeConfig.label}
                            </span>
                            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                              {activity.description}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium px-2 py-0.5 bg-white/60 dark:bg-slate-800/60 rounded-md whitespace-nowrap" style={{ fontFamily: 'var(--font-jetbrains)' }}>
                              {formatRelativeTime(activity.timestamp)}
                            </span>
                            {activity.relatedEntityType === 'family' && (
                              <button
                                onClick={() => handleEntityClick(activity.relatedEntityId, activity.relatedEntityType)}
                                className="flex items-center gap-0.5 text-[10px] text-[#1E3A5F] dark:text-amber-400 font-medium hover:underline"
                              >
                                View <ArrowRight className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Load More */}
        {activities.length >= limit && (
          <div className="flex justify-center pt-2">
            <button
              onClick={() => setLimit((prev) => prev + 50)}
              className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-[#1E3A5F] dark:text-amber-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-sm hover:shadow-md"
            >
              <ChevronDown className="w-4 h-4" />
              Load More
            </button>
          </div>
        )}
      </div>
    </ViewLayout>
  );
}
