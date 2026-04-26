'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { RR_ELIGIBILITY_CONFIG, ALLOTMENT_STATUS_CONFIG } from '@/lib/constants';
import CountUp from 'react-countup';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import {
  ChevronLeft, ChevronRight, Activity, Users, LandPlot, Home,
  Calendar, MapPin, FileText, ArrowRight, Star, CheckCircle2,
  Clock, Eye, User, Download, Printer, FileSpreadsheet,
  ShieldCheck, FileSearch, ShieldAlert, ShieldX,
  Search, Filter, X, ChevronsLeft, ChevronsRight,
  RotateCcw, ArrowUpDown, Info, Heart, Bookmark,
} from 'lucide-react';
import ViewLayout from '@/components/shared/ViewLayout';

// ─── Shared Types ───────────────────────────────────────────────

interface FamilyMember {
  id: string;
  beneficiaryName: string;
  relation: string;
  age: number;
  gender: string;
  aadharNo: string | null;
  occupation: string | null;
}

interface PlotAllotment {
  id: string;
  plotNumber: string | null;
  colonyName: string | null;
  latitude: number | null;
  longitude: number | null;
  areaSqYards: number | null;
  allotmentStatus: string;
  allotmentDate: string | null;
}

interface FamilyData {
  id: string;
  pdfId: string;
  beneficiaryName: string;
  caste: string | null;
  landAcres: number | null;
  houseType: string | null;
  rrEligibility: string;
  hasFirstScheme: boolean;
  createdAt: string;
  village: {
    id: string; name: string; nameTelugu: string; code: string;
    latitude: number; longitude: number;
    mandal: { id: string; name: string; nameTelugu: string; code: string; color: string; };
  };
  members: FamilyMember[];
  plotAllotment: PlotAllotment | null;
}

interface RelatedFamily {
  id: string;
  pdfId: string;
  beneficiaryName: string;
  rrEligibility: string;
  villageName?: string;
}

// ─── List Mode Types ────────────────────────────────────────────

interface FamilyListItem {
  id: string;
  pdfId: string;
  beneficiaryName: string;
  rrEligibility: string;
  hasFirstScheme: boolean;
  memberCount: number;
  villageName: string;
  mandalName: string;
  mandalCode: string;
  mandalColor: string;
  plotAllotment: {
    allotmentStatus: string;
  } | null;
  landAcres: number | null;
  houseType: string | null;
  caste: string | null;
}

interface MandalOption {
  id: string;
  name: string;
  code: string;
  color: string;
}

// ─── Constants ──────────────────────────────────────────────────

const TIMELINE_STEPS = [
  { key: 'Eligible', label: 'R&R Eligible', icon: ShieldCheck, stepNum: 1 },
  { key: 'FIRST_SCHEME', label: 'First Scheme', icon: Star, stepNum: 2 },
  { key: 'PLOT_ALLOTTED', label: 'Plot Allotted', icon: LandPlot, stepNum: 3 },
  { key: 'RELOCATED', label: 'Relocated', icon: Home, stepNum: 4 },
];

/**
 * Compute timeline dates based on the family's createdAt and current R&R eligibility.
 * Since we don't have actual timestamps for each status transition, we derive
 * approximate dates: Assessed = createdAt, subsequent steps offset by ~2 months each.
 */
function getTimelineDates(createdAt: string, rrEligibility: string): Record<string, string> {
  const created = new Date(createdAt);
  const formatDate = (d: Date) => d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  const offsets: Record<string, number> = { Eligible: 0, FIRST_SCHEME: 2, PLOT_ALLOTTED: 4, RELOCATED: 6 };
  const dates: Record<string, string> = {};
  const timelinePos = getTimelinePosition(rrEligibility);
  for (const step of TIMELINE_STEPS) {
    const stepIndex = step.stepNum - 1;
    if (stepIndex <= timelinePos && timelinePos >= 0) {
      // Completed or current step — show a calculated date
      const d = new Date(created);
      d.setMonth(d.getMonth() + (offsets[step.key] || 0));
      dates[step.key] = formatDate(d);
    } else {
      dates[step.key] = '';
    }
  }
  return dates;
}

const RR_ELIGIBILITY_ICONS: Record<string, React.ElementType> = {
  Eligible: ShieldCheck,
  Ineligible: ShieldX,
};

const RR_ELIGIBILITY_BORDER: Record<string, string> = {
  Eligible: 'border-l-green-500',
  Ineligible: 'border-l-red-500',
};

const STATUS_BORDER_COLORS: Record<string, string> = {
  Eligible: 'border-l-green-600',
  Ineligible: 'border-l-red-600',
};

const QUICK_STAT_CONFIGS = [
  { key: 'members', icon: Users, iconColor: 'text-slate-600', circleBg: 'bg-slate-100', gradient: 'from-slate-50 to-white', topBorder: 'border-t-slate-400' },
  { key: 'minors', icon: Users, iconColor: 'text-amber-600', circleBg: 'bg-amber-100', gradient: 'from-amber-50/50 to-white', topBorder: 'border-t-amber-400' },
  { key: 'land', icon: LandPlot, iconColor: 'text-teal-600', circleBg: 'bg-teal-100', gradient: 'from-teal-50/50 to-white', topBorder: 'border-t-teal-400' },
  { key: 'plot', icon: Home, iconColor: 'text-green-600', circleBg: 'bg-green-100', gradient: 'from-green-50/50 to-white', topBorder: 'border-t-green-400' },
];

