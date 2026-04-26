'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { RR_ELIGIBILITY_CONFIG } from '@/lib/constants';
import CountUp from 'react-countup';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { Users, Home, CheckCircle2, Clock, ChevronRight, BadgeCheck, MapPinned, ClipboardCheck, RefreshCw, FileSignature, Key, Settings2, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ViewLayout from '@/components/shared/ViewLayout';
import DataTableView from '@/components/shared/DataTableView';
import ProjectMap from '@/components/map/ProjectMap';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';

interface Stats {
  totalFamilies: number;
  totalMembers: number;
  firstSchemeCount: number;
  eligible: number;
  ineligible: number;
  plotsAllotted: number;
  plotsPending: number;
  plotsPossessionGiven: number;
  mandals: Array<{
    id: string; name: string; nameTelugu: string; code: string;
    latitude: number; longitude: number; color: string;
    familyCount: number; villageCount: number; firstSchemeCount: number;
  }>;
}

// R&R Eligibility colors
const RR_COLORS: Record<string, string> = {
  Eligible: '#16A34A',
  Ineligible: '#DC2626',
};

// Custom tooltip for R&R Eligibility donut chart
function SesDonutTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { status: string; count: number; fill: string } }> }) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0];
  return (
    <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{data.payload.status}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{data.value.toLocaleString()} families</p>
    </div>
  );
}

// Custom tooltip for Mandal bar chart
function MandalBarTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-xs text-slate-500 dark:text-slate-400">
          <span className="inline-block w-2 h-2 rounded-sm mr-1.5" style={{ backgroundColor: entry.color }} />
          {entry.name}: <span className="font-medium text-slate-700 dark:text-slate-300">{entry.value.toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
}

