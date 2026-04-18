'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { SES_STATUS_CONFIG } from '@/lib/constants';
import CountUp from 'react-countup';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { Users, Home, CheckCircle2, Clock, ChevronRight, Activity, LandPlot, MapPin, FileCheck, MapPinned, ClipboardCheck, KeyRound, BadgeCheck, TrendingUp, TrendingDown, Calendar, RefreshCw, AlertCircle, FileSignature, Key } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import GovFooter from '@/components/shared/GovFooter';
import GlobalSearch from '@/components/shared/GlobalSearch';
import NotificationBanner from '@/components/shared/NotificationBanner';
import SidebarNav from '@/components/shared/SidebarNav';
import MobileMenuButton from '@/components/shared/MobileMenuButton';
import DataTableView from '@/components/shared/DataTableView';
import ThemeToggle from '@/components/shared/ThemeToggle';

interface Stats {
  totalFamilies: number;
  totalMembers: number;
  firstSchemeEligible: number;
  surveyed: number;
  verified: number;
  approved: number;
  rejected: number;
  plotsAllotted: number;
  plotsPending: number;
  plotsPossessionGiven: number;
  mandals: Array<{
    id: string; name: string; nameTelugu: string; code: string;
    latitude: number; longitude: number; color: string;
    familyCount: number; villageCount: number; firstSchemeCount: number;
  }>;
}

// GeoJSON mandal boundaries (embedded)
const MANDAL_GEOJSON = {
  POL: { name: 'Polavaram', coords: [[81.638,17.285],[81.655,17.295],[81.678,17.300],[81.700,17.298],[81.720,17.290],[81.738,17.280],[81.750,17.265],[81.758,17.248],[81.755,17.230],[81.748,17.218],[81.735,17.208],[81.720,17.200],[81.700,17.198],[81.682,17.202],[81.668,17.210],[81.655,17.222],[81.645,17.238],[81.638,17.255],[81.635,17.270],[81.638,17.285]] },
  VEL: { name: 'Velairpad', coords: [[81.540,17.358],[81.558,17.368],[81.580,17.375],[81.605,17.378],[81.628,17.372],[81.648,17.360],[81.662,17.345],[81.672,17.328],[81.678,17.310],[81.672,17.295],[81.660,17.282],[81.645,17.272],[81.628,17.265],[81.608,17.262],[81.588,17.265],[81.572,17.275],[81.558,17.290],[81.548,17.308],[81.542,17.325],[81.538,17.342],[81.540,17.358]] },
  BUT: { name: 'Buttaigudem', coords: [[81.660,17.200],[81.678,17.208],[81.700,17.210],[81.722,17.205],[81.742,17.195],[81.758,17.182],[81.772,17.168],[81.782,17.150],[81.785,17.132],[81.778,17.115],[81.765,17.102],[81.748,17.092],[81.728,17.088],[81.708,17.090],[81.690,17.098],[81.675,17.110],[81.662,17.125],[81.652,17.142],[81.648,17.160],[81.650,17.178],[81.655,17.192],[81.660,17.200]] },
};

// Godavari river path
const GODAVARI_PATH = [
  [81.350,17.480],[81.380,17.458],[81.405,17.438],[81.430,17.415],
  [81.458,17.392],[81.485,17.370],[81.510,17.348],[81.535,17.325],
  [81.555,17.305],[81.575,17.285],[81.595,17.268],[81.618,17.252],
  [81.640,17.240],[81.658,17.232],[81.675,17.225],[81.690,17.218],
  [81.700,17.212],[81.711,17.205],[81.712,17.198],[81.710,17.190],
  [81.705,17.180],[81.698,17.168],[81.690,17.155],[81.682,17.142],
  [81.675,17.128],[81.668,17.115],[81.660,17.100],[81.652,17.085],
  [81.645,17.070],[81.638,17.055],[81.632,17.040],[81.628,17.025],
];

