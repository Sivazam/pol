'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { SES_STATUS_CONFIG } from '@/lib/constants';
import CountUp from 'react-countup';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import {
  ChevronRight, Search, Filter,
  Users, Star, MapPin, X, LandPlot, Home, CheckCircle2,
  Clock, ArrowUpDown, FileText, Info, ChevronsLeft, ChevronsRight,
  TrendingUp, Minus, RotateCcw, Building2,
} from 'lucide-react';
import ViewLayout from '@/components/shared/ViewLayout';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Family {
  id: string;
  pdfNumber: string;
  headName: string;
  headNameTelugu: string;
  caste: string | null;
  landAcres: number | null;
  houseType: string | null;
  sesStatus: string;
  firstSchemeEligible: boolean;
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

// ─── Status border colors for family cards ────────────────────────────────────

const STATUS_BORDER_COLORS: Record<string, string> = {
  APPROVED: 'border-l-green-600',
  VERIFIED: 'border-l-amber-500',
  SURVEYED: 'border-l-slate-400',
  REJECTED: 'border-l-red-600',
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function VillageView() {
  const selectedVillageId = useAppStore((s) => s.selectedVillageId);
  const navigateToFamily = useAppStore((s) => s.navigateToFamily);
  const navigateToVillage = useAppStore((s) => s.navigateToVillage);

  const containerRef = useRef<HTMLDivElement>(null);

  // ─── Mode 1: No village selected — All Villages List ────────────────────────
  const [allVillages, setAllVillages] = useState<VillageInfo[]>([]);
  const [villagesLoading, setVillagesLoading] = useState(true);
  const [villageSearch, setVillageSearch] = useState('');
  const [mandalFilter, setMandalFilter] = useState('');

  // ─── Mode 2: Village selected — Family listing ──────────────────────────────
  const [village, setVillage] = useState<VillageInfo | null>(null);
  const [families, setFamilies] = useState<Family[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sesFilter, setSesFilter] = useState('');
  const [sortBy, setSortBy] = useState('pdfNumber');
  const [loading, setLoading] = useState(true);
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const limit = 20;

  // ─── Fetch all villages (Mode 1) ────────────────────────────────────────────
  useEffect(() => {
    if (selectedVillageId) return; // skip in village-selected mode
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

  // ─── Fetch village info (Mode 2) ────────────────────────────────────────────
  useEffect(() => {
    if (!selectedVillageId) return;
    fetch('/api/mandals')
      .then(r => r.json())
      .then(async (mandals: any[]) => {
        for (const m of mandals) {
          const vRes = await fetch(`/api/villages?mandalId=${m.id}`);
          const villages = await vRes.json();
          const found = villages.find((v: any) => v.id === selectedVillageId);
          if (found) { setVillage(found); break; }
        }
      })
      .catch(() => {});
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
    if (sesFilter) params.set('sesStatus', sesFilter);
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
  }, [selectedVillageId, page, search, sesFilter, sortBy]);

  // ─── GSAP entrance animation ────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const isLoading = selectedVillageId ? loading : villagesLoading;
    if (!isLoading) {
      const els = container.querySelectorAll('.anim-in');
      gsap.fromTo(
        els,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.06, ease: 'power3.out' }
      );
    }
  }, [selectedVillageId, loading, villagesLoading, page]);

  // ─── Computed values (Mode 2) ───────────────────────────────────────────────
  const totalPages = Math.ceil(total / limit);
  const accentColor = village?.mandal?.color || '#D97706';

  const statusEntries = village?.statusBreakdown
    ? Object.entries(village.statusBreakdown).map(([key, count]) => ({
        key, count, config: SES_STATUS_CONFIG[key] || SES_STATUS_CONFIG.SURVEYED,
      }))
    : [];

  const avgFamilySize = useMemo(() => {
    if (families.length === 0) return 0;
    const totalMembers = families.reduce((sum, f) => sum + f.memberCount, 0);
    return (totalMembers / families.length).toFixed(1);
  }, [families]);

  const pendingPlots = useMemo(() => {
    return families.filter(f => f.sesStatus !== 'APPROVED').length;
  }, [families]);

  const hasActiveFilters = search || sesFilter;

  const clearAllFilters = () => {
    setSearch('');
    setSesFilter('');
    setPage(1);
    setLoading(true);
  };

  // ─── Computed values (Mode 1) ───────────────────────────────────────────────
  const filteredVillages = useMemo(() => {
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
    return list;
  }, [allVillages, mandalFilter, villageSearch]);

  const allVillagesTotalFamilies = useMemo(() =>
    allVillages.reduce((sum, v) => sum + v.totalFamilies, 0), [allVillages]);

  const allVillagesFirstScheme = useMemo(() =>
    allVillages.reduce((sum, v) => sum + v.firstSchemeCount, 0), [allVillages]);

  // Unique mandal codes from villages data
  const mandalOptions = useMemo(() => {
    const seen = new Map<string, { code: string; name: string; color: string }>();
    allVillages.forEach(v => {
      if (v.mandal?.code && !seen.has(v.mandal.code)) {
        seen.set(v.mandal.code, { code: v.mandal.code, name: v.mandal.name, color: v.mandal.color });
      }
    });
    return Array.from(seen.values());
  }, [allVillages]);

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
          {/* Diagonal pattern overlay */}
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
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
              All Villages
            </h1>
            <p className="text-slate-500 text-sm">
              {allVillages.length} villages across {mandalOptions.length} mandals in the Polavaram project area
            </p>
            <div className="ashoka-divider max-w-xs mx-auto" />
            {/* Summary Stats */}
            <div className="flex items-center justify-center gap-8 pt-3">
              <div className="flex flex-col items-center">
                <span className="counter-value text-3xl sm:text-4xl font-bold text-[#0F2B46]">
                  <CountUp end={allVillages.length} duration={1.2} />
                </span>
                <span className="text-xs text-slate-400 mt-1 font-medium uppercase tracking-wider">Villages</span>
              </div>
              <div className="w-px h-12 bg-slate-200" />
              <div className="flex flex-col items-center">
                <span className="counter-value text-3xl sm:text-4xl font-bold text-emerald-700">
                  <CountUp end={allVillagesTotalFamilies} duration={1.5} separator="," />
                </span>
                <span className="text-xs text-slate-400 mt-1 font-medium uppercase tracking-wider">Total Families</span>
              </div>
              <div className="w-px h-12 bg-slate-200" />
              <div className="flex flex-col items-center">
                <span className="counter-value text-3xl sm:text-4xl font-bold text-amber-700">
                  <CountUp end={allVillagesFirstScheme} duration={1.5} separator="," />
                </span>
                <span className="text-xs text-slate-400 mt-1 font-medium uppercase tracking-wider">First Scheme</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="anim-in opacity-0 bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Filter Villages</span>
            {(villageSearch || mandalFilter) && (
              <button
                onClick={() => { setVillageSearch(''); setMandalFilter(''); }}
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
                placeholder="Search by village name or code..."
                value={villageSearch}
                onChange={e => setVillageSearch(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F]/40 transition-all shadow-sm"
              />
              {villageSearch && (
                <button
                  onClick={() => setVillageSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
                className="pl-10 pr-8 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-sm text-slate-900 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F]/40 transition-all shadow-sm"
              >
                <option value="">All Mandals</option>
                {mandalOptions.map(m => (
                  <option key={m.code} value={m.code}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results summary */}
        <div className="anim-in opacity-0 flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg px-4 py-2">
          <p className="text-xs text-slate-500">
            Showing <span className="font-semibold text-slate-700">{filteredVillages.length}</span> of{' '}
            <span className="font-semibold text-slate-700">{allVillages.length}</span> villages
          </p>
          {mandalFilter && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Filtered by:</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded border bg-slate-100 border-slate-200 text-slate-700">
                {mandalOptions.find(m => m.code === mandalFilter)?.name || mandalFilter}
              </span>
              <button
                onClick={() => setMandalFilter('')}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Village Cards Grid */}
        <motion.div
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.04 } },
          }}
          initial="hidden"
          animate="visible"
          key={`villages-${mandalFilter}-${villageSearch}`}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {filteredVillages.map((v) => {
            const mandalBadge = MANDAL_BADGE_COLORS[v.mandal?.code || ''] || {
              bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200',
            };
            const mandalColor = v.mandal?.color || '#64748B';
            const breakdownEntries = Object.entries(v.statusBreakdown || {});
            const totalInBreakdown = breakdownEntries.reduce((sum, [, c]) => sum + c, 0);

            return (
              <motion.div
                key={v.id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="gov-card p-4 cursor-pointer group hover:scale-[1.01] transition-all duration-200 relative overflow-hidden border-l-4"
                style={{ borderLeftColor: mandalColor }}
                onClick={() => navigateToVillage(v.id)}
              >
                {/* Hover gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-50/0 via-transparent to-slate-100/0 group-hover:from-slate-50/50 group-hover:to-amber-50/30 transition-all duration-300 pointer-events-none" />

                <div className="relative z-[1]">
                  {/* Village Name + Mandal Badge */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900 leading-snug truncate">
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

                  {/* Family Count & First Scheme */}
                  <div className="flex items-center gap-3 mt-3 text-xs text-slate-600">
                    <span className="flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                      <Users className="w-3 h-3 text-slate-400" />
                      <span className="font-semibold">{v.totalFamilies}</span> families
                    </span>
                    <span className="flex items-center gap-1 bg-green-50 px-1.5 py-0.5 rounded border border-green-100">
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                      <span className="font-semibold text-green-700">{v.firstSchemeCount}</span> eligible
                    </span>
                  </div>

                  {/* SES Breakdown Mini Bars */}
                  {breakdownEntries.length > 0 && totalInBreakdown > 0 && (
                    <div className="mt-3 pt-3 border-t border-dashed border-slate-200">
                      <div className="flex items-center gap-0.5 h-2 rounded-full overflow-hidden bg-slate-100">
                        {breakdownEntries.map(([status, count]) => {
                          const pct = (count / totalInBreakdown) * 100;
                          const barColors: Record<string, string> = {
                            SURVEYED: '#94A3B8',
                            VERIFIED: '#D97706',
                            APPROVED: '#16A34A',
                            REJECTED: '#DC2626',
                          };
                          return (
                            <div
                              key={status}
                              className="h-full rounded-sm transition-all duration-300"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: barColors[status] || '#94A3B8',
                                minWidth: pct > 0 ? '3px' : '0',
                              }}
                              title={`${SES_STATUS_CONFIG[status]?.label || status}: ${count}`}
                            />
                          );
                        })}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1.5">
                        {breakdownEntries.map(([status, count]) => {
                          const cfg = SES_STATUS_CONFIG[status];
                          if (!cfg) return null;
                          return (
                            <span key={status} className={`text-[10px] ${cfg.color} flex items-center gap-0.5`}>
                              <span
                                className="w-1.5 h-1.5 rounded-full inline-block"
                                style={{
                                  backgroundColor:
                                    status === 'SURVEYED' ? '#94A3B8' :
                                    status === 'VERIFIED' ? '#D97706' :
                                    status === 'APPROVED' ? '#16A34A' :
                                    status === 'REJECTED' ? '#DC2626' : '#94A3B8'
                                }}
                              />
                              {count}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Click affordance */}
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
        {filteredVillages.length === 0 && !villagesLoading && (
          <div className="gov-card p-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
                <Search className="w-6 h-6 text-slate-300" />
              </div>
              <p className="text-slate-500 text-sm">No villages found matching your criteria</p>
              <button
                onClick={() => { setVillageSearch(''); setMandalFilter(''); }}
                className="text-xs text-[#D97706] hover:underline font-medium"
              >
                Clear filters
              </button>
            </div>
          </div>
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* A. Village Header Card */}
        <div className="anim-in opacity-0 gov-card p-6 sm:p-8 relative overflow-hidden">
          {/* Diagonal pattern overlay */}
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
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
              {village?.name}
            </h1>
            <p className="text-slate-500 text-lg">{village?.nameTelugu}</p>

            {/* Mandal badge */}
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

            {/* GPS Coordinates */}
            {village?.latitude && village?.longitude && (
              <p
                className="text-xs text-slate-400 mt-1"
                style={{ fontFamily: 'var(--font-jetbrains)' }}
              >
                {village.latitude.toFixed(4)}°N, {village.longitude.toFixed(4)}°E
              </p>
            )}

            <div className="ashoka-divider max-w-xs mx-auto" />

            {/* Stat Counters */}
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
                  <CountUp end={village?.firstSchemeCount || 0} duration={1.5} separator="," />
                </span>
                <span className="text-xs text-slate-400 mt-1 font-medium uppercase tracking-wider">First Scheme</span>
              </div>
            </div>
          </div>

          {/* Status Breakdown Mini-bars */}
          {statusEntries.length > 0 && (
            <div className="mt-6 pt-5 border-t border-slate-100 relative z-[1]">
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

        {/* B. Stats Summary Cards */}
        <div className="anim-in opacity-0 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`gov-card p-4 border-t-[3px] ${STAT_CARD_CONFIGS[0].topBorder} hover:-translate-y-0.5 hover:shadow-md transition-all cursor-default`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${STAT_CARD_CONFIGS[0].bgColor} flex items-center justify-center`}>
                <Users className={`w-5 h-5 ${STAT_CARD_CONFIGS[0].iconColor}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900 flex items-center gap-1">
                  <CountUp end={total} duration={1.2} separator="," />
                  <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                </p>
                <p className="text-xs text-slate-500">Total Families</p>
              </div>
            </div>
          </div>
          <div className={`gov-card p-4 border-t-[3px] ${STAT_CARD_CONFIGS[1].topBorder} hover:-translate-y-0.5 hover:shadow-md transition-all cursor-default`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${STAT_CARD_CONFIGS[1].bgColor} flex items-center justify-center`}>
                <CheckCircle2 className={`w-5 h-5 ${STAT_CARD_CONFIGS[1].iconColor}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-green-700 flex items-center gap-1">
                  <CountUp end={village?.firstSchemeCount || 0} duration={1.2} separator="," />
                  <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                </p>
                <p className="text-xs text-slate-500">First Scheme Eligible</p>
              </div>
            </div>
          </div>
          <div className={`gov-card p-4 border-t-[3px] ${STAT_CARD_CONFIGS[2].topBorder} hover:-translate-y-0.5 hover:shadow-md transition-all cursor-default`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${STAT_CARD_CONFIGS[2].bgColor} flex items-center justify-center`}>
                <Users className={`w-5 h-5 ${STAT_CARD_CONFIGS[2].iconColor}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-teal-700 flex items-center gap-1">
                  {avgFamilySize}
                  <Minus className="w-3.5 h-3.5 text-slate-400" />
                </p>
                <p className="text-xs text-slate-500">Avg. Family Size</p>
              </div>
            </div>
          </div>
          <div className={`gov-card p-4 border-t-[3px] ${STAT_CARD_CONFIGS[3].topBorder} hover:-translate-y-0.5 hover:shadow-md transition-all cursor-default`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${STAT_CARD_CONFIGS[3].bgColor} flex items-center justify-center`}>
                <Clock className={`w-5 h-5 ${STAT_CARD_CONFIGS[3].iconColor}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-orange-700 flex items-center gap-1">
                  {pendingPlots}
                  <Minus className="w-3.5 h-3.5 text-slate-400" />
                </p>
                <p className="text-xs text-slate-500">Pending Plots</p>
              </div>
            </div>
          </div>
        </div>

        {/* C. Search & Filter Bar */}
        <div className="anim-in opacity-0 bg-slate-50 border border-slate-200 rounded-xl p-4">
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
                className="w-full pl-10 pr-10 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F]/40 transition-all shadow-sm"
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
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={sesFilter}
                onChange={e => { setSesFilter(e.target.value); setPage(1); setLoading(true); }}
                className="pl-10 pr-8 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-sm text-slate-900 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F]/40 transition-all shadow-sm"
              >
                <option value="">All Status</option>
                <option value="SURVEYED">Surveyed</option>
                <option value="VERIFIED">Verified</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <div className="relative">
              <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={sortBy}
                onChange={e => { setSortBy(e.target.value); setPage(1); setLoading(true); }}
                className="pl-10 pr-8 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-sm text-slate-900 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F]/40 transition-all shadow-sm"
              >
                <option value="pdfNumber">Sort by PDF Number</option>
                <option value="headName">Sort by Name</option>
                <option value="sesStatus">Sort by Status</option>
              </select>
            </div>
          </div>
        </div>

        {/* F. Family Count Summary Bar */}
        <div className="anim-in opacity-0 flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg px-4 py-2">
          <div className="flex items-center gap-2">
            <p className="text-xs text-slate-500">
              Showing <span className="font-semibold text-slate-700">{families.length}</span> of{' '}
              <span className="font-semibold text-slate-700">{total}</span> families
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
                  Filters apply to the current village data
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800" />
                </div>
              )}
            </div>
          </div>
          {sesFilter && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Filtered by:</span>
              <button
                onClick={() => { setSesFilter(''); setPage(1); setLoading(true); }}
                className={`text-xs font-medium px-2 py-0.5 rounded border ${SES_STATUS_CONFIG[sesFilter]?.color || ''} ${SES_STATUS_CONFIG[sesFilter]?.bg || ''} ${SES_STATUS_CONFIG[sesFilter]?.border || ''} hover:opacity-80 transition-opacity cursor-pointer`}
              >
                {SES_STATUS_CONFIG[sesFilter]?.label || sesFilter}
              </button>
              <button
                onClick={() => { setSesFilter(''); setPage(1); setLoading(true); }}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
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
            const statusCfg = SES_STATUS_CONFIG[f.sesStatus] || SES_STATUS_CONFIG.SURVEYED;
            const borderColor = STATUS_BORDER_COLORS[f.sesStatus] || 'border-l-slate-300';
            return (
              <motion.div
                key={f.id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className={`gov-card p-4 cursor-pointer group border-l-4 ${borderColor} hover:scale-[1.01] transition-all duration-200 relative overflow-hidden`}
                onClick={() => navigateToFamily(f.pdfNumber, f.id)}
              >
                {/* Hover gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-50/0 via-transparent to-slate-100/0 group-hover:from-slate-50/50 group-hover:to-amber-50/30 transition-all duration-300 pointer-events-none" />

                <div className="relative z-[1]">
                  {/* PDF Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="gov-badge px-2.5 py-1 rounded-md border bg-amber-50 border-amber-300 text-amber-700 tracking-widest flex items-center gap-1.5">
                      <FileText className="w-3 h-3" />
                      {f.pdfNumber}
                    </span>
                    {f.firstSchemeEligible && (
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    )}
                  </div>

                  {/* Family Head Name */}
                  <p className="text-sm font-medium text-slate-900 leading-snug">
                    {f.headName}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{f.headNameTelugu}</p>

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
                    {f.houseType && (
                      <span className="flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                        <Home className="w-3 h-3 text-slate-400" />
                        {f.houseType}
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

        {/* E. Pagination */}
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
