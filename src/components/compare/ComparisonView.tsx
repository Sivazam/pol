'use client';

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { MANDAL_COLORS } from '@/lib/constants';
import gsap from 'gsap';
import {
  GitCompare, TrendingUp, Users, LandPlot, Home, CheckCircle2,
  Clock, AlertCircle, Search, ChevronDown, ArrowUpDown,
} from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, ResponsiveContainer, Tooltip, Legend,
} from 'recharts';
import ViewLayout from '@/components/shared/ViewLayout';

// ── Types ──
interface MandalCompareItem {
  id: string;
  name: string;
  nameTelugu: string;
  code: string;
  color: string;
  familyCount: number;
  villageCount: number;
  firstSchemeCount: number;
  rrBreakdown: Record<string, number>;
  plotsAllotted: number;
  plotsPending: number;
  totalPlots: number;
}

interface VillageCompareItem {
  id: string;
  name: string;
  nameTelugu: string;
  code: string;
  mandalName: string;
  mandalCode: string;
  mandalColor: string;
  familyCount: number;
  firstSchemeCount: number;
  memberCount: number;
  rrBreakdown: Record<string, number>;
  plotsAllotted: number;
  plotsPending: number;
}

type CompareItem = MandalCompareItem | VillageCompareItem;

interface MandalOption {
  id: string;
  name: string;
  code: string;
  color: string;
}

interface VillageOption {
  id: string;
  name: string;
  mandalName: string;
  mandalCode: string;
}

// ── Section Header ──
function SectionHeader({ title, accentColor = '#1E3A5F' }: { title: string; accentColor?: string }) {
  return (
    <div className="mb-5">
      <h3
        className="text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-wider flex items-center"
        style={{ borderLeft: `3px solid ${accentColor}`, paddingLeft: '10px' }}
      >
        {title}
      </h3>
      <div className="mt-2 h-px bg-gradient-to-r from-slate-200 via-slate-100 to-transparent dark:from-slate-600 dark:via-slate-700" />
    </div>
  );
}

// ── Color coding for winner ──
function getWinnerClass(values: number[], index: number): string {
  const max = Math.max(...values);
  if (values[index] === max && values.filter(v => v === max).length === 1) {
    return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700';
  }
  return 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600';
}