// District boundary
const DISTRICT_BOUNDARY = [
  [81.250,17.480],[81.300,17.500],[81.360,17.510],[81.420,17.505],
  [81.480,17.498],[81.540,17.490],[81.590,17.478],[81.630,17.460],
  [81.665,17.440],[81.695,17.415],[81.715,17.388],[81.730,17.358],
  [81.742,17.325],[81.750,17.290],[81.755,17.255],[81.758,17.220],
  [81.758,17.185],[81.752,17.150],[81.740,17.118],[81.722,17.090],
  [81.700,17.068],[81.672,17.052],[81.640,17.042],[81.605,17.038],
  [81.570,17.042],[81.535,17.055],[81.505,17.075],[81.478,17.098],
  [81.455,17.125],[81.435,17.155],[81.420,17.188],[81.405,17.218],
  [81.385,17.248],[81.360,17.275],[81.330,17.300],[81.300,17.320],
  [81.272,17.340],[81.255,17.362],[81.245,17.388],[81.240,17.415],
  [81.238,17.440],[81.240,17.460],[81.250,17.480],
];

// Map projection
const MAP_BOUNDS = { minLng: 81.22, maxLng: 81.80, minLat: 17.02, maxLat: 17.52 };
const SVG_W = 700;
const SVG_H = 460;
const MAP_PAD = 40;

function project(lng: number, lat: number) {
  const xRange = MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng;
  const yRange = MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat;
  const x = MAP_PAD + ((lng - MAP_BOUNDS.minLng) / xRange) * (SVG_W - 2 * MAP_PAD);
  const y = MAP_PAD + ((MAP_BOUNDS.maxLat - lat) / yRange) * (SVG_H - 2 * MAP_PAD);
  return { x, y };
}

function polygonToSvgPath(coords: number[][]) {
  return coords.map((c, i) => {
    const p = project(c[0], c[1]);
    return `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(' ') + ' Z';
}

function pathToSvgLine(coords: number[][]) {
  return coords.map((c, i) => {
    const p = project(c[0], c[1]);
    return `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(' ');
}

function getCentroid(coords: number[][]) {
  const sum = coords.reduce((acc, c) => ({ lng: acc.lng + c[0], lat: acc.lat + c[1] }), { lng: 0, lat: 0 });
  return { lng: sum.lng / coords.length, lat: sum.lat / coords.length };
}

// SES Donut Chart colors
const SES_COLORS: Record<string, string> = {
  SURVEYED: '#94A3B8',
  VERIFIED: '#D97706',
  APPROVED: '#16A34A',
  REJECTED: '#DC2626',
};

// Custom tooltip for SES donut chart
function SesDonutTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { status: string; count: number; fill: string } }> }) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0];
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-slate-900">{data.payload.status}</p>
      <p className="text-xs text-slate-500">{data.value.toLocaleString()} families</p>
    </div>
  );
}

// Custom tooltip for Mandal bar chart
function MandalBarTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-slate-900 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-xs text-slate-500">
          <span className="inline-block w-2 h-2 rounded-sm mr-1.5" style={{ backgroundColor: entry.color }} />
          {entry.name}: <span className="font-medium text-slate-700">{entry.value.toLocaleString()}</span>
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

