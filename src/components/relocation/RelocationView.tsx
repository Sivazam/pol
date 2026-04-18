'use client';

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { ALLOTMENT_STATUS_CONFIG, SES_STATUS_CONFIG, MANDAL_COLORS } from '@/lib/constants';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import CountUp from 'react-countup';
import {
  ChevronLeft, Activity, MapPin, Home, LandPlot, Calendar,
  AlertTriangle, ArrowRight, CheckCircle2, Clock, Ruler, Building2,
  Navigation, FileText, Users, Phone, Info, Search, Home as HomeIcon,
  TrendingUp, BarChart3, Filter, X
} from 'lucide-react';
import ViewLayout from '@/components/shared/ViewLayout';

/* ─── Types ─── */

interface RelocationData {
  family: {
    id: string;
    pdfNumber: string;
    headName: string;
    headNameTelugu: string;
    village: { id: string; name: string; nameTelugu: string; latitude: number; longitude: number; };
  };
  newPlot: {
    id: string;
    plotNumber: string | null;
    colonyName: string | null;
    latitude: number | null;
    longitude: number | null;
    areaSqYards: number | null;
    allotmentStatus: string;
    allotmentDate: string | null;
  } | null;
  originalLocation: {
    latitude: number;
    longitude: number;
    name: string;
    nameTelugu: string;
  };
}

interface FamilyListItem {
  id: string;
  pdfNumber: string;
  headName: string;
  headNameTelugu?: string;
  villageName: string;
  mandalName: string;
  mandalCode: string;
  mandalColor: string;
  sesStatus: string;
  plotStatus: string;
  memberCount: number;
  landAcres?: number;
}

interface StatsData {
  totalFamilies: number;
  plotsAllotted: number;
  plotsPending: number;
  plotsPossessionGiven: number;
  mandals: {
    id: string;
    name: string;
    nameTelugu?: string;
    code: string;
    color: string;
    familyCount: number;
    villageCount: number;
    firstSchemeCount: number;
  }[];
  surveyed: number;
  verified: number;
  approved: number;
  rejected: number;
}

