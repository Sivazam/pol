'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { RR_ELIGIBILITY_CONFIG } from '@/lib/constants';
import CountUp from 'react-countup';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import {
  ChevronRight, Search, Filter,
  Users, Star, MapPin, X, LandPlot, Home, CheckCircle2,
  Clock, ArrowUpDown, FileText, Info, ChevronsLeft, ChevronsRight,
  TrendingUp, Minus, RotateCcw, Building2,
  LayoutGrid, Map as MapIcon, Baby, User, ArrowLeft,
  BarChart3, PieChart, Navigation, ChevronDown,
} from 'lucide-react';
import ViewLayout from '@/components/shared/ViewLayout';
import ProjectMap from '@/components/map/ProjectMap';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Family {
  id: string;
  pdfId: string;
  beneficiaryName: string;
  caste: string | null;
  landAcres: number | null;
  houseType: string | null;
  rrEligibility: string;
  hasFirstScheme: boolean;
  memberCount: number;
}

interface VillageInfo {
  id: string;
  name: string;
  nameTelugu: string;
  code: string;
  latitude: number;
  longitude: number;
  totalFamilies: number;
  firstSchemeCount: number;
  statusBreakdown: Record<string, number>;
  mandal: { name: string; nameTelugu?: string; color: string; code: string };
  mandalId?: string;
}

interface VillageDetail {
  village: {
    id: string;
    name: string;
    nameTelugu: string;
    code: string;
    latitude: number;
    longitude: number;
    mandalId: string;
    mandal: { id: string; name: string; nameTelugu: string; code: string; color: string };
  };
  familyStats: {
    total: number;
    firstSchemeCount: number;
    statusBreakdown: Record<string, number>;
    avgFamilySize: string;
  };
  memberDemographics: {
    total: number;
    maleCount: number;
    femaleCount: number;
    minorCount: number;
    adultCount: number;
    sizeBuckets: Record<string, number>;
  };
  landStats: {
    avgLand: string;
    minLand: string;
    maxLand: string;
    landBuckets: Record<string, number>;
    familiesWithLand: number;
    familiesWithoutLand: number;
  };
  topFamilies: Array<{
    id: string;
    pdfId: string;
    beneficiaryName: string;
    landAcres: number | null;
    rrEligibility: string;
    hasFirstScheme: boolean;
    memberCount: number;
 }>;
  plotStats: {
    total: number;
    allotted: number;
    possessionGiven: number;
    allotmentRate: string;
  };
  nearbyVillages: Array<{
    id: string;
    name: string;
    nameTelugu: string;
    code: string;
    latitude: number;
    longitude: number;
    totalFamilies: number;
    firstSchemeCount: number;
  }>;
}

// ─── Status border colors for family cards ────────────────────────────────────

const STATUS_BORDER_COLORS: Record<string, string> = {
  Eligible: 'border-l-green-600',
  Ineligible: 'border-l-red-600',
};

const STATUS_COLORS_MAP: Record<string, string> = {
  Eligible: '#16A34A',
  Ineligible: '#DC2626',
};

// ─── Stat card configs for village-selected mode ──────────────────────────────

const STAT_CARD_CONFIGS = [
  { key: 'total', topBorder: 'border-t-[#0F2B46]', iconColor: 'text-[#0F2B46]', bgColor: 'bg-[#0F2B46]/10' },
  { key: 'eligible', topBorder: 'border-t-green-500', iconColor: 'text-green-600', bgColor: 'bg-green-50' },
  { key: 'avgSize', topBorder: 'border-t-teal-500', iconColor: 'text-teal-600', bgColor: 'bg-teal-50' },
  { key: 'pending', topBorder: 'border-t-orange-500', iconColor: 'text-orange-600', bgColor: 'bg-orange-50' },
];

// ─── Mandal color map for badge coloring ──────────────────────────────────────

const MANDAL_BADGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  VRP: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300' },
  CHN: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-300' },
  KUN: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300' },
};

// ─── Sort options for village list ────────────────────────────────────────────