// ── Custom Radar Tooltip ──
function RadarTooltipContent({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }> }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 shadow-lg">
      {payload.map((entry, i) => (
        <p key={i} className="text-xs text-slate-600 dark:text-slate-400">
          <span className="inline-block w-2 h-2 rounded-sm mr-1.5" style={{ backgroundColor: entry.color }} />
          {entry.name}: <span className="font-medium text-slate-900 dark:text-slate-100">{entry.value.toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
}

// ── Metric Row for comparison table ──
interface MetricRowProps {
  label: string;
  icon: React.ElementType;
  values: number[];
  suffix?: string;
  format?: 'number' | 'percent';
}

function MetricRow({ label, icon: Icon, values, suffix = '', format = 'number' }: MetricRowProps) {
  const formatVal = (v: number) => {
    if (format === 'percent') return `${v}%`;
    return v.toLocaleString() + suffix;
  };

  const maxVal = Math.max(...values);

  return (
    <div className="flex items-center border-b border-slate-100 dark:border-slate-700/50 last:border-0">
      <div className="w-40 sm:w-48 shrink-0 px-4 py-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
        <Icon className="w-3.5 h-3.5 text-slate-400" />
        <span className="truncate">{label}</span>
      </div>
      {values.map((val, i) => {
        const isWinner = val === maxVal && values.filter(v => v === maxVal).length === 1;
        return (
          <div
            key={i}
            className={`flex-1 px-4 py-3 text-center text-sm font-medium transition-colors ${
              isWinner
                ? 'bg-emerald-50/60 dark:bg-emerald-900/15 text-emerald-700 dark:text-emerald-400'
                : 'text-slate-700 dark:text-slate-300'
            }`}
            style={{ fontFamily: 'var(--font-jetbrains)' }}
          >
            {formatVal(val)}
            {isWinner && (
              <TrendingUp className="w-3 h-3 inline-block ml-1 text-emerald-500" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Component ──
export default function ComparisonView() {
  const [compareType, setCompareType] = useState<'mandal' | 'village'>('mandal');
  const [mandalOptions, setMandalOptions] = useState<MandalOption[]>([]);
  const [villageOptions, setVillageOptions] = useState<VillageOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [compareData, setCompareData] = useState<CompareItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [villageSearch, setVillageSearch] = useState('');
  const [showVillageDropdown, setShowVillageDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch mandal and village options, auto-select first 3 mandals
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/mandals').then(r => r.json()),
      fetch('/api/villages?all=true').then(r => r.json()),
    ]).then(([mandals, villages]) => {
      if (cancelled) return;
      const mOpts = mandals.map((m: MandalOption) => ({
        id: m.id, name: m.name, code: m.code, color: m.color,
      }));
      const vOpts = villages.map((v: VillageOption & { mandal: { name: string; code: string; color: string } }) => ({
        id: v.id, name: v.name, mandalName: v.mandal?.name || '', mandalCode: v.mandal?.code || '',
      }));
      setMandalOptions(mOpts);
      setVillageOptions(vOpts);
      setOptionsLoading(false);
      // Auto-select first 3 mandals
      setSelectedIds(mOpts.slice(0, 3).map(m => m.id));
    }).catch(() => { if (!cancelled) setOptionsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Auto-select all mandals when switching to mandal mode
  const handleCompareTypeChange = useCallback((type: 'mandal' | 'village') => {
    setCompareType(type);
    if (type === 'mandal' && mandalOptions.length > 0) {
      setSelectedIds(mandalOptions.slice(0, 3).map(m => m.id));
    } else {
      setSelectedIds([]);
    }
    setCompareData(null);
  }, [mandalOptions]);

  // Fetch comparison data when ids change
  const prevIdsRef = useRef<string>('');
  useEffect(() => {
    const key = `${compareType}:${selectedIds.join(',')}`;
    if (key === prevIdsRef.current) return;
    prevIdsRef.current = key;

    if (selectedIds.length < 2) {
      // Clear stale data asynchronously to avoid cascading renders
      queueMicrotask(() => setCompareData(null));
      return;
    }

    let cancelled = false;
    // Use requestAnimationFrame to avoid synchronous setState in effect
    requestAnimationFrame(() => {
      if (cancelled) return;
      setLoading(true);
      fetch(`/api/compare?type=${compareType}&ids=${selectedIds.join(',')}`)
        .then(r => r.json())
        .then(d => {
          if (!cancelled) {
            setCompareData(d.items || []);
            setLoading(false);
          }
        })
        .catch(() => { if (!cancelled) setLoading(false); });
    });
    return () => { cancelled = true; };
  }, [selectedIds, compareType]);

  // Animate on data load
  useEffect(() => {
    if (!loading && compareData && containerRef.current) {
      const els = containerRef.current.querySelectorAll('.anim-in');
      gsap.fromTo(els, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.06, ease: 'power3.out' });
    }
  }, [loading, compareData]);

  // Filtered village options
  const filteredVillages = useMemo(() => {
    if (!villageSearch.trim()) return villageOptions;
    const q = villageSearch.toLowerCase();
    return villageOptions.filter(v =>
      v.name.toLowerCase().includes(q) || v.mandalName.toLowerCase().includes(q)
    );
  }, [villageOptions, villageSearch]);

  // Toggle selection
  const toggleId = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id);
      }
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  // Radar chart data
  const radarData = useMemo(() => {
    if (!compareData || compareData.length === 0) return [];
    const items = compareData;

    if (compareType === 'mandal') {
      const mandalItems = items as MandalCompareItem[];
      const maxFamily = Math.max(...mandalItems.map(m => m.familyCount), 1);
      const maxVillage = Math.max(...mandalItems.map(m => m.villageCount), 1);
      const maxFirstScheme = Math.max(...mandalItems.map(m => m.firstSchemeCount), 1);
      const maxPlotsAllotted = Math.max(...mandalItems.map(m => m.plotsAllotted), 1);
      const maxEligible = Math.max(...mandalItems.map(m => m.rrBreakdown.Eligible || 0), 1);
      const maxIneligible = Math.max(...mandalItems.map(m => m.rrBreakdown.Ineligible || 0), 1);

      return [
        { metric: 'Families', ...Object.fromEntries(mandalItems.map((m, i) => [`item${i}`, Math.round((m.familyCount / maxFamily) * 100)])) },
        { metric: 'Villages', ...Object.fromEntries(mandalItems.map((m, i) => [`item${i}`, Math.round((m.villageCount / maxVillage) * 100)])) },
        { metric: '1st Scheme', ...Object.fromEntries(mandalItems.map((m, i) => [`item${i}`, Math.round((m.firstSchemeCount / maxFirstScheme) * 100)])) },
        { metric: 'Plots Allotted', ...Object.fromEntries(mandalItems.map((m, i) => [`item${i}`, Math.round((m.plotsAllotted / maxPlotsAllotted) * 100)])) },
        { metric: 'Eligible', ...Object.fromEntries(mandalItems.map((m, i) => [`item${i}`, Math.round(((m.rrBreakdown.Eligible || 0) / maxEligible) * 100)])) },
        { metric: 'Ineligible', ...Object.fromEntries(mandalItems.map((m, i) => [`item${i}`, Math.round(((m.rrBreakdown.Ineligible || 0) / maxIneligible) * 100)])) },
      ];
    } else {
      const villageItems = items as VillageCompareItem[];
      const maxFamily = Math.max(...villageItems.map(v => v.familyCount), 1);
      const maxFirstScheme = Math.max(...villageItems.map(v => v.firstSchemeCount), 1);
      const maxMembers = Math.max(...villageItems.map(v => v.memberCount), 1);
      const maxPlotsAllotted = Math.max(...villageItems.map(v => v.plotsAllotted), 1);
      const maxEligible = Math.max(...villageItems.map(v => v.rrBreakdown.Eligible || 0), 1);
      const maxIneligible = Math.max(...villageItems.map(v => v.rrBreakdown.Ineligible || 0), 1);

      return [
        { metric: 'Families', ...Object.fromEntries(villageItems.map((v, i) => [`item${i}`, Math.round((v.familyCount / maxFamily) * 100)])) },
        { metric: '1st Scheme', ...Object.fromEntries(villageItems.map((v, i) => [`item${i}`, Math.round((v.firstSchemeCount / maxFirstScheme) * 100)])) },
        { metric: 'Members', ...Object.fromEntries(villageItems.map((v, i) => [`item${i}`, Math.round((v.memberCount / maxMembers) * 100)])) },
        { metric: 'Plots Allotted', ...Object.fromEntries(villageItems.map((v, i) => [`item${i}`, Math.round((v.plotsAllotted / maxPlotsAllotted) * 100)])) },
        { metric: 'Eligible', ...Object.fromEntries(villageItems.map((v, i) => [`item${i}`, Math.round(((v.rrBreakdown.Eligible || 0) / maxEligible) * 100)])) },
        { metric: 'Ineligible', ...Object.fromEntries(villageItems.map((v, i) => [`item${i}`, Math.round(((v.rrBreakdown.Ineligible || 0) / maxIneligible) * 100)])) },
      ];
    }
  }, [compareData, compareType]);

  // Radar colors
  const RADAR_COLORS = ['#D97706', '#0D9488', '#EA580C'];

  // Get names for headers
  const getItemNames = (): string[] => {
    if (!compareData) return [];
    return compareData.map(item => item.name);
  };

  // ── Loading State ──
  if (optionsLoading) {
    return (
      <ViewLayout navTitle="COMPARE">
        <div className="flex items-center justify-center py-32">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-2 border-slate-200 border-t-[#1E3A5F] rounded-full animate-spin" />
            <p className="text-slate-400 text-sm tracking-widest uppercase" style={{ fontFamily: 'var(--font-jetbrains)' }}>Loading...</p>
          </div>
        </div>
      </ViewLayout>
    );
  }

  return (
    <ViewLayout navTitle="COMPARE" navSubtitle="Side-by-side Analysis">
      <div ref={containerRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 w-full">

        {/* ── Page Header ── */}
        <div className="anim-in opacity-0 p-6 sm:p-7 bg-gradient-to-r from-[#0F2B46] to-[#1E3A5F] text-white rounded-xl border border-[#0F2B46]/30 shadow-sm header-card-glow">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <GitCompare className="w-4 h-4 text-amber-300/80" />
                <p className="text-[10px] tracking-[0.2em] uppercase text-amber-300/80 font-medium" style={{ fontFamily: 'var(--font-jetbrains)' }}>side-by-side analysis</p>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight mt-1">Mandal & Village Comparison</h1>
              <p className="text-sm text-white/60 mt-1">Compare up to 3 mandals or villages with detailed metrics and visual radar charts</p>
            </div>
          </div>
        </div>

        {/* ── Selection Controls ── */}
        <div className="anim-in opacity-0 gov-card p-5 sm:p-6">
          <SectionHeader title="SELECT ENTITIES TO COMPARE" accentColor="#D97706" />

          {/* Type Toggle */}
          <div className="flex items-center gap-3 mb-5">
            <span className="text-sm text-slate-500 dark:text-slate-400">Compare by:</span>
            <div className="flex rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden">
              <button
                onClick={() => handleCompareTypeChange('mandal')}
                className={`px-4 py-2 text-sm font-medium transition-all ${
                  compareType === 'mandal'
                    ? 'bg-[#1E3A5F] text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                Mandal
              </button>
              <button
                onClick={() => handleCompareTypeChange('village')}
                className={`px-4 py-2 text-sm font-medium transition-all ${
                  compareType === 'village'
                    ? 'bg-[#1E3A5F] text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                Village
              </button>
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-500 ml-2">
              {selectedIds.length}/3 selected
            </span>
          </div>

          {/* Mandal Selection */}
          {compareType === 'mandal' && (
            <div className="flex flex-wrap gap-3">
              {mandalOptions.map(m => {
                const isSelected = selectedIds.includes(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => toggleId(m.id)}
                    disabled={!isSelected && selectedIds.length >= 3}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      isSelected
                        ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 shadow-sm'
                        : selectedIds.length >= 3
                          ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                          : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-300 hover:bg-amber-50/50 dark:hover:bg-amber-900/10'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: m.color || MANDAL_COLORS[m.code as keyof typeof MANDAL_COLORS] }} />
                    {m.name}
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-500" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Village Selection */}
          {compareType === 'village' && (
            <div>
              {/* Search */}
              <div className="relative mb-3 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search villages..."
                  value={villageSearch}
                  onChange={e => setVillageSearch(e.target.value)}
                  onFocus={() => setShowVillageDropdown(true)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 transition"
                />
              </div>

              {/* Selected chips */}
              {selectedIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedIds.map(id => {
                    const v = villageOptions.find(opt => opt.id === id);
                    if (!v) return null;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1E3A5F]/10 dark:bg-amber-900/20 text-[#1E3A5F] dark:text-amber-400 text-xs font-medium border border-[#1E3A5F]/20 dark:border-amber-700"
                      >
                        {v.name}
                        <button onClick={() => toggleId(id)} className="hover:text-red-500 transition-colors">
                          <AlertCircle className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Village list dropdown */}
              {showVillageDropdown && (
                <div className="border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 max-h-64 overflow-y-auto custom-scrollbar shadow-lg">
                  {filteredVillages.map(v => {
                    const isSelected = selectedIds.includes(v.id);
                    const mandalColor = MANDAL_COLORS[v.mandalCode as keyof typeof MANDAL_COLORS] || '#94A3B8';
                    return (
                      <button
                        key={v.id}
                        onClick={() => {
                          toggleId(v.id);
                        }}
                        disabled={!isSelected && selectedIds.length >= 3}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors border-b border-slate-100 dark:border-slate-700/50 last:border-0 ${
                          isSelected
                            ? 'bg-amber-50 dark:bg-amber-900/15 text-amber-800 dark:text-amber-300'
                            : selectedIds.length >= 3
                              ? 'text-slate-400 dark:text-slate-600 cursor-not-allowed'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: mandalColor }} />
                        <span className="font-medium">{v.name}</span>
                        <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">{v.mandalName}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" />}
                      </button>
                    );
                  })}
                  {filteredVillages.length === 0 && (
                    <div className="px-4 py-6 text-center text-sm text-slate-400">No villages found</div>
                  )}
                </div>
              )}

              {/* Click outside to close dropdown */}
              {showVillageDropdown && (
                <div
                  className="fixed inset-0 z-[-1]"
                  onClick={() => setShowVillageDropdown(false)}
                />
              )}
            </div>
          )}
        </div>

        {/* ── Loading indicator ── */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-slate-200 border-t-[#1E3A5F] rounded-full animate-spin" />
          </div>
        )}

        {/* ── Comparison Results ── */}
        {compareData && compareData.length >= 2 && !loading && (
          <>
            {/* ── Comparison Table ── */}
            <div className="anim-in opacity-0 gov-card overflow-hidden">
              <div className="p-5 sm:p-6 pb-0">
                <SectionHeader title="DETAILED COMPARISON" accentColor="#1E3A5F" />
              </div>

              {/* Table header with entity names */}
              <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <div className="w-40 sm:w-48 shrink-0 px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Metric
                </div>
                {compareData.map((item, i) => {
                  const color = compareType === 'mandal'
                    ? (item as MandalCompareItem).color || MANDAL_COLORS[(item as MandalCompareItem).code as keyof typeof MANDAL_COLORS]
                    : MANDAL_COLORS[((item as VillageCompareItem).mandalCode) as keyof typeof MANDAL_COLORS] || '#94A3B8';
                  return (
                    <div key={i} className="flex-1 px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{item.name}</span>
                      </div>
                      {compareType === 'village' && (
                        <p className="text-[10px] text-slate-400 mt-0.5">{(item as VillageCompareItem).mandalName}</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Metric rows */}
              <div className="divide-y-0">
                <MetricRow
                  label="Total Families"
                  icon={Users}
                  values={compareData.map(item => item.familyCount)}
                />

                {compareType === 'mandal' && (
                  <MetricRow
                    label="Villages"
                    icon={Home}
                    values={compareData.map(item => (item as MandalCompareItem).villageCount)}
                  />
                )}

                {compareType === 'village' && (
                  <MetricRow
                    label="Members"
                    icon={Users}
                    values={compareData.map(item => (item as VillageCompareItem).memberCount)}
                  />
                )}

                <MetricRow
                  label="1st Scheme Eligible"
                  icon={CheckCircle2}
                  values={compareData.map(item => item.firstSchemeCount)}
                />

                <MetricRow
                  label="R&R - Eligible"
                  icon={CheckCircle2}
                  values={compareData.map(item => item.rrBreakdown.Eligible || 0)}
                />

                <MetricRow
                  label="R&R - Ineligible"
                  icon={AlertCircle}
                  values={compareData.map(item => item.rrBreakdown.Ineligible || 0)}
                />

                <MetricRow
                  label="Plots Allotted"
                  icon={LandPlot}
                  values={compareData.map(item => item.plotsAllotted)}
                />

                <MetricRow
                  label="Plots Pending"
                  icon={Clock}
                  values={compareData.map(item => item.plotsPending)}
                />

                {/* 1st Scheme percentage */}
                <MetricRow
                  label="1st Scheme %"
                  icon={TrendingUp}
                  values={compareData.map(item =>
                    item.familyCount > 0 ? Math.round((item.firstSchemeCount / item.familyCount) * 100) : 0
                  )}
                  format="percent"
                />

                {/* Allotment rate */}
                <MetricRow
                  label="Allotment Rate"
                  icon={ArrowUpDown}
                  values={compareData.map(item => {
                    if (compareType === 'mandal') {
                      const total = (item as MandalCompareItem).totalPlots;
                      return total > 0 ? Math.round(((item as MandalCompareItem).plotsAllotted / total) * 100) : 0;
                    }
                    const total = item.plotsAllotted + item.plotsPending;
                    return total > 0 ? Math.round((item.plotsAllotted / total) * 100) : 0;
                  })}
                  format="percent"
                />
              </div>
            </div>

            {/* ── Radar Chart ── */}
            <div className="anim-in opacity-0 gov-card p-5 sm:p-6">
              <SectionHeader title="VISUAL COMPARISON" accentColor="#0D9488" />
              <div className="w-full" style={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid stroke="#E2E8F0" />
                    <PolarAngleAxis
                      dataKey="metric"
                      tick={{ fontSize: 11, fill: '#64748B' }}
                    />
                    <PolarRadiusAxis
                      tick={{ fontSize: 9, fill: '#94A3B8' }}
                      domain={[0, 100]}
                      tickCount={5}
                    />
                    <Tooltip content={<RadarTooltipContent />} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                    {compareData.map((item, i) => (
                      <Radar
                        key={i}
                        name={item.name}
                        dataKey={`item${i}`}
                        stroke={RADAR_COLORS[i]}
                        fill={RADAR_COLORS[i]}
                        fillOpacity={0.15}
                        strokeWidth={2}
                      />
                    ))}
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-center text-xs text-slate-400 mt-2">
                Values normalized to 0–100 scale for visual comparison
              </p>
            </div>

            {/* ── R&R Eligibility Cards ── */}
            <div className="anim-in opacity-0 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              {compareData.map((item, i) => {
                const total = item.familyCount;
                const color = compareType === 'mandal'
                  ? (item as MandalCompareItem).color || MANDAL_COLORS[(item as MandalCompareItem).code as keyof typeof MANDAL_COLORS]
                  : MANDAL_COLORS[((item as VillageCompareItem).mandalCode) as keyof typeof MANDAL_COLORS] || '#94A3B8';
                const rr = item.rrBreakdown;

                return (
                  <div key={i} className="gov-card p-5 sm:p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{item.name}</h4>
                    </div>

                    {/* R&R Eligibility Stacked bar */}
                    <div className="mb-4">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">R&R Eligibility Distribution</p>
                      <div className="w-full h-6 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-700">
                        {total > 0 && (
                          <>
                            {rr.Eligible > 0 && (
                              <div
                                className="h-full bg-emerald-500 transition-all"
                                style={{ width: `${(rr.Eligible / total) * 100}%` }}
                                title={`Eligible: ${rr.Eligible}`}
                              />
                            )}
                            {rr.Ineligible > 0 && (
                              <div
                                className="h-full bg-red-500 transition-all"
                                style={{ width: `${(rr.Ineligible / total) * 100}%` }}
                                title={`Ineligible: ${rr.Ineligible}`}
                              />
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />Eligible {rr.Eligible || 0}</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />Ineligible {rr.Ineligible || 0}</span>
                      </div>
                    </div>

                    {/* Quick stats */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-slate-900 dark:text-slate-100" style={{ fontFamily: 'var(--font-jetbrains)' }}>{item.plotsAllotted}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Allotted</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-slate-900 dark:text-slate-100" style={{ fontFamily: 'var(--font-jetbrains)' }}>{item.plotsPending}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Pending</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400" style={{ fontFamily: 'var(--font-jetbrains)' }}>
                          {total > 0 ? Math.round((item.firstSchemeCount / total) * 100) : 0}%
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">1st Scheme</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-slate-900 dark:text-slate-100" style={{ fontFamily: 'var(--font-jetbrains)' }}>{total.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Families</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── Empty State ── */}
        {(!compareData || compareData.length < 2) && !loading && (
          <div className="anim-in opacity-0 gov-card p-8 sm:p-12 text-center">
            <GitCompare className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">Select Entities to Compare</h3>
            <p className="text-sm text-slate-400 dark:text-slate-500 max-w-md mx-auto">
              Choose at least 2 {compareType === 'mandal' ? 'mandals' : 'villages'} from the selection above to see a detailed side-by-side comparison with charts and metrics.
            </p>
          </div>
        )}

      </div>
    </ViewLayout>
  );
}