/* ─── Helpers ─── */

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const PLOT_STATUS_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  ALLOTTED: { label: 'Allotted', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-300' },
  POSSESSION_GIVEN: { label: 'Possession Given', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-300' },
  PENDING: { label: 'Pending', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-300' },
  NOT_ALLOTTED: { label: 'Not Allotted', color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200' },
};

/* ═══════════════════════════════════════════════════════════════
   OVERVIEW MODE — shown when no family is selected
   ═══════════════════════════════════════════════════════════════ */

function RelocationOverview() {
  const navigateToRelocation = useAppStore((s) => s.navigateToRelocation);
  const containerRef = useRef<HTMLDivElement>(null);

  const [stats, setStats] = useState<StatsData | null>(null);
  const [families, setFamilies] = useState<FamilyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [plotFilter, setPlotFilter] = useState<string>('ALL');

  // Fetch stats
  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(d => setStats(d))
      .catch(() => {});
  }, []);

  // Fetch families with allotted plots
  useEffect(() => {
    fetch('/api/families?all=true&limit=50')
      .then(r => r.json())
      .then(d => {
        // Filter to only families that have some plot status (not NOT_ALLOTTED)
        const allotted = (d.families || []).filter(
          (f: FamilyListItem) => f.plotStatus && f.plotStatus !== 'NOT_ALLOTTED'
        );
        setFamilies(allotted);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // GSAP entrance animations
  useEffect(() => {
    if (!loading && containerRef.current) {
      const els = containerRef.current.querySelectorAll('.anim-in');
      gsap.fromTo(els, { opacity: 0, y: 25 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.07, ease: 'power3.out' });
    }
  }, [loading]);

  // Filter families by search and plot filter
  const filteredFamilies = useMemo(() => {
    let result = families;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        f => f.pdfNumber.toLowerCase().includes(q) || f.headName.toLowerCase().includes(q)
      );
    }
    if (plotFilter !== 'ALL') {
      result = result.filter(f => f.plotStatus === plotFilter);
    }
    return result;
  }, [families, searchQuery, plotFilter]);

  // Compute allotment rate
  const allotmentRate = stats
    ? stats.totalFamilies > 0
      ? ((stats.plotsAllotted + stats.plotsPossessionGiven) / stats.totalFamilies * 100)
      : 0
    : 0;

  // Group families by mandal
  const mandalBreakdown = useMemo(() => {
    const map: Record<string, { name: string; color: string; total: number; allotted: number; possession: number; pending: number }> = {};
    families.forEach(f => {
      const key = f.mandalCode;
      if (!map[key]) {
        map[key] = {
          name: f.mandalName,
          color: f.mandalColor || (MANDAL_COLORS as Record<string, string>)[key] || '#64748B',
          total: 0,
          allotted: 0,
          possession: 0,
          pending: 0,
        };
      }
      map[key].total += 1;
      if (f.plotStatus === 'ALLOTTED') map[key].allotted += 1;
      if (f.plotStatus === 'POSSESSION_GIVEN') map[key].possession += 1;
      if (f.plotStatus === 'PENDING') map[key].pending += 1;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [families]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm tracking-widest uppercase" style={{ fontFamily: 'var(--font-jetbrains)' }}>Loading Relocation Data</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="anim-in opacity-0">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <Navigation className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Relocation &amp; Plot Allotment</h1>
            <p className="text-sm text-slate-500">Track rehabilitation plot allotments across all mandals</p>
          </div>
        </div>
        <div className="ashoka-divider mt-4" />
      </div>

      {/* Summary Cards */}
      {stats && (
        <div className="anim-in opacity-0 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="gov-card p-5 border-t-[3px] border-t-blue-500">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <LandPlot className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Plots Allotted</span>
            </div>
            <p className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-jetbrains)' }}>
              <CountUp end={stats.plotsAllotted} duration={1.5} separator="," />
            </p>
            <p className="text-xs text-slate-400 mt-1">Families with allotted plots</p>
          </div>

          <div className="gov-card p-5 border-t-[3px] border-t-amber-500">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Pending</span>
            </div>
            <p className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-jetbrains)' }}>
              <CountUp end={stats.plotsPending} duration={1.5} separator="," />
            </p>
            <p className="text-xs text-slate-400 mt-1">Awaiting allotment</p>
          </div>

          <div className="gov-card p-5 border-t-[3px] border-t-green-500">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Possession Given</span>
            </div>
            <p className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-jetbrains)' }}>
              <CountUp end={stats.plotsPossessionGiven} duration={1.5} separator="," />
            </p>
            <p className="text-xs text-slate-400 mt-1">Families resettled</p>
          </div>

          <div className="gov-card p-5 border-t-[3px] border-t-[#0F2B46]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-[#0F2B46]" />
              </div>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Allotment Rate</span>
            </div>
            <p className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-jetbrains)' }}>
              <CountUp end={allotmentRate} duration={1.5} decimals={1} />%
            </p>
            <p className="text-xs text-slate-400 mt-1">Allotted + Possession / Total</p>
          </div>
        </div>
      )}

      {/* Mandal Breakdown */}
      {mandalBreakdown.length > 0 && (
        <div className="anim-in opacity-0 gov-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-[#0F2B46]/10 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-[#0F2B46]" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 tracking-wide">MANDAL-WISE PLOT ALLOTMENT</h3>
          </div>
          <div className="space-y-4">
            {mandalBreakdown.map(([code, m]) => {
              const totalWithPlot = m.allotted + m.possession + m.pending;
              const pct = totalWithPlot > 0 ? ((m.allotted + m.possession) / m.total * 100) : 0;
              return (
                <div key={code} className="group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: m.color }} />
                      <span className="text-sm font-semibold text-slate-900">{m.name}</span>
                      <span className="text-xs text-slate-400">({code})</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full font-medium">{m.allotted} Allotted</span>
                      <span className="text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-medium">{m.possession} Possession</span>
                      <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium">{m.pending} Pending</span>
                    </div>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                    {m.allotted > 0 && (
                      <div
                        className="bg-blue-500 h-full transition-all duration-700"
                        style={{ width: `${m.allotted / m.total * 100}%` }}
                      />
                    )}
                    {m.possession > 0 && (
                      <div
                        className="bg-green-500 h-full transition-all duration-700"
                        style={{ width: `${m.possession / m.total * 100}%` }}
                      />
                    )}
                    {m.pending > 0 && (
                      <div
                        className="bg-amber-400 h-full transition-all duration-700"
                        style={{ width: `${m.pending / m.total * 100}%` }}
                      />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1" style={{ fontFamily: 'var(--font-jetbrains)' }}>
                    {pct.toFixed(1)}% allotment rate — {m.total} families with plots
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="anim-in opacity-0 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by PDF number or family name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F2B46]/20 focus:border-[#0F2B46]/40 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={plotFilter}
            onChange={(e) => setPlotFilter(e.target.value)}
            className="pl-10 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F2B46]/20 focus:border-[#0F2B46]/40 appearance-none cursor-pointer transition-all"
          >
            <option value="ALL">All Plot Status</option>
            <option value="ALLOTTED">Allotted</option>
            <option value="POSSESSION_GIVEN">Possession Given</option>
            <option value="PENDING">Pending</option>
          </select>
        </div>
      </div>

      {/* Result count */}
      <div className="anim-in opacity-0 flex items-center justify-between">
        <p className="text-xs text-slate-400">
          Showing <span className="font-semibold text-slate-600">{filteredFamilies.length}</span> families with allotted plots
        </p>
        {(searchQuery || plotFilter !== 'ALL') && (
          <button
            onClick={() => { setSearchQuery(''); setPlotFilter('ALL'); }}
            className="text-xs text-amber-700 hover:text-amber-800 font-medium flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Clear filters
          </button>
        )}
      </div>

      {/* Families List */}
      {filteredFamilies.length > 0 ? (
        <div className="anim-in opacity-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFamilies.map((f, i) => {
            const plotCfg = PLOT_STATUS_LABELS[f.plotStatus] || PLOT_STATUS_LABELS.NOT_ALLOTTED;
            const sesCfg = SES_STATUS_CONFIG[f.sesStatus];
            return (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.5) }}
                onClick={() => navigateToRelocation(f.id)}
                className="gov-card p-4 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all border-l-4 group"
                style={{ borderLeftColor: f.mandalColor || '#64748B' }}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="gov-badge px-2 py-1 rounded-md border bg-amber-50 border-amber-300 text-amber-700 text-xs font-semibold">
                    {f.pdfNumber}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${plotCfg.color} ${plotCfg.bg} ${plotCfg.border}`}>
                    {plotCfg.label}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 mb-1">{f.headName}</h4>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
                  <MapPin className="w-3 h-3" />
                  <span>{f.villageName}</span>
                  <span className="text-slate-300">•</span>
                  <span>{f.mandalName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {sesCfg && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${sesCfg.color} ${sesCfg.bg} ${sesCfg.border}`}>
                        {sesCfg.label}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Users className="w-3 h-3" />{f.memberCount}
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="anim-in opacity-0 gov-card p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">No families found</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            {searchQuery || plotFilter !== 'ALL'
              ? 'Try adjusting your search or filter criteria.'
              : 'No families with allotted plots in the current dataset.'}
          </p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DETAIL MODE — shown when a family is selected
   ═══════════════════════════════════════════════════════════════ */

function RelocationDetail({ familyId }: { familyId: string }) {
  const [data, setData] = useState<RelocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/relocation/${familyId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [familyId]);

  useEffect(() => {
    if (!loading && containerRef.current) {
      const els = containerRef.current.querySelectorAll('.anim-in');
      gsap.fromTo(els, { opacity: 0, y: 25 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power3.out' });
    }
  }, [loading]);

  const distanceKm = useMemo(() => {
    if (!data?.newPlot?.latitude || !data?.newPlot?.longitude) return null;
    return haversineDistance(
      data.originalLocation.latitude, data.originalLocation.longitude,
      data.newPlot.latitude, data.newPlot.longitude
    );
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm tracking-widest uppercase" style={{ fontFamily: 'var(--font-jetbrains)' }}>Loading Relocation Data</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-32">
        <p className="text-red-600 font-medium">Data not found</p>
      </div>
    );
  }

  const hasCoordinates = data.newPlot?.latitude != null && data.newPlot?.longitude != null;
  const allotCfg = data.newPlot ? ALLOTMENT_STATUS_CONFIG[data.newPlot.allotmentStatus] : null;

  return (
    <div ref={containerRef} className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Family Info Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="anim-in opacity-0 gov-card p-6 border-l-4 border-l-amber-400"
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="gov-badge px-3 py-1.5 rounded-md border bg-amber-50 border-amber-300 text-amber-700 tracking-widest text-sm font-semibold">
                {data.family.pdfNumber}
              </span>
              {allotCfg && (
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${allotCfg.color} ${allotCfg.bg} ${allotCfg.border}`}>
                  {allotCfg.label}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{data.family.headName}</h1>
            <p className="text-slate-500 mt-1">{data.family.headNameTelugu}</p>
            <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
              <MapPin className="w-3 h-3" />
              <span>From {data.originalLocation.name}</span>
              <ArrowRight className="w-3 h-3" />
              <span>{data.newPlot?.colonyName || 'Pending allotment'}</span>
            </div>
          </div>

          {distanceKm !== null && (
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200">
              <Navigation className="w-5 h-5 text-amber-600" />
              <div>
                <p className="text-lg font-bold text-slate-900">{distanceKm.toFixed(1)} km</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Relocation Distance</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Relocation Status Summary */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="anim-in opacity-0 grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        <div className="gov-card p-4 text-center border-t-[3px] border-t-red-400">
          <MapPin className="w-5 h-5 text-red-500 mx-auto mb-2" />
          <p className="text-xs text-slate-400 mb-1">Original</p>
          <p className="text-sm font-bold text-slate-900 truncate">{data.originalLocation.name}</p>
        </div>
        <div className="gov-card p-4 text-center border-t-[3px] border-t-green-400">
          <Home className="w-5 h-5 text-green-500 mx-auto mb-2" />
          <p className="text-xs text-slate-400 mb-1">New Plot</p>
          <p className="text-sm font-bold text-slate-900 truncate">{data.newPlot?.colonyName || 'Pending'}</p>
        </div>
        <div className="gov-card p-4 text-center border-t-[3px] border-t-amber-400">
          <LandPlot className="w-5 h-5 text-amber-500 mx-auto mb-2" />
          <p className="text-xs text-slate-400 mb-1">Plot Area</p>
          <p className="text-sm font-bold text-slate-900">{data.newPlot?.areaSqYards ? `${data.newPlot.areaSqYards} sq.yd` : 'Pending'}</p>
        </div>
        <div className="gov-card p-4 text-center border-t-[3px] border-t-[#0F2B46]">
          <Calendar className="w-5 h-5 text-[#0F2B46] mx-auto mb-2" />
          <p className="text-xs text-slate-400 mb-1">Allotment</p>
          <p className="text-sm font-bold text-slate-900">{data.newPlot?.allotmentDate ? new Date(data.newPlot.allotmentDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'Pending'}</p>
        </div>
      </motion.div>

      {/* Geo Warning */}
      {(!hasCoordinates || !data.newPlot) && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="anim-in opacity-0 border border-amber-300 bg-amber-50 rounded-xl p-5 flex items-start gap-4"
        >
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-amber-800 font-semibold">Geo-coordinates pending</p>
            <p className="text-sm text-amber-700 mt-1">
              {!data.newPlot
                ? 'No plot has been allotted to this family yet. Once allotted, the relocation path will be visualized on the map.'
                : 'Plot allotted but location not yet mapped. Coordinates will be updated after geo-survey verification.'}
            </p>
          </div>
        </motion.div>
      )}

      {/* Before / After Map */}
      {hasCoordinates && data.newPlot && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="anim-in opacity-0"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Original Location */}
            <div className="gov-card p-5 border-t-[3px] border-t-red-400">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-red-600" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 tracking-wide">ORIGINAL VILLAGE</h3>
              </div>
              <div className="relative w-full h-[220px] bg-[#F8FAFC] rounded-lg overflow-hidden border border-slate-200">
                <svg viewBox="0 0 400 200" className="w-full h-full">
                  <defs>
                    <pattern id="reloc-grid1-light" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth="0.5"/>
                    </pattern>
                    <radialGradient id="origGlow-light" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#EF4444" stopOpacity="0.2"/>
                      <stop offset="100%" stopColor="#EF4444" stopOpacity="0"/>
                    </radialGradient>
                  </defs>
                  <rect width="400" height="200" fill="#F8FAFC"/>
                  <rect width="400" height="200" fill="url(#reloc-grid1-light)"/>
                  <circle cx="200" cy="90" r="45" fill="url(#origGlow-light)">
                    <animate attributeName="r" values="35;50;35" dur="2.5s" repeatCount="indefinite"/>
                  </circle>
                  <circle cx="200" cy="90" r="8" fill="#DC2626"/>
                  <circle cx="200" cy="90" r="12" fill="none" stroke="#DC2626" strokeWidth="1.5" opacity="0.3">
                    <animate attributeName="r" values="12;22;12" dur="2s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite"/>
                  </circle>
                  <text x="200" y="125" fill="#991B1B" fontSize="11" fontWeight="700" textAnchor="middle">{data.originalLocation.name}</text>
                  <text x="200" y="140" fill="#B91C1C" fontSize="8" textAnchor="middle" opacity="0.6">{data.originalLocation.nameTelugu}</text>
                  <text x="200" y="158" fill="#64748B" fontSize="7" textAnchor="middle" style={{ fontFamily: 'var(--font-jetbrains)' }}>
                    {data.originalLocation.latitude.toFixed(4)}°N, {data.originalLocation.longitude.toFixed(4)}°E
                  </text>
                  <text x="380" y="20" fill="#94A3B8" fontSize="9" fontWeight="600" textAnchor="middle">N↑</text>
                </svg>
              </div>
            </div>

            {/* New Plot Location */}
            <div className="gov-card p-5 border-t-[3px] border-t-green-400">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
                  <Home className="w-4 h-4 text-green-600" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 tracking-wide">NEW PLOT LOCATION</h3>
              </div>
              <div className="relative w-full h-[220px] bg-[#F8FAFC] rounded-lg overflow-hidden border border-slate-200">
                <svg viewBox="0 0 400 200" className="w-full h-full">
                  <defs>
                    <pattern id="reloc-grid2-light" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth="0.5"/>
                    </pattern>
                    <radialGradient id="newGlow-light" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#22C55E" stopOpacity="0.2"/>
                      <stop offset="100%" stopColor="#22C55E" stopOpacity="0"/>
                    </radialGradient>
                  </defs>
                  <rect width="400" height="200" fill="#F8FAFC"/>
                  <rect width="400" height="200" fill="url(#reloc-grid2-light)"/>
                  <circle cx="200" cy="90" r="45" fill="url(#newGlow-light)">
                    <animate attributeName="r" values="35;50;35" dur="2.5s" repeatCount="indefinite"/>
                  </circle>
                  <circle cx="200" cy="90" r="8" fill="#16A34A"/>
                  <circle cx="200" cy="90" r="12" fill="none" stroke="#16A34A" strokeWidth="1.5" opacity="0.3">
                    <animate attributeName="r" values="12;22;12" dur="1.5s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="0.3;0;0.3" dur="1.5s" repeatCount="indefinite"/>
                  </circle>
                  <text x="200" y="125" fill="#166534" fontSize="11" fontWeight="700" textAnchor="middle">{data.newPlot.colonyName || 'New Plot'}</text>
                  <text x="200" y="140" fill="#15803D" fontSize="8" textAnchor="middle" opacity="0.6">{data.newPlot.plotNumber || 'Plot pending'}</text>
                  <text x="200" y="158" fill="#64748B" fontSize="7" textAnchor="middle" style={{ fontFamily: 'var(--font-jetbrains)' }}>
                    {data.newPlot.latitude!.toFixed(4)}°N, {data.newPlot.longitude!.toFixed(4)}°E
                  </text>
                  <text x="380" y="20" fill="#94A3B8" fontSize="9" fontWeight="600" textAnchor="middle">N↑</text>
                </svg>
              </div>
            </div>
          </div>

          {/* Relocation Arc Visualization */}
          <div className="gov-card p-5 mt-4 border-t-[3px] border-t-amber-400">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Navigation className="w-4 h-4 text-amber-600" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 tracking-wide">RELOCATION PATH</h3>
              </div>
              {distanceKm !== null && (
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200" style={{ fontFamily: 'var(--font-jetbrains)' }}>
                  {distanceKm.toFixed(1)} km
                </span>
              )}
            </div>
            <div className="relative w-full h-[140px] bg-[#F8FAFC] rounded-lg overflow-hidden border border-slate-200">
              <svg viewBox="0 0 600 140" className="w-full h-full">
                <defs>
                  <linearGradient id="arcGrad-light" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#DC2626"/>
                    <stop offset="50%" stopColor="#D97706"/>
                    <stop offset="100%" stopColor="#16A34A"/>
                  </linearGradient>
                </defs>
                <pattern id="arc-grid-light" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(148,163,184,0.08)" strokeWidth="0.5"/>
                </pattern>
                <rect width="600" height="140" fill="#F8FAFC"/>
                <rect width="600" height="140" fill="url(#arc-grid-light)"/>
                <circle cx="100" cy="100" r="7" fill="#DC2626"/>
                <circle cx="100" cy="100" r="11" fill="none" stroke="#DC2626" strokeWidth="1" opacity="0.3"/>
                <text x="100" y="120" fill="#991B1B" fontSize="8" fontWeight="600" textAnchor="middle">{data.originalLocation.name}</text>
                <circle cx="500" cy="100" r="7" fill="#16A34A"/>
                <circle cx="500" cy="100" r="11" fill="none" stroke="#16A34A" strokeWidth="1" opacity="0.3"/>
                <text x="500" y="120" fill="#166534" fontSize="8" fontWeight="600" textAnchor="middle">{data.newPlot.colonyName || 'New Plot'}</text>
                <path d="M 100,95 Q 300,15 500,95" fill="none" stroke="url(#arcGrad-light)" strokeWidth="3" strokeDasharray="600">
                  <animate attributeName="stroke-dashoffset" from="600" to="0" dur="2s" fill="freeze"/>
                </path>
                <polygon points="498,91 505,97 498,103" fill="#16A34A" opacity="0">
                  <animate attributeName="opacity" from="0" to="1" dur="0.3s" begin="2s" fill="freeze"/>
                </polygon>
                <text x="300" y="50" fill="#92400E" fontSize="9" fontWeight="700" textAnchor="middle" opacity="0">
                  RELOCATION PATH
                  <animate attributeName="opacity" from="0" to="1" dur="0.5s" begin="1.5s" fill="freeze"/>
                </text>
                {distanceKm !== null && (
                  <text x="300" y="65" fill="#64748B" fontSize="8" textAnchor="middle" opacity="0" style={{ fontFamily: 'var(--font-jetbrains)' }}>
                    {distanceKm.toFixed(1)} km
                    <animate attributeName="opacity" from="0" to="1" dur="0.5s" begin="2s" fill="freeze"/>
                  </text>
                )}
              </svg>
            </div>
          </div>
        </motion.div>
      )}

      {/* Plot Details */}
      {data.newPlot && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="anim-in opacity-0 gov-card p-6"
        >
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-[#0F2B46]/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-[#0F2B46]" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 tracking-wide">PLOT DETAILS</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: 'Plot Number', value: data.newPlot.plotNumber || 'Pending', icon: LandPlot, color: 'text-blue-700', borderColor: 'border-l-blue-400', bg: 'bg-blue-50' },
              { label: 'Colony Name', value: data.newPlot.colonyName || 'Pending', icon: Building2, color: 'text-purple-700', borderColor: 'border-l-purple-400', bg: 'bg-purple-50' },
              { label: 'Area', value: data.newPlot.areaSqYards ? `${data.newPlot.areaSqYards} sq. yards` : 'Pending', icon: Ruler, color: 'text-teal-700', borderColor: 'border-l-teal-400', bg: 'bg-teal-50' },
              { label: 'Allotment Status', value: allotCfg?.label || data.newPlot.allotmentStatus, icon: allotCfg?.label === 'Possession Given' ? CheckCircle2 : Clock, color: allotCfg?.color || 'text-slate-600', borderColor: 'border-l-amber-400', bg: allotCfg?.bg || 'bg-slate-50' },
              { label: 'Allotment Date', value: data.newPlot.allotmentDate ? new Date(data.newPlot.allotmentDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Pending', icon: Calendar, color: 'text-amber-700', borderColor: 'border-l-amber-400', bg: 'bg-amber-50' },
              { label: 'Coordinates', value: hasCoordinates ? `${data.newPlot.latitude!.toFixed(4)}°N, ${data.newPlot.longitude!.toFixed(4)}°E` : 'Pending', icon: MapPin, color: 'text-green-700', borderColor: 'border-l-green-400', bg: 'bg-green-50' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.08 }}
                className={`p-4 bg-white rounded-xl border border-slate-200 border-l-4 ${item.borderColor} shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-7 h-7 rounded-lg ${item.bg} flex items-center justify-center`}>
                    <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{item.label}</span>
                </div>
                <p className="text-sm text-slate-900 font-semibold">{item.value}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* No Plot Allotted */}
      {!data.newPlot && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="anim-in opacity-0 gov-card p-8 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
            <HomeIcon className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">No Plot Allotted Yet</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            This family&apos;s SES status needs to reach &quot;Approved&quot; before a new plot can be allotted under the rehabilitation scheme.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 text-xs text-slate-400 bg-slate-50 px-4 py-2 rounded-lg">
            <Info className="w-3.5 h-3.5" />
            Contact Mandal Revenue Office for status updates
          </div>
        </motion.div>
      )}

      {/* Help Section */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="anim-in opacity-0 bg-[#0F2B46]/5 border border-[#0F2B46]/10 rounded-xl p-5"
      >
        <div className="flex items-start gap-3">
          <Phone className="w-5 h-5 text-[#0F2B46] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-[#0F2B46]">Need Help?</p>
            <p className="text-xs text-slate-500 mt-1">
              For relocation queries, contact the <span className="font-semibold">Rehabilitation &amp; Resettlement Cell</span> at the Mandal Revenue Office or call the helpline at <span className="font-semibold text-[#0F2B46]">1800-XXX-XXXX</span> (toll-free).
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN EXPORT — switches between Overview and Detail
   ═══════════════════════════════════════════════════════════════ */

export default function RelocationView() {
  const selectedFamilyId = useAppStore((s) => s.selectedFamilyId);

  // Determine navbar title based on mode
  const navTitle = selectedFamilyId ? 'RELOCATION DETAIL' : 'RELOCATION & PLOTS';
  const navTitleColor = selectedFamilyId ? '#FCD34D' : 'white';
  const accentDotColor = selectedFamilyId ? '#FCD34D' : '#D97706';
  const navSubtitle = selectedFamilyId ? 'Family Relocation Path' : 'Plot Allotment Overview';

  return (
    <ViewLayout
      navTitle={navTitle}
      navTitleColor={navTitleColor}
      accentDotColor={accentDotColor}
      navSubtitle={navSubtitle}
      maxWidth={selectedFamilyId ? 'max-w-5xl' : 'max-w-7xl'}
    >
      {selectedFamilyId ? (
        <RelocationDetail familyId={selectedFamilyId} />
      ) : (
        <RelocationOverview />
      )}
    </ViewLayout>
  );
}
