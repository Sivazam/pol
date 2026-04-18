'use client';

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { SES_STATUS_CONFIG, MANDAL_COLORS } from '@/lib/constants';
import CountUp from 'react-countup';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import {
  ChevronRight, MapPin, Users, Home, CheckCircle2, Download, Map as MapIcon, Building2, Landmark,
} from 'lucide-react';
import ViewLayout from '@/components/shared/ViewLayout';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
const MANDAL_GEOJSON: Record<string, { name: string; coords: number[][] }> = {
  VRP: { name: 'VR Puram', coords: [[81.410,17.270],[81.430,17.280],[81.455,17.288],[81.478,17.290],[81.500,17.285],[81.518,17.275],[81.530,17.260],[81.538,17.245],[81.535,17.228],[81.525,17.215],[81.510,17.205],[81.490,17.198],[81.468,17.195],[81.448,17.200],[81.432,17.210],[81.420,17.222],[81.412,17.238],[81.408,17.255],[81.406,17.265],[81.410,17.270]] },
  CHN: { name: 'Chintoor', coords: [[81.345,17.220],[81.368,17.230],[81.390,17.238],[81.410,17.240],[81.428,17.235],[81.442,17.225],[81.452,17.210],[81.458,17.195],[81.455,17.178],[81.445,17.165],[81.430,17.155],[81.412,17.148],[81.392,17.145],[81.372,17.150],[81.358,17.160],[81.348,17.175],[81.342,17.190],[81.340,17.205],[81.342,17.215],[81.345,17.220]] },
  KUN: { name: 'Kunavaram', coords: [[81.268,17.168],[81.290,17.178],[81.315,17.185],[81.338,17.188],[81.358,17.182],[81.375,17.172],[81.388,17.158],[81.395,17.142],[81.392,17.125],[81.382,17.112],[81.368,17.102],[81.350,17.095],[81.330,17.092],[81.310,17.095],[81.292,17.105],[81.278,17.118],[81.270,17.132],[81.265,17.148],[81.264,17.160],[81.268,17.168]] },
};

const GODAVARI_PATH = [
  [81.250,17.280],[81.270,17.268],[81.290,17.255],[81.310,17.242],
  [81.330,17.230],[81.348,17.220],[81.365,17.210],[81.380,17.200],
  [81.395,17.190],[81.410,17.180],[81.425,17.170],[81.440,17.160],
  [81.455,17.148],[81.468,17.138],[81.478,17.128],[81.490,17.118],
  [81.505,17.108],[81.520,17.098],[81.538,17.088],[81.555,17.078],
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
  familyCount: number; villageCount: number; firstSchemeCount: number;
  statusBreakdown: Record<string, number>;
}

interface TooltipInfo { village: VillageData; x: number; y: number; }

/* ------------------------------------------------------------------ */
/*  SVG coordinate helpers — Single mandal view                        */
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
/*  SVG coordinate helpers — All mandals overview map                   */
/* ------------------------------------------------------------------ */

const OVERVIEW_BOUNDS = { minLng: 81.22, maxLng: 81.58, minLat: 17.06, maxLat: 17.32 };
const OVERVIEW_W = 700;
const OVERVIEW_H = 420;
const OVERVIEW_PAD = 40;

function projectOverview(lng: number, lat: number) {
  const xRange = OVERVIEW_BOUNDS.maxLng - OVERVIEW_BOUNDS.minLng;
  const yRange = OVERVIEW_BOUNDS.maxLat - OVERVIEW_BOUNDS.minLat;
  const x = OVERVIEW_PAD + ((lng - OVERVIEW_BOUNDS.minLng) / xRange) * (OVERVIEW_W - 2 * OVERVIEW_PAD);
  const y = OVERVIEW_PAD + ((OVERVIEW_BOUNDS.maxLat - lat) / yRange) * (OVERVIEW_H - 2 * OVERVIEW_PAD);
  return { x, y };
}

