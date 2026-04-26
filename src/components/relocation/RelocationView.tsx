'use client';

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { ALLOTMENT_STATUS_CONFIG, RR_ELIGIBILITY_CONFIG, MANDAL_COLORS } from '@/lib/constants';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import CountUp from 'react-countup';
import {
  ChevronLeft, Activity, MapPin, Home, LandPlot, Calendar,
  AlertTriangle, ArrowRight, CheckCircle2, Clock, Ruler, Building2,
  Navigation, FileText, Users, Phone, Info, Search, Home as HomeIcon,
  TrendingUp, BarChart3, Filter, X, ArrowUpDown, ChevronDown,
  LayoutGrid, Bell, Zap, Timer, Milestone, Box,
  ArrowRightLeft, Flag, Megaphone, AlertCircle
} from 'lucide-react';
import ViewLayout from '@/components/shared/ViewLayout';
import ProjectMap from '@/components/map/ProjectMap';

/* ─── Types ─── */

interface RelocationData {
  family: {
    id: string;
    pdfId: string;
    beneficiaryName: string;
    village: { id: string; name: string; nameTelugu: string; latitude: number; longitude: number; };
  };
  plotAllotment: {
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
  pdfId: string;
  beneficiaryName: string;
  villageName: string;
  mandalName: string;
  mandalCode: string;
  mandalColor: string;
  rrEligibility: string;
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
  eligible: number;
  ineligible: number;
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

/* ─── Activity API response type ─── */
interface ActivityEntry {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  relatedEntityId: string;
  relatedEntityType: string;
  severity: string;
  mandalCode: string;
}

/* ═══════════════════════════════════════════════════════════════
   RELOCATION MAP — Plot Allotment Overview using ProjectMap
   ═══════════════════════════════════════════════════════════════ */
function RelocationMap() {
  const navigateToVillage = useAppStore((s) => s.navigateToVillage);

  return (
    <div className="anim-in opacity-0 gov-card p-6">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-[#0F2B46]/10 flex items-center justify-center">
          <MapPin className="w-4 h-4 text-[#0F2B46]" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-wide">RELOCATION MAP — Plot Allotment Overview</h3>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">Click villages to explore family relocation details</p>
        </div>
      </div>
      <ProjectMap
        center={[81.32, 17.63]}
        zoom={9.5}
        maxBounds={{ sw: [81.15, 17.40], ne: [81.70, 17.90] }}
        height="450px"
        showMandals={true}
        showVillages={true}
        showDam={true}
        showControls={true}
        showLegend={true}
        showLayerToggles={true}
        onVillageClick={(villageId) => navigateToVillage(villageId)}
        className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700"
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ALLOTMENT PIPELINE — Kanban Visualization
   ═══════════════════════════════════════════════════════════════ */
function AllotmentPipeline({ families, stats }: { families: FamilyListItem[]; stats: StatsData | null }) {
  const navigateToRelocation = useAppStore((s) => s.navigateToRelocation);

  const pipelineColumns = useMemo(() => {
    const pending = families.filter(f => f.plotStatus === 'PENDING');
    const allotted = families.filter(f => f.plotStatus === 'ALLOTTED');
    const possession = families.filter(f => f.plotStatus === 'POSSESSION_GIVEN');

    return [
      {
        key: 'PENDING',
        title: 'Pending',
        icon: Timer,
        color: 'amber',
        borderClass: 'border-t-amber-400',
        bgClass: 'bg-amber-50',
        textClass: 'text-amber-700',
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-600',
        dotClass: 'bg-amber-400',
        count: stats?.plotsPending ?? pending.length,
        families: pending.slice(0, 6),
      },
      {
        key: 'ALLOTTED',
        title: 'Allotted',
        icon: LandPlot,
        color: 'teal',
        borderClass: 'border-t-teal-400',
        bgClass: 'bg-teal-50',
        textClass: 'text-teal-700',
        iconBg: 'bg-teal-100',
        iconColor: 'text-teal-600',
        dotClass: 'bg-teal-400',
        count: stats?.plotsAllotted ?? allotted.length,
        families: allotted.slice(0, 6),
      },
      {
        key: 'POSSESSION_GIVEN',
        title: 'Possession Given',
        icon: CheckCircle2,
        color: 'green',
        borderClass: 'border-t-green-400',
        bgClass: 'bg-green-50',
        textClass: 'text-green-700',
        iconBg: 'bg-green-100',
        iconColor: 'text-green-600',
        dotClass: 'bg-green-400',
        count: stats?.plotsPossessionGiven ?? possession.length,
        families: possession.slice(0, 6),
      },
    ];
  }, [families, stats]);

  return (
    <div className="anim-in opacity-0 gov-card p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg bg-[#0F2B46]/10 flex items-center justify-center">
          <Milestone className="w-4 h-4 text-[#0F2B46]" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900 tracking-wide">ALLOTMENT PIPELINE</h3>
        <span className="ml-auto text-[10px] text-slate-400">Click a family card to view details</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {pipelineColumns.map((col) => (
          <div key={col.key} className={`rounded-xl border-t-[3px] ${col.borderClass} bg-white shadow-sm overflow-hidden`}>
            {/* Column Header */}
            <div className={`px-4 py-3 ${col.bgClass} border-b border-slate-100 flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg ${col.iconBg} flex items-center justify-center`}>
                  <col.icon className={`w-3.5 h-3.5 ${col.iconColor}`} />
                </div>
                <span className={`text-xs font-bold ${col.textClass} uppercase tracking-wider`}>{col.title}</span>
              </div>
              <span className={`text-sm font-bold ${col.textClass}`} style={{ fontFamily: 'var(--font-jetbrains)' }}>
                <CountUp end={col.count} duration={1.2} separator="," />
              </span>
            </div>
            {/* Family Cards */}
            <div className="p-3 space-y-2 max-h-64 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#CBD5E1 transparent' }}>
              {col.families.length > 0 ? col.families.map((f) => (
                <motion.div
                  key={f.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigateToRelocation(f.id)}
                  className="p-2.5 bg-slate-50/80 rounded-lg border border-slate-200 cursor-pointer hover:border-slate-300 hover:bg-white transition-all"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      {f.pdfId}
                    </span>
                    <div className={`w-1.5 h-1.5 rounded-full ${col.dotClass}`} />
                  </div>
                  <p className="text-xs font-medium text-slate-900 truncate">{f.beneficiaryName}</p>
                  <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-2.5 h-2.5" />{f.villageName}
                  </p>
                </motion.div>
              )) : (
                <div className="py-6 text-center text-xs text-slate-400">No families in this stage</div>
              )}
            </div>
          </div>
        ))}
      </div>
      {/* Pipeline Flow Arrow */}
      <div className="hidden md:flex items-center justify-center gap-2 mt-4 text-slate-300">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Pipeline Flow</span>
        <ArrowRight className="w-4 h-4 text-amber-400" />
        <ArrowRight className="w-4 h-4 text-teal-400" />
        <ArrowRight className="w-4 h-4 text-green-400" />
        <div className="flex-1 h-px bg-slate-200" />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   COLONY-WISE DISTRIBUTION BAR CHART — derived from real families
   ═══════════════════════════════════════════════════════════════ */
function ColonyDistribution({ families }: { families: FamilyListItem[] }) {
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);

  // Derive colony distribution from families data, grouping by villageName
  const colonyDistribution = useMemo(() => {
    const map: Record<string, { name: string; plots: number; allotted: number; possession: number; pending: number }> = {};
    families.forEach(f => {
      const key = f.villageName;
      if (!map[key]) {
        map[key] = { name: key, plots: 0, allotted: 0, possession: 0, pending: 0 };
      }
      map[key].plots += 1;
      if (f.plotStatus === 'ALLOTTED') map[key].allotted += 1;
      if (f.plotStatus === 'POSSESSION_GIVEN') map[key].possession += 1;
      if (f.plotStatus === 'PENDING') map[key].pending += 1;
    });
    return Object.values(map).sort((a, b) => b.plots - a.plots);
  }, [families]);

  const maxPlots = colonyDistribution.length > 0
    ? Math.max(...colonyDistribution.map(c => c.plots))
    : 1;

  return (
    <div className="anim-in opacity-0 gov-card p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg bg-[#0F2B46]/10 flex items-center justify-center">
          <BarChart3 className="w-4 h-4 text-[#0F2B46]" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-wide">COLONY-WISE PLOT DISTRIBUTION</h3>
      </div>
      {colonyDistribution.length > 0 ? (
        <div className="space-y-5 max-h-96 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#CBD5E1 transparent' }}>
          {colonyDistribution.map((colony) => {
            const isHovered = hoveredBar === colony.name;
            return (
              <div
                key={colony.name}
                className="group relative"
                onMouseEnter={() => setHoveredBar(colony.name)}
                onMouseLeave={() => setHoveredBar(null)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[60%]">{colony.name}</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100" style={{ fontFamily: 'var(--font-jetbrains)' }}>
                    {colony.plots.toLocaleString()} plots
                  </span>
                </div>
                <div className="w-full h-6 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden flex relative">
                  <motion.div
                    className="bg-amber-400 h-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(colony.pending / maxPlots) * 100}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                  <motion.div
                    className="bg-teal-500 h-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(colony.allotted / maxPlots) * 100}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
                  />
                  <motion.div
                    className="bg-green-500 h-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(colony.possession / maxPlots) * 100}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                  />
                </div>
                {/* Tooltip */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute z-10 top-0 right-0 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg p-3 text-xs min-w-[160px]"
                    >
                      <p className="font-semibold text-slate-900 dark:text-slate-100 mb-2">{colony.name}</p>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
                          <span className="text-slate-600 dark:text-slate-400">Pending:</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100 ml-auto" style={{ fontFamily: 'var(--font-jetbrains)' }}>{colony.pending}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-sm bg-teal-500" />
                          <span className="text-slate-600 dark:text-slate-400">Allotted:</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100 ml-auto" style={{ fontFamily: 'var(--font-jetbrains)' }}>{colony.allotted}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-sm bg-green-500" />
                          <span className="text-slate-600 dark:text-slate-400">Possession:</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100 ml-auto" style={{ fontFamily: 'var(--font-jetbrains)' }}>{colony.possession}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="flex items-center gap-3 mt-1.5 text-[10px]">
                  <span className="text-amber-600 font-medium">{colony.pending} Pending</span>
                  <span className="text-teal-600 font-medium">{colony.allotted} Allotted</span>
                  <span className="text-green-600 font-medium">{colony.possession} Possession</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">No colony data available</div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   RECENT ALLOTMENT ACTIVITY FEED — real API data
   ═══════════════════════════════════════════════════════════════ */
function RecentActivityFeed() {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/activity?type=ALLOTMENT&limit=8')
      .then(r => r.json())
      .then(d => {
        setActivities(d.activities || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'success': return { line: 'bg-green-300', dot: 'bg-green-500 border-green-300' };
      case 'info': return { line: 'bg-teal-300', dot: 'bg-teal-500 border-teal-300' };
      case 'warning': return { line: 'bg-amber-300', dot: 'bg-amber-500 border-amber-300' };
      default: return { line: 'bg-slate-300', dot: 'bg-slate-400 border-slate-300' };
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'success': return PLOT_STATUS_LABELS['POSSESSION_GIVEN'];
      case 'info': return PLOT_STATUS_LABELS['ALLOTTED'];
      case 'warning': return PLOT_STATUS_LABELS['PENDING'];
      default: return null;
    }
  };

  // Parse the activity description to extract key parts
  const parseDescription = (desc: string) => {
    // Expected format: "Plot P-142 at ColonyName allotted to family PDF-2847 (BeneficiaryName) — Village, Mandal"
    const plotMatch = desc.match(/Plot\s+(\S+)/);
    const colonyMatch = desc.match(/at\s+(.+?)\s+allotted/);
    const pdfMatch = desc.match(/family\s+(\S+)/);
    const nameMatch = desc.match(/\(([^)]+)\)/);
    const locationMatch = desc.match(/—\s*(.+)/);

    return {
      plotNumber: plotMatch?.[1] || 'N/A',
      colony: colonyMatch?.[1] || (locationMatch?.[1] || ''),
      pdfId: pdfMatch?.[1] || '',
      beneficiaryName: nameMatch?.[1] || '',
      location: locationMatch?.[1] || '',
    };
  };

  return (
    <div className="anim-in opacity-0 gov-card p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg bg-[#0F2B46]/10 flex items-center justify-center">
          <Zap className="w-4 h-4 text-[#0F2B46]" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-wide">RECENT ALLOTMENT ACTIVITY</h3>
      </div>
      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="flex gap-4 items-start">
              <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
              <div className="flex-1 h-16 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
      ) : activities.length > 0 ? (
        <div className="relative max-h-96 overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#CBD5E1 transparent' }}>
          {activities.map((activity, i) => {
            const style = getSeverityStyle(activity.severity);
            const badge = getSeverityBadge(activity.severity);
            const parsed = parseDescription(activity.description);
            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="relative flex gap-4 pb-5 group"
              >
                {/* Timeline Line */}
                {i < activities.length - 1 && (
                  <div className={`absolute left-[11px] top-6 w-0.5 h-full ${style.line} opacity-40`} />
                )}
                {/* Dot */}
                <div className={`w-6 h-6 rounded-full border-2 ${style.dot} flex items-center justify-center shrink-0 z-10`}>
                  <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-slate-900" />
                </div>
                {/* Content */}
                <div className="flex-1 p-3 bg-slate-50/80 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-600 group-hover:bg-white dark:group-hover:bg-slate-800 group-hover:border-slate-300 dark:group-hover:border-slate-500 transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-700">
                      {parsed.pdfId || activity.relatedEntityId}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {new Date(activity.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{parsed.beneficiaryName || activity.description.slice(0, 60)}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {parsed.colony && (
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5" />{parsed.colony}
                      </span>
                    )}
                    {parsed.plotNumber && parsed.plotNumber !== 'N/A' && (
                      <>
                        <span className="text-[10px] text-slate-300 dark:text-slate-600">•</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <LandPlot className="w-2.5 h-2.5" />{parsed.plotNumber}
                        </span>
                      </>
                    )}
                    {badge && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${badge.color} ${badge.bg} ${badge.border}`}>
                        {badge.label}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">No recent allotment activity</div>
      )}
    </div>
  );
}

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
  const [mandalFilter, setMandalFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('pdf');

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

  // Filter families by search and filters
  const filteredFamilies = useMemo(() => {
    let result = families;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        f => f.pdfId.toLowerCase().includes(q) || f.beneficiaryName.toLowerCase().includes(q) || f.villageName.toLowerCase().includes(q)
      );
    }
    if (plotFilter !== 'ALL') {
      result = result.filter(f => f.plotStatus === plotFilter);
    }
    if (mandalFilter !== 'ALL') {
      result = result.filter(f => f.mandalCode === mandalFilter);
    }
    // Sort
    switch (sortBy) {
      case 'pdf':
        result.sort((a, b) => a.pdfId.localeCompare(b.pdfId));
        break;
      case 'name':
        result.sort((a, b) => a.beneficiaryName.localeCompare(b.beneficiaryName));
        break;
      case 'village':
        result.sort((a, b) => a.villageName.localeCompare(b.villageName));
        break;
      case 'members':
        result.sort((a, b) => b.memberCount - a.memberCount);
        break;
    }
    return result;
  }, [families, searchQuery, plotFilter, mandalFilter, sortBy]);

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

  // Colony distribution for filtering
  const colonyNames = useMemo(() => {
    const names = new Set<string>();
    families.forEach(f => {
      if (f.villageName) names.add(f.villageName);
    });
    return Array.from(names).sort();
  }, [families]);

  // Unique mandals for filter
  const mandalOptions = useMemo(() => {
    const map: Record<string, string> = {};
    families.forEach(f => {
      if (!map[f.mandalCode]) map[f.mandalCode] = f.mandalName;
    });
    return Object.entries(map);
  }, [families]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header skeleton */}
        <div className="skeleton-pulse h-20 rounded-xl" />
        {/* KPI card skeletons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="skeleton-pulse h-36 rounded-xl" />
          ))}
        </div>
        {/* Pipeline skeleton */}
        <div className="skeleton-pulse h-64 rounded-xl" />
        {/* Chart skeleton */}
        <div className="skeleton-pulse h-80 rounded-xl" />
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

      {/* ─── A. PLOT ALLOTMENT DASHBOARD ─── Summary Cards */}
      {stats && (
        <div className="anim-in opacity-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Total Plots */}
          <motion.div
            whileHover={{ y: -2 }}
            className="gov-card p-5 border-t-[3px] border-t-[#0F2B46] group"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Box className="w-4 h-4 text-[#0F2B46]" />
              </div>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Total Plots</span>
            </div>
            <p className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-jetbrains)' }}>
              <CountUp end={stats.totalFamilies} duration={1.5} separator="," />
            </p>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3 text-green-500" />
              <span className="text-xs text-green-600 font-medium">Active</span>
            </div>
          </motion.div>

          {/* Allotted */}
          <motion.div
            whileHover={{ y: -2 }}
            className="gov-card p-5 border-t-[3px] border-t-teal-500 group"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <LandPlot className="w-4 h-4 text-teal-600" />
              </div>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Allotted</span>
            </div>
            <p className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-jetbrains)' }}>
              <CountUp end={stats.plotsAllotted} duration={1.5} separator="," />
            </p>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3 text-teal-500" />
              <span className="text-xs text-teal-600 font-medium">{stats.totalFamilies > 0 ? ((stats.plotsAllotted / stats.totalFamilies) * 100).toFixed(1) : 0}%</span>
            </div>
          </motion.div>

          {/* Pending */}
          <motion.div
            whileHover={{ y: -2 }}
            className="gov-card p-5 border-t-[3px] border-t-amber-500 group"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Pending</span>
            </div>
            <p className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-jetbrains)' }}>
              <CountUp end={stats.plotsPending} duration={1.5} separator="," />
            </p>
            <div className="flex items-center gap-1 mt-1">
              <Timer className="w-3 h-3 text-amber-500" />
              <span className="text-xs text-amber-600 font-medium">Awaiting</span>
            </div>
          </motion.div>

          {/* Possession Given */}
          <motion.div
            whileHover={{ y: -2 }}
            className="gov-card p-5 border-t-[3px] border-t-green-500 group"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Possession</span>
            </div>
            <p className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-jetbrains)' }}>
              <CountUp end={stats.plotsPossessionGiven} duration={1.5} separator="," />
            </p>
            <div className="flex items-center gap-1 mt-1">
              <Flag className="w-3 h-3 text-green-500" />
              <span className="text-xs text-green-600 font-medium">Resettled</span>
            </div>
          </motion.div>

          {/* Allotment Rate */}
          <motion.div
            whileHover={{ y: -2 }}
            className="gov-card p-5 border-t-[3px] border-t-[#0F2B46] group"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp className="w-4 h-4 text-[#0F2B46]" />
              </div>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Rate</span>
            </div>
            <p className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-jetbrains)' }}>
              <CountUp end={allotmentRate} duration={1.5} decimals={1} />%
            </p>
            <div className="flex items-center gap-1 mt-1">
              <ArrowRightLeft className="w-3 h-3 text-[#0F2B46]" />
              <span className="text-xs text-slate-500 font-medium">All+Pos / Total</span>
            </div>
          </motion.div>
        </div>
      )}

      {/* ─── B. ALLOTMENT PIPELINE ─── */}
      <AllotmentPipeline families={families} stats={stats} />

      {/* ─── C. COLONY-WISE PLOT DISTRIBUTION ─── */}
      <ColonyDistribution families={families} />

      {/* ─── D. RECENT ALLOTMENT ACTIVITY FEED ─── */}
      <RecentActivityFeed />

      {/* ─── F. RELOCATION MAP ─── */}
      <RelocationMap />

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

      {/* ─── E. ENHANCED SEARCH & FILTER ─── */}
      <div className="anim-in opacity-0 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by PDF number, family name, or colony..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F2B46]/20 focus:border-[#0F2B46]/40 transition-all"
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
          <div className="flex gap-2 flex-wrap">
            {/* Plot Status Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={plotFilter}
                onChange={(e) => setPlotFilter(e.target.value)}
                className="pl-10 pr-8 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0F2B46]/20 focus:border-[#0F2B46]/40 appearance-none cursor-pointer transition-all"
              >
                <option value="ALL">All Status</option>
                <option value="ALLOTTED">Allotted</option>
                <option value="POSSESSION_GIVEN">Possession Given</option>
                <option value="PENDING">Pending</option>
              </select>
            </div>
            {/* Mandal Filter */}
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={mandalFilter}
                onChange={(e) => setMandalFilter(e.target.value)}
                className="pl-10 pr-8 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0F2B46]/20 focus:border-[#0F2B46]/40 appearance-none cursor-pointer transition-all"
              >
                <option value="ALL">All Mandals</option>
                {mandalOptions.map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>
            {/* Sort */}
            <div className="relative">
              <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="pl-10 pr-8 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0F2B46]/20 focus:border-[#0F2B46]/40 appearance-none cursor-pointer transition-all"
              >
                <option value="pdf">Sort: PDF ID</option>
                <option value="name">Sort: Name</option>
                <option value="village">Sort: Village</option>
                <option value="members">Sort: Members</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Result count */}
      <div className="anim-in opacity-0 flex items-center justify-between">
        <p className="text-xs text-slate-400">
          Showing <span className="font-semibold text-slate-600">{filteredFamilies.length}</span> families with allotted plots
        </p>
        {(searchQuery || plotFilter !== 'ALL' || mandalFilter !== 'ALL') && (
          <button
            onClick={() => { setSearchQuery(''); setPlotFilter('ALL'); setMandalFilter('ALL'); setSortBy('pdf'); }}
            className="text-xs text-amber-700 hover:text-amber-800 font-medium flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Clear all filters
          </button>
        )}
      </div>

      {/* Families List */}
      {filteredFamilies.length > 0 ? (
        <div className="anim-in opacity-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFamilies.map((f, i) => {
            const plotCfg = PLOT_STATUS_LABELS[f.plotStatus] || PLOT_STATUS_LABELS.NOT_ALLOTTED;
            const rrCfg = RR_ELIGIBILITY_CONFIG[f.rrEligibility];
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
                    {f.pdfId}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${plotCfg.color} ${plotCfg.bg} ${plotCfg.border}`}>
                    {plotCfg.label}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 mb-1">{f.beneficiaryName}</h4>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
                  <MapPin className="w-3 h-3" />
                  <span>{f.villageName}</span>
                  <span className="text-slate-300">•</span>
                  <span>{f.mandalName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {rrCfg && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${rrCfg.color} ${rrCfg.bg} ${rrCfg.border}`}>
                        {rrCfg.label}
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
            {searchQuery || plotFilter !== 'ALL' || mandalFilter !== 'ALL'
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
    if (!data?.plotAllotment?.latitude || !data?.plotAllotment?.longitude) return null;
    return haversineDistance(
      data.originalLocation.latitude, data.originalLocation.longitude,
      data.plotAllotment.latitude, data.plotAllotment.longitude
    );
  }, [data]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header skeleton */}
        <div className="skeleton-pulse h-28 rounded-xl" />
        {/* KPI card skeletons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="skeleton-pulse h-20 rounded-lg" />
          ))}
        </div>
        {/* Pipeline skeleton */}
        <div className="skeleton-pulse h-48 rounded-xl" />
        {/* Chart skeleton */}
        <div className="skeleton-pulse h-64 rounded-xl" />
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

  const hasCoordinates = data.plotAllotment?.latitude != null && data.plotAllotment?.longitude != null;
  const allotCfg = data.plotAllotment ? ALLOTMENT_STATUS_CONFIG[data.plotAllotment.allotmentStatus] : null;

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
                {data.family.pdfId}
              </span>
              {allotCfg && (
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${allotCfg.color} ${allotCfg.bg} ${allotCfg.border}`}>
                  {allotCfg.label}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{data.family.beneficiaryName}</h1>
            <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
              <MapPin className="w-3 h-3" />
              <span>From {data.originalLocation.name}</span>
              <ArrowRight className="w-3 h-3" />
              <span>{data.plotAllotment?.colonyName || 'Pending allotment'}</span>
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
          <p className="text-sm font-bold text-slate-900 truncate">{data.plotAllotment?.colonyName || 'Pending'}</p>
        </div>
        <div className="gov-card p-4 text-center border-t-[3px] border-t-amber-400">
          <LandPlot className="w-5 h-5 text-amber-500 mx-auto mb-2" />
          <p className="text-xs text-slate-400 mb-1">Plot Area</p>
          <p className="text-sm font-bold text-slate-900">{data.plotAllotment?.areaSqYards ? `${data.plotAllotment.areaSqYards} sq.yd` : 'Pending'}</p>
        </div>
        <div className="gov-card p-4 text-center border-t-[3px] border-t-[#0F2B46]">
          <Calendar className="w-5 h-5 text-[#0F2B46] mx-auto mb-2" />
          <p className="text-xs text-slate-400 mb-1">Allotment</p>
          <p className="text-sm font-bold text-slate-900">{data.plotAllotment?.allotmentDate ? new Date(data.plotAllotment.allotmentDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'Pending'}</p>
        </div>
      </motion.div>

      {/* Geo Warning */}
      {(!hasCoordinates || !data.plotAllotment) && (
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
              {!data.plotAllotment
                ? 'No plot has been allotted to this family yet. Once allotted, the relocation path will be visualized on the map.'
                : 'Plot allotted but location not yet mapped. Coordinates will be updated after geo-survey verification.'}
            </p>
          </div>
        </motion.div>
      )}

      {/* Before / After Map */}
      {hasCoordinates && data.plotAllotment && (
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
                  <text x="200" y="125" fill="#166534" fontSize="11" fontWeight="700" textAnchor="middle">{data.plotAllotment.colonyName || 'New Plot'}</text>
                  <text x="200" y="140" fill="#15803D" fontSize="8" textAnchor="middle" opacity="0.6">{data.plotAllotment.plotNumber || 'Plot pending'}</text>
                  <text x="200" y="158" fill="#64748B" fontSize="7" textAnchor="middle" style={{ fontFamily: 'var(--font-jetbrains)' }}>
                    {data.plotAllotment.latitude!.toFixed(4)}°N, {data.plotAllotment.longitude!.toFixed(4)}°E
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
                <text x="500" y="120" fill="#166534" fontSize="8" fontWeight="600" textAnchor="middle">{data.plotAllotment.colonyName || 'New Plot'}</text>
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
      {data.plotAllotment && (
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
              { label: 'Plot Number', value: data.plotAllotment.plotNumber || 'Pending', icon: LandPlot, color: 'text-blue-700', borderColor: 'border-l-blue-400', bg: 'bg-blue-50' },
              { label: 'Colony Name', value: data.plotAllotment.colonyName || 'Pending', icon: Building2, color: 'text-purple-700', borderColor: 'border-l-purple-400', bg: 'bg-purple-50' },
              { label: 'Area', value: data.plotAllotment.areaSqYards ? `${data.plotAllotment.areaSqYards} sq. yards` : 'Pending', icon: Ruler, color: 'text-teal-700', borderColor: 'border-l-teal-400', bg: 'bg-teal-50' },
              { label: 'Allotment Status', value: allotCfg?.label || data.plotAllotment.allotmentStatus, icon: allotCfg?.label === 'Possession Given' ? CheckCircle2 : Clock, color: allotCfg?.color || 'text-slate-600', borderColor: 'border-l-amber-400', bg: allotCfg?.bg || 'bg-slate-50' },
              { label: 'Allotment Date', value: data.plotAllotment.allotmentDate ? new Date(data.plotAllotment.allotmentDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Pending', icon: Calendar, color: 'text-amber-700', borderColor: 'border-l-amber-400', bg: 'bg-amber-50' },
              { label: 'Coordinates', value: hasCoordinates ? `${data.plotAllotment.latitude!.toFixed(4)}°N, ${data.plotAllotment.longitude!.toFixed(4)}°E` : 'Pending', icon: MapPin, color: 'text-green-700', borderColor: 'border-l-green-400', bg: 'bg-green-50' },
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
      {!data.plotAllotment && (
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
            This family must be marked R&amp;R Eligible before a plot can be allotted under the rehabilitation scheme.
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
        transition={{ delay: 0.4 }}
        className="anim-in opacity-0 gov-card p-6 border-l-4 border-l-teal-400"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
            <Phone className="w-4 h-4 text-teal-600" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 tracking-wide">NEED HELP?</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-400 mb-1 uppercase tracking-wider">Grievance Cell</p>
            <p className="text-sm font-semibold text-slate-900">1800-425-0202</p>
            <p className="text-xs text-slate-500 mt-1">Toll-free helpline for R&amp;R queries</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-400 mb-1 uppercase tracking-wider">Mandal Revenue Office</p>
            <p className="text-sm font-semibold text-slate-900">mro-polavaram@ap.gov.in</p>
            <p className="text-xs text-slate-500 mt-1">For allotment &amp; possession queries</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function RelocationView() {
  const view = useAppStore((s) => s.view);
  const selectedFamilyId = useAppStore((s) => s.selectedFamilyId);

  return (
    <ViewLayout
      navTitle="RELOCATION & PLOTS"
      accentDotColor="#14B8A6"
      navSubtitle="Plot Allotment Tracker"
    >
      {selectedFamilyId ? (
        <RelocationDetail familyId={selectedFamilyId} />
      ) : (
        <RelocationOverview />
      )}
    </ViewLayout>
  );
}