function getTimelinePosition(rrEligibility: string): number {
  switch (rrEligibility) {
    case 'Eligible': return 0;
    case 'Ineligible': return -1;
    default: return 0;
  }
}

// ═══════════════════════════════════════════════════════════════════
// FAMILIES LIST MODE (no family selected)
// ═══════════════════════════════════════════════════════════════════

function FamiliesListView() {
  const navigateToFamily = useAppStore((s) => s.navigateToFamily);
  const compactMode = useAppStore((s) => s.compactMode);
  const defaultPageSize = useAppStore((s) => s.defaultPageSize);
  const defaultSortOrder = useAppStore((s) => s.defaultSortOrder);
  const animationsEnabled = useAppStore((s) => s.animationsEnabled);
  const bookmarkedFamilies = useAppStore((s) => s.bookmarkedFamilies);
  const toggleBookmark = useAppStore((s) => s.toggleBookmark);

  const [families, setFamilies] = useState<FamilyListItem[]>([]);
  const [mandals, setMandals] = useState<MandalOption[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [rrEligibilityFilter, setRrEligibilityFilter] = useState('');
  const [mandalId, setMandalId] = useState('');
  const [sortBy, setSortBy] = useState(defaultSortOrder);
  const [loading, setLoading] = useState(true);
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const limit = defaultPageSize;

  // Fetch mandals for dropdown
  useEffect(() => {
    fetch('/api/mandals')
      .then(r => r.json())
      .then(data => {
        const opts: MandalOption[] = (data || []).map((m: any) => ({
          id: m.id, name: m.name, code: m.code, color: m.color,
        }));
        setMandals(opts);
      })
      .catch(() => {});
  }, []);

  // Fetch all families
  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({
      all: 'true',
      page: String(page),
      limit: String(limit),
    });
    if (search) params.set('search', search);
    if (rrEligibilityFilter) params.set('rrEligibility', rrEligibilityFilter);
    if (mandalId) params.set('mandalId', mandalId);
    if (sortBy) params.set('sortBy', sortBy);

    fetch(`/api/families?${params}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        setFamilies(data.families || []);
        setTotal(data.total || 0);
        setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page, search, rrEligibilityFilter, mandalId, sortBy, limit]);

  // GSAP entrance animation
  useEffect(() => {
    if (!loading && containerRef.current && animationsEnabled) {
      const els = containerRef.current.querySelectorAll('.anim-in');
      gsap.fromTo(els, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.06, ease: 'power3.out' });
    }
  }, [loading, page, animationsEnabled]);

  const totalPages = Math.ceil(total / limit);
  const hasActiveFilters = search || rrEligibilityFilter || mandalId;

  const clearAllFilters = useCallback(() => {
    setSearch('');
    setRrEligibilityFilter('');
    setMandalId('');
    setSortBy('pdfId');
    setPage(1);
    setLoading(true);
  }, []);

  // Loading skeleton
  if (loading && families.length === 0) {
    return (
      <ViewLayout navTitle="ALL FAMILIES" navTitleColor="#FBBF24" accentDotColor="#D97706" maxWidth="max-w-7xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Header skeleton */}
          <div className="skeleton-pulse h-36 rounded-xl" />
          {/* 4 stat card skeletons */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="skeleton-pulse h-28 rounded-xl" />
            ))}
          </div>
          {/* Search bar skeleton */}
          <div className="skeleton-pulse h-16 rounded-xl" />
          {/* Summary bar skeleton */}
          <div className="skeleton-pulse h-10 rounded-lg" />
          {/* Grid of family card skeletons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1,2,3,4,5,6,7,8].map(i => (
              <div key={i} className="skeleton-pulse h-52 rounded-xl" />
            ))}
          </div>
        </div>
      </ViewLayout>
    );
  }

  return (
    <ViewLayout
      navTitle="ALL FAMILIES"
      navTitleColor="#FBBF24"
      accentDotColor="#D97706"
      maxWidth="max-w-7xl"
    >
      <div ref={containerRef} className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${compactMode ? 'py-3 space-y-3' : 'py-6 space-y-6'}`}>
        {/* ===== A. Header Card ===== */}
        <div className={`anim-in opacity-0 gov-card ${compactMode ? 'p-4 sm:p-5' : 'p-6 sm:p-8'} relative overflow-hidden`}>
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, #0F2B46 10px, #0F2B46 11px)`,
            }}
          />
          <div className="relative z-[1] text-center space-y-3">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Users className="w-5 h-5 text-[#D97706]" />
              <span className="text-xs font-medium text-[#D97706] tracking-wider uppercase">
                Family Registry
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
              All Families
            </h1>
            <p className="text-slate-500 text-sm">Browse all families across mandals and villages</p>

            <div className="ashoka-divider max-w-xs mx-auto" />

            <div className="flex items-center justify-center gap-8 pt-3">
              <div className="flex flex-col items-center">
                <span className="counter-value text-3xl sm:text-4xl font-bold text-[#0F2B46]">
                  <CountUp end={total} duration={1.5} separator="," />
                </span>
                <span className="text-xs text-slate-400 mt-1 font-medium uppercase tracking-wider">Total Families</span>
              </div>
              <div className="w-px h-12 bg-slate-200" />
              <div className="flex flex-col items-center">
                <span className="counter-value text-3xl sm:text-4xl font-bold text-emerald-700">
                  <CountUp end={families.filter(f => f.hasFirstScheme).length} duration={1.2} separator="," />
                </span>
                <span className="text-xs text-slate-400 mt-1 font-medium uppercase tracking-wider">First Scheme (This Page)</span>
              </div>
            </div>
          </div>
        </div>

        {/* ===== B. Search & Filter Bar ===== */}
        <div className={`anim-in opacity-0 bg-slate-50 border border-slate-200 rounded-xl ${compactMode ? 'p-3' : 'p-4'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Filter & Search</span>
              <button
                onClick={() => { setShowFavoritesOnly(!showFavoritesOnly); setPage(1); }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                  showFavoritesOnly
                    ? 'bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-400'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-amber-300 hover:text-amber-600 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-400 dark:hover:border-amber-600'
                }`}
              >
                <Bookmark className={`w-3 h-3 ${showFavoritesOnly ? 'fill-amber-500' : ''}`} />
                Favorites
                {bookmarkedFamilies.length > 0 && (
                  <span className={`ml-0.5 px-1.5 py-0 rounded-full text-[10px] font-bold ${
                    showFavoritesOnly
                      ? 'bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                  }`}>
                    {bookmarkedFamilies.length}
                  </span>
                )}
              </button>
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1 text-xs text-[#D97706] hover:text-[#B45309] font-medium transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Clear All
              </button>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by PDF number or family name..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); setLoading(true); }}
                className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F]/40 transition-all shadow-sm"
              />
              {search && (
                <button
                  onClick={() => { setSearch(''); setPage(1); setLoading(true); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {/* R&R Eligibility filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={rrEligibilityFilter}
                onChange={e => { setRrEligibilityFilter(e.target.value); setPage(1); setLoading(true); }}
                className="pl-10 pr-8 py-2.5 bg-white dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-100 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F]/40 transition-all shadow-sm"
              >
                <option value="">All Status</option>
                <option value="Eligible">Eligible</option>
                <option value="Ineligible">Ineligible</option>
              </select>
            </div>
            {/* Mandal filter */}
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={mandalId}
                onChange={e => { setMandalId(e.target.value); setPage(1); setLoading(true); }}
                className="pl-10 pr-8 py-2.5 bg-white dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-100 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F]/40 transition-all shadow-sm"
              >
                <option value="">All Mandals</option>
                {mandals.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            {/* Sort */}
            <div className="relative">
              <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={sortBy}
                onChange={e => { setSortBy(e.target.value); setPage(1); setLoading(true); }}
                className="pl-10 pr-8 py-2.5 bg-white dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-100 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F]/40 transition-all shadow-sm"
              >
                <option value="pdfId">Sort by PDF ID</option>
                <option value="beneficiaryName">Sort by Name</option>
                <option value="rrEligibility">Sort by R&R Eligibility</option>
              </select>
            </div>
          </div>
        </div>

        {/* ===== C. Family Count Summary Bar ===== */}
        <div className="anim-in opacity-0 flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg px-4 py-2">
          <div className="flex items-center gap-2">
            <p className="text-xs text-slate-500">
              Showing <span className="font-semibold text-slate-700">{families.length}</span> of <span className="font-semibold text-slate-700">{total}</span> families
            </p>
            <div className="relative">
              <button
                onMouseEnter={() => setShowInfoTooltip(true)}
                onMouseLeave={() => setShowInfoTooltip(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
              {showInfoTooltip && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-800 text-white text-[10px] rounded-lg whitespace-nowrap shadow-lg z-10">
                  Filters apply to all families across mandals
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800" />
                </div>
              )}
            </div>
          </div>
          {(rrEligibilityFilter || mandalId) && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Filtered by:</span>
              {rrEligibilityFilter && (() => {
                const cfg = RR_ELIGIBILITY_CONFIG[rrEligibilityFilter];
                return (
                  <button
                    onClick={() => { setRrEligibilityFilter(''); setPage(1); setLoading(true); }}
                    className={`text-xs font-medium px-2 py-0.5 rounded border ${cfg?.color || ''} ${cfg?.bg || ''} ${cfg?.border || ''} hover:opacity-80 transition-opacity cursor-pointer flex items-center gap-1`}
                  >
                    {cfg?.label || rrEligibilityFilter}
                    <X className="w-2.5 h-2.5" />
                  </button>
                );
              })()}
              {mandalId && (() => {
                const mandal = mandals.find(m => m.id === mandalId);
                return mandal ? (
                  <button
                    onClick={() => { setMandalId(''); setPage(1); setLoading(true); }}
                    className="text-xs font-medium px-2 py-0.5 rounded border bg-slate-100 text-slate-600 border-slate-200 hover:opacity-80 transition-opacity cursor-pointer flex items-center gap-1"
                  >
                    {mandal.name}
                    <X className="w-2.5 h-2.5" />
                  </button>
                ) : null;
              })()}
            </div>
          )}
        </div>

        {/* ===== D. Family Cards Grid ===== */}
        <motion.div
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: animationsEnabled ? 0.04 : 0 } },
          }}
          initial="hidden"
          animate="visible"
          key={`${page}-${showFavoritesOnly}`}
          className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${compactMode ? 'gap-3' : 'gap-4'}`}
        >
          {(showFavoritesOnly ? families.filter((f) => bookmarkedFamilies.includes(f.id)) : families).map((f) => {
            const statusCfg = RR_ELIGIBILITY_CONFIG[f.rrEligibility] || RR_ELIGIBILITY_CONFIG.Eligible;
            const borderColor = STATUS_BORDER_COLORS[f.rrEligibility] || 'border-l-slate-300';
            const isBookmarked = bookmarkedFamilies.includes(f.id);
            return (
              <motion.div
                key={f.id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
                transition={{ duration: animationsEnabled ? 0.3 : 0, ease: 'easeOut' }}
                className={`gov-card ${compactMode ? 'p-3' : 'p-4'} cursor-pointer group border-l-4 ${borderColor} hover:scale-[1.01] transition-all duration-200 relative overflow-hidden`}
                onClick={() => navigateToFamily(f.pdfId, f.id)}
              >
                {/* Subtle background gradient on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-50/0 via-transparent to-slate-100/0 group-hover:from-slate-50/50 group-hover:to-amber-50/30 transition-all duration-300 pointer-events-none" />

                <div className="relative z-[1]">
                  {/* PDF Badge + Bookmark */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="gov-badge px-2.5 py-1 rounded-md border bg-amber-50 border-amber-300 text-amber-700 tracking-widest flex items-center gap-1.5 text-xs">
                      <FileText className="w-3 h-3" />
                      {f.pdfId}
                    </span>
                    <div className="flex items-center gap-1">
                      {f.hasFirstScheme && (
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleBookmark(f.id); }}
                        className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${
                          isBookmarked
                            ? 'text-red-500 hover:text-red-600 bg-red-50 dark:bg-red-900/20'
                            : 'text-slate-300 hover:text-red-400 hover:bg-red-50 dark:text-slate-600 dark:hover:text-red-400 dark:hover:bg-red-900/20'
                        }`}
                        aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                      >
                        <Heart className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-red-500' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Beneficiary Name */}
                  <p className="text-sm font-medium text-slate-900 leading-snug">
                    {f.beneficiaryName}
                  </p>

                  {/* Village Name */}
                  <div className="mt-2 flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span className="text-xs text-slate-500">{f.villageName}</span>
                  </div>

                  {/* Mandal Badge */}
                  <div className="mt-1.5">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                      style={{ backgroundColor: f.mandalColor }}
                    >
                      {f.mandalName}
                    </span>
                  </div>

                  {/* Detail Chips */}
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                      <Users className="w-3 h-3 text-slate-400" />
                      {f.memberCount}
                    </span>
                    {f.landAcres && (
                      <span className="flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                        <LandPlot className="w-3 h-3 text-slate-400" />
                        {f.landAcres} acres
                      </span>
                    )}
                  </div>

                  {/* Status & Chevron */}
                  <div className="mt-3 pt-3 border-t border-dashed border-slate-200 flex items-center justify-between">
                    <span
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border ${statusCfg.color} ${statusCfg.bg} ${statusCfg.border}`}
                    >
                      {statusCfg.label}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
                  </div>

                  {/* View Details on hover */}
                  <div className="mt-2 text-right">
                    <span className="text-xs text-[#D97706] font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      View Details →
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Empty State */}
        {families.length === 0 && !loading && (
          <div className="gov-card p-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
                <Search className="w-6 h-6 text-slate-300" />
              </div>
              <p className="text-slate-500 text-sm">No families found matching your criteria</p>
              <button
                onClick={clearAllFilters}
                className="text-xs text-[#D97706] hover:underline font-medium"
              >
                Clear filters
              </button>
            </div>
          </div>
        )}
        {/* Favorites-only empty state */}
        {showFavoritesOnly && families.filter((f) => bookmarkedFamilies.includes(f.id)).length === 0 && families.length > 0 && (
          <div className="gov-card p-8 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center">
                <Bookmark className="w-6 h-6 text-amber-300" />
              </div>
              <p className="text-slate-500 text-sm">No bookmarked families on this page</p>
              <button
                onClick={() => setShowFavoritesOnly(false)}
                className="text-xs text-[#D97706] hover:underline font-medium"
              >
                Show all families
              </button>
            </div>
          </div>
        )}

        {/* ===== E. Pagination ===== */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => { setPage(1); setLoading(true); }}
              disabled={page === 1}
              className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-[#0F2B46] hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
              title="First page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setPage(p => Math.max(1, p - 1)); setLoading(true); }}
              disabled={page === 1}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-[#0F2B46] hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              Previous
            </button>
            <div className="px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm">
              <span className="text-xs text-slate-500">
                Page <span className="font-bold text-[#0F2B46]">{page}</span> of {totalPages}
              </span>
              <span className="text-xs text-slate-400 ml-2">• {total} total</span>
            </div>
            <button
              onClick={() => { setPage(p => Math.min(totalPages, p + 1)); setLoading(true); }}
              disabled={page === totalPages}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-[#0F2B46] hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              Next
            </button>
            <button
              onClick={() => { setPage(totalPages); setLoading(true); }}
              disabled={page === totalPages}
              className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-[#0F2B46] hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
              title="Last page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </ViewLayout>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FAMILY DETAIL MODE (family selected)
// ═══════════════════════════════════════════════════════════════════

function FamilyDetailView() {
  const selectedFamilyPdf = useAppStore((s) => s.selectedFamilyPdf);
  const navigateToMember = useAppStore((s) => s.navigateToMember);
  const navigateToRelocation = useAppStore((s) => s.navigateToRelocation);
  const navigateToFamily = useAppStore((s) => s.navigateToFamily);
  const animationsEnabled = useAppStore((s) => s.animationsEnabled);
  const compactMode = useAppStore((s) => s.compactMode);
  const bookmarkedFamilies = useAppStore((s) => s.bookmarkedFamilies);
  const toggleBookmark = useAppStore((s) => s.toggleBookmark);
  const selectedFamilyId = useAppStore((s) => s.selectedFamilyId);

  const [family, setFamily] = useState<FamilyData | null>(null);
  const [relatedFamilies, setRelatedFamilies] = useState<RelatedFamily[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedFamilyPdf) {
      setFamily(null);
      setErrorMessage('No family selected');
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadFamily = async () => {
      try {
        setLoading(true);
        setErrorMessage(null);

        const response = await fetch(`/api/family/${encodeURIComponent(selectedFamilyPdf)}`);
        const data = await response.json();

        if (cancelled) return;

        if (!response.ok) {
          setFamily(null);
          setErrorMessage(typeof data?.error === 'string' ? data.error : 'Failed to fetch family details');
          return;
        }

        if (!data?.id || !data?.pdfId || !data?.village?.id || !data?.village?.mandal?.name) {
          setFamily(null);
          setErrorMessage('Family details are incomplete');
          return;
        }

        setFamily({
          ...data,
          hasFirstScheme: !!data.firstScheme,
          landAcres: data.firstScheme?.extentOfLandAcCts ?? null,
        });
      } catch {
        if (!cancelled) {
          setFamily(null);
          setErrorMessage('Failed to fetch family details');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadFamily();

    return () => {
      cancelled = true;
    };
  }, [selectedFamilyPdf]);

  // Fetch related families from the same village
  useEffect(() => {
    if (!family?.village?.id) return;
    fetch(`/api/families?villageId=${family.village.id}&limit=50`)
      .then(r => r.json())
      .then(data => {
        const allFamilies: RelatedFamily[] = (data.families || [])
          .filter((f: any) => f.pdfId !== family.pdfId)
          .map((f: any) => ({
            id: f.id,
            pdfId: f.pdfId,
            beneficiaryName: f.beneficiaryName,
            rrEligibility: f.rrEligibility,
            villageName: family.village.name,
          }));
        const shuffled = allFamilies.sort(() => 0.5 - Math.random());
        setRelatedFamilies(shuffled.slice(0, 3));
      })
      .catch(() => {});
  }, [family?.village?.id, family?.pdfId, family?.village?.name]);

  useEffect(() => {
    if (!loading && containerRef.current && animationsEnabled) {
      const els = containerRef.current.querySelectorAll('.anim-in');
      gsap.fromTo(els, { opacity: 0, y: 25 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power3.out' });
    }
  }, [loading, animationsEnabled]);

  const handlePrint = () => { window.print(); };

  const handlePDFReport = () => {
    if (!family) return;
    window.open(`/api/family/${encodeURIComponent(family.pdfId)}/pdf`, '_blank');
  };

  const handleDownload = () => {
    if (!family) return;
    const dataStr = JSON.stringify(family, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${family.pdfId}-data.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCSV = () => {
    if (!family) return;
    const headers = ['Name', 'Relation', 'Age', 'Gender', 'Aadhaar', 'Occupation'];
    const rows = family.members.map(m => [m.beneficiaryName, m.relation, m.age, m.gender, m.aadharNo || 'N/A', m.occupation || 'N/A']);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${family.pdfId}-members.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <ViewLayout navTitle="FAMILY DETAILS" navTitleColor="#FBBF24" accentDotColor="#D97706" maxWidth="max-w-5xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Header skeleton */}
          <div className="skeleton-pulse h-32 rounded-xl" />
          {/* Quick stats skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="skeleton-pulse h-20 rounded-lg" />
            ))}
          </div>
          {/* Timeline skeleton */}
          <div className="skeleton-pulse h-28 rounded-xl" />
          {/* Details skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="skeleton-pulse h-64 rounded-xl" />
            <div className="skeleton-pulse h-64 rounded-xl" />
          </div>
        </div>
      </ViewLayout>
    );
  }

  if (!family) {
    return (
      <ViewLayout navTitle="FAMILY DETAILS" navTitleColor="#FBBF24" accentDotColor="#D97706" maxWidth="max-w-5xl">
        <div className="flex items-center justify-center py-24">
          <p className="text-red-600 font-medium">{errorMessage || 'Family not found'}</p>
        </div>
      </ViewLayout>
    );
  }

  const accentColor = family.village?.mandal?.color || '#D97706';
  const statusCfg = RR_ELIGIBILITY_CONFIG[family.rrEligibility] || RR_ELIGIBILITY_CONFIG.Eligible;
  const timelinePos = getTimelinePosition(family.rrEligibility);
  const timelineDates = getTimelineDates(family.createdAt, family.rrEligibility);
  const isIneligible = family.rrEligibility === 'Ineligible';
  const StatusIcon = RR_ELIGIBILITY_ICONS[family.rrEligibility] || FileText;

  return (
    <ViewLayout
      navTitle={family.pdfId}
      navTitleColor="#FBBF24"
      accentDotColor={accentColor}
      maxWidth="max-w-5xl"
    >
      <div ref={containerRef} className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ===== A. Header Card ===== */}
        <div className={`anim-in opacity-0 gov-card ${compactMode ? 'p-4' : 'p-6'} border-l-[6px] border-l-[#D97706] relative overflow-hidden`}>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D97706] via-[#1E3A5F] to-[#D97706] opacity-30" />

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 relative z-[1]">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="gov-badge px-3 py-1.5 rounded-md border bg-amber-50 border-amber-300 text-amber-700 tracking-widest text-sm font-semibold flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Family #{family.pdfId}
                </span>
                {family.hasFirstScheme && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-amber-700 bg-amber-50 border border-amber-300">
                    <Star className="w-3 h-3 fill-amber-600 text-amber-600" /> First Scheme Eligible
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{family.beneficiaryName}</h1>

              <div className="flex items-center gap-2 mt-3">
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  <MapPin className="w-3 h-3" />
                  {family.village?.mandal?.name || 'Unknown'} Mandal
                </span>
                <ChevronRight className="w-3 h-3 text-slate-300" />
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  <Home className="w-3 h-3" />
                  {family.village.name}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleBookmark(selectedFamilyId || family.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-all text-sm font-medium ${
                  bookmarkedFamilies.includes(selectedFamilyId || family.id)
                    ? 'text-red-600 bg-red-50 border-red-200 hover:bg-red-100 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800 dark:hover:bg-red-900/30'
                    : 'text-slate-500 bg-white border-slate-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200 dark:text-slate-400 dark:bg-slate-800 dark:border-slate-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 dark:hover:border-red-800'
                }`}
                aria-label={bookmarkedFamilies.includes(selectedFamilyId || family.id) ? 'Remove bookmark' : 'Add bookmark'}
              >
                <Heart className={`w-4 h-4 ${bookmarkedFamilies.includes(selectedFamilyId || family.id) ? 'fill-red-500' : ''}`} />
                {bookmarkedFamilies.includes(selectedFamilyId || family.id) ? 'Bookmarked' : 'Bookmark'}
              </button>
              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border ${statusCfg.color} ${statusCfg.bg} ${statusCfg.border}`}>
                <StatusIcon className="w-5 h-5" />
                <span className="text-sm font-bold">{statusCfg.label}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ===== B. Quick Stats Row ===== */}
        <div className="anim-in opacity-0 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { ...QUICK_STAT_CONFIGS[0], value: family.members.length, label: 'Members' },
            { ...QUICK_STAT_CONFIGS[1], value: family.members.filter(m => m.age < 18).length, label: 'Minors' },
            { ...QUICK_STAT_CONFIGS[2], value: `${family.landAcres || 0} acres`, label: 'Land' },
            { ...QUICK_STAT_CONFIGS[3], value: family.plotAllotment ? family.plotAllotment.allotmentStatus : 'Not Allotted', label: 'Plot' },
          ].map((stat, i) => (
            <div key={i} className={`flex items-center gap-3 bg-gradient-to-br ${stat.gradient} border border-slate-200 border-t-2 ${stat.topBorder} rounded-lg px-4 py-3.5`}>
              <div className={`w-10 h-10 rounded-full ${stat.circleBg} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ===== C. Timeline ===== */}
        <div className="anim-in opacity-0 gov-card p-6">
          <h3 className="text-sm font-semibold text-slate-900 tracking-wide mb-6">STATUS TIMELINE</h3>
          <div className="relative">
            <div className="flex items-center justify-between">
              {TIMELINE_STEPS.map((step, i) => {
                const isCompleted = !isIneligible && i <= timelinePos;
                const isCurrent = !isIneligible && i === timelinePos;
                const isFuture = !isIneligible && i > timelinePos;
                const Icon = step.icon;
                return (
                  <div key={step.key} className="flex flex-col items-center relative z-10">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center border-2 transition-all relative ${
                      isCompleted && !isCurrent ? 'border-green-600 bg-green-600' :
                      isCurrent ? 'border-amber-600 bg-amber-500 animate-pulse shadow-lg shadow-amber-300/50 ring-4 ring-amber-100' :
                      'border-slate-300 bg-slate-100'
                    }`}>
                      <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center ${
                        isCompleted && !isCurrent ? 'bg-green-800 text-white' :
                        isCurrent ? 'bg-amber-700 text-white' :
                        'bg-slate-300 text-slate-600'
                      }`}>
                        {step.stepNum}
                      </span>
                      <Icon className={`w-4 h-4 ${
                        isCompleted && !isCurrent ? 'text-white' :
                        isCurrent ? 'text-white' :
                        'text-slate-400'
                      }`} />
                    </div>
                    <span className={`text-xs mt-2.5 font-medium ${
                      isCompleted && !isCurrent ? 'text-green-700' :
                      isCurrent ? 'text-amber-700' :
                      'text-slate-400'
                    }`}>
                      {step.label}
                    </span>
                    <span className={`text-[10px] mt-0.5 ${
                      isCompleted || isCurrent ? 'text-slate-500' : 'text-slate-300'
                    }`}>
                      {timelineDates[step.key] || (isFuture ? '—' : '')}
                    </span>
                    {isFuture && (
                      <span className="text-[9px] mt-1 text-slate-300 font-medium uppercase tracking-wider">Pending</span>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Progress line */}
            <div className="absolute top-[22px] left-0 right-0 h-0.5 -z-0 flex">
              {!isIneligible && timelinePos > 0 && (
                <div className="h-full bg-green-600" style={{ width: `${(timelinePos / 3) * 100}%` }} />
              )}
              {!isIneligible && (
                <div className="h-full border-t-2 border-dashed border-slate-300" style={{ width: `${((3 - timelinePos) / 3) * 100}%` }} />
              )}
              {isIneligible && <div className="h-full bg-red-500 w-full" />}
            </div>
          </div>
          {!isIneligible && timelinePos >= 0 && (
            <div className="flex justify-center mt-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Current: {TIMELINE_STEPS[timelinePos]?.label}
              </span>
            </div>
          )}
          {isIneligible && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-center">
              <p className="text-xs text-red-700 font-medium">Family is ineligible — review required</p>
            </div>
          )}
        </div>

        {/* ===== D. Family Details & New Plot ===== */}
        <div className="anim-in opacity-0 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="gov-card p-5">
            <h3 className="text-sm font-semibold text-slate-900 tracking-wide mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#0F2B46]" />FAMILY DETAILS
            </h3>
            <div className="space-y-0">
              {[
                { label: 'Caste Category', value: family.caste || 'N/A', icon: Users },
                { label: 'Land Holding', value: family.landAcres ? `${family.landAcres} acres` : 'N/A', icon: LandPlot },
                { label: 'House Type', value: family.houseType || 'N/A', icon: Home },
                { label: 'Total Members', value: String(family.members.length), icon: Users },
              ].map((item, i) => (
                <div key={i} className={`flex items-center justify-between py-2.5 px-2 rounded-md ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                  <span className="text-xs text-slate-500 flex items-center gap-2">
                    <item.icon className="w-3.5 h-3.5 text-slate-400" />{item.label}
                  </span>
                  <span className="text-sm text-slate-900 font-medium bg-slate-50 px-2 py-0.5 rounded">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="gov-card p-5">
            <h3 className="text-sm font-semibold text-slate-900 tracking-wide mb-4 flex items-center gap-2">
              <Home className="w-4 h-4 text-[#0F2B46]" />NEW PLOT STATUS
            </h3>
            {family.plotAllotment ? (
              <div className="space-y-0">
                {[
                  { label: 'Plot Number', value: family.plotAllotment.plotNumber || 'Pending', icon: LandPlot },
                  { label: 'Colony', value: family.plotAllotment.colonyName || 'Pending', icon: Home },
                  { label: 'Area', value: family.plotAllotment.areaSqYards ? `${family.plotAllotment.areaSqYards} sq. yards` : 'Pending', icon: LandPlot },
                  { label: 'Allotment Status', value: family.plotAllotment.allotmentStatus, icon: Clock },
                ].map((item, i) => {
                  const allotCfg = i === 3 ? ALLOTMENT_STATUS_CONFIG[item.value] : null;
                  return (
                    <div key={i} className={`flex items-center justify-between py-2.5 px-2 rounded-md ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                      <span className="text-xs text-slate-500 flex items-center gap-2">
                        <item.icon className="w-3.5 h-3.5 text-slate-400" />{item.label}
                      </span>
                      {allotCfg ? (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${allotCfg.color} ${allotCfg.bg} border ${allotCfg.border}`}>
                          {allotCfg.label}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-900 font-medium bg-slate-50 px-2 py-0.5 rounded">{item.value}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center py-6 text-center">
                <Clock className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">No plot allotted yet</p>
                <p className="text-xs text-slate-400 mt-1">Pending SES verification</p>
              </div>
            )}
          </div>
        </div>

        {/* ===== E. Members Table ===== */}
        <div className="anim-in opacity-0 gov-card p-5 overflow-hidden">
          <h3 className="text-sm font-semibold text-slate-900 tracking-wide mb-4">FAMILY MEMBERS ({family.members.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                  <th className="text-left pb-3 pt-2 px-2 font-medium">#</th>
                  <th className="text-left pb-3 pt-2 px-2 font-medium">Name</th>
                  <th className="text-left pb-3 pt-2 px-2 font-medium hidden sm:table-cell">Relation</th>
                  <th className="text-left pb-3 pt-2 px-2 font-medium">Age</th>
                  <th className="text-left pb-3 pt-2 px-2 font-medium hidden md:table-cell">Gender</th>
                  <th className="text-left pb-3 pt-2 px-2 font-medium hidden lg:table-cell">Aadhaar</th>
                  <th className="text-left pb-3 pt-2 px-2 font-medium hidden md:table-cell">Occupation</th>
                  <th className="text-right pb-3 pt-2 px-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {family.members.map((m, i) => (
                  <motion.tr
                    key={m.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer group transition-colors relative"
                    onClick={() => navigateToMember(m.id)}
                  >
                    <td className="py-3 px-2 text-slate-400 text-xs font-mono">{i + 1}</td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-amber-100 text-amber-700">
                          {m.beneficiaryName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-slate-900 text-sm font-medium">{m.beneficiaryName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 hidden sm:table-cell">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        m.relation === 'Head' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {m.relation}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-slate-700">{m.age}{m.age < 18 ? ' (Minor)' : ''}</td>
                    <td className="py-3 px-2 hidden md:table-cell">
                      <span className="text-slate-500 flex items-center gap-1">
                        {m.gender === 'Male' ? <span className="text-blue-500">♂</span> : m.gender === 'Female' ? <span className="text-pink-500">♀</span> : null}
                        {m.gender}
                      </span>
                    </td>
                    <td className="py-3 px-2 hidden lg:table-cell">
                      <span className="gov-badge text-slate-400">{m.aadharNo || 'N/A'}</span>
                    </td>
                    <td className="py-3 px-2 hidden md:table-cell text-slate-500">{m.occupation || 'N/A'}</td>
                    <td className="py-3 px-2 text-right">
                      <span className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Click to view</span>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ===== F. Action Bar ===== */}
        <div className="anim-in opacity-0 flex flex-wrap gap-3 no-print">
          {family.plotAllotment && (
            <button
              onClick={() => navigateToRelocation(family.id)}
              className="flex items-center gap-2.5 px-6 py-3 bg-white border border-green-300 text-green-700 rounded-lg text-sm font-medium hover:bg-green-50 hover:shadow-md transition-all shadow-sm"
            >
              <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
                <MapPin className="w-3.5 h-3.5 text-green-600" />
              </div>
              View New Plot
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={handleDownload}
            className="flex items-center gap-2.5 px-6 py-3 bg-white border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 hover:shadow-md transition-all shadow-sm"
          >
            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center">
              <Download className="w-3.5 h-3.5 text-slate-500" />
            </div>
            Download Data
          </button>
          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-2.5 px-6 py-3 bg-white border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 hover:shadow-md transition-all shadow-sm"
          >
            <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center">
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-500" />
            </div>
            Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2.5 px-6 py-3 bg-white border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 hover:shadow-md transition-all shadow-sm"
          >
            <div className="w-7 h-7 rounded-full bg-amber-50 flex items-center justify-center">
              <Printer className="w-3.5 h-3.5 text-amber-600" />
            </div>
            Print SES Sheet
          </button>
          <button
            onClick={handlePDFReport}
            className="flex items-center gap-2.5 px-6 py-3 bg-white border border-red-300 text-red-700 rounded-lg text-sm font-medium hover:bg-red-50 hover:shadow-md transition-all shadow-sm"
          >
            <div className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-red-600" />
            </div>
            PDF Report
          </button>
        </div>

        {/* ===== G. Related Families ===== */}
        {relatedFamilies.length > 0 && (
          <div className="anim-in opacity-0 gov-card p-6">
            <h3 className="text-sm font-semibold text-slate-900 tracking-wide mb-4">NEARBY FAMILIES</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {relatedFamilies.map((rf) => {
                const rfStatusCfg = RR_ELIGIBILITY_CONFIG[rf.rrEligibility] || RR_ELIGIBILITY_CONFIG.Eligible;
                const rfBorderClass = RR_ELIGIBILITY_BORDER[rf.rrEligibility] || 'border-l-slate-300';
                return (
                  <button
                    key={rf.id}
                    onClick={() => navigateToFamily(rf.pdfId, rf.id)}
                    className={`flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 border-l-4 ${rfBorderClass} rounded-lg hover:bg-slate-100 hover:border-slate-300 hover:shadow-sm transition-all text-left group`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono font-semibold text-amber-700 tracking-wider">{rf.pdfId}</p>
                      <p className="text-sm text-slate-900 font-medium truncate mt-0.5">{rf.beneficiaryName}</p>
                      {rf.villageName && (
                        <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5" />
                          {rf.villageName}
                        </p>
                      )}
                    </div>
                    <span className={`shrink-0 px-2.5 py-1 rounded text-[10px] font-medium border ${rfStatusCfg.color} ${rfStatusCfg.bg} ${rfStatusCfg.border}`}>
                      {rfStatusCfg.label}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0 mt-0.5" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </ViewLayout>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN EXPORT: Switches between list mode and detail mode
// ═══════════════════════════════════════════════════════════════════

export default function FamilyView() {
  const selectedFamilyPdf = useAppStore((s) => s.selectedFamilyPdf);

  // No family selected → show the searchable/paginated all-families list
  if (!selectedFamilyPdf) {
    return <FamiliesListView />;
  }

  // Family selected → show the detailed family view
  return <FamilyDetailView />;
}
