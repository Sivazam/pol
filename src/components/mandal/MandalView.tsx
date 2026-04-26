'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { RR_ELIGIBILITY_CONFIG } from '@/lib/constants';
import CountUp from 'react-countup';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import {
  ChevronRight, MapPin, Users, Home, CheckCircle2, Download, Map as MapIcon, Building2, Landmark,
} from 'lucide-react';
import ViewLayout from '@/components/shared/ViewLayout';
import ProjectMap from '@/components/map/ProjectMap';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

/* ------------------------------------------------------------------ */
/*  R&R Eligibility hex color map for inline styles (light theme)      */
/* ------------------------------------------------------------------ */
const RR_HEX_COLORS: Record<string, string> = {
  Eligible: '#16A34A',
  Ineligible: '#DC2626',
};

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

  const containerRef = useRef<HTMLDivElement>(null);
  const fetchIdRef = useRef(0);

  // Derived loading state: loading when mandals not loaded (overview) or when selected mandal data not ready (detail)
  const loading = selectedMandalId ? loadedMandalId !== selectedMandalId : !mandalsLoaded;

  // Mandal color map for card borders and dots
  const mandalColorMap: Record<string, string> = { VRP: '#D97706', CHN: '#0D9488', KUN: '#EA580C' };

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
  const rrEntries = Object.entries(RR_ELIGIBILITY_CONFIG).map(([key, cfg]) => ({
    key, label: cfg.label, color: cfg.color, bg: cfg.bg,
    hex: RR_HEX_COLORS[key] ?? '#94A3B8', count: aggregatedSes[key] || 0,
  }));
  const maxRr = Math.max(...rrEntries.map((d) => d.count), 1);

  /* ---- Derived data for all mandals overview ---- */
  const overviewTotalFamilies = allMandals.reduce((s, m) => s + m.familyCount, 0);
  const overviewTotalVillages = allMandals.reduce((s, m) => s + (m.villageCount || 0), 0);
  const overviewTotalFirstScheme = allMandals.reduce((s, m) => s + m.firstSchemeCount, 0);

  /* ---- LOADING STATE ---- */
  if (loading) {
    return (
      <ViewLayout navTitle="MANDALS" accentDotColor="#D97706">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Header skeleton */}
          <div className="skeleton-pulse h-36 rounded-xl" />
          {/* Map area skeleton */}
          <div className="skeleton-pulse h-[400px] rounded-xl" />
          {/* Mandal card skeletons */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {[1,2,3].map(i => (
              <div key={i} className="skeleton-pulse h-56 rounded-xl" />
            ))}
          </div>
          {/* R&R Eligibility overview skeleton */}
          <div className="skeleton-pulse h-48 rounded-xl" />
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

          {/* Interactive Map of All Mandals */}
          <div className="anim-in opacity-0">
            <div className="gov-card p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-900 tracking-wide" style={{ fontFamily: 'var(--font-jetbrains)' }}>PROJECT AREA MAP</h2>
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">3 MANDALS</span>
              </div>
              <ProjectMap
                center={[81.32, 17.63]}
                zoom={9.5}
                height="400px"
                showMandals={true}
                showVillages={false}
                showVillagePolygons={false}
                showDam={true}
                showControls={true}
                showLegend={true}
                showLayerToggles={false}
                onMandalClick={(code, id) => {
                  navigateToMandal(id);
                }}
                onVillageClick={(villageId, villageName) => {
                  navigateToVillage(villageId);
                }}
                className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700"
              />
              <p className="mt-2 text-xs text-slate-400 text-center">Click on any mandal zone to explore details</p>
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
                  className="gov-card p-5 cursor-pointer group border-l-4 hover:scale-[1.02] hover:shadow-md transition-all duration-200 relative dot-pattern-bg"
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

                  {/* R&R Eligibility breakdown mini bars */}
                  <div className="flex items-center gap-1">
                    {sesItems.map(([status, count]) => {
                      const hex = RR_HEX_COLORS[status];
                      if (!hex) return null;
                      const pct = (count / total) * 100;
                      return (
                        <div key={status} className="h-2 rounded-full first:rounded-l-full last:rounded-r-full" style={{ width: `${pct}%`, backgroundColor: hex, opacity: 0.7, minWidth: 4 }} title={`${RR_ELIGIBILITY_CONFIG[status]?.label}: ${count}`}/>
                      );
                    })}
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-400 flex-wrap">
                    {sesItems.map(([status, count]) => {
                      const hex = RR_HEX_COLORS[status];
                      if (!hex) return null;
                      return (
                        <span key={status} className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: hex }}/>
                          {RR_ELIGIBILITY_CONFIG[status]?.label} {count}
                        </span>
                      );
                    })}
                  </div>

                  {/* View link with slide-underline */}
                  <div className="mt-3 flex items-center gap-1 text-xs font-medium transition-colors" style={{ color }}>
                    <span className="slide-underline">View details</span>
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Aggregated R&R Eligibility Overview */}
          <div className="anim-in opacity-0 gov-card p-5 sm:p-6">
            <h3 className="text-sm font-semibold text-slate-900 tracking-wide mb-4">PROJECT-WIDE R&R ELIGIBILITY</h3>
            <div className="space-y-3">
              {Object.entries(RR_ELIGIBILITY_CONFIG).map(([key, cfg]) => {
                const totalCount = allMandals.reduce((s, m) => s + (m.statusBreakdown[key] || 0), 0);
                const maxCount = Math.max(...Object.keys(RR_ELIGIBILITY_CONFIG).map(k => allMandals.reduce((s, m) => s + (m.statusBreakdown[k] || 0), 0)), 1);
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                      <span className="text-xs text-slate-500 counter-value"><CountUp end={totalCount} duration={1.5} separator="," /></span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${(totalCount / maxCount) * 100}%` }} transition={{ duration: 1, delay: 0.3 }} className="h-full rounded-full" style={{ backgroundColor: RR_HEX_COLORS[key], opacity: 0.7 }}/>
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

        {/* Interactive Village Map */}
        <div className="anim-in opacity-0">
          <div className="gov-card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-900 tracking-wide" style={{ fontFamily: 'var(--font-jetbrains)' }}>VILLAGE MAP</h2>
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">{mandalInfo?.name?.toUpperCase()} MANDAL</span>
            </div>
            <ProjectMap
              center={[mandalInfo?.longitude ?? 81.32, mandalInfo?.latitude ?? 17.63]}
              zoom={11}
              height="450px"
              showMandals={true}
              showVillages={true}
              showVillagePolygons={false}
              highlightMandalVillages={true}
              selectedMandalCode={mandalCode}
              focusMandalCode={mandalCode}
              showDam={true}
              showControls={true}
              showLegend={true}
              showLayerToggles={false}
              onVillageClick={(villageId, _villageName) => {
                navigateToVillage(villageId);
              }}
              className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700"
            />
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

                    {/* R&R Eligibility mini bars */}
                    <div className="mt-3 flex items-center gap-1">
                      {sesItems.map(([status, count]) => {
                        const hex = RR_HEX_COLORS[status];
                        if (!hex) return null;
                        const pct = (count / total) * 100;
                        return (
                          <div key={status} className="h-2 rounded-full first:rounded-l-full last:rounded-r-full" style={{ width: `${pct}%`, backgroundColor: hex, opacity: 0.7, minWidth: 4 }} title={`${RR_ELIGIBILITY_CONFIG[status]?.label}: ${count}`}/>
                        );
                      })}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-400 flex-wrap">
                      {sesItems.map(([status, count]) => {
                        const hex = RR_HEX_COLORS[status];
                        if (!hex) return null;
                        return (
                          <span key={status} className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: hex }}/>
                            {RR_ELIGIBILITY_CONFIG[status]?.label} {count}
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
            {/* R&R Eligibility Chart */}
            <div className="anim-in opacity-0 gov-card p-4 sm:p-5 rounded-xl">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-900 tracking-wide">VILLAGE R&R ELIGIBILITY</h3>
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
                    <Bar dataKey="Eligible" stackId="a" fill="#16A34A" radius={[0, 0, 0, 0]} barSize={30} name="Eligible" />
                    <Bar dataKey="Ineligible" stackId="a" fill="#DC2626" radius={[0, 4, 4, 0]} barSize={30} name="Ineligible" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-3 mt-1">
                {[{ label: 'Eligible', color: '#16A34A' }, { label: 'Ineligible', color: '#DC2626' }].map(item => (
                  <div key={item.label} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: item.color }} />
                    <span className="text-[10px] text-slate-500">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* R&R Breakdown */}
            <div className="anim-in opacity-0 gov-card p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-slate-900 tracking-wide mb-4">R&R ELIGIBILITY BREAKDOWN</h3>
              <div className="space-y-3">
                {rrEntries.map((item, i) => (
                  <div key={item.key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-semibold ${item.color}`}>{item.label}</span>
                      <span className="text-xs text-slate-500 counter-value"><CountUp end={item.count} duration={1.5} separator="," /></span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${(item.count / maxRr) * 100}%` }} transition={{ duration: 1, delay: 0.3 + i * 0.1 }} className="h-full rounded-full" style={{ backgroundColor: item.hex, opacity: 0.7 }}/>
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
                  const csv = ['Village,Total Families,First Scheme Eligible,Eligible,Ineligible'];
                  villages.forEach(v => {
                    csv.push(`${v.name},${v.totalFamilies},${v.firstSchemeCount},${v.statusBreakdown.Eligible || 0},${v.statusBreakdown.Ineligible || 0}`);
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