function polygonToOverviewPath(coords: number[][]) {
  return coords.map((c, i) => {
    const p = projectOverview(c[0], c[1]);
    return `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(' ') + ' Z';
}

function lineToOverviewPath(coords: number[][]) {
  return coords.map((c, i) => {
    const p = projectOverview(c[0], c[1]);
    return `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(' ');
}

function getCentroid(coords: number[][]) {
  const sum = coords.reduce((acc, c) => ({ lng: acc.lng + c[0], lat: acc.lat + c[1] }), { lng: 0, lat: 0 });
  return { lng: sum.lng / coords.length, lat: sum.lat / coords.length };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function MandalView() {
  const selectedMandalId = useAppStore((s) => s.selectedMandalId);
  const navigateToVillage = useAppStore((s) => s.navigateToVillage);
  const navigateToMandal = useAppStore((s) => s.navigateToMandal);
  const goBack = useAppStore((s) => s.goBack);

  const [villages, setVillages] = useState<VillageData[]>([]);
  const [mandalInfo, setMandalInfo] = useState<MandalInfo | null>(null);
  const [allMandals, setAllMandals] = useState<MandalInfo[]>([]);
  const [loadedMandalId, setLoadedMandalId] = useState<string | null>(null);
  const [mandalsLoaded, setMandalsLoaded] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);
  const [hoveredVillage, setHoveredVillage] = useState<string | null>(null);
  const [hoveredOverviewMandal, setHoveredOverviewMandal] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const fetchIdRef = useRef(0);

  // Derived loading state: loading when mandals not loaded (overview) or when selected mandal data not ready (detail)
  const loading = selectedMandalId ? loadedMandalId !== selectedMandalId : !mandalsLoaded;

  /* ---- Fetch all mandals (for overview mode) ---- */
  useEffect(() => {
    fetch('/api/mandals')
      .then((r) => r.json())
      .then((data: MandalInfo[]) => {
        setAllMandals(Array.isArray(data) ? data : []);
        setMandalsLoaded(true);
      })
      .catch(() => { setMandalsLoaded(true); });
  }, []);

  /* ---- Fetch mandal info for selected mandal ---- */
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

  /* ---- Fetch villages for selected mandal ---- */
  useEffect(() => {
    if (!selectedMandalId) return;
    const currentFetchId = ++fetchIdRef.current;
    fetch(`/api/villages?mandalId=${selectedMandalId}`)
      .then((r) => r.json())
      .then((data) => {
        if (currentFetchId !== fetchIdRef.current) return;
        setVillages(Array.isArray(data) ? data : []);
        setLoadedMandalId(selectedMandalId);
      })
      .catch(() => {
        if (currentFetchId === fetchIdRef.current) setLoadedMandalId(selectedMandalId);
      });
  }, [selectedMandalId]);

  /* ---- GSAP entrance ---- */
  useEffect(() => {
    if (!loading && containerRef.current) {
      const els = containerRef.current.querySelectorAll('.anim-in');
      gsap.fromTo(els, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'power3.out' });
    }
  }, [loading, selectedMandalId]);

  /* ---- Derived data for selected mandal ---- */
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

  /* ---- Derived data for all mandals overview ---- */
  const overviewTotalFamilies = allMandals.reduce((s, m) => s + m.familyCount, 0);
  const overviewTotalVillages = allMandals.reduce((s, m) => s + (m.villageCount || 0), 0);
  const overviewTotalFirstScheme = allMandals.reduce((s, m) => s + m.firstSchemeCount, 0);

  /* ---- SVG map geometry for selected mandal ---- */
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

  /* ---- Overview map memoized paths ---- */
  const overviewMandalPaths = useMemo(() => ({
    VRP: polygonToOverviewPath(MANDAL_GEOJSON.VRP.coords),
    CHN: polygonToOverviewPath(MANDAL_GEOJSON.CHN.coords),
    KUN: polygonToOverviewPath(MANDAL_GEOJSON.KUN.coords),
  }), []);

  const overviewRiverPath = useMemo(() => lineToOverviewPath(GODAVARI_PATH), []);
  const overviewDamPoint = useMemo(() => projectOverview(81.460, 17.230), []);

  const overviewCentroids = useMemo(() => ({
    VRP: { ...getCentroid(MANDAL_GEOJSON.VRP.coords), name: 'VR Puram' },
    CHN: { ...getCentroid(MANDAL_GEOJSON.CHN.coords), name: 'Chintoor' },
    KUN: { ...getCentroid(MANDAL_GEOJSON.KUN.coords), name: 'Kunavaram' },
  }), []);

  const mandalColorMap: Record<string, string> = { VRP: '#D97706', CHN: '#0D9488', KUN: '#EA580C' };

  const handlePinHover = useCallback((v: VillageData, svgX: number, svgY: number) => {
    setTooltip({ village: v, x: svgX, y: svgY });
  }, []);

  /* ---- LOADING STATE ---- */
  if (loading) {
    return (
      <ViewLayout navTitle="MANDALS" accentDotColor="#D97706">
        <div className="flex items-center justify-center py-32">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-2 border-slate-200 border-t-[#1E3A5F] rounded-full animate-spin" />
            <p className="text-slate-400 text-sm tracking-widest uppercase" style={{ fontFamily: 'var(--font-jetbrains)' }}>Loading Mandal</p>
          </div>
        </div>
      </ViewLayout>
    );
  }

  /* ================================================================ */
  /*  MODE 1: No mandal selected — All Mandals Overview               */
  /* ================================================================ */
  if (!selectedMandalId) {
    return (
      <ViewLayout
        navTitle="ALL MANDALS"
        navTitleColor="#D97706"
        accentDotColor="#D97706"
      >
        <div ref={containerRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Header Section */}
          <div className="anim-in opacity-0 gov-card p-5 sm:p-6 text-center relative overflow-hidden">
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-50/50 to-transparent pointer-events-none" />
            <div className="relative z-[1]">
              <div className="flex items-center justify-center gap-2">
                <Landmark className="w-6 h-6 text-amber-600" />
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">All Mandals</h1>
              </div>
              <p className="text-slate-500 text-sm mt-1">Polavaram Project Rehabilitation Zone</p>
              <div className="ashoka-divider max-w-xs mx-auto mt-3" />
              <div className="flex items-center justify-center gap-6 sm:gap-10 pt-4">
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-amber-600" />
                    <span className="counter-value text-2xl font-bold text-slate-900"><CountUp end={overviewTotalFamilies} duration={2} separator="," /></span>
                  </div>
                  <span className="text-xs text-slate-400 mt-0.5">Total Families</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-teal-600" />
                    <span className="counter-value text-2xl font-bold text-slate-900"><CountUp end={overviewTotalVillages} duration={1.5} /></span>
                  </div>
                  <span className="text-xs text-slate-400 mt-0.5">Villages</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="counter-value text-2xl font-bold text-slate-900"><CountUp end={overviewTotalFirstScheme} duration={2} separator="," /></span>
                  </div>
                  <span className="text-xs text-slate-400 mt-0.5">First Scheme Eligible</span>
                </div>
              </div>
            </div>
          </div>

          {/* SVG Map of All Mandals */}
          <div className="anim-in opacity-0">
            <div className="gov-card p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-900 tracking-wide" style={{ fontFamily: 'var(--font-jetbrains)' }}>PROJECT AREA MAP</h2>
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">3 MANDALS</span>
              </div>
              <div className="relative w-full h-[280px] sm:h-[400px] bg-[#F8FAFC] rounded-lg overflow-hidden border border-slate-200">
                <svg viewBox={`0 0 ${OVERVIEW_W} ${OVERVIEW_H}`} className="w-full h-full">
                  <defs>
                    <pattern id="overview-grid" width="25" height="25" patternUnits="userSpaceOnUse">
                      <path d="M 25 0 L 0 0 0 25" fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth="0.5"/>
                    </pattern>
                    <filter id="overview-shadow" x="-5%" y="-5%" width="110%" height="110%">
                      <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.1"/>
                    </filter>
                  </defs>

                  {/* Background */}
                  <rect width={OVERVIEW_W} height={OVERVIEW_H} fill="#F8FAFC"/>
                  <rect width={OVERVIEW_W} height={OVERVIEW_H} fill="url(#overview-grid)"/>

                  {/* Godavari River */}
                  <path d={overviewRiverPath} fill="none" stroke="#3B82F6" strokeWidth="3" opacity="0.5" strokeDasharray="1200">
                    <animate attributeName="stroke-dashoffset" from="1200" to="0" dur="3s" fill="freeze"/>
                  </path>
                  <path d={overviewRiverPath} fill="none" stroke="#60A5FA" strokeWidth="1.5" opacity="0.3"/>

                  {/* River label */}
                  {(() => {
                    const mid = GODAVARI_PATH[Math.floor(GODAVARI_PATH.length / 2)];
                    const p = projectOverview(mid[0], mid[1]);
                    return <text x={p.x + 10} y={p.y - 8} fill="#3B82F6" fontSize="9" fontWeight="500" opacity="0.6" transform={`rotate(-35, ${p.x + 10}, ${p.y - 8})`}>GODAVARI RIVER</text>;
                  })()}

                  {/* Mandal polygons */}
                  {Object.entries(MANDAL_GEOJSON).map(([code, data]) => {
                    const color = mandalColorMap[code];
                    const isHovered = hoveredOverviewMandal === code;
                    const mStats = allMandals.find(m => m.code === code);
                    const centroid = overviewCentroids[code as keyof typeof overviewCentroids];
                    const cp = projectOverview(centroid.lng, centroid.lat);

                    return (
                      <g
                        key={code}
                        className="cursor-pointer"
                        onClick={() => {
                          if (mStats) navigateToMandal(mStats.id);
                        }}
                        onMouseEnter={() => setHoveredOverviewMandal(code)}
                        onMouseLeave={() => setHoveredOverviewMandal(null)}
                      >
                        {/* Polygon fill */}
                        <path
                          d={overviewMandalPaths[code as keyof typeof overviewMandalPaths]}
                          fill={color}
                          fillOpacity={isHovered ? 0.25 : 0.12}
                          stroke={color}
                          strokeWidth={isHovered ? 2.5 : 1.5}
                          strokeOpacity={isHovered ? 0.8 : 0.5}
                          style={{ transition: 'all 0.3s ease' }}
                          filter="url(#overview-shadow)"
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
                    <circle cx={overviewDamPoint.x} cy={overviewDamPoint.y} r="16" fill="#D97706" opacity="0.15">
                      <animate attributeName="r" values="12;20;12" dur="2.5s" repeatCount="indefinite"/>
                      <animate attributeName="opacity" values="0.15;0.05;0.15" dur="2.5s" repeatCount="indefinite"/>
                    </circle>
                    <polygon
                      points={`${overviewDamPoint.x},${overviewDamPoint.y - 5} ${overviewDamPoint.x + 4},${overviewDamPoint.y} ${overviewDamPoint.x},${overviewDamPoint.y + 5} ${overviewDamPoint.x - 4},${overviewDamPoint.y}`}
                      fill="#D97706"
                      stroke="#FFF"
                      strokeWidth="1"
                    />
                    <text x={overviewDamPoint.x + 12} y={overviewDamPoint.y + 3} fill="#92400E" fontSize="8" fontWeight="700">DAM</text>
                  </g>

                  {/* Legend */}
                  <rect x="12" y={OVERVIEW_H - 52} width="180" height="42" rx="6" fill="white" stroke="#E2E8F0" strokeWidth="1" opacity="0.95"/>
                  <rect x="24" y={OVERVIEW_H - 38} width="8" height="8" rx="1.5" fill="#D97706"/>
                  <text x="38" y={OVERVIEW_H - 31} fill="#475569" fontSize="8" fontWeight="500">VR Puram</text>
                  <rect x="100" y={OVERVIEW_H - 38} width="8" height="8" rx="1.5" fill="#0D9488"/>
                  <text x="114" y={OVERVIEW_H - 31} fill="#475569" fontSize="8" fontWeight="500">Chintoor</text>
                  <rect x="24" y={OVERVIEW_H - 22} width="8" height="8" rx="1.5" fill="#EA580C"/>
                  <text x="38" y={OVERVIEW_H - 15} fill="#475569" fontSize="8" fontWeight="500">Kunavaram</text>
                  <line x1="100" y1={OVERVIEW_H - 18} x2="120" y2={OVERVIEW_H - 18} stroke="#3B82F6" strokeWidth="1.5" opacity="0.6"/>
                  <text x="124" y={OVERVIEW_H - 15} fill="#475569" fontSize="8" fontWeight="500">River</text>
                </svg>
              </div>
              <p className="mt-2 text-xs text-slate-400 text-center">Click on any mandal zone to explore details</p>

              {/* Hover info panel */}
              {hoveredOverviewMandal && (() => {
                const mStats = allMandals.find(m => m.code === hoveredOverviewMandal);
                if (!mStats) return null;
                return (
                  <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-4">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: mandalColorMap[hoveredOverviewMandal] }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{mStats.name} Mandal</p>
                      <p className="text-xs text-slate-500">{mStats.villageCount || 0} villages · {mStats.familyCount} families · {mStats.firstSchemeCount} first-scheme eligible</p>
                    </div>
                    <button
                      onClick={() => navigateToMandal(mStats.id)}
                      className="shrink-0 text-xs text-[#1E3A5F] font-medium hover:underline flex items-center gap-1"
                    >
                      Explore <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Mandal Cards Grid */}
          <div className="anim-in opacity-0">
            <h2 className="text-sm font-semibold text-slate-900 tracking-wide mb-4" style={{ fontFamily: 'var(--font-jetbrains)' }}>MANDAL DETAILS</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {allMandals.map((mandal, i) => {
              const color = mandalColorMap[mandal.code] || mandal.color || '#D97706';
              const sesItems = Object.entries(mandal.statusBreakdown);
              const total = sesItems.reduce((s, [, c]) => s + c, 0) || 1;

              return (
                <motion.div
                  key={mandal.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.1 }}
                  className="gov-card p-5 cursor-pointer group border-l-4 hover:scale-[1.01] hover:shadow-md transition-all duration-200"
                  style={{ borderLeftColor: color }}
                  onClick={() => navigateToMandal(mandal.id)}
                >
                  {/* Card header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                      <div>
                        <p className="text-base font-semibold text-slate-900">{mandal.name}</p>
                        <p className="text-xs text-slate-400">{mandal.nameTelugu}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="text-center p-2 bg-[#F8FAFC] rounded-lg">
                      <p className="counter-value text-lg font-bold text-slate-900"><CountUp end={mandal.familyCount} duration={1.5} separator="," /></p>
                      <p className="text-[10px] text-slate-400">Families</p>
                    </div>
                    <div className="text-center p-2 bg-[#F8FAFC] rounded-lg">
                      <p className="counter-value text-lg font-bold text-slate-900"><CountUp end={mandal.villageCount || 0} duration={1} /></p>
                      <p className="text-[10px] text-slate-400">Villages</p>
                    </div>
                    <div className="text-center p-2 bg-[#F8FAFC] rounded-lg">
                      <p className="counter-value text-lg font-bold text-emerald-700"><CountUp end={mandal.firstSchemeCount} duration={1.5} separator="," /></p>
                      <p className="text-[10px] text-slate-400">1st Scheme</p>
                    </div>
                  </div>

                  {/* SES status breakdown mini bars */}
                  <div className="flex items-center gap-1">
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

                  {/* View link */}
                  <div className="mt-3 flex items-center gap-1 text-xs font-medium transition-colors" style={{ color }}>
                    <span>View details</span>
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Aggregated SES Overview */}
          <div className="anim-in opacity-0 gov-card p-5 sm:p-6">
            <h3 className="text-sm font-semibold text-slate-900 tracking-wide mb-4">PROJECT-WIDE SES STATUS</h3>
            <div className="space-y-3">
              {Object.entries(SES_STATUS_CONFIG).map(([key, cfg]) => {
                const totalCount = allMandals.reduce((s, m) => s + (m.statusBreakdown[key] || 0), 0);
                const maxCount = Math.max(...Object.keys(SES_STATUS_CONFIG).map(k => allMandals.reduce((s, m) => s + (m.statusBreakdown[k] || 0), 0)), 1);
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                      <span className="text-xs text-slate-500 counter-value"><CountUp end={totalCount} duration={1.5} separator="," /></span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${(totalCount / maxCount) * 100}%` }} transition={{ duration: 1, delay: 0.3 }} className="h-full rounded-full" style={{ backgroundColor: SES_HEX_COLORS[key], opacity: 0.7 }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </ViewLayout>
    );
  }

  /* ================================================================ */
  /*  MODE 2: Mandal selected — Detailed View                         */
  /* ================================================================ */
  return (
    <ViewLayout
      navTitle={mandalInfo?.name?.toUpperCase() || 'MANDAL'}
      navTitleColor={accentColor}
      accentDotColor={accentColor}
    >
      <div ref={containerRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Mandal Header */}
        <div className="anim-in opacity-0 gov-card p-5 sm:p-6 text-center border-l-4 relative overflow-hidden" style={{ borderLeftColor: accentColor }}>
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

                {/* Compass indicator */}
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
                      <circle cx={v.x} cy={v.y} r="16" fill={accentColor} opacity="0.08">
                        <animate attributeName="r" values="10;18;10" dur={`${2 + i * 0.3}s`} repeatCount="indefinite"/>
                        <animate attributeName="opacity" values="0.12;0.03;0.12" dur={`${2 + i * 0.3}s`} repeatCount="indefinite"/>
                      </circle>
                      <circle cx={v.x} cy={v.y} r={isHovered ? 9 : 7} fill={accentColor} opacity={isHovered ? 0.2 : 0.12} style={{ transition: 'all 0.2s' }}/>
                      <circle cx={v.x} cy={v.y} r={isHovered ? 5 : 3.5} fill={accentColor} filter="url(#pin-glow-light)" style={{ transition: 'all 0.2s' }}/>
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

                {/* Scale bar */}
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
    </ViewLayout>
  );
}
