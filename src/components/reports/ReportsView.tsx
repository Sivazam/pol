'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { RR_ELIGIBILITY_CONFIG, MANDAL_COLORS } from '@/lib/constants';
import CountUp from 'react-countup';
import gsap from 'gsap';
import {
  TrendingUp, TrendingDown, Users, LandPlot, Home, PieChart as PieChartIcon,
  Download, FileSpreadsheet, FileJson, Calendar, ArrowUpDown, Search,
  BarChart3, MapPin, Activity, ChevronUp, ChevronDown, Filter,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell,
} from 'recharts';
import ViewLayout from '@/components/shared/ViewLayout';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

// ── Types ──
interface ReportsData {
  kpis: {
    rehabilitationRate: number;
    avgLandHolding: number;
    avgFamilySize: number;
    plotAllotmentRate: number;
  };
  rrByMandal: Array<{
    mandalName: string; mandalCode: string; color: string;
    Eligible: number; Ineligible: number;
  }>;
  monthlyProgress: Array<{
    month: string; Eligible: number; Ineligible: number;
  }>;
  villageComparison: Array<{
    villageName: string; mandalName: string; mandalCode: string;
    totalFamilies: number; firstSchemePct: number; avgLand: number;
    rrBreakdown: { Eligible: number; Ineligible: number };
  }>;
  landDistribution: Array<{ range: string; count: number }>;
  casteDistribution: Array<{ caste: string; count: number; percentage: number }>;
}

// ── Color constants ──
const RR_ELIGIBILITY_COLORS: Record<string, string> = {
  Eligible: '#16A34A',
  Ineligible: '#DC2626',
};

const CASTE_COLORS = [
  '#0F2B46', '#1E3A5F', '#D97706', '#0D9488', '#16A34A',
  '#EA580C', '#7C3AED', '#0891B2',
];

const LAND_GRADIENT = ['#DBEAFE', '#93C5FD', '#3B82F6', '#1E40AF', '#1E3A5F'];

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
      <div className="mt-2 h-px bg-gradient-to-r from-slate-200 via-slate-100 to-transparent" />
    </div>
  );
}

// ── Custom Recharts Tooltips ──
function StackedBarTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
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

function AreaChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
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

// ── Sorting state ──
type SortKey = 'villageName' | 'mandalName' | 'totalFamilies' | 'firstSchemePct' | 'avgLand';
type SortDir = 'asc' | 'desc';