// Recent Activity mock data
const RECENT_ACTIVITIES = [
  { id: 1, icon: BadgeCheck, description: 'Family PDF-POL-CHI-0001 status changed to Verified', time: '2 hours ago', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  { id: 2, icon: MapPinned, description: 'New plot allotted to PDF-VEL-PUR-0005', time: '5 hours ago', color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200' },
  { id: 3, icon: ClipboardCheck, description: 'Family PDF-BUT-GUN-0012 SES survey completed', time: '8 hours ago', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' },
  { id: 4, icon: KeyRound, description: 'Plot possession given for PDF-POL-BHA-0003', time: '1 day ago', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { id: 5, icon: FileCheck, description: 'Family PDF-VEL-VLP-0008 approved for relocation', time: '1 day ago', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
];

// Section header component with accent and separator
function SectionHeader({ title, accentColor = '#1E3A5F' }: { title: string; accentColor?: string }) {
  return (
    <div className="mb-5">
      <h3
        className="text-sm font-semibold text-slate-900 tracking-wider flex items-center"
        style={{ borderLeft: `3px solid ${accentColor}`, paddingLeft: '10px' }}
      >
        {title}
      </h3>
      <div className="mt-2 h-px bg-gradient-to-r from-slate-200 via-slate-100 to-transparent" />
    </div>
  );
}

export default function DashboardView() {
  const navigateToMandal = useAppStore((s) => s.navigateToMandal);
  const goBack = useAppStore((s) => s.goBack);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredMandal, setHoveredMandal] = useState<string | null>(null);
  const [showDataTable, setShowDataTable] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading && containerRef.current) {
      const els = containerRef.current.querySelectorAll('.anim-in');
      gsap.fromTo(els, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'power3.out' });
    }
  }, [loading]);

  // Memoize SVG paths
  const mandalPaths = useMemo(() => ({
    POL: polygonToSvgPath(MANDAL_GEOJSON.POL.coords),
    VEL: polygonToSvgPath(MANDAL_GEOJSON.VEL.coords),
    BUT: polygonToSvgPath(MANDAL_GEOJSON.BUT.coords),
  }), []);

  const districtPath = useMemo(() => polygonToSvgPath(DISTRICT_BOUNDARY), []);
  const riverPath = useMemo(() => pathToSvgLine(GODAVARI_PATH), []);
  const damPoint = useMemo(() => project(81.7119, 17.2473), []);

  const mandalCentroids = useMemo(() => ({
    POL: { ...getCentroid(MANDAL_GEOJSON.POL.coords), name: 'Polavaram' },
    VEL: { ...getCentroid(MANDAL_GEOJSON.VEL.coords), name: 'Velairpad' },
    BUT: { ...getCentroid(MANDAL_GEOJSON.BUT.coords), name: 'Buttaigudem' },
  }), []);

  // Map mandal code to stats
  const mandalStatsMap = useMemo(() => {
    const map: Record<string, Stats['mandals'][0]> = {};
    stats?.mandals.forEach(m => { map[m.code] = m; });
    return map;
  }, [stats]);

  // SES Donut chart data
  const sesDonutData = useMemo(() => {
    if (!stats) return [];
    return [
      { status: 'SURVEYED', count: stats.surveyed },
      { status: 'VERIFIED', count: stats.verified },
      { status: 'APPROVED', count: stats.approved },
      { status: 'REJECTED', count: stats.rejected },
    ];
  }, [stats]);

  // Mandal comparison bar chart data
  const mandalBarData = useMemo(() => {
    if (!stats) return [];
    return stats.mandals.map(m => ({
      name: m.name,
      code: m.code,
      'Family Count': m.familyCount,
      'First Scheme Eligible': m.firstSchemeCount,
    }));
  }, [stats]);

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#F0F4F8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-slate-200 border-t-[#1E3A5F] rounded-full animate-spin" />
          <p className="text-slate-400 text-sm tracking-widest uppercase" style={{ fontFamily: 'var(--font-jetbrains)' }}>Loading Dashboard</p>
        </div>
      </div>
    );
  }

  if (!stats) return <div className="w-full min-h-screen bg-[#F0F4F8] flex items-center justify-center"><p className="text-red-600 font-medium">Failed to load data</p></div>;

  const resettleCount = stats.plotsAllotted + stats.plotsPossessionGiven;
  const completionPct = stats.totalFamilies ? ((resettleCount / stats.totalFamilies) * 100).toFixed(1) : '0';

  // Enhanced counter cards with gradient backgrounds and slate for Pending
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
      trend: '+12 this week',
      trendUp: true,
      tooltip: 'Number of families affected by the Polavaram project across all 3 mandals',
    },
    {
      label: 'First Scheme Eligible',
      value: stats.firstSchemeEligible,
      icon: CheckCircle2,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      topBorder: '#16A34A',
      gradientFrom: 'from-emerald-50/50',
      gradientTo: 'to-emerald-100/60',
      trend: '+8 this week',
      trendUp: true,
      tooltip: 'Families eligible for first scheme compensation under R&R policy',
    },
    {
      label: 'Plots Allotted',
      value: resettleCount,
      icon: Home,
      color: 'text-amber-700',
      bg: 'bg-amber-50',
      borderColor: 'border-amber-200',
      topBorder: '#D97706',
      gradientFrom: 'from-amber-50/50',
      gradientTo: 'to-amber-100/60',
      trend: '+5 this week',
      trendUp: true,
      tooltip: 'Families who have been allotted new plots for relocation',
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
      trend: '-3 this week',
      trendUp: false,
      tooltip: 'Families still waiting for plot allotment',
    },
  ];

  const sesData = [
    { status: 'SURVEYED', count: stats.surveyed, ...SES_STATUS_CONFIG.SURVEYED },
    { status: 'VERIFIED', count: stats.verified, ...SES_STATUS_CONFIG.VERIFIED },
    { status: 'APPROVED', count: stats.approved, ...SES_STATUS_CONFIG.APPROVED },
    { status: 'REJECTED', count: stats.rejected, ...SES_STATUS_CONFIG.REJECTED },
  ];
  const maxSes = Math.max(...sesData.map(d => d.count), 1);

  const mandalColorMap: Record<string, string> = { POL: '#D97706', VEL: '#0D9488', BUT: '#EA580C' };

  return (
    <div ref={containerRef} className="w-full min-h-screen bg-[#F0F4F8] flex flex-col">
      {/* Sidebar Navigation */}
      <SidebarNav />

      {/* Tricolor Bar */}
      <div className="tricolor-bar w-full lg:pl-[52px]" />

      {/* Top Nav - Navy gradient */}
      <div className="sticky top-[3px] z-50 bg-gradient-to-r from-[#0F2B46] to-[#1E3A5F] shadow-md lg:pl-[52px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MobileMenuButton />
            <button onClick={goBack} className="text-white/70 hover:text-white transition-colors text-sm flex items-center gap-1">
              <ChevronRight className="w-4 h-4 rotate-180" /><span className="hidden sm:inline">Back</span>
            </button>
            <div className="w-px h-6 bg-white/20" />
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-sm font-medium text-white tracking-wide" style={{ fontFamily: 'var(--font-jetbrains)' }}>POLAVARAM R&R PORTAL</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-white/50">
            <GlobalSearch />
            <span className="hidden md:inline">Government of Andhra Pradesh</span>
            <div className="flex items-center gap-1.5 text-emerald-400"><Activity className="w-3 h-3" /><span>LIVE</span></div>
            <ThemeToggle />
          </div>
        </div>
        {/* Notification Banner */}
        <NotificationBanner />
      </div>

      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 lg:pl-[68px] py-6 space-y-8 w-full">
        {/* Government Header Banner */}
        <div className="anim-in opacity-0 gov-card p-6 sm:p-7 bg-gradient-to-r from-[#0F2B46] to-[#1E3A5F] text-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[10px] tracking-[0.2em] uppercase text-amber-300/80 font-medium" style={{ fontFamily: 'var(--font-jetbrains)' }}>government of andhra pradesh</p>
                <span className="text-white/20">|</span>
                <span className="flex items-center gap-1 text-[10px] text-emerald-400/70" style={{ fontFamily: 'var(--font-jetbrains)' }}>
                  <RefreshCw className="w-2.5 h-2.5" /> Data updated: Just now
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight mt-1">Polavaram Project Rehabilitation & Resettlement</h1>
              <p className="text-sm text-white/60 mt-1">Water Resources Department — Monitoring 14,000+ affected families across Eluru District</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-400/30">
                <LandPlot className="w-5 h-5 text-amber-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Counter Cards - Enhanced with gradient bg, top border, pill trends, hover lift */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {counterCards.map((card, i) => (
            <div
              key={i}
              className="anim-in opacity-0 relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-slate-300 cursor-default"
              title={card.tooltip}
            >
              {/* Thin colored top border */}
              <div className="h-[3px] w-full" style={{ backgroundColor: card.topBorder }} />
              {/* Gradient background overlay */}
              <div className={`absolute inset-0 bg-gradient-to-br ${card.gradientFrom} ${card.gradientTo} pointer-events-none`} style={{ top: '3px' }} />
              <div className="relative p-5 sm:p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2.5 rounded-lg ${card.bg} border ${card.borderColor}`}><card.icon className={`w-4 h-4 ${card.color}`} /></div>
                  {/* Pill-shaped trend badge */}
                  <span className={`flex items-center gap-0.5 text-[10px] font-semibold px-2.5 py-1 rounded-full ${card.trendUp ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-red-50 text-red-500 border border-red-200'}`} style={{ fontFamily: 'var(--font-jetbrains)' }}>
                    {card.trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {card.trend}
                  </span>
                </div>
                <div className="counter-value text-2xl sm:text-3xl font-bold text-slate-900">
                  <CountUp end={card.value} duration={2} separator="," />
                </div>
                <p className="mt-1 text-xs sm:text-sm text-slate-500">{card.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* View All Families Button */}
        <div className="anim-in opacity-0 flex justify-center">
          <button
            onClick={() => setShowDataTable(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-[#1E3A5F] hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
          >
            <Users className="w-4 h-4" />
            View All Families
          </button>
        </div>

        {/* Rehabilitation Progress Overview - Enhanced */}
        <div className="anim-in opacity-0 gov-card p-6">
          <SectionHeader title="REHABILITATION PROGRESS" accentColor="#D97706" />
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
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${completionPct}%` }}
                transition={{ duration: 1.5, delay: 0.5, ease: 'easeOut' }}
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
                  className="w-2.5 h-2.5 rotate-45 bg-white border-2 border-slate-300 mx-auto"
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* GeoJSON Map */}
          <div className="lg:col-span-2 anim-in opacity-0">
            <div className="gov-card p-5 sm:p-6">
              <SectionHeader title="PROJECT AREA MAP" accentColor="#1E3A5F" />
              <div className="relative w-full h-[300px] sm:h-[420px] bg-[#F8FAFC] rounded-lg overflow-hidden border border-slate-200">
                <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-full">
                  <defs>
                    <pattern id="map-grid" width="25" height="25" patternUnits="userSpaceOnUse">
                      <path d="M 25 0 L 0 0 0 25" fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth="0.5"/>
                    </pattern>
                    <filter id="map-shadow" x="-5%" y="-5%" width="110%" height="110%">
                      <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.1"/>
                    </filter>
                  </defs>

                  {/* Background */}
                  <rect width={SVG_W} height={SVG_H} fill="#F8FAFC"/>
                  <rect width={SVG_W} height={SVG_H} fill="url(#map-grid)"/>

                  {/* District boundary */}
                  <path d={districtPath} fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="6,3" opacity="0.7"/>

                  {/* Godavari River */}
                  <path d={riverPath} fill="none" stroke="#3B82F6" strokeWidth="3" opacity="0.5" strokeDasharray="1200">
                    <animate attributeName="stroke-dashoffset" from="1200" to="0" dur="3s" fill="freeze"/>
                  </path>
                  <path d={riverPath} fill="none" stroke="#60A5FA" strokeWidth="1.5" opacity="0.3"/>

                  {/* River label */}
                  {(() => {
                    const mid = GODAVARI_PATH[Math.floor(GODAVARI_PATH.length / 2)];
                    const p = project(mid[0], mid[1]);
                    return <text x={p.x + 10} y={p.y - 8} fill="#3B82F6" fontSize="9" fontWeight="500" opacity="0.6" transform={`rotate(-35, ${p.x + 10}, ${p.y - 8})`}>GODAVARI RIVER</text>;
                  })()}

                  {/* Mandal polygons */}
                  {Object.entries(MANDAL_GEOJSON).map(([code, data]) => {
                    const color = mandalColorMap[code];
                    const isHovered = hoveredMandal === code;
                    const mStats = mandalStatsMap[code];
                    const centroid = mandalCentroids[code as keyof typeof mandalCentroids];
                    const cp = project(centroid.lng, centroid.lat);

                    return (
                      <g
                        key={code}
                        className="cursor-pointer"
                        onClick={() => {
                          if (mStats) navigateToMandal(mStats.id);
                        }}
                        onMouseEnter={() => setHoveredMandal(code)}
                        onMouseLeave={() => setHoveredMandal(null)}
                      >
                        {/* Polygon fill */}
                        <path
                          d={mandalPaths[code as keyof typeof mandalPaths]}
                          fill={color}
                          fillOpacity={isHovered ? 0.25 : 0.12}
                          stroke={color}
                          strokeWidth={isHovered ? 2.5 : 1.5}
                          strokeOpacity={isHovered ? 0.8 : 0.5}
                          style={{ transition: 'all 0.3s ease' }}
                          filter="url(#map-shadow)"
                        />
                        {/* Pulse animation on hover */}
                        {isHovered && (
                          <circle cx={cp.x} cy={cp.y} r="20" fill={color} opacity="0.15">
                            <animate attributeName="r" values="15;25;15" dur="1.5s" repeatCount="indefinite"/>
                            <animate attributeName="opacity" values="0.15;0.05;0.15" dur="1.5s" repeatCount="indefinite"/>
                          </circle>
                        )}
                        {/* Center dot */}
                        <circle cx={cp.x} cy={cp.y} r={isHovered ? 5 : 3.5} fill={color} style={{ transition: 'r 0.3s ease' }}/>
                        {/* Mandal name */}
                        <text x={cp.x} y={cp.y - 14} fill={color} fontSize="10" fontWeight="600" textAnchor="middle" opacity={isHovered ? 1 : 0.85}>{data.name}</text>
                        {/* Family count */}
                        {mStats && (
                          <text x={cp.x} y={cp.y + 22} fill="#64748B" fontSize="8" textAnchor="middle" opacity={isHovered ? 0.8 : 0.5}>{mStats.familyCount} families</text>
                        )}
                      </g>
                    );
                  })}

                  {/* Dam marker */}
                  <g>
                    <circle cx={damPoint.x} cy={damPoint.y} r="16" fill="#D97706" opacity="0.15">
                      <animate attributeName="r" values="12;20;12" dur="2.5s" repeatCount="indefinite"/>
                      <animate attributeName="opacity" values="0.15;0.05;0.15" dur="2.5s" repeatCount="indefinite"/>
                    </circle>
                    {/* Diamond shape for dam */}
                    <polygon
                      points={`${damPoint.x},${damPoint.y - 6} ${damPoint.x + 5},${damPoint.y} ${damPoint.x},${damPoint.y + 6} ${damPoint.x - 5},${damPoint.y}`}
                      fill="#D97706"
                      stroke="#FFF"
                      strokeWidth="1"
                    />
                    <text x={damPoint.x + 12} y={damPoint.y + 3} fill="#92400E" fontSize="8" fontWeight="700">POLAVARAM DAM</text>
                  </g>

                  {/* Enhanced Legend - larger, squares, family counts, box-shadow */}
                  <rect x="12" y={SVG_H - 68} width="200" height="58" rx="8" fill="white" stroke="#E2E8F0" strokeWidth="1" opacity="0.95" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.08))' }}/>
                  {/* Polavaram - square shape + family count */}
                  <rect x="24" y={SVG_H - 52} width="8" height="8" rx="1.5" fill="#D97706"/>
                  <text x="38" y={SVG_H - 45} fill="#475569" fontSize="9" fontWeight="500">Polavaram</text>
                  <text x="96" y={SVG_H - 45} fill="#94A3B8" fontSize="8">{mandalStatsMap.POL?.familyCount ?? ''}</text>
                  {/* Velairpad - square shape + family count */}
                  <rect x="120" y={SVG_H - 52} width="8" height="8" rx="1.5" fill="#0D9488"/>
                  <text x="134" y={SVG_H - 45} fill="#475569" fontSize="9" fontWeight="500">Velairpad</text>
                  <text x="198" y={SVG_H - 45} fill="#94A3B8" fontSize="8">{mandalStatsMap.VEL?.familyCount ?? ''}</text>
                  {/* Buttaigudem - square shape + family count */}
                  <rect x="24" y={SVG_H - 34} width="8" height="8" rx="1.5" fill="#EA580C"/>
                  <text x="38" y={SVG_H - 27} fill="#475569" fontSize="9" fontWeight="500">Buttaigudem</text>
                  <text x="108" y={SVG_H - 27} fill="#94A3B8" fontSize="8">{mandalStatsMap.BUT?.familyCount ?? ''}</text>
                  {/* River line legend */}
                  <line x1="130" y1={SVG_H - 30} x2="155" y2={SVG_H - 30} stroke="#3B82F6" strokeWidth="1.5" opacity="0.6"/>
                  <text x="160" y={SVG_H - 27} fill="#475569" fontSize="9" fontWeight="500">River</text>
                </svg>
              </div>
              <p className="mt-2 text-xs text-slate-400 text-center">Click on any mandal zone to explore details</p>
              {/* Hover info panel */}
              {hoveredMandal && mandalStatsMap[hoveredMandal] && (
                <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-4">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: mandalColorMap[hoveredMandal] }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{mandalStatsMap[hoveredMandal].name} Mandal</p>
                    <p className="text-xs text-slate-500">{mandalStatsMap[hoveredMandal].villageCount} villages · {mandalStatsMap[hoveredMandal].familyCount} families · {mandalStatsMap[hoveredMandal].firstSchemeCount} first-scheme eligible</p>
                  </div>
                  <button
                    onClick={() => navigateToMandal(mandalStatsMap[hoveredMandal].id)}
                    className="shrink-0 text-xs text-[#1E3A5F] font-medium hover:underline flex items-center gap-1"
                  >
                    Explore <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* SES Status Overview - Enhanced with percentages, taller bars, rounded corners */}
            <div className="anim-in opacity-0 gov-card p-5 sm:p-6">
              <SectionHeader title="SES STATUS OVERVIEW" accentColor="#D97706" />
              <div className="space-y-4">
                {sesData.map((item) => {
                  const pct = stats.totalFamilies ? ((item.count / stats.totalFamilies) * 100).toFixed(1) : '0';
                  return (
                    <div key={item.status}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-xs font-semibold ${item.color}`}>{item.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 counter-value"><CountUp end={item.count} duration={1.5} separator="," /></span>
                          <span className="text-[10px] text-slate-400 font-medium px-1.5 py-0.5 bg-slate-50 rounded" style={{ fontFamily: 'var(--font-jetbrains)' }}>{pct}%</span>
                        </div>
                      </div>
                      {/* Taller bars with rounded corners */}
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(item.count / maxSes) * 100}%` }}
                          transition={{ duration: 1, delay: 0.3 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: item.status === 'SURVEYED' ? '#94A3B8' : item.status === 'VERIFIED' ? '#D97706' : item.status === 'APPROVED' ? '#16A34A' : '#DC2626', opacity: 0.7, borderRadius: '9999px' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mandal Cards */}
            <div className="space-y-3">
              {stats.mandals.map((mandal, i) => {
                const color = mandalColorMap[mandal.code] || '#D97706';
                return (
                  <motion.div
                    key={mandal.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.15 }}
                    className="gov-card p-5 cursor-pointer group border-l-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                    style={{ borderLeftColor: color }}
                    onClick={() => navigateToMandal(mandal.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{mandal.name}</p>
                          <p className="text-xs text-slate-400">{mandal.villageCount} villages</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-slate-900 counter-value"><CountUp end={mandal.familyCount} duration={1.5} separator="," /></p>
                        <p className="text-xs text-slate-400">families</p>
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
                );
              })}
            </div>
          </div>
        </div>

        {/* Charts Section - 2-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* A) SES Status Donut Chart */}
          <div className="anim-in opacity-0 gov-card p-5 sm:p-6">
            <SectionHeader title="SES STATUS DISTRIBUTION" accentColor="#16A34A" />
            <div className="relative w-full" style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sesDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={105}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="status"
                    stroke="none"
                  >
                    {sesDonutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={SES_COLORS[entry.status]} />
                    ))}
                  </Pie>
                  <Tooltip content={<SesDonutTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Center label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="counter-value text-2xl font-bold text-slate-900">{stats.totalFamilies.toLocaleString()}</p>
                <p className="text-xs text-slate-400">Total Families</p>
              </div>
            </div>
            {/* Donut Legend */}
            <div className="flex items-center justify-center gap-4 mt-2">
              {sesDonutData.map((entry) => (
                <div key={entry.status} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: SES_COLORS[entry.status] }} />
                  <span className="text-xs text-slate-500">{entry.status.charAt(0) + entry.status.slice(1).toLowerCase()}</span>
                  <span className="text-xs text-slate-400 font-medium counter-value">{entry.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* B) Mandal Comparison Bar Chart */}
          <div className="anim-in opacity-0 gov-card p-5 sm:p-6">
            <SectionHeader title="MANDAL COMPARISON" accentColor="#0D9488" />
            <div className="w-full" style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={mandalBarData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} width={80} />
                  <Tooltip content={<MandalBarTooltip />} />
                  <Legend content={<MandalBarLegend />} />
                  <Bar dataKey="Family Count" fill="#1E3A5F" radius={[0, 4, 4, 0]} barSize={18} />
                  <Bar dataKey="First Scheme Eligible" fill="#D97706" radius={[0, 4, 4, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Activity Section - Enhanced with alternating bg, thicker timeline, monospace time badge */}
        <div className="anim-in opacity-0 gov-card p-5 sm:p-6">
          <SectionHeader title="RECENT ACTIVITY" accentColor="#0D9488" />
          <div className="relative">
            {/* Timeline vertical line - thicker w-0.5 */}
            <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-slate-200" />
            <div className="space-y-0">
              {RECENT_ACTIVITIES.map((activity, index) => {
                const IconComp = activity.icon;
                return (
                  <div
                    key={activity.id}
                    className={`relative flex items-start gap-4 pl-2 py-3 px-3 -ml-2 rounded-lg transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}`}
                  >
                    {/* Timeline dot with icon */}
                    <div className={`relative z-10 flex items-center justify-center w-[30px] h-[30px] rounded-full border ${activity.border} ${activity.bg} shrink-0`}>
                      <IconComp className={`w-3.5 h-3.5 ${activity.color}`} />
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-1 flex items-start justify-between gap-3">
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">{activity.description}</p>
                      {/* Monospace time badge */}
                      <span className="shrink-0 text-[10px] text-slate-500 font-medium px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md whitespace-nowrap" style={{ fontFamily: 'var(--font-jetbrains)' }}>{activity.time}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Plot Allotment - Enhanced with icon backgrounds, taller cards, more padding, gradient overlays */}
        <div className="anim-in opacity-0 gov-card p-5 sm:p-6">
          <SectionHeader title="PLOT ALLOTMENT STATUS" accentColor="#1E3A5F" />
          <div className="grid grid-cols-3 gap-4 sm:gap-5">
            {/* Pending - slate/neutral color */}
            <div className="relative overflow-hidden text-center p-5 sm:p-6 bg-gradient-to-br from-slate-50 to-slate-100/70 rounded-xl border border-slate-200">
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

      {/* Government Footer - has top border separator from GovFooter component */}
      <GovFooter />

      {/* Family Data Table Dialog */}
      <DataTableView open={showDataTable} onOpenChange={setShowDataTable} />
    </div>
  );
}
