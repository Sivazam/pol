'use client';

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { SES_STATUS_CONFIG } from '@/lib/constants';
import CountUp from 'react-countup';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import {
  ChevronRight, ChevronLeft, Activity, MapPin, Users, Home, CheckCircle2, Download, Map as MapIcon,
} from 'lucide-react';
import GlobalSearch from '@/components/shared/GlobalSearch';
import Breadcrumb from '@/components/shared/Breadcrumb';
import GovFooter from '@/components/shared/GovFooter';
import SidebarNav from '@/components/shared/SidebarNav';
import MobileMenuButton from '@/components/shared/MobileMenuButton';
import ThemeToggle from '@/components/shared/ThemeToggle';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

/* ------------------------------------------------------------------ */
/*  SES hex color map for inline styles (light theme)                  */
/* ------------------------------------------------------------------ */
const SES_HEX_COLORS: Record<string, string> = {
  SURVEYED: '#94A3B8',
  VERIFIED: '#D97706',
  APPROVED: '#16A34A',
  REJECTED: '#DC2626',
};

/* ------------------------------------------------------------------ */
/*  GeoJSON Mandal boundaries (embedded)                               */
/* ------------------------------------------------------------------ */
const MANDAL_GEOJSON: Record<string, { coords: number[][] }> = {
  VRP: { coords: [[81.400,17.260],[81.420,17.275],[81.445,17.285],[81.470,17.290],[81.495,17.285],[81.515,17.275],[81.530,17.260],[81.535,17.245],[81.530,17.228],[81.520,17.215],[81.505,17.205],[81.485,17.198],[81.460,17.195],[81.438,17.200],[81.418,17.210],[81.405,17.225],[81.398,17.240],[81.395,17.255],[81.400,17.260]] },
  CHN: { coords: [[81.330,17.215],[81.350,17.230],[81.375,17.240],[81.400,17.245],[81.425,17.240],[81.445,17.228],[81.460,17.215],[81.468,17.198],[81.465,17.182],[81.455,17.168],[81.440,17.158],[81.420,17.150],[81.398,17.148],[81.378,17.152],[81.358,17.162],[81.342,17.175],[81.332,17.190],[81.328,17.205],[81.330,17.215]] },
  KUN: { coords: [[81.260,17.140],[81.280,17.155],[81.305,17.165],[81.330,17.170],[81.355,17.165],[81.375,17.155],[81.390,17.140],[81.398,17.125],[81.395,17.108],[81.385,17.095],[81.370,17.085],[81.350,17.078],[81.328,17.075],[81.305,17.080],[81.285,17.090],[81.270,17.105],[81.258,17.118],[81.255,17.130],[81.260,17.140]] },
};

const GODAVARI_PATH = [
  [81.540,17.300],[81.520,17.280],[81.500,17.260],[81.480,17.245],
  [81.460,17.230],[81.440,17.215],[81.420,17.200],[81.400,17.188],
  [81.380,17.172],[81.365,17.155],[81.348,17.140],[81.330,17.125],
  [81.315,17.110],[81.300,17.095],[81.285,17.080],[81.275,17.065],
  [81.268,17.050],[81.262,17.035],
];

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface VillageData {
  id: string; name: string; nameTelugu: string; code: string;
  latitude: number; longitude: number; mandalId: string;
  totalFamilies: number; firstSchemeCount: number;
  statusBreakdown: Record<string, number>;
  mandal: { name: string; color: string };
}

interface MandalInfo {
  id: string; name: string; nameTelugu: string; code: string;
  latitude: number; longitude: number; color: string;
  familyCount: number; firstSchemeCount: number;
  statusBreakdown: Record<string, number>;
}

interface TooltipInfo { village: VillageData; x: number; y: number; }

/* ------------------------------------------------------------------ */
/*  SVG coordinate helpers                                             */
/* ------------------------------------------------------------------ */

function computeBounds(villages: VillageData[], geoCoords: number[][]) {
  const lats = [...villages.map(v => v.latitude), ...geoCoords.map(c => c[1])];
  const lngs = [...villages.map(v => v.longitude), ...geoCoords.map(c => c[0])];
  return {
    minLat: Math.min(...lats) - 0.015,
    maxLat: Math.max(...lats) + 0.015,
    minLng: Math.min(...lngs) - 0.015,
    maxLng: Math.max(...lngs) + 0.015,
  };
}