type VillageSortOption = 'name' | 'familyCount' | 'firstSchemePercent';
const VILLAGE_SORT_LABELS: Record<VillageSortOption, string> = {
  name: 'Name',
  familyCount: 'Family Count',
  firstSchemePercent: 'First Scheme %',
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function VillageView() {
  const selectedVillageId = useAppStore((s) => s.selectedVillageId);
  const navigateToFamily = useAppStore((s) => s.navigateToFamily);
  const navigateToVillage = useAppStore((s) => s.navigateToVillage);
  const goBack = useAppStore((s) => s.goBack);

  const containerRef = useRef<HTMLDivElement>(null);

  // ─── Mode 1: No village selected — All Villages List ────────────────────────
  const [allVillages, setAllVillages] = useState<VillageInfo[]>([]);
  const [villagesLoading, setVillagesLoading] = useState(true);
  const [villageSearch, setVillageSearch] = useState('');
  const [mandalFilter, setMandalFilter] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [villageSort, setVillageSort] = useState<VillageSortOption>('name');

  // ─── Mode 2: Village selected — Family listing ──────────────────────────────
  const [village, setVillage] = useState<VillageInfo | null>(null);
  const [villageDetail, setVillageDetail] = useState<VillageDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [families, setFamilies] = useState<Family[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [rrFilter, setRrFilter] = useState('');
  const [sortBy, setSortBy] = useState('pdfId');
  const [loading, setLoading] = useState(true);
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const limit = 20;

  // ─── Fetch all villages (Mode 1) ────────────────────────────────────────────
  useEffect(() => {
    if (selectedVillageId) return;
    let cancelled = false;
    fetch('/api/villages?all=true')
      .then(r => r.json())
      .then((data: VillageInfo[]) => {
        if (!cancelled) {
          setAllVillages(data);
          setVillagesLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setVillagesLoading(false); });
    return () => { cancelled = true; };
  }, [selectedVillageId]);

  // ─── Fetch village info (Mode 2) — optimized to use direct village endpoint ─
  useEffect(() => {
    if (!selectedVillageId) return;
    let cancelled = false;
    fetch(`/api/village/${selectedVillageId}`)
      .then(r => r.json())
      .then((data: VillageDetail) => {
        if (!cancelled) {
          // Construct VillageInfo from the village detail response
          const v = data.village;
          const info: VillageInfo = {
            id: v.id,
            name: v.name,
            nameTelugu: v.nameTelugu,
            code: v.code,
            latitude: v.latitude,
            longitude: v.longitude,
            totalFamilies: data.familyStats.total,
            firstSchemeCount: data.familyStats.firstSchemeCount,
            statusBreakdown: data.familyStats.statusBreakdown,
            mandal: { name: v.mandal.name, nameTelugu: v.mandal.nameTelugu, color: v.mandal.color, code: v.mandal.code },
            mandalId: v.mandalId,
          };
          setVillage(info);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [selectedVillageId]);

  // ─── Fetch village detail from new API ──────────────────────────────────────
  useEffect(() => {
    if (!selectedVillageId) return;
    let cancelled = false;
    // Use a microtask to avoid synchronous setState in effect
    queueMicrotask(() => {
      if (!cancelled) setDetailLoading(true);
    });
    fetch(`/api/village/${selectedVillageId}`)
      .then(r => r.json())
      .then((data: VillageDetail) => {
        if (!cancelled) {
          setVillageDetail(data);
          setDetailLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setDetailLoading(false); });
    return () => { cancelled = true; };
  }, [selectedVillageId]);

  // ─── Fetch families (Mode 2) ────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedVillageId) return;
    let cancelled = false;
    const params = new URLSearchParams({
      villageId: selectedVillageId,
      page: String(page),
      limit: String(limit),
    });
    if (search) params.set('search', search);
    if (rrFilter) params.set('rrEligibility', rrFilter);
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
  }, [selectedVillageId, page, search, rrFilter, sortBy]);

  // ─── GSAP entrance animation ────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const isLoading = selectedVillageId ? (loading || detailLoading) : villagesLoading;
    if (!isLoading) {
      const els = container.querySelectorAll('.anim-in');
      gsap.fromTo(
        els,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.06, ease: 'power3.out' }
      );
    }
  }, [selectedVillageId, loading, detailLoading, villagesLoading, page, villageDetail]);

  // ─── Computed values (Mode 2) ───────────────────────────────────────────────
  const totalPages = Math.ceil(total / limit);
  const accentColor = village?.mandal?.color || '#D97706';

  const statusEntries = village?.statusBreakdown
    ? Object.entries(village.statusBreakdown).map(([key, count]) => ({
        key, count, config: RR_ELIGIBILITY_CONFIG[key] || RR_ELIGIBILITY_CONFIG.Eligible,
      }))
    : [];

  const avgFamilySize = useMemo(() => {
    if (families.length === 0) return 0;
    const totalMembers = families.reduce((sum, f) => sum + f.memberCount, 0);
    return (totalMembers / families.length).toFixed(1);
  }, [families]);

  const pendingPlots = useMemo(() => {
    return families.filter(f => f.rrEligibility !== 'Eligible').length;
  }, [families]);

  const hasActiveFilters = search || rrFilter;

  const clearAllFilters = () => {
    setSearch('');
    setRrFilter('');
    setPage(1);
    setLoading(true);
  };

  // ─── Computed values (Mode 1) ───────────────────────────────────────────────
  const filteredAndSortedVillages = useMemo(() => {
    let list = allVillages;
    if (mandalFilter) {
      list = list.filter(v => v.mandal?.code === mandalFilter);
    }
    if (villageSearch.trim()) {
      const q = villageSearch.trim().toLowerCase();
      list = list.filter(v =>
        v.name.toLowerCase().includes(q) ||
        v.nameTelugu?.toLowerCase().includes(q) ||
        v.code?.toLowerCase().includes(q)
      );
    }
    // Sort
    list = [...list].sort((a, b) => {
      if (villageSort === 'name') return a.name.localeCompare(b.name);
      if (villageSort === 'familyCount') return b.totalFamilies - a.totalFamilies;
      if (villageSort === 'firstSchemePercent') {
        const pctA = a.totalFamilies > 0 ? (a.firstSchemeCount / a.totalFamilies) * 100 : 0;
        const pctB = b.totalFamilies > 0 ? (b.firstSchemeCount / b.totalFamilies) * 100 : 0;
        return pctB - pctA;
      }
      return 0;
    });
    return list;
  }, [allVillages, mandalFilter, villageSearch, villageSort]);

  const allVillagesTotalFamilies = useMemo(() =>
    allVillages.reduce((sum, v) => sum + v.totalFamilies, 0), [allVillages]);

  const allVillagesFirstScheme = useMemo(() =>
    allVillages.reduce((sum, v) => sum + v.firstSchemeCount, 0), [allVillages]);

  const mandalOptions = useMemo(() => {
    const seen = new Map<string, { code: string; name: string; color: string }>();
    allVillages.forEach(v => {
      if (v.mandal?.code && !seen.has(v.mandal.code)) {
        seen.set(v.mandal.code, { code: v.mandal.code, name: v.mandal.name, color: v.mandal.color });
      }
    });
    return Array.from(seen.values());
  }, [allVillages]);

  // ─── Render: Interactive MapLibre Map View ──────────────────────────────────
  const renderMapView = () => {
    return (
      <div className="anim-in opacity-0 gov-card p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <MapIcon className="w-4 h-4 text-[#D97706]" />
            Village Locations
          </h3>
          <span className="text-xs text-slate-400">{filteredAndSortedVillages.length} villages shown</span>
        </div>
        <ProjectMap
          center={[81.32, 17.63]}
          zoom={9.5}
          maxBounds={{ sw: [81.15, 17.40], ne: [81.70, 17.90] }}
          height="420px"
          showMandals={true}
          showVillages={true}
          showVillagePolygons={false}
          showDam={true}
          showControls={true}
          showLegend={true}
          showLayerToggles={true}
          onVillageClick={(villageId, _villageName) => {
            navigateToVillage(villageId);
          }}
          className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700"
        />
        <p className="mt-2 text-xs text-slate-400 text-center">Click on any village to explore details • Use layer toggles to customize view</p>
      </div>
    );
  };

  // ─── Render: Demographics Section ───────────────────────────────────────────
  const renderDemographics = () => {
    if (!villageDetail) return null;
    const { memberDemographics: demo, landStats: land } = villageDetail;

    const genderTotal = demo.maleCount + demo.femaleCount || 1;
    const malePct = ((demo.maleCount / genderTotal) * 100).toFixed(0);
    const femalePct = ((demo.femaleCount / genderTotal) * 100).toFixed(0);

    const ageTotal = demo.minorCount + demo.adultCount || 1;
    const minorPct = ((demo.minorCount / ageTotal) * 100).toFixed(0);
    const adultPct = ((demo.adultCount / ageTotal) * 100).toFixed(0);

    return (
      <div className="anim-in opacity-0 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Population Demographics */}
        <div className="gov-card p-4 space-y-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#D97706]" />
            Population Demographics
          </h3>

          {/* Gender Ratio */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-300 font-medium">Gender Ratio</span>
              <span className="text-slate-400">{demo.total} total members</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold w-12">{demo.maleCount} M</span>
              <div className="flex-1 flex h-3 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700">
                <div className="bg-blue-500 h-full transition-all duration-700" style={{ width: `${malePct}%` }} />
                <div className="bg-pink-500 h-full transition-all duration-700" style={{ width: `${femalePct}%` }} />
              </div>
              <span className="text-xs text-pink-600 dark:text-pink-400 font-semibold w-12 text-right">{demo.femaleCount} F</span>
            </div>
          </div>

          {/* Age Distribution */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-300 font-medium">Age Distribution</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Baby className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Minors</span>
                </div>
                <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full transition-all duration-700" style={{ width: `${minorPct}%` }} />
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">{demo.minorCount} ({minorPct}%)</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-3.5 h-3.5 text-teal-500" />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Adults</span>
                </div>
                <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="bg-teal-500 h-full rounded-full transition-all duration-700" style={{ width: `${adultPct}%` }} />
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">{demo.adultCount} ({adultPct}%)</span>
              </div>
            </div>
          </div>

          {/* Family Size Distribution */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-300 font-medium">Family Size Distribution</span>
            </div>
            <div className="space-y-1.5">
              {Object.entries(demo.sizeBuckets).map(([range, count]) => {
                const maxCount = Math.max(...Object.values(demo.sizeBuckets), 1);
                const pct = (count / maxCount) * 100;
                return (
                  <div key={range} className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 w-8 font-medium">{range}</span>
                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="bg-[#0F2B46] dark:bg-amber-600 h-full rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-400 w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Land Holdings */}
        <div className="gov-card p-4 space-y-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <LandPlot className="w-4 h-4 text-[#D97706]" />
            Land Holdings Summary
          </h3>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
              <p className="text-lg font-bold text-[#0F2B46] dark:text-amber-400">{land.avgLand}</p>
              <p className="text-[10px] text-slate-400">Avg Acres</p>
            </div>
            <div className="text-center p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
              <p className="text-lg font-bold text-teal-700 dark:text-teal-400">{land.minLand}</p>
              <p className="text-[10px] text-slate-400">Min Acres</p>
            </div>
            <div className="text-center p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
              <p className="text-lg font-bold text-orange-700 dark:text-orange-400">{land.maxLand}</p>
              <p className="text-[10px] text-slate-400">Max Acres</p>
            </div>
          </div>

          {/* Land Distribution */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-300 font-medium">Land Distribution (acres)</span>
            </div>
            <div className="space-y-1.5">
              {Object.entries(land.landBuckets).map(([range, count]) => {
                const maxCount = Math.max(...Object.values(land.landBuckets), 1);
                const pct = (count / maxCount) * 100;
                return (
                  <div key={range} className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 w-10 font-medium">{range} ac</span>
                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="bg-teal-600 dark:bg-teal-500 h-full rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-400 w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Land vs No-land families */}
          <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
              <span className="text-xs text-slate-600 dark:text-slate-300">{land.familiesWithLand} with land</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
              <span className="text-xs text-slate-600 dark:text-slate-300">{land.familiesWithoutLand} landless</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─── Render: R&R Eligibility Breakdown Donut ─────────────────────────────────────
  const renderRREligibilityBreakdown = () => {
    if (!villageDetail) return null;
    const { statusBreakdown } = villageDetail.familyStats;
    const entries = Object.entries(statusBreakdown);
    const totalFamilies = entries.reduce((sum, [, c]) => sum + c, 0) || 1;

    return (
      <div className="anim-in opacity-0 gov-card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <PieChart className="w-4 h-4 text-[#D97706]" />
          R&R Eligibility Breakdown
        </h3>
        <div className="flex items-center gap-6">
          {/* CSS Donut */}
          <div className="relative w-32 h-32 shrink-0">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              {entries.reduce<{ offset: number; elements: React.ReactNode[] }>((acc, [status, count]) => {
                const pct = (count / totalFamilies) * 100;
                const color = STATUS_COLORS_MAP[status] || '#94A3B8';
                const element = (
                  <circle
                    key={status}
                    cx="18" cy="18" r="14"
                    fill="none"
                    stroke={color}
                    strokeWidth="5"
                    strokeDasharray={`${pct} ${100 - pct}`}
                    strokeDashoffset={-acc.offset}
                    strokeLinecap="butt"
                  />
                );
                return { offset: acc.offset + pct, elements: [...acc.elements, element] };
              }, { offset: 0, elements: [] }).elements}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{totalFamilies}</p>
                <p className="text-[8px] text-slate-400">families</p>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-2">
            {entries.map(([status, count]) => {
              const cfg = RR_ELIGIBILITY_CONFIG[status];
              if (!cfg) return null;
              const pct = ((count / totalFamilies) * 100).toFixed(1);
              return (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: STATUS_COLORS_MAP[status] || '#94A3B8' }}
                    />
                    <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{count}</span>
                    <span className="text-[10px] text-slate-400">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ─── Render: Quick Stats Row ────────────────────────────────────────────────
  const renderQuickStats = () => {
    if (!villageDetail) return null;
    const { familyStats, plotStats } = villageDetail;
    const firstSchemePct = familyStats.total > 0
      ? ((familyStats.firstSchemeCount / familyStats.total) * 100).toFixed(1) : '0';

    const stats = [
      { label: 'Total Families', value: familyStats.total, icon: Users, color: 'text-[#0F2B46] dark:text-amber-400', bg: 'bg-[#0F2B46]/10 dark:bg-amber-900/20' },
      { label: 'Avg Land (acres)', value: villageDetail.landStats.avgLand, icon: LandPlot, color: 'text-teal-700 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-900/20' },
      { label: 'First Scheme %', value: `${firstSchemePct}%`, icon: CheckCircle2, color: 'text-green-700 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
      { label: 'Plot Allotment Rate', value: `${plotStats.allotmentRate}%`, icon: Home, color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    ];

    return (
      <div className="anim-in opacity-0 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="gov-card p-4 hover:-translate-y-0.5 hover:shadow-md transition-all cursor-default">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className={`text-lg font-bold ${s.color}`}>
                  {typeof s.value === 'number' ? <CountUp end={s.value} duration={1} separator="," /> : s.value}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ─── Render: Top Families Table ─────────────────────────────────────────────
  const renderTopFamilies = () => {
    if (!villageDetail || villageDetail.topFamilies.length === 0) return null;

    return (
      <div className="anim-in opacity-0 gov-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#D97706]" />
            Top Families by Land Holding
          </h3>
          <span className="text-[10px] text-slate-400">Top 10</span>
        </div>
        <div className="overflow-x-auto max-h-80 overflow-y-auto custom-scrollbar">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10">
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-2 px-2 font-semibold text-slate-500 dark:text-slate-400">#</th>
                <th className="text-left py-2 px-2 font-semibold text-slate-500 dark:text-slate-400">PDF ID</th>
                <th className="text-left py-2 px-2 font-semibold text-slate-500 dark:text-slate-400">Beneficiary Name</th>
                <th className="text-right py-2 px-2 font-semibold text-slate-500 dark:text-slate-400">Land (ac)</th>
                <th className="text-center py-2 px-2 font-semibold text-slate-500 dark:text-slate-400">Members</th>
                <th className="text-center py-2 px-2 font-semibold text-slate-500 dark:text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {villageDetail.topFamilies.map((f, idx) => {
                const statusCfg = RR_ELIGIBILITY_CONFIG[f.rrEligibility];
                return (
                  <tr
                    key={f.id}
                    className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                    onClick={() => navigateToFamily(f.pdfId, f.id)}
                  >
                    <td className="py-2 px-2 text-slate-400 font-medium">{idx + 1}</td>
                    <td className="py-2 px-2">
                      <span className="font-mono text-amber-700 dark:text-amber-400 font-semibold">{f.pdfId}</span>
                    </td>
                    <td className="py-2 px-2 text-slate-900 dark:text-slate-100 font-medium">{f.beneficiaryName}</td>
                    <td className="py-2 px-2 text-right font-semibold text-teal-700 dark:text-teal-400">{f.landAcres}</td>
                    <td className="py-2 px-2 text-center text-slate-600 dark:text-slate-300">{f.memberCount}</td>
                    <td className="py-2 px-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${statusCfg?.color} ${statusCfg?.bg} ${statusCfg?.border}`}>
                        {statusCfg?.label || f.rrEligibility}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ─── Render: Nearby Villages ────────────────────────────────────────────────
  const renderNearbyVillages = () => {
    if (!villageDetail || villageDetail.nearbyVillages.length === 0) return null;

    return (
      <div className="anim-in opacity-0 gov-card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Navigation className="w-4 h-4 text-[#D97706]" />
          Nearby Villages
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {villageDetail.nearbyVillages.map((nv) => (
            <button
              key={nv.id}
              onClick={() => navigateToVillage(nv.id)}
              className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left group"
            >
              <div className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-[#D97706] transition-colors">
                  {nv.name}
                </p>
                <p className="text-[10px] text-slate-400 truncate">{nv.nameTelugu}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">{nv.totalFamilies} families</span>
                  <span className="text-[10px] text-green-600 dark:text-green-400">{nv.firstSchemeCount} eligible</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#D97706] transition-colors shrink-0" />
            </button>
          ))}
        </div>
      </div>
    );
  };

  // ─── Render: All Villages List (Mode 1) ─────────────────────────────────────
  const renderAllVillages = () => {
    if (villagesLoading) {
      return (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-2 border-slate-200 border-t-[#1E3A5F] rounded-full animate-spin" />
            <p className="text-slate-400 text-sm tracking-widest uppercase" style={{ fontFamily: 'var(--font-jetbrains)' }}>
              Loading Villages
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header Section */}
        <div className="anim-in opacity-0 gov-card p-6 sm:p-8 relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, #0F2B46 10px, #0F2B46 11px)`,
            }}
          />
          <div className="relative z-[1] text-center space-y-3">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Building2 className="w-5 h-5 text-[#D97706]" />
              <span className="text-xs font-medium text-[#D97706] tracking-wider uppercase">
                Rehabilitation Villages
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              All Villages
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {allVillages.length} villages across {mandalOptions.length} mandals in the Polavaram project area
            </p>
            <div className="ashoka-divider max-w-xs mx-auto" />
            <div className="flex items-center justify-center gap-8 pt-3">
              <div className="flex flex-col items-center">
                <span className="counter-value text-3xl sm:text-4xl font-bold text-[#0F2B46] dark:text-amber-400">
                  <CountUp end={allVillages.length} duration={1.2} />
                </span>
                <span className="text-xs text-slate-400 mt-1 font-medium uppercase tracking-wider">Villages</span>
              </div>
              <div className="w-px h-12 bg-slate-200 dark:bg-slate-600" />
              <div className="flex flex-col items-center">
                <span className="counter-value text-3xl sm:text-4xl font-bold text-emerald-700 dark:text-emerald-400">
                  <CountUp end={allVillagesTotalFamilies} duration={1.5} separator="," />
                </span>
                <span className="text-xs text-slate-400 mt-1 font-medium uppercase tracking-wider">Total Families</span>
              </div>
              <div className="w-px h-12 bg-slate-200 dark:bg-slate-600" />
              <div className="flex flex-col items-center">
                <span className="counter-value text-3xl sm:text-4xl font-bold text-amber-700 dark:text-amber-400">
                  <CountUp end={allVillagesFirstScheme} duration={1.5} separator="," />
                </span>
                <span className="text-xs text-slate-400 mt-1 font-medium uppercase tracking-wider">First Scheme</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search, Filter, Sort & View Toggle Bar */}
        <div className="anim-in opacity-0 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Filter Villages</span>
            <div className="flex items-center gap-3">
              {(villageSearch || mandalFilter) && (
                <button
                  onClick={() => { setVillageSearch(''); setMandalFilter(''); }}
                  className="flex items-center gap-1 text-xs text-[#D97706] hover:text-[#B45309] font-medium transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Clear All
                </button>
              )}
              {/* View Mode Toggle */}
              <div className="flex items-center border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden" role="group" aria-label="View mode toggle">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-[#0F2B46] text-white' : 'bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-600'}`}
                  title="Grid View"
                  aria-label="Grid view"
                  aria-pressed={viewMode === 'grid'}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`p-1.5 transition-colors ${viewMode === 'map' ? 'bg-[#0F2B46] text-white' : 'bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-600'}`}
                  title="Map View"
                  aria-label="Map view"
                  aria-pressed={viewMode === 'map'}
                >
                  <MapIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by village name or code..."
                value={villageSearch}
                onChange={e => setVillageSearch(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F]/40 transition-all shadow-sm"
              />
              {villageSearch && (
                <button
                  onClick={() => setVillageSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label="Clear village search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={mandalFilter}
                onChange={e => setMandalFilter(e.target.value)}
                className="pl-10 pr-8 py-2.5 bg-white dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-100 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F]/40 transition-all shadow-sm"
              >
                <option value="">All Mandals</option>
                {mandalOptions.map(m => (
                  <option key={m.code} value={m.code}>{m.name}</option>
                ))}
              </select>
            </div>
            <div className="relative">
              <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={villageSort}
                onChange={e => setVillageSort(e.target.value as VillageSortOption)}
                className="pl-10 pr-8 py-2.5 bg-white dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-100 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F]/40 transition-all shadow-sm"
              >
                {Object.entries(VILLAGE_SORT_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>Sort: {label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results summary */}
        <div className="anim-in opacity-0 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-lg px-4 py-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{filteredAndSortedVillages.length}</span> of{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">{allVillages.length}</span> villages
          </p>
          {mandalFilter && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Filtered by:</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded border bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200">
                {mandalOptions.find(m => m.code === mandalFilter)?.name || mandalFilter}
              </span>
              <button
                onClick={() => setMandalFilter('')}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Remove mandal filter"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Map View or Grid View */}
        {viewMode === 'map' ? (
          renderMapView()
        ) : (
          <>
            {/* Village Cards Grid */}
            <motion.div
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.04 } },
              }}
              initial="hidden"
              animate="visible"
              key={`villages-${mandalFilter}-${villageSearch}-${villageSort}`}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            >
              {filteredAndSortedVillages.map((v) => {
                const mandalBadge = MANDAL_BADGE_COLORS[v.mandal?.code || ''] || {
                  bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200',
                };
                const mandalColor = v.mandal?.color || '#64748B';
                const breakdownEntries = Object.entries(v.statusBreakdown || {});
                const totalInBreakdown = breakdownEntries.reduce((sum, [, c]) => sum + c, 0);
                const firstSchemePct = v.totalFamilies > 0 ? ((v.firstSchemeCount / v.totalFamilies) * 100).toFixed(0) : '0';

                return (
                  <motion.div
                    key={v.id}
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      visible: { opacity: 1, y: 0 },
                    }}
                    transition={{ duration: 0.3, ease: 'easeOut', delay: 0.03 * (filteredAndSortedVillages.indexOf(v) % 12) }}
                    className="gov-card p-4 cursor-pointer group card-elevate transition-all duration-200 relative overflow-hidden border-l-4 stagger-entrance"
                    style={{ borderLeftColor: mandalColor, animationDelay: `${(filteredAndSortedVillages.indexOf(v) % 12) * 60}ms` }}
                    onClick={() => navigateToVillage(v.id)}
                  >
                    {/* Mini progress bar at top showing R&R Eligibility % */}
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-teal-500 transition-all duration-700"
                        style={{ width: `${firstSchemePct}%` }}
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-50/0 via-transparent to-slate-100/0 group-hover:from-slate-50/50 group-hover:to-amber-50/30 transition-all duration-300 pointer-events-none dark:group-hover:from-slate-800/50 dark:group-hover:to-amber-900/10" />

                    <div className="relative z-[1]">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug truncate">
                            {v.name}
                          </h3>
                          <p className="text-xs text-slate-400 mt-0.5 truncate">{v.nameTelugu}</p>
                        </div>
                        <span
                          className={`ml-2 shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${mandalBadge.bg} ${mandalBadge.text} ${mandalBadge.border}`}
                        >
                          <MapPin className="w-2.5 h-2.5" />
                          {v.mandal?.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-3 text-xs text-slate-600 dark:text-slate-300">
                        <span className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-700">
                          <Users className="w-3 h-3 text-slate-400" />
                          <span className="font-semibold">{v.totalFamilies}</span> families
                        </span>
                        <span className="flex items-center gap-1 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded border border-green-100 dark:border-green-800">
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                          <span className="font-semibold text-green-700 dark:text-green-400">{firstSchemePct}%</span>
                        </span>
                      </div>

                      {/* R&R Eligibility Mini Bars */}
                      {breakdownEntries.length > 0 && totalInBreakdown > 0 && (
                        <div className="mt-3 pt-3 border-t border-dashed border-slate-200 dark:border-slate-700">
                          <div className="flex items-center gap-0.5 h-2 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700">
                            {breakdownEntries.map(([status, count]) => {
                              const pct = (count / totalInBreakdown) * 100;
                              return (
                                <div
                                  key={status}
                                  className="h-full rounded-sm transition-all duration-300"
                                  style={{
                                    width: `${pct}%`,
                                    backgroundColor: STATUS_COLORS_MAP[status] || '#94A3B8',
                                    minWidth: pct > 0 ? '3px' : '0',
                                  }}
                                  title={`${RR_ELIGIBILITY_CONFIG[status]?.label || status}: ${count}`}
                                />
                              );
                            })}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1.5">
                            {breakdownEntries.map(([status, count]) => {
                              const cfg = RR_ELIGIBILITY_CONFIG[status];
                              if (!cfg) return null;
                              return (
                                <span key={status} className={`text-[10px] ${cfg.color} flex items-center gap-0.5`}>
                                  <span
                                    className="w-1.5 h-1.5 rounded-full inline-block"
                                    style={{ backgroundColor: STATUS_COLORS_MAP[status] || '#94A3B8' }}
                                  />
                                  {count}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-[#D97706] font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          View Details
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Empty state for no results */}
            {filteredAndSortedVillages.length === 0 && !villagesLoading && (
              <div className="gov-card p-12 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                    <Search className="w-6 h-6 text-slate-300" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">No villages found matching your criteria</p>
                  <button
                    onClick={() => { setVillageSearch(''); setMandalFilter(''); }}
                    className="text-xs text-[#D97706] hover:underline font-medium"
                  >
                    Clear filters
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // ─── Render: Village Selected (Mode 2) ──────────────────────────────────────
  const renderVillageDetail = () => {
    if (loading && families.length === 0) {
      return (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-2 border-slate-200 border-t-[#1E3A5F] rounded-full animate-spin" />
            <p className="text-slate-400 text-sm tracking-widest uppercase" style={{ fontFamily: 'var(--font-jetbrains)' }}>
              Loading Village
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        {/* Back button */}
        <button
          onClick={() => {
            useAppStore.getState().selectVillage(null);
            useAppStore.getState().setView('village');
          }}
          className="anim-in opacity-0 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-[#D97706] transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to all villages
        </button>

        {/* A. Village Header Card */}
        <div className="anim-in opacity-0 gov-card p-5 sm:p-6 relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, #0F2B46 10px, #0F2B46 11px)`,
            }}
          />
          <div className="relative z-[1] text-center space-y-3">
            <div className="flex items-center justify-center gap-2 mb-1">
              <MapPin className="w-5 h-5 text-[#D97706]" />
              <span className="text-xs font-medium text-[#D97706] tracking-wider uppercase">
                Village Profile
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {village?.name}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-lg">{village?.nameTelugu}</p>

            {village?.mandal?.name && (
              <div className="flex justify-center mt-1">
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white shadow-sm"
                  style={{ backgroundColor: accentColor }}
                >
                  <MapPin className="w-3 h-3" />
                  {village.mandal.name} Mandal
                </span>
              </div>
            )}

            {village?.latitude && village?.longitude && (
              <p
                className="text-xs text-slate-400 mt-1"
                style={{ fontFamily: 'var(--font-jetbrains)' }}
              >
                {village.latitude.toFixed(4)}°N, {village.longitude.toFixed(4)}°E
              </p>
            )}

            <div className="ashoka-divider max-w-xs mx-auto" />

            <div className="flex items-center justify-center gap-8 pt-3">
              <div className="flex flex-col items-center">
                <span className="counter-value text-3xl sm:text-4xl font-bold text-[#0F2B46] dark:text-amber-400">
                  <CountUp end={total} duration={1.5} separator="," />
                </span>
                <span className="text-xs text-slate-400 mt-1 font-medium uppercase tracking-wider">Total Families</span>
              </div>
              <div className="w-px h-12 bg-slate-200 dark:bg-slate-600" />
              <div className="flex flex-col items-center">
                <span className="counter-value text-3xl sm:text-4xl font-bold text-emerald-700 dark:text-emerald-400">
                  <CountUp end={village?.firstSchemeCount || 0} duration={1.5} separator="," />
                </span>
                <span className="text-xs text-slate-400 mt-1 font-medium uppercase tracking-wider">First Scheme</span>
              </div>
            </div>
          </div>

          {statusEntries.length > 0 && (
            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-700 relative z-[1]">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {statusEntries.map(({ key, count, config }) => (
                  <div
                    key={key}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${config.bg} ${config.border}`}
                  >
                    <span className={`text-sm font-semibold ${config.color}`}>
                      {count}
                    </span>
                    <span className={`text-xs ${config.color} opacity-80`}>
                      {config.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats Row (from detail API) */}
        {!detailLoading && renderQuickStats()}

        {/* Demographics + Land Holdings */}
        {!detailLoading && renderDemographics()}

        {/* R&R Eligibility + Plot Stats */}
        <div className="anim-in opacity-0 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {!detailLoading && renderRREligibilityBreakdown()}

          {/* Plot Statistics */}
          {villageDetail && (
            <div className="gov-card p-4 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Home className="w-4 h-4 text-[#D97706]" />
                Plot Allotment Statistics
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                  <p className="text-xl font-bold text-[#0F2B46] dark:text-amber-400">
                    <CountUp end={villageDetail.plotStats.total} duration={1} />
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">Total Plots</p>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
                  <p className="text-xl font-bold text-green-700 dark:text-green-400">
                    <CountUp end={villageDetail.plotStats.allotted} duration={1} />
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">Allotted</p>
                </div>
                <div className="text-center p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-100 dark:border-teal-800">
                  <p className="text-xl font-bold text-teal-700 dark:text-teal-400">
                    <CountUp end={villageDetail.plotStats.possessionGiven} duration={1} />
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">Possession</p>
                </div>
              </div>

              {/* Allotment progress bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">Allotment Progress</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">{villageDetail.plotStats.allotmentRate}%</span>
                </div>
                <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full transition-all duration-1000"
                    style={{ width: `${villageDetail.plotStats.allotmentRate}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Top Families Table */}
        {!detailLoading && renderTopFamilies()}

        {/* Nearby Villages */}
        {!detailLoading && renderNearbyVillages()}

        {/* B. Stats Summary Cards */}
        <div className="anim-in opacity-0 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`gov-card p-4 border-t-[3px] ${STAT_CARD_CONFIGS[0].topBorder} hover:-translate-y-0.5 hover:shadow-md transition-all cursor-default`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${STAT_CARD_CONFIGS[0].bgColor} flex items-center justify-center`}>
                <Users className={`w-5 h-5 ${STAT_CARD_CONFIGS[0].iconColor}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                  <CountUp end={total} duration={1.2} separator="," />
                  <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Total Families</p>
              </div>
            </div>
          </div>
          <div className={`gov-card p-4 border-t-[3px] ${STAT_CARD_CONFIGS[1].topBorder} hover:-translate-y-0.5 hover:shadow-md transition-all cursor-default`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${STAT_CARD_CONFIGS[1].bgColor} flex items-center justify-center`}>
                <CheckCircle2 className={`w-5 h-5 ${STAT_CARD_CONFIGS[1].iconColor}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-green-700 dark:text-green-400 flex items-center gap-1">
                  <CountUp end={village?.firstSchemeCount || 0} duration={1.2} separator="," />
                  <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">First Scheme Eligible</p>
              </div>
            </div>
          </div>
          <div className={`gov-card p-4 border-t-[3px] ${STAT_CARD_CONFIGS[2].topBorder} hover:-translate-y-0.5 hover:shadow-md transition-all cursor-default`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${STAT_CARD_CONFIGS[2].bgColor} flex items-center justify-center`}>
                <Users className={`w-5 h-5 ${STAT_CARD_CONFIGS[2].iconColor}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-teal-700 dark:text-teal-400 flex items-center gap-1">
                  {avgFamilySize}
                  <Minus className="w-3.5 h-3.5 text-slate-400" />
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Avg. Family Size</p>
              </div>
            </div>
          </div>
          <div className={`gov-card p-4 border-t-[3px] ${STAT_CARD_CONFIGS[3].topBorder} hover:-translate-y-0.5 hover:shadow-md transition-all cursor-default`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${STAT_CARD_CONFIGS[3].bgColor} flex items-center justify-center`}>
                <Clock className={`w-5 h-5 ${STAT_CARD_CONFIGS[3].iconColor}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-orange-700 dark:text-orange-400 flex items-center gap-1">
                  {pendingPlots}
                  <Minus className="w-3.5 h-3.5 text-slate-400" />
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Pending Plots</p>
              </div>
            </div>
          </div>
        </div>

        {/* C. Search & Filter Bar */}
        <div className="anim-in opacity-0 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Filter & Search</span>
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
                  aria-label="Clear family search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={rrFilter}
                onChange={e => { setRrFilter(e.target.value); setPage(1); setLoading(true); }}
                className="pl-10 pr-8 py-2.5 bg-white dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-100 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F]/40 transition-all shadow-sm"
              >
                <option value="">All Status</option>
                <option value="Eligible">Eligible</option>
                <option value="Ineligible">Ineligible</option>
              </select>
            </div>
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

        {/* F. Family Count Summary Bar */}
        <div className="anim-in opacity-0 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-lg px-4 py-2">
          <div className="flex items-center gap-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{families.length}</span> of{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-200">{total}</span> families
            </p>
            <div className="relative">
              <button
                onMouseEnter={() => setShowInfoTooltip(true)}
                onMouseLeave={() => setShowInfoTooltip(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Show filter information"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
              {showInfoTooltip && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-800 text-white text-[10px] rounded-lg whitespace-nowrap shadow-lg z-10">
                  Filters apply to the current village data
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800" />
                </div>
              )}
            </div>
          </div>
          {rrFilter && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Filtered by:</span>
              <button
                onClick={() => { setRrFilter(''); setPage(1); setLoading(true); }}
                className={`text-xs font-medium px-2 py-0.5 rounded border ${RR_ELIGIBILITY_CONFIG[rrFilter]?.color || ''} ${RR_ELIGIBILITY_CONFIG[rrFilter]?.bg || ''} ${RR_ELIGIBILITY_CONFIG[rrFilter]?.border || ''} hover:opacity-80 transition-opacity cursor-pointer`}
              >
                {RR_ELIGIBILITY_CONFIG[rrFilter]?.label || rrFilter}
              </button>
              <button
                onClick={() => { setRrFilter(''); setPage(1); setLoading(true); }}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Remove R&R Eligibility filter"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* D. Family Cards */}
        <motion.div
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.04 } },
          }}
          initial="hidden"
          animate="visible"
          key={page}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {families.map((f) => {
            const statusCfg = RR_ELIGIBILITY_CONFIG[f.rrEligibility] || RR_ELIGIBILITY_CONFIG.Eligible;
            const borderColor = STATUS_BORDER_COLORS[f.rrEligibility] || 'border-l-slate-300';
            return (
              <motion.div
                key={f.id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className={`gov-card p-4 cursor-pointer group border-l-4 ${borderColor} hover:scale-[1.01] transition-all duration-200 relative overflow-hidden`}
                onClick={() => navigateToFamily(f.pdfId, f.id)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-slate-50/0 via-transparent to-slate-100/0 group-hover:from-slate-50/50 group-hover:to-amber-50/30 transition-all duration-300 pointer-events-none dark:group-hover:from-slate-800/50 dark:group-hover:to-amber-900/10" />

                <div className="relative z-[1]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="gov-badge px-2.5 py-1 rounded-md border bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 tracking-widest flex items-center gap-1.5">
                      <FileText className="w-3 h-3" />
                      {f.pdfId}
                    </span>
                    {f.hasFirstScheme && (
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    )}
                  </div>

                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-snug">
                    {f.beneficiaryName}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-700">
                      <Users className="w-3 h-3 text-slate-400" />
                      {f.memberCount}
                    </span>
                    {f.landAcres && (
                      <span className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-700">
                        <LandPlot className="w-3 h-3 text-slate-400" />
                        {f.landAcres} acres
                      </span>
                    )}
                    {f.houseType && (
                      <span className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-700">
                        <Home className="w-3 h-3 text-slate-400" />
                        {f.houseType}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <span
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border ${statusCfg.color} ${statusCfg.bg} ${statusCfg.border}`}
                    >
                      {statusCfg.label}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
                  </div>

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
              <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                <Search className="w-6 h-6 text-slate-300" />
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm">No families found matching your criteria</p>
              <button
                onClick={clearAllFilters}
                className="text-xs text-[#D97706] hover:underline font-medium"
              >
                Clear filters
              </button>
            </div>
          </div>
        )}

        {/* E. Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => { setPage(1); setLoading(true); }}
              disabled={page === 1}
              className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0F2B46] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
              title="First page"
              aria-label="First page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setPage(p => Math.max(1, p - 1)); setLoading(true); }}
              disabled={page === 1}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0F2B46] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              Previous
            </button>
            <div className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Page <span className="font-bold text-[#0F2B46] dark:text-slate-100">{page}</span> of {totalPages}
              </span>
              <span className="text-xs text-slate-400 ml-2">• {total} total</span>
            </div>
            <button
              onClick={() => { setPage(p => Math.min(totalPages, p + 1)); setLoading(true); }}
              disabled={page === totalPages}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0F2B46] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              Next
            </button>
            <button
              onClick={() => { setPage(totalPages); setLoading(true); }}
              disabled={page === totalPages}
              className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0F2B46] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
              title="Last page"
              aria-label="Last page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    );
  };

  // ─── Main render with ViewLayout wrapper ────────────────────────────────────
  const isVillageSelected = !!selectedVillageId;
  const navTitle = isVillageSelected
    ? (village?.name?.toUpperCase() || 'VILLAGE')
    : 'ALL VILLAGES';
  const accentDot = isVillageSelected
    ? accentColor
    : '#D97706';
  const navSubtitle = isVillageSelected
    ? village?.mandal?.name
    : `${allVillages.length} villages`;

  return (
    <ViewLayout
      navTitle={navTitle}
      accentDotColor={accentDot}
      navSubtitle={navSubtitle}
    >
      <div ref={containerRef}>
        {isVillageSelected ? renderVillageDetail() : renderAllVillages()}
      </div>
    </ViewLayout>
  );
}