// Custom legend for Mandal bar chart
function MandalBarLegend({ payload }: { payload?: Array<{ value: string; color: string }> }) {
  if (!payload) return null;
  return (
    <div className="flex items-center justify-center gap-4 pt-3">
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
          <span className="text-xs text-slate-500">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

// Activity type to icon/color mapping
const ACTIVITY_TYPE_CONFIG: Record<string, { icon: typeof BadgeCheck; color: string; bg: string; border: string }> = {
  STATUS: { icon: BadgeCheck, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  ALLOTMENT: { icon: MapPinned, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200' },
  REGISTRATION: { icon: ClipboardCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
};

// Helper to format relative time from ISO timestamp
function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// Section header component with accent and separator
function SectionHeader({ title, accentColor = '#1E3A5F', subtitle }: { title: string; accentColor?: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-3">
        <div className="w-1 h-5 rounded-full" style={{ backgroundColor: accentColor }} />
        <div>
          <h3 className="text-[14px] font-bold text-slate-900 dark:text-slate-100 tracking-wide" style={{ fontWeight: 700 }}>
            {title}
          </h3>
          {subtitle && <p className="text-[12px] text-slate-400 mt-0.5 font-light">{subtitle}</p>}
        </div>
      </div>
      <div className="mt-2 h-px bg-slate-200/60 dark:bg-slate-700/60" />
    </div>
  );
}

export default function DashboardView() {
  const navigateToMandal = useAppStore((s) => s.navigateToMandal);
  const navigateToVillage = useAppStore((s) => s.navigateToVillage);
  const setView = useAppStore((s) => s.setView);
  const animationsEnabled = useAppStore((s) => s.animationsEnabled);
  const compactMode = useAppStore((s) => s.compactMode);
  const dashboardWidgets = useAppStore((s) => s.dashboardWidgets);
  const setDashboardWidget = useAppStore((s) => s.setDashboardWidget);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDataTable, setShowDataTable] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [recentActivities, setRecentActivities] = useState<Array<{ id: string; type: string; description: string; timestamp: string }>>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const showFamilyTable = useAppStore((s) => s.showFamilyTable);
  const setShowFamilyTable = useAppStore((s) => s.setShowFamilyTable);

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
        setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch('/api/activity?limit=5')
      .then(r => r.json())
      .then(data => setRecentActivities(data.activities || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!loading && containerRef.current && animationsEnabled) {
      const els = containerRef.current.querySelectorAll('.anim-in');
      gsap.fromTo(els, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'power3.out' });
    }
  }, [loading, animationsEnabled]);

  // Map mandal code to stats
  const mandalStatsMap = useMemo(() => {
    const map: Record<string, Stats['mandals'][0]> = {};
    stats?.mandals.forEach(m => { map[m.code] = m; });
    return map;
  }, [stats]);

  // R&R Eligibility donut chart data
  const rrDonutData = useMemo(() => {
    if (!stats) return [];
    return [
      { status: 'Eligible', count: stats.eligible },
      { status: 'Ineligible', count: stats.ineligible },
    ];
  }, [stats]);

  // Mandal comparison bar chart data
  const mandalBarData = useMemo(() => {
    if (!stats) return [];
    return stats.mandals.map(m => ({
      name: m.name,
      code: m.code,
      'Family Count': m.familyCount,
      'First Scheme Count': m.firstSchemeCount,
    }));
  }, [stats]);

  if (loading) {
    return (
      <ViewLayout navTitle="DASHBOARD">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 w-full">
          {/* Header skeleton */}
          <div className="skeleton-pulse h-24 rounded-xl" />
          {/* Counter cards skeleton */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {[1,2,3,4].map(i => (
              <div key={i} className="skeleton-pulse h-32 rounded-xl" />
            ))}
          </div>
          {/* Progress skeleton */}
          <div className="skeleton-pulse h-28 rounded-xl" />
          {/* Map + sidebar skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 skeleton-pulse h-[420px] rounded-xl" />
            <div className="space-y-4">
              <div className="skeleton-pulse h-48 rounded-xl" />
              <div className="skeleton-pulse h-32 rounded-xl" />
            </div>
          </div>
          {/* Charts skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="skeleton-pulse h-80 rounded-xl" />
            <div className="skeleton-pulse h-80 rounded-xl" />
          </div>
          {/* Activity skeleton */}
          <div className="skeleton-pulse h-48 rounded-xl" />
        </div>
      </ViewLayout>
    );
  }

  if (!stats) return (
    <ViewLayout navTitle="DASHBOARD">
      <div className="flex flex-col items-center justify-center py-32">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-red-600 dark:text-red-400 font-medium mb-4">Failed to load data</p>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#0F2B46] hover:bg-[#1E3A5F] text-white rounded-lg text-sm font-medium transition-colors shadow-sm hover:shadow-md"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    </ViewLayout>
  );

  const resettleCount = stats.plotsAllotted + stats.plotsPossessionGiven;
  const completionPct = stats.totalFamilies ? ((resettleCount / stats.totalFamilies) * 100).toFixed(1) : '0';

  // Counter cards — fake trend indicators removed
  const counterCards = [
    {
      label: 'Total Families',
      value: stats.totalFamilies,
      icon: Users,
      color: 'text-[#1E3A5F]',
      bg: 'bg-[#1E3A5F]/10',
      borderColor: 'border-[#1E3A5F]/20',
      topBorder: '#1E3A5F',
      gradientFrom: 'from-[#0F2B46]/[0.03]',
      gradientTo: 'to-[#1E3A5F]/[0.08]',
      trend: '',
      tooltip: 'Number of families affected by the Polavaram project across all 3 mandals',
    },
    {
      label: 'First Scheme Eligible',
      value: stats.firstSchemeCount,
      icon: CheckCircle2,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      topBorder: '#16A34A',
      gradientFrom: 'from-emerald-50/50',
      gradientTo: 'to-emerald-100/60',
      trend: '',
      tooltip: 'Families eligible for first scheme compensation under R&R policy',
    },
    {
      label: 'Families Resettled',
      value: resettleCount,
      icon: Home,
      color: 'text-amber-700',
      bg: 'bg-amber-50',
      borderColor: 'border-amber-200',
      topBorder: '#D97706',
      gradientFrom: 'from-amber-50/50',
      gradientTo: 'to-amber-100/60',
      trend: '',
      tooltip: 'Families who have been allotted plots or given possession for relocation',
    },
    {
      label: 'Pending Allotments',
      value: stats.plotsPending,
      icon: Clock,
      color: 'text-slate-600',
      bg: 'bg-slate-50',
      borderColor: 'border-slate-200',
      topBorder: '#64748B',
      gradientFrom: 'from-slate-50/50',
      gradientTo: 'to-slate-100/60',
      trend: '',
      tooltip: 'Families still waiting for plot allotment',
    },
  ];

  // SES completion info — survey is complete for all families
  const sesCompletePct = 100;

  const rrData = [
    { status: 'Eligible', count: stats.eligible, ...RR_ELIGIBILITY_CONFIG.Eligible },
    { status: 'Ineligible', count: stats.ineligible, ...RR_ELIGIBILITY_CONFIG.Ineligible },
  ];
  const maxRr = Math.max(...rrData.map(d => d.count), 1);

  return (
    <ViewLayout navTitle="POLAVARAM R&R PORTAL">
      <div ref={containerRef} className={`page-slide-in max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${compactMode ? 'py-3 space-y-4' : 'py-6 space-y-8'} w-full`}>
        {/* Government Header Banner */}
        {dashboardWidgets.header && (
        <div className="anim-in opacity-0 relative overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-[#1E293B] text-[#1A202C] dark:text-slate-100 shadow-[0_1px_3px_rgba(15,43,70,0.04),0_8px_24px_-12px_rgba(15,43,70,0.10)]">
          {/* Tricolour top accent */}
          <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, #FF9933 0% 33%, #E2E8F0 33% 66%, #138808 66% 100%)' }} />
          <div className="p-6 sm:p-7">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-[10px] tracking-[0.2em] uppercase text-[#1E3A5F]/70 dark:text-amber-400/80 font-semibold" style={{ fontFamily: 'var(--font-jetbrains)' }}>Government of Andhra Pradesh</p>
                  <span className="text-slate-300 dark:text-slate-600">·</span>
                  <span className="flex items-center gap-1.5 text-[10px] text-emerald-600/80 dark:text-emerald-400/80" style={{ fontFamily: 'var(--font-jetbrains)' }}>
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    </span>
                    Live · {lastUpdated || '…'}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight text-[#0F2B46] dark:text-slate-100 leading-tight" style={{ fontFamily: 'var(--font-inter)' }}>
                  Rehabilitation &amp; Resettlement Dashboard
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-normal max-w-2xl">
                  Water Resources Department · Monitoring{' '}
                  <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">{stats.totalFamilies.toLocaleString()}</span> families across{' '}
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{stats.mandals.length}</span> mandals and{' '}
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{stats.mandals.reduce((s, m) => s + m.villageCount, 0)}</span> villages.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="h-9 px-3 rounded-lg flex items-center gap-1.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/20 transition-all text-xs font-medium text-slate-600 dark:text-slate-300" title="Customize Dashboard">
                      <Settings2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Customize</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl p-4" align="end" sideOffset={8}>
                    <div className="flex items-center gap-2 mb-3">
                      <Settings2 className="w-4 h-4 text-[#1E3A5F] dark:text-amber-400" />
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Customize Dashboard</h4>
                    </div>
                    <div className="space-y-2.5">
                      {[
                        { key: 'header', label: 'Header Banner' },
                        { key: 'counters', label: 'Counter Cards' },
                        { key: 'progress', label: 'Progress Bar' },
                        { key: 'map', label: 'Project Area Map' },
                        { key: 'rrEligibility', label: 'R&R Eligibility Overview' },
                        { key: 'mandalCards', label: 'Mandal Cards' },
                        { key: 'charts', label: 'Charts' },
                        { key: 'activity', label: 'Recent Activity' },
                      ].map((widget) => (
                        <label key={widget.key} className="flex items-center gap-2.5 cursor-pointer group">
                          <Checkbox
                            checked={dashboardWidgets[widget.key] ?? true}
                            onCheckedChange={(checked) => setDashboardWidget(widget.key, !!checked)}
                            className="data-[state=checked]:bg-[#1E3A5F] data-[state=checked]:border-[#1E3A5F] dark:data-[state=checked]:bg-amber-600 dark:data-[state=checked]:border-amber-600"
                          />
                          <span className="text-xs text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">{widget.label}</span>
                        </label>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Always-visible Customize button (fallback when header is hidden) */}
        {!dashboardWidgets.header && (
          <div className="flex justify-end">
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm">
                  <Settings2 className="w-3.5 h-3.5" />
                  Customize
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl p-4" align="end" sideOffset={8}>
                <div className="flex items-center gap-2 mb-3">
                  <Settings2 className="w-4 h-4 text-[#1E3A5F] dark:text-amber-400" />
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Customize Dashboard</h4>
                </div>
                <div className="space-y-2.5">
                  {[
                    { key: 'header', label: 'Header Banner' },
                    { key: 'counters', label: 'Counter Cards' },
                    { key: 'progress', label: 'Progress Bar' },
                    { key: 'map', label: 'Project Area Map' },
                    { key: 'rrEligibility', label: 'R&R Eligibility Overview' },
                    { key: 'mandalCards', label: 'Mandal Cards' },
                    { key: 'charts', label: 'Charts' },
                    { key: 'activity', label: 'Recent Activity' },
                  ].map((widget) => (
                    <label key={widget.key} className="flex items-center gap-2.5 cursor-pointer group">
                      <Checkbox
                        checked={dashboardWidgets[widget.key] ?? true}
                        onCheckedChange={(checked) => setDashboardWidget(widget.key, !!checked)}
                        className="data-[state=checked]:bg-[#1E3A5F] data-[state=checked]:border-[#1E3A5F] dark:data-[state=checked]:bg-amber-600 dark:data-[state=checked]:border-amber-600"
                      />
                      <span className="text-xs text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">{widget.label}</span>
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Counter Cards — refined: subtle shadow, top accent stripe, clean tabular numbers */}
        {dashboardWidgets.counters && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {counterCards.map((card, i) => (
            <div
              key={i}
              className="anim-in opacity-0 group relative overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-[#1E293B] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-12px_rgba(15,43,70,0.18)] cursor-default"
              style={{ animationDelay: `${i * 80}ms`, boxShadow: '0 1px 2px rgba(15,43,70,0.04)' }}
              title={card.tooltip}
            >
              {/* Top accent stripe */}
              <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, ${card.topBorder} 0%, ${card.topBorder}55 100%)` }} />
              <div className="relative p-5 sm:p-6">
                <div className="flex items-start justify-between mb-4">
                  <span className="text-[10px] uppercase tracking-[0.16em] font-semibold text-slate-500 dark:text-slate-400" style={{ fontFamily: 'var(--font-jetbrains)' }}>
                    {card.label}
                  </span>
                  <div className={`p-2 rounded-lg ${card.bg} border ${card.borderColor}`}>
                    <card.icon className={`w-3.5 h-3.5 ${card.color}`} strokeWidth={2.2} />
                  </div>
                </div>
                <div className="text-3xl sm:text-[2.1rem] font-semibold tabular-nums tracking-tight text-slate-900 dark:text-slate-100 leading-none" style={{ fontFamily: 'var(--font-inter)' }}>
                  <CountUp end={card.value} duration={1.6} separator="," />
                </div>
                <div className="mt-2 h-px bg-slate-100 dark:bg-slate-800" />
                <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500 leading-snug">{card.tooltip}</p>
              </div>
            </div>
          ))}
        </div>
        )}

        {/* View All Families Button */}
        <div className="anim-in opacity-0 flex justify-center">
          <button
            onClick={() => setShowDataTable(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-[#1E3A5F] dark:text-amber-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
          >
            <Users className="w-4 h-4" />
            View All Families
          </button>
        </div>

        {/* Rehabilitation Progress Overview - Enhanced */}
        {dashboardWidgets.progress && (
        <div className="anim-in opacity-0 gov-card p-6 section-reveal">
          <SectionHeader title="REHABILITATION PROGRESS" accentColor="#D97706" subtitle="Track family resettlement status" />
          {/* SES Survey Status - complete for all families */}
          <div className="flex items-center gap-3 mb-4 px-3 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
            <BadgeCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">SES Survey Complete</span>
            <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">— All {stats.totalFamilies.toLocaleString()} families surveyed across 3 mandals</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5">
            <span className="text-xs text-slate-400" style={{ fontFamily: 'var(--font-jetbrains)' }}>{resettleCount.toLocaleString()} of {stats.totalFamilies.toLocaleString()} families resettled</span>
          </div>
          <div className="relative">
            {/* Percentage labels above the bar at 25%, 50%, 75% */}
            <div className="relative h-5 mb-1">
              {[25, 50, 75].map(pct => (
                <span
                  key={pct}
                  className="absolute text-[9px] font-medium text-slate-400 -translate-x-1/2"
                  style={{ left: `${pct}%`, fontFamily: 'var(--font-jetbrains)' }}
                >
                  {pct}%
                </span>
              ))}
            </div>
            {/* Progress bar - thicker h-3 */}
            <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 progress-bar-animated">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${completionPct}%` }}
                transition={{ duration: animationsEnabled ? 1.5 : 0, delay: animationsEnabled ? 0.5 : 0, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-500"
                style={{ boxShadow: '0 0 12px rgba(16, 185, 129, 0.3)' }}
              />
            </div>
            {/* Milestone markers as diamond shapes */}
            {[25, 50, 75].map(pct => (
              <div
                key={pct}
                className="absolute top-5"
                style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
              >
                {/* Diamond shape */}
                <div
                  className="w-2.5 h-2.5 rotate-45 bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-500 mx-auto"
                  style={{ marginTop: '2px' }}
                />
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="counter-value text-lg font-bold" style={{ color: parseFloat(completionPct) >= 50 ? '#16A34A' : '#D97706' }}>{completionPct}%</span>
              <span className="text-xs text-slate-400">Complete</span>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-slate-500">Allotted: {stats.plotsAllotted}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-slate-500">Possession: {stats.plotsPossessionGiven}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-300" />
                <span className="text-slate-500">Pending: {stats.plotsPending}</span>
              </span>
            </div>
          </div>
        </div>
        )}

        {(dashboardWidgets.map || dashboardWidgets.rrEligibility || dashboardWidgets.mandalCards) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Interactive Map using ProjectMap component */}
          {dashboardWidgets.map && (
          <div className="lg:col-span-2 anim-in opacity-0 section-reveal">
            <div className="gov-card p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <SectionHeader title="PROJECT AREA MAP" accentColor="#1E3A5F" subtitle="Click on mandal to explore" />
              </div>
              <div className="relative">
                <ProjectMap
                  center={[81.32, 17.63]}
                  zoom={9.5}
                  maxBounds={{ sw: [81.15, 17.40], ne: [81.70, 17.90] }}
                  height="420px"
                  showMandals={true}
                  showVillages={false}
                  showVillagePolygons={false}
                  showDam={true}
                  showControls={true}
                  showLegend={true}
                  showLayerToggles={false}
                  onMandalClick={(code, id) => {
                    const mStats = mandalStatsMap[code];
                    if (mStats) navigateToMandal(mStats.id);
                  }}
                  onVillageClick={(villageId, villageName) => {
                    navigateToVillage(villageId);
                  }}
                  className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700"
                />
                {/* Stat badges overlaid on map (top-left corner) */}
                <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 pointer-events-none">
                  <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-md px-2.5 py-1 border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Villages</span>
                    <span className="ml-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">{stats.mandals.reduce((s, m) => s + m.villageCount, 0)}</span>
                  </div>
                  <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-md px-2.5 py-1 border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">R&R Eligible</span>
                    <span className="ml-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">{stats.totalFamilies > 0 ? Math.round((stats.eligible / stats.totalFamilies) * 100) : 0}%</span>
                  </div>
                  <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-md px-2.5 py-1 border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Families</span>
                    <span className="ml-1.5 text-xs font-bold text-[#1E3A5F] dark:text-amber-400">{stats.totalFamilies.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-400 text-center flex items-center justify-center gap-2">
                <MapPinned className="w-3 h-3" /> Click on mandals to explore • Scroll to zoom • Drag to pan
              </p>
            </div>
          </div>
          )}

          {/* Sidebar */}
          <div className="space-y-6">
            {/* R&R Eligibility Overview - Enhanced with percentages, taller bars, rounded corners */}
            {dashboardWidgets.rrEligibility && (
            <div className="anim-in opacity-0 gov-card p-5 sm:p-6">
              <SectionHeader title="R&R ELIGIBILITY OVERVIEW" accentColor="#D97706" subtitle="SES complete for all families — eligibility determined" />
              <div className="space-y-4">
                {rrData.map((item) => {
                  const pct = stats.totalFamilies ? ((item.count / stats.totalFamilies) * 100).toFixed(1) : '0';
                  return (
                    <div key={item.status}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-xs font-semibold ${item.color}`}>{item.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 counter-value"><CountUp end={item.count} duration={1.5} separator="," /></span>
                          <span className="text-[10px] text-slate-400 font-medium px-1.5 py-0.5 bg-slate-50 dark:bg-slate-800 rounded">{pct}%</span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(item.count / maxRr) * 100}%` }}
                          transition={{ duration: animationsEnabled ? 1.2 : 0, ease: 'easeOut' }}
                          className={`h-full rounded-full ${item.bg}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            )}

            {/* Mandal Quick Cards */}
            {dashboardWidgets.mandalCards && (
            <div className="anim-in opacity-0 space-y-3">
              <SectionHeader title="MANDAL COMPARISON" accentColor="#0D9488" subtitle="Across 3 project mandals" />
              {stats.mandals.map((mandal, i) => (
                <motion.div
                  key={mandal.id}
                  className="group gov-card p-4 cursor-pointer hover:shadow-md transition-all"
                  whileHover={{ scale: 1.01 }}
                  onClick={() => navigateToMandal(mandal.id)}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: animationsEnabled ? i * 0.1 : 0 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: mandal.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{mandal.name}</h4>
                        <span className="text-xs font-bold" style={{ color: mandal.color }}>{mandal.familyCount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-slate-500">{mandal.villageCount} villages</span>
                        <span className="text-slate-300">·</span>
                        <p className="text-xs text-slate-400">families</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span className="text-emerald-700 font-medium">{mandal.firstSchemeCount} eligible</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-400">First Scheme</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-xs text-slate-400 group-hover:text-slate-600 transition-colors">
                    <span>View details</span><ChevronRight className="w-3 h-3" />
                  </div>
                </motion.div>
              ))}
            </div>
            )}
          </div>
        </div>
        )}

        {/* Charts Section - 2-column grid */}
        {dashboardWidgets.charts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 section-reveal">
          {/* A) R&R Eligibility Donut Chart */}
          <div className="anim-in opacity-0 gov-card p-5 sm:p-6">
            <SectionHeader title="R&R ELIGIBILITY DISTRIBUTION" accentColor="#16A34A" subtitle="Family eligibility breakdown" />
            <div className="relative w-full" style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={rrDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="status"
                    animationDuration={animationsEnabled ? 1200 : 0}
                  >
                    {rrDonutData.map((entry) => (
                      <Cell key={entry.status} fill={RR_COLORS[entry.status]} />
                    ))}
                  </Pie>
                  <Tooltip content={<SesDonutTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* B) Mandal Comparison Bar Chart */}
          <div className="anim-in opacity-0 gov-card p-5 sm:p-6">
            <SectionHeader title="MANDAL COMPARISON" accentColor="#1E3A5F" subtitle="Families vs First Scheme Eligible" />
            <div className="relative w-full" style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mandalBarData} layout="vertical" margin={{ left: 20, right: 20, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip content={<MandalBarTooltip />} />
                  <Legend content={<MandalBarLegend />} />
                  <Bar dataKey="Family Count" fill="#1E3A5F" radius={[0, 4, 4, 0]} barSize={18} />
                  <Bar dataKey="First Scheme Eligible" fill="#D97706" radius={[0, 4, 4, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        )}

        {/* Recent Activity Section - Using real API data */}
        {dashboardWidgets.activity && (
        <div className="anim-in opacity-0 gov-card p-5 sm:p-6 section-reveal">
          <SectionHeader title="RECENT ACTIVITY" accentColor="#0D9488" />
          <div className="relative">
            {/* Timeline vertical line - thicker w-0.5 */}
            <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-slate-200" />
            <div className="space-y-0">
              {recentActivities.length > 0 ? recentActivities.map((activity, index) => {
                const config = ACTIVITY_TYPE_CONFIG[activity.type] || ACTIVITY_TYPE_CONFIG.STATUS;
                const IconComp = config.icon;
                return (
                  <div
                    key={activity.id}
                    className={`stagger-item relative flex items-start gap-4 pl-2 py-3 px-3 -ml-2 rounded-lg transition-colors ${index % 2 === 0 ? 'bg-white dark:bg-[#1E293B]' : 'bg-slate-50/70 dark:bg-slate-800/50'}`}
                    style={{ animationDelay: `${index * 0.08}s` }}
                  >
                    {/* Timeline dot with icon */}
                    <div className={`relative z-10 flex items-center justify-center w-[30px] h-[30px] rounded-full border ${config.border} ${config.bg} shrink-0`}>
                      <IconComp className={`w-3.5 h-3.5 ${config.color}`} />
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-1 flex items-start justify-between gap-3">
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{activity.description}</p>
                      {/* Monospace time badge */}
                      <span className="shrink-0 text-[10px] text-slate-500 dark:text-slate-400 font-medium px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md whitespace-nowrap" style={{ fontFamily: 'var(--font-jetbrains)' }}>{formatRelativeTime(activity.timestamp)}</span>
                    </div>
                  </div>
                );
              }) : (
                <div className="py-8 text-center text-sm text-slate-400">No recent activity</div>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Plot Allotment - Enhanced with icon backgrounds, taller cards, more padding, gradient overlays */}
        <div className="anim-in opacity-0 gov-card p-5 sm:p-6">
          <SectionHeader title="PLOT ALLOTMENT STATUS" accentColor="#1E3A5F" />
          <div className="grid grid-cols-3 gap-4 sm:gap-5">
            {/* Pending - slate/neutral color */}
            <div className="relative overflow-hidden text-center p-5 sm:p-6 bg-gradient-to-br from-slate-50 dark:from-slate-800 to-slate-100/70 dark:to-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
              {/* Icon background */}
              <div className="mx-auto mb-3 w-10 h-10 rounded-full bg-slate-200/60 flex items-center justify-center">
                <Clock className="w-5 h-5 text-slate-500" />
              </div>
              <div className="counter-value text-xl sm:text-2xl font-bold text-slate-700"><CountUp end={stats.plotsPending} duration={1.5} separator="," /></div>
              <p className="mt-1 text-xs text-slate-500 font-medium">Pending</p>
            </div>
            {/* Allotted - amber/in-progress */}
            <div className="relative overflow-hidden text-center p-5 sm:p-6 bg-gradient-to-br from-amber-50 to-amber-100/60 rounded-xl border border-amber-200">
              {/* Icon background */}
              <div className="mx-auto mb-3 w-10 h-10 rounded-full bg-amber-200/50 flex items-center justify-center">
                <FileSignature className="w-5 h-5 text-amber-600" />
              </div>
              <div className="counter-value text-xl sm:text-2xl font-bold text-amber-700"><CountUp end={stats.plotsAllotted} duration={1.5} separator="," /></div>
              <p className="mt-1 text-xs text-amber-600 font-medium">Allotted</p>
            </div>
            {/* Possession Given - green/completed */}
            <div className="relative overflow-hidden text-center p-5 sm:p-6 bg-gradient-to-br from-emerald-50 to-emerald-100/60 rounded-xl border border-emerald-200">
              {/* Icon background */}
              <div className="mx-auto mb-3 w-10 h-10 rounded-full bg-emerald-200/50 flex items-center justify-center">
                <Key className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="counter-value text-xl sm:text-2xl font-bold text-emerald-700"><CountUp end={stats.plotsPossessionGiven} duration={1.5} separator="," /></div>
              <p className="mt-1 text-xs text-emerald-600 font-medium">Possession Given</p>
            </div>
          </div>
        </div>
      </div>

      {/* Family Data Table Dialog */}
      <DataTableView open={showDataTable || showFamilyTable} onOpenChange={(open) => { setShowDataTable(open); if (!open) setShowFamilyTable(false); }} />
    </ViewLayout>
  );
}