function projectCoord(lng: number, lat: number, bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }, w: number, h: number, pad: number) {
  const xRange = bounds.maxLng - bounds.minLng || 0.01;
  const yRange = bounds.maxLat - bounds.minLat || 0.01;
  const x = pad + ((lng - bounds.minLng) / xRange) * (w - 2 * pad);
  const y = pad + ((bounds.maxLat - lat) / yRange) * (h - 2 * pad);
  return { x, y };
}

function polygonToSvgPath(coords: number[][], bounds: ReturnType<typeof computeBounds>, w: number, h: number, pad: number) {
  return coords.map((c, i) => {
    const p = projectCoord(c[0], c[1], bounds, w, h, pad);
    return `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(' ') + ' Z';
}

function lineToSvgPath(coords: number[][], bounds: ReturnType<typeof computeBounds>, w: number, h: number, pad: number) {
  return coords.map((c, i) => {
    const p = projectCoord(c[0], c[1], bounds, w, h, pad);
    return `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(' ');
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function MandalView() {
  const selectedMandalId = useAppStore((s) => s.selectedMandalId);
  const navigateToVillage = useAppStore((s) => s.navigateToVillage);
  const goBack = useAppStore((s) => s.goBack);
  const setView = useAppStore((s) => s.setView);

  const [villages, setVillages] = useState<VillageData[]>([]);
  const [mandalInfo, setMandalInfo] = useState<MandalInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);
  const [hoveredVillage, setHoveredVillage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  /* redirect if no mandal selected */
  useEffect(() => {
    if (!selectedMandalId) setView('dashboard');
  }, [selectedMandalId, setView]);

  /* fetch mandal info */
  useEffect(() => {
    if (!selectedMandalId) return;
    fetch('/api/mandals')
      .then((r) => r.json())
      .then((data: MandalInfo[]) => {
        const m = data.find((d) => d.id === selectedMandalId);
        if (m) setMandalInfo(m);
      })
      .catch(() => {});
  }, [selectedMandalId]);

  /* fetch villages */
  useEffect(() => {
    if (!selectedMandalId) return;
    let cancelled = false;
    fetch(`/api/villages?mandalId=${selectedMandalId}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setVillages(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedMandalId]);

  /* GSAP entrance */
  useEffect(() => {
    if (!loading && containerRef.current) {
      const els = containerRef.current.querySelectorAll('.anim-in');
      gsap.fromTo(els, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'power3.out' });
    }
  }, [loading]);

  /* derived data */
  const accentColor = mandalInfo?.color ?? '#D97706';
  const mandalCode = mandalInfo?.code ?? 'VRP';
  const totalFamilies = villages.reduce((s, v) => s + v.totalFamilies, 0);
  const totalFirstScheme = villages.reduce((s, v) => s + v.firstSchemeCount, 0);

  const aggregatedSes: Record<string, number> = {};
  villages.forEach((v) => {
    Object.entries(v.statusBreakdown).forEach(([k, val]) => {
      aggregatedSes[k] = (aggregatedSes[k] || 0) + val;
    });
  });
  const sesEntries = Object.entries(SES_STATUS_CONFIG).map(([key, cfg]) => ({
    key, label: cfg.label, color: cfg.color, bg: cfg.bg,
    hex: SES_HEX_COLORS[key] ?? '#94A3B8', count: aggregatedSes[key] || 0,
  }));
  const maxSes = Math.max(...sesEntries.map((d) => d.count), 1);

  /* SVG map geometry */
  const svgW = 700;
  const svgH = 440;
  const pad = 50;

  const geoCoords = MANDAL_GEOJSON[mandalCode]?.coords || [];
  const bounds = useMemo(() =>
    villages.length ? computeBounds(villages, geoCoords) :
    { minLat: 17.05, maxLat: 17.3, minLng: 81.25, maxLng: 81.55 },
    [villages, mandalCode]
  );

  const villagePins = useMemo(() =>
    villages.map((v) => ({
      ...v,
      ...projectCoord(v.longitude, v.latitude, bounds, svgW, svgH, pad),
    })),
    [villages, bounds]
  );

  const mandalPath = useMemo(() =>
    geoCoords.length ? polygonToSvgPath(geoCoords, bounds, svgW, svgH, pad) : '',
    [geoCoords, bounds]
  );

  const riverSvg = useMemo(() =>
    lineToSvgPath(GODAVARI_PATH, bounds, svgW, svgH, pad),
    [bounds]
  );

  const handlePinHover = useCallback((v: VillageData, svgX: number, svgY: number) => {
    setTooltip({ village: v, x: svgX, y: svgY });
  }, []);

  /* LOADING STATE */
  if (loading || !selectedMandalId) {
    return (
      <div className="w-full min-h-screen bg-[#F0F4F8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-slate-200 border-t-[#1E3A5F] rounded-full animate-spin" />
          <p className="text-slate-400 text-sm tracking-widest uppercase" style={{ fontFamily: 'var(--font-jetbrains)' }}>Loading Mandal</p>
        </div>
      </div>
    );
  }

  /* RENDER */
  return (
    <div ref={containerRef} className="w-full min-h-screen bg-[#F0F4F8] flex flex-col">
      {/* Sidebar Navigation */}
      <SidebarNav />

      {/* Tricolor Bar */}
      <div className="tricolor-bar w-full lg:pl-[52px]" />

      {/* Top Nav - Navy gradient */}
      <div className="sticky top-[3px] z-50 bg-gradient-to-r from-[#0F2B46] to-[#1E3A5F] shadow-md lg:pl-[52px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <MobileMenuButton />
            <button onClick={goBack} className="text-white/70 hover:text-white transition-colors text-sm flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" /><span className="hidden sm:inline">Back</span>
            </button>
            <div className="w-px h-6 bg-white/20" />
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
              <span className="text-sm font-medium text-white tracking-wide" style={{ fontFamily: 'var(--font-jetbrains)' }}>POLAVARAM R&R PORTAL</span>
            </div>
          </div>
          <GlobalSearch />
          <div className="flex items-center gap-4 text-xs text-white/50">
            <span className="font-semibold text-sm" style={{ color: accentColor }}>{mandalInfo?.name?.toUpperCase()}</span>
            <span className="hidden md:inline">Government of Andhra Pradesh</span>
            <div className="flex items-center gap-1.5 text-emerald-400"><Activity className="w-3 h-3" /><span>LIVE</span></div>
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="flex-1">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><Breadcrumb /></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Mandal Header */}
        <div className="anim-in opacity-0 gov-card p-5 sm:p-6 text-center border-l-4 relative overflow-hidden" style={{ borderLeftColor: accentColor }}>
          {/* Subtle gradient overlay at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-50/50 to-transparent pointer-events-none" />
          <div className="relative z-[1]">
            <div className="flex items-center justify-center gap-2">
              <MapIcon className="w-6 h-6" style={{ color: accentColor }} />
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: accentColor }}>
                {mandalInfo?.name ?? 'Mandal'}
              </h1>
            </div>
            <p className="text-slate-500 text-lg">{mandalInfo?.nameTelugu ?? ''}</p>
            <p className="text-slate-400 text-xs mt-0.5" style={{ fontFamily: 'var(--font-jetbrains)' }}>Code: {mandalCode}</p>
            <div className="ashoka-divider max-w-xs mx-auto mt-3" />
            <div className="flex items-center justify-center gap-6 sm:gap-10 pt-4">
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" style={{ color: accentColor }} />
                  <span className="counter-value text-2xl font-bold text-slate-900"><CountUp end={totalFamilies} duration={2} separator="," /></span>
                </div>
                <span className="text-xs text-slate-400 mt-0.5">Total Families</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" style={{ color: accentColor }} />
                  <span className="counter-value text-2xl font-bold text-slate-900"><CountUp end={villages.length} duration={1.5} /></span>
                </div>
                <span className="text-xs text-slate-400 mt-0.5">Villages</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" style={{ color: accentColor }} />
                  <span className="counter-value text-2xl font-bold text-slate-900"><CountUp end={totalFirstScheme} duration={2} separator="," /></span>
                </div>
                <span className="text-xs text-slate-400 mt-0.5">First Scheme Eligible</span>
              </div>
            </div>
          </div>
        </div>

        {/* SVG Village Map with GeoJSON Boundary */}
        <div className="anim-in opacity-0">
          <div className="gov-card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-900 tracking-wide" style={{ fontFamily: 'var(--font-jetbrains)' }}>VILLAGE MAP</h2>
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">{mandalInfo?.name?.toUpperCase()} MANDAL</span>
            </div>
            <div className="relative w-full h-[320px] sm:h-[450px] bg-[#F8FAFC] rounded-lg overflow-hidden border border-slate-200">
              <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-full" onMouseLeave={() => { setTooltip(null); setHoveredVillage(null); }}>
                <defs>
                  <pattern id="mandal-grid-light" width="25" height="25" patternUnits="userSpaceOnUse">
                    <path d="M 25 0 L 0 0 0 25" fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth="0.5"/>
                  </pattern>
                  <filter id="pin-glow-light">
                    <feGaussianBlur stdDeviation="3" result="b"/>
                    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                  </filter>
                </defs>

                {/* Background */}
                <rect width={svgW} height={svgH} fill="#F8FAFC"/>
                <rect width={svgW} height={svgH} fill="url(#mandal-grid-light)"/>

                {/* Compass indicator - N ↑ top right */}
                <g transform={`translate(${svgW - 35}, 30)`}>
                  <circle cx="0" cy="0" r="14" fill="white" stroke="#CBD5E1" strokeWidth="1" opacity="0.9"/>
                  <text x="0" y="-2" textAnchor="middle" fill="#64748B" fontSize="8" fontWeight="700">N</text>
                  <line x1="0" y1="2" x2="0" y2="8" stroke="#94A3B8" strokeWidth="1.5"/>
                  <polygon points="-3,8 3,8 0,12" fill="#94A3B8"/>
                </g>

                {/* Godavari river */}
                <path d={riverSvg} fill="none" stroke="#3B82F6" strokeWidth="3" opacity="0.4" strokeDasharray="800">
                  <animate attributeName="stroke-dashoffset" from="800" to="0" dur="3s" fill="freeze"/>
                </path>
                <path d={riverSvg} fill="none" stroke="#60A5FA" strokeWidth="1" opacity="0.2"/>

                {/* Mandal boundary polygon */}
                {mandalPath && (
                  <path
                    d={mandalPath}
                    fill={accentColor}
                    fillOpacity="0.08"
                    stroke={accentColor}
                    strokeWidth="2"
                    strokeOpacity="0.4"
                    strokeDasharray="8,4"
                  />
                )}

                {/* Village pins */}
                {villagePins.map((v, i) => {
                  const isHovered = hoveredVillage === v.id;
                  return (
                    <g
                      key={v.id}
                      className="cursor-pointer"
                      onClick={() => navigateToVillage(v.id)}
                      onMouseEnter={() => { handlePinHover(v, v.x, v.y); setHoveredVillage(v.id); }}
                      onMouseLeave={() => { setTooltip(null); setHoveredVillage(null); }}
                    >
                      {/* Pulse ring */}
                      <circle cx={v.x} cy={v.y} r="16" fill={accentColor} opacity="0.08">
                        <animate attributeName="r" values="10;18;10" dur={`${2 + i * 0.3}s`} repeatCount="indefinite"/>
                        <animate attributeName="opacity" values="0.12;0.03;0.12" dur={`${2 + i * 0.3}s`} repeatCount="indefinite"/>
                      </circle>
                      {/* Outer ring */}
                      <circle cx={v.x} cy={v.y} r={isHovered ? 9 : 7} fill={accentColor} opacity={isHovered ? 0.2 : 0.12} style={{ transition: 'all 0.2s' }}/>
                      {/* Center dot */}
                      <circle cx={v.x} cy={v.y} r={isHovered ? 5 : 3.5} fill={accentColor} filter="url(#pin-glow-light)" style={{ transition: 'all 0.2s' }}/>
                      {/* Label */}
                      <text x={v.x} y={v.y - 14} fill={accentColor} fontSize={isHovered ? '10' : '8'} fontWeight={isHovered ? '700' : '500'} textAnchor="middle" opacity={isHovered ? 1 : 0.75} style={{ transition: 'all 0.2s' }}>
                        {v.name}
                      </text>
                    </g>
                  );
                })}

                {/* Dam marker */}
                {(() => {
                  const damP = projectCoord(81.7119, 17.2473, bounds, svgW, svgH, pad);
                  return (
                    <g>
                      <circle cx={damP.x} cy={damP.y} r="14" fill="#D97706" opacity="0.1">
                        <animate attributeName="r" values="10;18;10" dur="2.5s" repeatCount="indefinite"/>
                      </circle>
                      <polygon
                        points={`${damP.x},${damP.y - 5} ${damP.x + 4},${damP.y} ${damP.x},${damP.y + 5} ${damP.x - 4},${damP.y}`}
                        fill="#D97706"
                      />
                      <text x={damP.x + 10} y={damP.y + 3} fill="#92400E" fontSize="7" fontWeight="700">DAM</text>
                    </g>
                  );
                })()}

                {/* Legend */}
                <rect x="10" y={svgH - 45} width="150" height="35" rx="5" fill="white" stroke="#E2E8F0" strokeWidth="1" opacity="0.95"/>
                <circle cx="24" cy={svgH - 28} r="3" fill={accentColor}/><text x="30" y={svgH - 25} fill="#64748B" fontSize="7">Village</text>
                <line x1="75" y1={svgH - 32} x2="95" y2={svgH - 26} stroke="#3B82F6" strokeWidth="1.5" opacity="0.5"/>
                <text x="99" y={svgH - 25} fill="#64748B" fontSize="7">River</text>
                <polygon points="24,35 28,39 24,43 20,39" fill="#D97706" transform={`translate(0, ${svgH - 62})`}/>
                <text x="32" y={svgH - 20} fill="#64748B" fontSize="7">Dam</text>

                {/* Scale bar - bottom right */}
                <g transform={`translate(${svgW - 90}, ${svgH - 25})`}>
                  <rect x="0" y="0" width="70" height="2" fill="#94A3B8" rx="1"/>
                  <rect x="0" y="0" width="2" height="6" fill="#94A3B8" rx="0.5"/>
                  <rect x="34" y="0" width="2" height="4" fill="#94A3B8" rx="0.5"/>
                  <rect x="68" y="0" width="2" height="6" fill="#94A3B8" rx="0.5"/>
                  <text x="0" y="12" fill="#94A3B8" fontSize="6" textAnchor="middle">0</text>
                  <text x="34" y="11" fill="#94A3B8" fontSize="6" textAnchor="middle">5</text>
                  <text x="68" y="12" fill="#94A3B8" fontSize="6" textAnchor="middle">10 km</text>
                </g>
              </svg>

              {/* Tooltip overlay */}
              <AnimatePresence>
                {tooltip && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.15 }}
                    className="absolute z-10 pointer-events-none"
                    style={{
                      left: `min(${(tooltip.x / svgW) * 100}%, calc(100% - 200px))`,
                      top: `max(${(tooltip.y / svgH) * 100 - 18}%, 0%)`,
                      transform: 'translate(-50%, -100%)',
                    }}
                  >
                    <div className="rounded-lg px-4 py-3 shadow-xl min-w-[180px] bg-white border border-slate-200" style={{ borderLeft: `3px solid ${accentColor}` }}>
                      <p className="text-sm font-semibold text-slate-900">{tooltip.village.name}</p>
                      <p className="text-xs text-slate-400">{tooltip.village.nameTelugu}</p>
                      <div className="mt-2 flex items-center gap-3 text-xs">
                        <span className="text-slate-600">
                          <Home className="w-3 h-3 inline mr-1" style={{ color: accentColor }} />
                          {tooltip.village.totalFamilies} families
                        </span>
                        <span className="text-emerald-700 font-medium">
                          <CheckCircle2 className="w-3 h-3 inline mr-1"/>
                          {tooltip.village.firstSchemeCount}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <p className="mt-2 text-xs text-slate-400 text-center">Click on any village to explore details</p>
          </div>
        </div>

        {/* Bottom: Village List + Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Village List Panel */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="anim-in opacity-0 text-sm font-semibold text-slate-900 tracking-wide mb-2" style={{ fontFamily: 'var(--font-jetbrains)' }}>VILLAGES</h3>
            <div className="max-h-[500px] overflow-y-auto space-y-3 pr-1 custom-scrollbar">
              {villages.map((v, i) => {
                const sesItems = Object.entries(v.statusBreakdown);
                const total = sesItems.reduce((s, [, c]) => s + c, 0) || 1;
                return (
                  <motion.div
                    key={v.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.07 }}
                    className="gov-card p-4 cursor-pointer group border-l-4 hover:scale-[1.01] hover:shadow-md transition-all duration-200"
                    style={{ borderLeftColor: `${accentColor}60` }}
                    onClick={() => navigateToVillage(v.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: accentColor }}/>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{v.name}</p>
                          <p className="text-xs text-slate-400">{v.nameTelugu}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border" style={{ backgroundColor: `${accentColor}10`, color: accentColor, borderColor: `${accentColor}30` }}>
                          <Users className="w-3 h-3"/>{v.totalFamilies}
                        </span>
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium" style={{ color: accentColor }}>View →</span>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors"/>
                      </div>
                    </div>

                    {/* SES mini bars */}
                    <div className="mt-3 flex items-center gap-1">
                      {sesItems.map(([status, count]) => {
                        const hex = SES_HEX_COLORS[status];
                        if (!hex) return null;
                        const pct = (count / total) * 100;
                        return (
                          <div key={status} className="h-2 rounded-full first:rounded-l-full last:rounded-r-full" style={{ width: `${pct}%`, backgroundColor: hex, opacity: 0.7, minWidth: 4 }} title={`${SES_STATUS_CONFIG[status]?.label}: ${count}`}/>
                        );
                      })}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-400 flex-wrap">
                      {sesItems.map(([status, count]) => {
                        const hex = SES_HEX_COLORS[status];
                        if (!hex) return null;
                        return (
                          <span key={status} className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: hex }}/>
                            {SES_STATUS_CONFIG[status]?.label} {count}
                          </span>
                        );
                      })}
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <span className="text-emerald-700 font-medium">{v.firstSchemeCount} first-scheme eligible</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Stats Section */}
          <div className="space-y-4">
            {/* SES Composition Chart */}
            <div className="anim-in opacity-0 gov-card p-4 sm:p-5 rounded-xl">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-900 tracking-wide">VILLAGE SES COMPOSITION</h3>
                <div className="h-[2px] w-16 mt-1 rounded-full" style={{ backgroundColor: accentColor }} />
              </div>
              <div className="w-full" style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={villages.map(v => ({ name: v.name, ...v.statusBreakdown }))} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748B' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} interval={0} angle={-30} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload) return null;
                        return (
                          <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-lg">
                            <p className="text-xs font-semibold text-slate-900 mb-1">{label}</p>
                            {payload.map((entry, i) => (
                              <p key={i} className="text-[10px] text-slate-600">
                                <span className="inline-block w-2 h-2 rounded-sm mr-1.5" style={{ backgroundColor: entry.color }} />
                                {String(entry.name)}: <span className="font-medium text-slate-800">{String(entry.value)}</span>
                              </p>
                            ))}
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="SURVEYED" stackId="a" fill="#94A3B8" radius={[0, 0, 0, 0]} barSize={30} name="Surveyed" />
                    <Bar dataKey="VERIFIED" stackId="a" fill="#D97706" radius={[0, 0, 0, 0]} barSize={30} name="Verified" />
                    <Bar dataKey="APPROVED" stackId="a" fill="#16A34A" radius={[0, 0, 0, 0]} barSize={30} name="Approved" />
                    <Bar dataKey="REJECTED" stackId="a" fill="#DC2626" radius={[0, 4, 4, 0]} barSize={30} name="Rejected" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-3 mt-1">
                {[{ label: 'Surveyed', color: '#94A3B8' }, { label: 'Verified', color: '#D97706' }, { label: 'Approved', color: '#16A34A' }, { label: 'Rejected', color: '#DC2626' }].map(item => (
                  <div key={item.label} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: item.color }} />
                    <span className="text-[10px] text-slate-500">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* SES Breakdown */}
            <div className="anim-in opacity-0 gov-card p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-slate-900 tracking-wide mb-4">SES STATUS BREAKDOWN</h3>
              <div className="space-y-3">
                {sesEntries.map((item, i) => (
                  <div key={item.key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-semibold ${item.color}`}>{item.label}</span>
                      <span className="text-xs text-slate-500 counter-value"><CountUp end={item.count} duration={1.5} separator="," /></span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${(item.count / maxSes) * 100}%` }} transition={{ duration: 1, delay: 0.3 + i * 0.1 }} className="h-full rounded-full" style={{ backgroundColor: item.hex, opacity: 0.7 }}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary Card */}
            <div className="anim-in opacity-0 gov-card p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-slate-900 tracking-wide mb-3">MANDAL SUMMARY</h3>
              <div className="space-y-3">
                {[
                  { label: 'Total Families', value: <CountUp end={totalFamilies} duration={1.5} separator="," />, bold: true },
                  { label: 'Total Villages', value: <CountUp end={villages.length} duration={1} />, bold: true },
                  { label: 'First Scheme Eligible', value: <CountUp end={totalFirstScheme} duration={1.5} separator="," />, bold: true, color: 'text-emerald-700' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-[#F8FAFC] rounded-lg">
                    <span className="text-xs text-slate-400">{item.label}</span>
                    <span className={`text-sm font-bold counter-value ${item.color || 'text-slate-900'}`}>{item.value}</span>
                  </div>
                ))}

                {/* Eligibility Rate with progress ring */}
                <div className="flex items-center justify-between p-2 bg-[#F8FAFC] rounded-lg">
                  <span className="text-xs text-slate-400">Eligibility Rate</span>
                  <div className="flex items-center gap-2">
                    {/* Progress ring */}
                    <svg width="28" height="28" viewBox="0 0 28 28">
                      <circle cx="14" cy="14" r="11" fill="none" stroke="#E2E8F0" strokeWidth="3" />
                      <circle
                        cx="14" cy="14" r="11" fill="none"
                        stroke={accentColor}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 11}`}
                        strokeDashoffset={`${2 * Math.PI * 11 * (1 - (totalFamilies ? totalFirstScheme / totalFamilies : 0))}`}
                        transform="rotate(-90 14 14)"
                        style={{ transition: 'stroke-dashoffset 1.2s ease' }}
                      />
                    </svg>
                    <span className="text-sm font-bold counter-value" style={{ color: accentColor }}>{totalFamilies ? ((totalFirstScheme / totalFamilies) * 100).toFixed(1) : 0}%</span>
                    <span className="text-[10px] text-slate-400">of target</span>
                  </div>
                </div>

                {/* Visual progress bar */}
                <div className="mt-2">
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: totalFamilies ? `${(totalFirstScheme / totalFamilies) * 100}%` : '0%' }} transition={{ duration: 1.2, delay: 0.5 }} className="h-full rounded-full" style={{ backgroundColor: accentColor, opacity: 0.7 }}/>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick action + Export */}
            <div className="anim-in opacity-0 gov-card p-4">
              <p className="text-xs text-slate-400 mb-3">Select a village from the map or list to view family details and relocation data.</p>
              <div className="flex items-center gap-2 text-xs mb-3" style={{ color: accentColor }}>
                <MapPin className="w-3.5 h-3.5"/><span>{villages.length} villages available</span>
              </div>
              <button
                onClick={() => {
                  const csv = ['Village,Total Families,First Scheme Eligible,Surveyed,Verified,Approved,Rejected'];
                  villages.forEach(v => {
                    csv.push(`${v.name},${v.totalFamilies},${v.firstSchemeCount},${v.statusBreakdown.SURVEYED || 0},${v.statusBreakdown.VERIFIED || 0},${v.statusBreakdown.APPROVED || 0},${v.statusBreakdown.REJECTED || 0}`);
                  });
                  const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = `${mandalInfo?.name || 'mandal'}-villages.csv`; a.click();
                  URL.revokeObjectURL(url);
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
              >
                <Download className="w-3.5 h-3.5" /> Export Village Data (CSV)
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>
      <GovFooter />
    </div>
  );
}