// ── Sort Icon Component (outside render to avoid re-creation) ──
function SortIcon({ column, sortKey, sortDir }: { column: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (sortKey !== column) return <ArrowUpDown className="w-3 h-3 text-slate-300" />;
  return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-amber-600" /> : <ChevronDown className="w-3 h-3 text-amber-600" />;
}

export default function ReportsView() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('totalFamilies');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [mandalFilter, setMandalFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/reports')
      .then(res => res.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading && containerRef.current) {
      const els = containerRef.current.querySelectorAll('.anim-in');
      gsap.fromTo(els, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'power3.out' });
    }
  }, [loading]);

  // ── Sorting & Filtering ──
  const filteredVillages = useMemo(() => {
    if (!data) return [];
    let result = [...data.villageComparison];
    if (mandalFilter !== 'all') {
      result = result.filter(v => v.mandalCode === mandalFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(v => v.villageName.toLowerCase().includes(q) || v.mandalName.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return result;
  }, [data, sortKey, sortDir, mandalFilter, searchQuery]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  // ── Export helpers ──
  const exportCSV = () => {
    if (!data) return;
    const rows = data.villageComparison.map(v =>
      [v.villageName, v.mandalName, v.totalFamilies, v.firstSchemePct, v.avgLand,
        v.rrBreakdown.Eligible, v.rrBreakdown.Ineligible].join(',')
    );
    const csv = ['Village,Mandal,Total Families,First Scheme %,Avg Land,Eligible,Ineligible', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'polavaram_report.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'polavaram_report.json'; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Loading State (skeleton) ──
  if (loading) {
    return (
      <ViewLayout navTitle="REPORTS & ANALYTICS">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 w-full">
          <div className="skeleton-pulse h-24 rounded-xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="skeleton-pulse h-32 rounded-xl" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="skeleton-pulse h-80 rounded-xl" />
            <div className="skeleton-pulse h-80 rounded-xl" />
          </div>
          <div className="skeleton-pulse h-64 rounded-xl" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="skeleton-pulse h-80 rounded-xl" />
            <div className="skeleton-pulse h-80 rounded-xl" />
          </div>
        </div>
      </ViewLayout>
    );
  }

  if (!data) {
    return (
      <ViewLayout navTitle="REPORTS & ANALYTICS">
        <div className="flex items-center justify-center py-32">
          <p className="text-red-600 font-medium">Failed to load reports data</p>
        </div>
      </ViewLayout>
    );
  }

  // ── KPI Cards Config ──
  const kpiCards = [
    {
      label: 'Rehabilitation Rate',
      value: data.kpis.rehabilitationRate,
      suffix: '%',
      icon: TrendingUp,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      topBorder: '#16A34A',
      gradientFrom: 'from-emerald-50/50',
      gradientTo: 'to-emerald-100/60',
      trend: '+4.2% this month',
      trendUp: true,
    },
    {
      label: 'Avg Land Holding',
      value: data.kpis.avgLandHolding,
      suffix: ' acres',
      icon: LandPlot,
      color: 'text-[#1E3A5F]',
      bg: 'bg-[#1E3A5F]/10',
      borderColor: 'border-[#1E3A5F]/20',
      topBorder: '#1E3A5F',
      gradientFrom: 'from-[#0F2B46]/[0.03]',
      gradientTo: 'to-[#1E3A5F]/[0.08]',
      trend: '-0.3 acres',
      trendUp: false,
    },
    {
      label: 'Avg Family Size',
      value: data.kpis.avgFamilySize,
      suffix: ' members',
      icon: Users,
      color: 'text-amber-700',
      bg: 'bg-amber-50',
      borderColor: 'border-amber-200',
      topBorder: '#D97706',
      gradientFrom: 'from-amber-50/50',
      gradientTo: 'to-amber-100/60',
      trend: 'Stable',
      trendUp: true,
    },
    {
      label: 'Plot Allotment Rate',
      value: data.kpis.plotAllotmentRate,
      suffix: '%',
      icon: Home,
      color: 'text-teal-700',
      bg: 'bg-teal-50',
      borderColor: 'border-teal-200',
      topBorder: '#0D9488',
      gradientFrom: 'from-teal-50/50',
      gradientTo: 'to-teal-100/60',
      trend: '+2.1% this month',
      trendUp: true,
    },
  ];

  // ── Stacked bar chart data ──
  const stackedBarData = data.rrByMandal.map(m => ({
    name: m.mandalName,
    Eligible: m.Eligible,
    Ineligible: m.Ineligible,
  }));

  return (
    <ViewLayout navTitle="REPORTS & ANALYTICS" navSubtitle="Deep Analytics">
      <div ref={containerRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 w-full">

        {/* ── Page Header ── */}
        <div className="anim-in opacity-0 p-6 sm:p-7 bg-gradient-to-r from-[#0F2B46] to-[#1E3A5F] text-white rounded-xl border border-[#0F2B46]/30 shadow-sm header-card-glow">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-4 h-4 text-amber-300/80" />
                <p className="text-[10px] tracking-[0.2em] uppercase text-amber-300/80 font-medium" style={{ fontFamily: 'var(--font-jetbrains)' }}>analytics & insights</p>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight mt-1">Reports & Analytics</h1>
              <p className="text-sm text-white/60 mt-1">Comprehensive rehabilitation project analytics across all mandals and villages</p>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
              <span className="text-xs text-white/50" style={{ fontFamily: 'var(--font-jetbrains)' }}>Real-time Data</span>
            </div>
          </div>
        </div>

        {/* ── A. KPI Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {kpiCards.map((card, i) => (
            <div
              key={i}
              className="anim-in opacity-0 glass-card card-elevate relative overflow-hidden rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm cursor-default"
            >
              <div className="h-[3px] w-full" style={{ backgroundColor: card.topBorder }} />
              <div className={`absolute inset-0 bg-gradient-to-br ${card.gradientFrom} ${card.gradientTo} pointer-events-none`} style={{ top: '3px' }} />
              <div className="relative p-5 sm:p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2.5 rounded-lg ${card.bg} border ${card.borderColor}`}>
                    <card.icon className={`w-4 h-4 ${card.color}`} />
                  </div>
                  <span className={`flex items-center gap-0.5 text-[10px] font-semibold px-2.5 py-1 rounded-full ${card.trendUp ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-red-50 text-red-500 border border-red-200'}`} style={{ fontFamily: 'var(--font-jetbrains)' }}>
                    {card.trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {card.trend}
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100" style={{ fontFamily: 'var(--font-jetbrains)' }}>
                  <CountUp end={card.value} duration={2} decimals={card.value % 1 !== 0 ? 1 : 0} separator="," />
                  <span className="text-sm font-medium text-slate-400 ml-1">{card.suffix}</span>
                </div>
                <p className="mt-1 text-xs sm:text-sm text-slate-500">{card.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── B. R&R Eligibility Deep Dive ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Stacked Bar Chart */}
          <div className="anim-in opacity-0 gov-card chart-glow p-5 sm:p-6">
            <SectionHeader title="R&R ELIGIBILITY BY MANDAL" accentColor="#D97706" />
            <div className="w-full" style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stackedBarData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="gradBarEligible" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={RR_ELIGIBILITY_COLORS.Eligible} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={RR_ELIGIBILITY_COLORS.Eligible} stopOpacity={0.5} />
                    </linearGradient>
                    <linearGradient id="gradBarIneligible" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={RR_ELIGIBILITY_COLORS.Ineligible} stopOpacity={0.95} />
                      <stop offset="100%" stopColor={RR_ELIGIBILITY_COLORS.Ineligible} stopOpacity={0.55} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} />
                  <Tooltip content={<StackedBarTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Bar dataKey="Eligible" stackId="a" fill="url(#gradBarEligible)" radius={[0, 0, 0, 0]} isAnimationActive animationDuration={1200} />
                  <Bar dataKey="Ineligible" stackId="a" fill="url(#gradBarIneligible)" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={1400} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Progress Area Chart */}
          <div className="anim-in opacity-0 gov-card chart-glow p-5 sm:p-6">
            <SectionHeader title="MONTHLY PROGRESSION" accentColor="#0D9488" />
            <div className="w-full" style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.monthlyProgress} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="gradEligible" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={RR_ELIGIBILITY_COLORS.Eligible} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={RR_ELIGIBILITY_COLORS.Eligible} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradIneligible" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={RR_ELIGIBILITY_COLORS.Ineligible} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={RR_ELIGIBILITY_COLORS.Ineligible} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} angle={-30} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} />
                  <Tooltip content={<AreaChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Area type="monotone" dataKey="Eligible" stroke={RR_ELIGIBILITY_COLORS.Eligible} fill="url(#gradEligible)" strokeWidth={2} isAnimationActive animationDuration={1200} />
                  <Area type="monotone" dataKey="Ineligible" stroke={RR_ELIGIBILITY_COLORS.Ineligible} fill="url(#gradIneligible)" strokeWidth={2} isAnimationActive animationDuration={1400} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── C. Village Comparison Table ── */}
        <div className="anim-in opacity-0 gov-card p-5 sm:p-6">
          <SectionHeader title="VILLAGE COMPARISON" accentColor="#1E3A5F" />
          {/* Filter Row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search village..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 transition"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={mandalFilter}
                onChange={e => setMandalFilter(e.target.value)}
                className="text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 transition"
              >
                <option value="all">All Mandals</option>
                <option value="VRP">VR Puram</option>
                <option value="CHN">Chintoor</option>
                <option value="KUN">Kunavaram</option>
              </select>
            </div>
            <span className="text-xs text-slate-400" style={{ fontFamily: 'var(--font-jetbrains)' }}>
              {filteredVillages.length} villages
            </span>
          </div>
          {/* Table */}
          <div className="max-h-96 overflow-y-auto custom-scrollbar rounded-lg border border-slate-200">
            <Table className="table-alternate-rows">
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('villageName')}>
                    <span className="flex items-center gap-1">Village <SortIcon column="villageName" sortKey={sortKey} sortDir={sortDir} /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('mandalName')}>
                    <span className="flex items-center gap-1">Mandal <SortIcon column="mandalName" sortKey={sortKey} sortDir={sortDir} /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none text-right" onClick={() => handleSort('totalFamilies')}>
                    <span className="flex items-center justify-end gap-1">Families <SortIcon column="totalFamilies" sortKey={sortKey} sortDir={sortDir} /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none text-right" onClick={() => handleSort('firstSchemePct')}>
                    <span className="flex items-center justify-end gap-1">1st Scheme % <SortIcon column="firstSchemePct" sortKey={sortKey} sortDir={sortDir} /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none text-right" onClick={() => handleSort('avgLand')}>
                    <span className="flex items-center justify-end gap-1">Avg Land <SortIcon column="avgLand" sortKey={sortKey} sortDir={sortDir} /></span>
                  </TableHead>
                  <TableHead>R&R Eligibility</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVillages.map(v => (
                  <TableRow key={`${v.mandalCode}-${v.villageName}`}>
                    <TableCell className="font-medium text-slate-900 dark:text-slate-100 text-xs">{v.villageName}</TableCell>
                    <TableCell className="text-xs">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: MANDAL_COLORS[v.mandalCode as keyof typeof MANDAL_COLORS] || '#94A3B8' }} />
                        {v.mandalName}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-xs font-medium" style={{ fontFamily: 'var(--font-jetbrains)' }}>{v.totalFamilies.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-xs" style={{ fontFamily: 'var(--font-jetbrains)' }}>
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${v.firstSchemePct >= 70 ? 'bg-emerald-50 text-emerald-700' : v.firstSchemePct >= 40 ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-600'}`}>
                        {v.firstSchemePct}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-xs" style={{ fontFamily: 'var(--font-jetbrains)' }}>{v.avgLand} ac</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {(['Eligible', 'Ineligible'] as const).map(status => {
                          const count = v.rrBreakdown[status];
                          if (count === 0) return null;
                          return (
                            <span
                              key={status}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border"
                              style={{
                                backgroundColor: RR_ELIGIBILITY_CONFIG[status]?.bg,
                                color: RR_ELIGIBILITY_CONFIG[status]?.color?.replace('text-', ''),
                                borderColor: RR_ELIGIBILITY_CONFIG[status]?.border?.replace('border-', ''),
                              }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: RR_ELIGIBILITY_COLORS[status] }} />
                              {count}
                            </span>
                          );
                        })}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <style jsx>{`
            .custom-scrollbar::-webkit-scrollbar { width: 6px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: #F1F5F9; border-radius: 3px; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 3px; }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94A3B8; }
          `}</style>
        </div>

        {/* ── D. Land Holdings + E. Caste Distribution ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Land Holdings Distribution */}
          <div className="anim-in opacity-0 gov-card chart-glow p-5 sm:p-6">
            <SectionHeader title="LAND HOLDINGS DISTRIBUTION" accentColor="#1E3A5F" />
            <div className="w-full" style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.landDistribution} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="gradLandBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1E3A5F" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#1E3A5F" stopOpacity={0.45} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} />
                  <Tooltip
                    formatter={(value: number) => [value.toLocaleString(), 'Families']}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={48} isAnimationActive animationDuration={1200}>
                    {data.landDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={LAND_GRADIENT[index]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-3 mt-2">
              {data.landDistribution.map((item, i) => (
                <div key={item.range} className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: LAND_GRADIENT[i] }} />
                  <span className="text-[10px] text-slate-500">{item.range}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Caste Category Distribution */}
          <div className="anim-in opacity-0 gov-card chart-glow p-5 sm:p-6">
            <SectionHeader title="CASTE CATEGORY DISTRIBUTION" accentColor="#D97706" />
            <div className="w-full flex flex-col items-center" style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.casteDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="caste"
                    stroke="none"
                    isAnimationActive
                    animationDuration={1200}
                    animationEasing="ease-out"
                  >
                    {data.casteDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CASTE_COLORS[index % CASTE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [value.toLocaleString(), name]}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2 max-h-32 overflow-y-auto custom-scrollbar">
              {data.casteDistribution.map((item, i) => (
                <div key={item.caste} className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: CASTE_COLORS[i % CASTE_COLORS.length] }} />
                  <span className="text-slate-600 truncate">{item.caste}</span>
                  <span className="text-slate-400 ml-auto" style={{ fontFamily: 'var(--font-jetbrains)' }}>{item.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── F. Export Section ── */}
        <div className="anim-in opacity-0 gov-card p-5 sm:p-6">
          <SectionHeader title="EXPORT REPORTS" accentColor="#0D9488" />
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-[#1E3A5F] dark:text-amber-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Export CSV
              </button>
              <button
                onClick={exportJSON}
                className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-[#1E3A5F] dark:text-amber-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
              >
                <FileJson className="w-4 h-4 text-amber-600" />
                Export JSON
              </button>
            </div>
            {/* Date range selector (mock) */}
            <div className="flex items-center gap-2 ml-auto">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-400" style={{ fontFamily: 'var(--font-jetbrains)' }}>Period:</span>
              <select className="text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 transition">
                <option>Last 12 Months</option>
                <option>2025 YTD</option>
                <option>2024 Full Year</option>
                <option>All Time</option>
              </select>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Export village-level comparison data with R&R eligibility breakdown, land holdings, and first-scheme eligibility metrics.
          </p>
        </div>

      </div>
    </ViewLayout>
  );
}
