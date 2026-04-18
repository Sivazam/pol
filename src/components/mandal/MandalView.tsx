'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { SES_STATUS_CONFIG } from '@/lib/constants';
import CountUp from 'react-countup';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import {
  ChevronRight,
  ChevronLeft,
  Activity,
  MapPin,
  Users,
  Home,
  CheckCircle2,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  SES hex color map for inline styles                                */
/* ------------------------------------------------------------------ */
const SES_HEX_COLORS: Record<string, string> = {
  SURVEYED: '#6B7280', // gray-500
  VERIFIED: '#F59E0B', // amber-500
  APPROVED: '#22C55E', // green-500
  REJECTED: '#EF4444', // red-500
};

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface VillageData {
  id: string;
  name: string;
  nameTelugu: string;
  code: string;
  latitude: number;
  longitude: number;
  mandalId: string;
  totalFamilies: number;
  firstSchemeCount: number;
  statusBreakdown: Record<string, number>;
  mandal: { name: string; color: string };
}

interface MandalInfo {
  id: string;
  name: string;
  nameTelugu: string;
  code: string;
  latitude: number;
  longitude: number;
  color: string;
  familyCount: number;
  firstSchemeCount: number;
  statusBreakdown: Record<string, number>;
}

interface TooltipInfo {
  village: VillageData;
  x: number;
  y: number;
}

/* ------------------------------------------------------------------ */
/*  SVG coordinate helpers                                             */
/* ------------------------------------------------------------------ */

function latLngToSvg(
  lat: number,
  lng: number,
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  width: number,
  height: number,
  padding: number
) {
  const xRange = bounds.maxLng - bounds.minLng || 0.01;
  const yRange = bounds.maxLat - bounds.minLat || 0.01;
  const x = padding + ((lng - bounds.minLng) / xRange) * (width - 2 * padding);
  const y =
    padding + ((bounds.maxLat - lat) / yRange) * (height - 2 * padding);
  return { x, y };
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

  const containerRef = useRef<HTMLDivElement>(null);

  /* ---- redirect if no mandal selected ---- */
  useEffect(() => {
    if (!selectedMandalId) {
      setView('dashboard');
    }
  }, [selectedMandalId, setView]);

  /* ---- fetch mandal info ---- */
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

  /* ---- fetch villages ---- */
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
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedMandalId]);

  /* ---- GSAP entrance ---- */
  useEffect(() => {
    if (!loading && containerRef.current) {
      const els = containerRef.current.querySelectorAll('.anim-in');
      gsap.fromTo(
        els,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'power3.out' }
      );
    }
  }, [loading]);

  /* ---- derived data ---- */
  const accentColor = mandalInfo?.color ?? '#F59E0B';
  const totalFamilies = villages.reduce((s, v) => s + v.totalFamilies, 0);
  const totalFirstScheme = villages.reduce(
    (s, v) => s + v.firstSchemeCount,
    0
  );

  // aggregated SES
  const aggregatedSes: Record<string, number> = {};
  villages.forEach((v) => {
    Object.entries(v.statusBreakdown).forEach(([k, val]) => {
      aggregatedSes[k] = (aggregatedSes[k] || 0) + val;
    });
  });
  const sesEntries = Object.entries(SES_STATUS_CONFIG).map(([key, cfg]) => ({
    key,
    label: cfg.label,
    color: cfg.color,
    bg: cfg.bg,
    hex: SES_HEX_COLORS[key] ?? '#6B7280',
    count: aggregatedSes[key] || 0,
  }));
  const maxSes = Math.max(...sesEntries.map((d) => d.count), 1);

  /* ---- SVG map geometry ---- */
  const svgW = 700;
  const svgH = 440;
  const pad = 60;

  const lats = villages.map((v) => v.latitude);
  const lngs = villages.map((v) => v.longitude);
  const bounds = {
    minLat: lats.length ? Math.min(...lats) - 0.015 : 17.1,
    maxLat: lats.length ? Math.max(...lats) + 0.015 : 17.3,
    minLng: lngs.length ? Math.min(...lngs) - 0.015 : 81.6,
    maxLng: lngs.length ? Math.max(...lngs) + 0.015 : 81.8,
  };

  const villagePins = villages.map((v) => ({
    ...v,
    ...latLngToSvg(v.latitude, v.longitude, bounds, svgW, svgH, pad),
  }));

  /* ---- river path (simplified Godavari through area) ---- */
  const riverPoints: [number, number][] = [
    [bounds.maxLat + 0.005, bounds.minLng - 0.005],
    [bounds.maxLat - 0.005, (bounds.minLng + bounds.maxLng) / 2 - 0.01],
    [(bounds.maxLat + bounds.minLat) / 2 + 0.005, (bounds.minLng + bounds.maxLng) / 2],
    [bounds.minLat + 0.005, (bounds.minLng + bounds.maxLng) / 2 + 0.01],
    [bounds.minLat - 0.005, bounds.maxLng + 0.005],
  ];
  const riverSvg = riverPoints
    .map(([lat, lng]) => {
      const p = latLngToSvg(lat, lng, bounds, svgW, svgH, pad);
      return `${p.x},${p.y}`;
    })
    .join(' Q ');

  /* ---- tooltip handler ---- */
  const handlePinHover = useCallback(
    (v: VillageData, svgX: number, svgY: number) => {
      setTooltip({ village: v, x: svgX, y: svgY });
    },
    []
  );

  /* -------------------------------------------------------------- */
  /*  LOADING STATE                                                  */
  /* -------------------------------------------------------------- */
  if (loading || !selectedMandalId) {
    return (
      <div className="w-full min-h-screen bg-[#0A0F1E] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          <p
            className="text-gray-500 text-sm tracking-widest uppercase"
            style={{ fontFamily: 'var(--font-jetbrains)' }}
          >
            Loading Mandal
          </p>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------- */
  /*  RENDER                                                         */
  /* -------------------------------------------------------------- */
  return (
    <div ref={containerRef} className="w-full min-h-screen bg-[#0A0F1E]">
      {/* ============ TOP NAV BAR ============ */}
      <div className="sticky top-0 z-50 bg-[#0A0F1E]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={goBack}
              className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="w-px h-6 bg-white/10" />
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: accentColor }}
              />
              <span
                className="text-sm font-medium text-white tracking-wide"
                style={{ fontFamily: 'var(--font-jetbrains)' }}
              >
                POLAVARAM R&R PORTAL
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span
              className="font-semibold text-sm"
              style={{ color: accentColor }}
            >
              {mandalInfo?.name?.toUpperCase()}
            </span>
            <span className="hidden md:inline">
              Government of Andhra Pradesh
            </span>
            <div className="flex items-center gap-1.5 text-green-400">
              <Activity className="w-3 h-3" />
              <span>LIVE</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* ============ MANDAL HEADER ============ */}
        <div className="anim-in opacity-0 text-center space-y-2 py-4">
          <h1
            className="text-3xl sm:text-4xl font-bold tracking-tight"
            style={{ color: accentColor }}
          >
            {mandalInfo?.name ?? 'Mandal'}
          </h1>
          <p className="text-gray-400 text-lg">
            {mandalInfo?.nameTelugu ?? ''}
          </p>
          <div className="flex items-center justify-center gap-6 sm:gap-10 pt-2">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1.5 text-gray-300">
                <Users className="w-4 h-4" style={{ color: accentColor }} />
                <span className="counter-value text-2xl font-bold text-white">
                  <CountUp end={totalFamilies} duration={2} separator="," />
                </span>
              </div>
              <span className="text-xs text-gray-500 mt-0.5">
                Total Families
              </span>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1.5 text-gray-300">
                <MapPin className="w-4 h-4" style={{ color: accentColor }} />
                <span className="counter-value text-2xl font-bold text-white">
                  <CountUp end={villages.length} duration={1.5} />
                </span>
              </div>
              <span className="text-xs text-gray-500 mt-0.5">Villages</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1.5 text-gray-300">
                <CheckCircle2
                  className="w-4 h-4"
                  style={{ color: accentColor }}
                />
                <span className="counter-value text-2xl font-bold text-white">
                  <CountUp end={totalFirstScheme} duration={2} separator="," />
                </span>
              </div>
              <span className="text-xs text-gray-500 mt-0.5">
                First Scheme Eligible
              </span>
            </div>
          </div>
        </div>

        {/* ============ SVG VILLAGE MAP ============ */}
        <div className="anim-in opacity-0">
          <div className="glow-card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-sm font-medium text-white tracking-wide"
                style={{ fontFamily: 'var(--font-jetbrains)' }}
              >
                VILLAGE MAP
              </h2>
              <span className="text-xs text-gray-500">
                {mandalInfo?.name?.toUpperCase()} MANDAL
              </span>
            </div>
            <div className="relative w-full h-[280px] sm:h-[400px] bg-[#0d1321] rounded-lg overflow-hidden border border-white/5">
              <svg
                viewBox={`0 0 ${svgW} ${svgH}`}
                className="w-full h-full"
                onMouseLeave={() => setTooltip(null)}
              >
                <defs>
                  {/* grid pattern */}
                  <pattern
                    id="mandal-grid"
                    width="30"
                    height="30"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 30 0 L 0 0 0 30"
                      fill="none"
                      stroke="rgba(255,255,255,0.03)"
                      strokeWidth="0.5"
                    />
                  </pattern>
                  {/* glow filter */}
                  <filter id="pin-glow">
                    <feGaussianBlur stdDeviation="4" result="b" />
                    <feMerge>
                      <feMergeNode in="b" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  {/* radial for each pin */}
                  <radialGradient
                    id="pin-radial"
                    cx="50%"
                    cy="50%"
                    r="50%"
                  >
                    <stop
                      offset="0%"
                      stopColor={accentColor}
                      stopOpacity="0.5"
                    />
                    <stop
                      offset="100%"
                      stopColor={accentColor}
                      stopOpacity="0"
                    />
                  </radialGradient>
                </defs>

                {/* background grid */}
                <rect width={svgW} height={svgH} fill="url(#mandal-grid)" />

                {/* Godavari river */}
                <path
                  d={`M ${riverSvg}`}
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="3"
                  opacity="0.5"
                  strokeDasharray="800"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="800"
                    to="0"
                    dur="3s"
                    fill="freeze"
                  />
                </path>
                <path
                  d={`M ${riverSvg}`}
                  fill="none"
                  stroke="#60A5FA"
                  strokeWidth="1"
                  opacity="0.2"
                />
                <text
                  x={svgW / 2 - 45}
                  y={30}
                  fill="#60A5FA"
                  fontSize="9"
                  opacity="0.5"
                >
                  GODAVARI RIVER
                </text>

                {/* village pins */}
                {villagePins.map((v, i) => (
                  <g
                    key={v.id}
                    className="cursor-pointer"
                    onClick={() => navigateToVillage(v.id)}
                    onMouseEnter={() => handlePinHover(v, v.x, v.y)}
                    onMouseLeave={() => setTooltip(null)}
                  >
                    {/* breathing pulse ring */}
                    <circle
                      cx={v.x}
                      cy={v.y}
                      r="18"
                      fill={accentColor}
                      opacity="0.1"
                    >
                      <animate
                        attributeName="r"
                        values="12;22;12"
                        dur={`${2 + i * 0.3}s`}
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0.15;0.05;0.15"
                        dur={`${2 + i * 0.3}s`}
                        repeatCount="indefinite"
                      />
                    </circle>
                    {/* solid outer ring */}
                    <circle
                      cx={v.x}
                      cy={v.y}
                      r="8"
                      fill={accentColor}
                      opacity="0.2"
                    />
                    {/* center dot */}
                    <circle
                      cx={v.x}
                      cy={v.y}
                      r="4"
                      fill={accentColor}
                      filter="url(#pin-glow)"
                    />
                    {/* label */}
                    <text
                      x={v.x}
                      y={v.y - 14}
                      fill={accentColor}
                      fontSize="8"
                      textAnchor="middle"
                      opacity="0.8"
                    >
                      {v.name}
                    </text>
                  </g>
                ))}

                {/* dam marker (center-ish) */}
                {mandalInfo && (
                  <g>
                    <circle
                      cx={svgW / 2}
                      cy={svgH / 2}
                      r="24"
                      fill="url(#pin-radial)"
                    >
                      <animate
                        attributeName="r"
                        values="18;28;18"
                        dur="2.5s"
                        repeatCount="indefinite"
                      />
                    </circle>
                    <circle
                      cx={svgW / 2}
                      cy={svgH / 2}
                      r="3"
                      fill="#F59E0B"
                    />
                    <text
                      x={svgW / 2 + 10}
                      y={svgH / 2 - 4}
                      fill="#F59E0B"
                      fontSize="7"
                      fontWeight="bold"
                    >
                      DAM
                    </text>
                  </g>
                )}

                {/* legend */}
                <rect
                  x="10"
                  y={svgH - 40}
                  width="150"
                  height="30"
                  rx="4"
                  fill="rgba(0,0,0,0.5)"
                />
                <circle
                  cx="24"
                  cy={svgH - 25}
                  r="3"
                  fill={accentColor}
                />
                <text
                  x="30"
                  y={svgH - 22}
                  fill="#9CA3AF"
                  fontSize="7"
                >
                  Village
                </text>
                <line
                  x1="75"
                  y1={svgH - 28}
                  x2="95"
                  y2={svgH - 22}
                  stroke="#3B82F6"
                  strokeWidth="1.5"
                  opacity="0.6"
                />
                <text
                  x="99"
                  y={svgH - 22}
                  fill="#9CA3AF"
                  fontSize="7"
                >
                  River
                </text>
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
                    <div
                      className="rounded-lg px-4 py-3 shadow-xl min-w-[180px]"
                      style={{
                        background: '#1F2937',
                        border: `1px solid ${accentColor}40`,
                      }}
                    >
                      <p
                        className="text-sm font-semibold text-white"
                      >
                        {tooltip.village.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {tooltip.village.nameTelugu}
                      </p>
                      <div className="mt-2 flex items-center gap-3 text-xs">
                        <span className="text-gray-300">
                          <Home className="w-3 h-3 inline mr-1" style={{ color: accentColor }} />
                          {tooltip.village.totalFamilies} families
                        </span>
                        <span className="text-green-400">
                          <CheckCircle2 className="w-3 h-3 inline mr-1" />
                          {tooltip.village.firstSchemeCount}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <p className="mt-2 text-xs text-gray-500 text-center">
              Click on any village pin to explore details
            </p>
          </div>
        </div>

        {/* ============ BOTTOM: VILLAGE LIST + STATS ============ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Village List Panel */}
          <div className="lg:col-span-2 space-y-3">
            <h3
              className="anim-in opacity-0 text-sm font-medium text-white tracking-wide mb-2"
              style={{ fontFamily: 'var(--font-jetbrains)' }}
            >
              VILLAGES
            </h3>
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
                    className="glow-card p-4 cursor-pointer group"
                    style={{
                      borderColor: `${accentColor}15`,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = `${accentColor}50`;
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 0 25px ${accentColor}20`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = `${accentColor}15`;
                      (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                    }}
                    onClick={() => navigateToVillage(v.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: accentColor }}
                        />
                        <div>
                          <p className="text-sm font-medium text-white">
                            {v.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {v.nameTelugu}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: `${accentColor}15`,
                            color: accentColor,
                          }}
                        >
                          <Users className="w-3 h-3" />
                          {v.totalFamilies}
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-colors" />
                      </div>
                    </div>

                    {/* SES mini bars */}
                    <div className="mt-3 flex items-center gap-1">
                      {sesItems.map(([status, count]) => {
                        const cfg = SES_STATUS_CONFIG[status];
                        const hex = SES_HEX_COLORS[status];
                        if (!cfg || !hex) return null;
                        const pct = (count / total) * 100;
                        return (
                          <div
                            key={status}
                            className="h-1.5 rounded-full first:rounded-l-full last:rounded-r-full"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: hex,
                              opacity: 0.7,
                              minWidth: 4,
                            }}
                            title={`${cfg.label}: ${count}`}
                          />
                        );
                      })}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-[10px] text-gray-500 flex-wrap">
                      {sesItems.map(([status, count]) => {
                        const cfg = SES_STATUS_CONFIG[status];
                        const hex = SES_HEX_COLORS[status];
                        if (!cfg || !hex) return null;
                        return (
                          <span key={status} className="flex items-center gap-1">
                            <span
                              className="w-1.5 h-1.5 rounded-full inline-block"
                              style={{ backgroundColor: hex }}
                            />
                            {cfg.label} {count}
                          </span>
                        );
                      })}
                    </div>

                    {/* first scheme count */}
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <span className="text-green-400">
                        {v.firstSchemeCount} first-scheme eligible
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Stats Section */}
          <div className="space-y-4">
            {/* SES Breakdown */}
            <div className="anim-in opacity-0 glow-card p-4 sm:p-5">
              <h3
                className="text-sm font-medium text-white tracking-wide mb-4"
                style={{ fontFamily: 'var(--font-jetbrains)' }}
              >
                SES STATUS BREAKDOWN
              </h3>
              <div className="space-y-3">
                {sesEntries.map((item, i) => (
                  <div key={item.key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-medium ${item.color}`}>
                        {item.label}
                      </span>
                      <span className="text-xs text-gray-400 counter-value">
                        <CountUp end={item.count} duration={1.5} separator="," />
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${(item.count / maxSes) * 100}%`,
                        }}
                        transition={{ duration: 1, delay: 0.3 + i * 0.1 }}
                        className="h-full rounded-full"
                        style={{
                          backgroundColor: item.hex,
                          opacity: 0.7,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary Card */}
            <div className="anim-in opacity-0 glow-card p-4 sm:p-5">
              <h3
                className="text-sm font-medium text-white tracking-wide mb-3"
                style={{ fontFamily: 'var(--font-jetbrains)' }}
              >
                MANDAL SUMMARY
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Total Families</span>
                  <span className="text-sm font-bold text-white counter-value">
                    <CountUp end={totalFamilies} duration={1.5} separator="," />
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Total Villages</span>
                  <span className="text-sm font-bold text-white counter-value">
                    <CountUp end={villages.length} duration={1} />
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    First Scheme Eligible
                  </span>
                  <span className="text-sm font-bold text-green-400 counter-value">
                    <CountUp end={totalFirstScheme} duration={1.5} separator="," />
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Eligibility Rate</span>
                  <span
                    className="text-sm font-bold counter-value"
                    style={{ color: accentColor }}
                  >
                    {totalFamilies
                      ? ((totalFirstScheme / totalFamilies) * 100).toFixed(1)
                      : 0}
                    %
                  </span>
                </div>

                {/* Visual progress bar for eligibility */}
                <div className="mt-2">
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: totalFamilies
                          ? `${(totalFirstScheme / totalFamilies) * 100}%`
                          : '0%',
                      }}
                      transition={{ duration: 1.2, delay: 0.5 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: accentColor, opacity: 0.6 }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick action */}
            <div className="anim-in opacity-0 glow-card p-4">
              <p className="text-xs text-gray-400 mb-2">
                Select a village from the map or list to view family details and
                relocation data.
              </p>
              <div className="flex items-center gap-2 text-xs" style={{ color: accentColor }}>
                <MapPin className="w-3.5 h-3.5" />
                <span>{villages.length} villages available</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
