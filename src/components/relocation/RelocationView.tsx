'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { ALLOTMENT_STATUS_CONFIG } from '@/lib/constants';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import {
  ChevronLeft, Activity, MapPin, Home, LandPlot, Calendar,
  AlertTriangle, ArrowRight, CheckCircle2, Clock, Ruler, Building2,
  Navigation, FileText, Users, Phone, Info
} from 'lucide-react';
import GlobalSearch from '@/components/shared/GlobalSearch';
import Breadcrumb from '@/components/shared/Breadcrumb';
import GovFooter from '@/components/shared/GovFooter';
import SidebarNav from '@/components/shared/SidebarNav';
import MobileMenuButton from '@/components/shared/MobileMenuButton';
import ThemeToggle from '@/components/shared/ThemeToggle';

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

// Calculate distance between two coordinates using Haversine formula
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function RelocationView() {
  const selectedFamilyId = useAppStore((s) => s.selectedFamilyId);
  const goBack = useAppStore((s) => s.goBack);
  const setView = useAppStore((s) => s.setView);

  const [data, setData] = useState<RelocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedFamilyId) { setView('dashboard'); return; }
    fetch(`/api/relocation/${selectedFamilyId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedFamilyId, setView]);

  useEffect(() => {
    if (!loading && containerRef.current) {
      const els = containerRef.current.querySelectorAll('.anim-in');
      gsap.fromTo(els, { opacity: 0, y: 25 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power3.out' });
    }
  }, [loading]);

  // Calculate relocation distance (must be before early returns)
  const distanceKm = useMemo(() => {
    if (!data?.newPlot?.latitude || !data?.newPlot?.longitude) return null;
    return haversineDistance(
      data.originalLocation.latitude, data.originalLocation.longitude,
      data.newPlot.latitude, data.newPlot.longitude
    );
  }, [data]);

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#F0F4F8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm tracking-widest uppercase" style={{ fontFamily: 'var(--font-jetbrains)' }}>Loading Relocation Data</p>
        </div>
      </div>
    );
  }

  if (!data) return (
    <div className="w-full min-h-screen bg-[#F0F4F8] flex items-center justify-center">
      <p className="text-red-600 font-medium">Data not found</p>
    </div>
  );

  const hasCoordinates = data.newPlot?.latitude != null && data.newPlot?.longitude != null;
  const allotCfg = data.newPlot ? ALLOTMENT_STATUS_CONFIG[data.newPlot.allotmentStatus] : null;

  return (
    <div ref={containerRef} className="w-full min-h-screen bg-[#F0F4F8] flex flex-col">
      <SidebarNav />
      <div className="tricolor-bar w-full lg:pl-[52px]" />

      {/* Top Nav */}
      <div className="sticky top-[3px] z-50 bg-gradient-to-r from-[#0F2B46] to-[#1E3A5F] shadow-md lg:pl-[52px]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MobileMenuButton />
            <button onClick={goBack} className="text-white/70 hover:text-white transition-colors text-sm flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" /><span className="hidden sm:inline">Back</span>
            </button>
            <div className="w-px h-6 bg-white/20" />
            <Navigation className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-white/60">Relocation</span>
            <span className="text-sm font-medium text-amber-300">{data.family.pdfNumber}</span>
          </div>
          <div className="flex items-center gap-3">
            <GlobalSearch />
            <div className="flex items-center gap-1.5 text-green-300 text-xs"><Activity className="w-3 h-3" /><span>LIVE</span></div>
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6"><Breadcrumb /></div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          {/* Family Info Header - Enhanced */}
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

              {/* Distance Badge */}
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
                      {/* Compass */}
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
                      {/* Compass */}
                      <text x="380" y="20" fill="#94A3B8" fontSize="9" fontWeight="600" textAnchor="middle">N↑</text>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Relocation Arc Visualization - Enhanced */}
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
                    {/* Original point with label */}
                    <circle cx="100" cy="100" r="7" fill="#DC2626"/>
                    <circle cx="100" cy="100" r="11" fill="none" stroke="#DC2626" strokeWidth="1" opacity="0.3"/>
                    <text x="100" y="120" fill="#991B1B" fontSize="8" fontWeight="600" textAnchor="middle">{data.originalLocation.name}</text>
                    {/* New point with label */}
                    <circle cx="500" cy="100" r="7" fill="#16A34A"/>
                    <circle cx="500" cy="100" r="11" fill="none" stroke="#16A34A" strokeWidth="1" opacity="0.3"/>
                    <text x="500" y="120" fill="#166534" fontSize="8" fontWeight="600" textAnchor="middle">{data.newPlot.colonyName || 'New Plot'}</text>
                    {/* Animated Arc */}
                    <path d="M 100,95 Q 300,15 500,95" fill="none" stroke="url(#arcGrad-light)" strokeWidth="3" strokeDasharray="600">
                      <animate attributeName="stroke-dashoffset" from="600" to="0" dur="2s" fill="freeze"/>
                    </path>
                    {/* Arrow at end */}
                    <polygon points="498,91 505,97 498,103" fill="#16A34A" opacity="0">
                      <animate attributeName="opacity" from="0" to="1" dur="0.3s" begin="2s" fill="freeze"/>
                    </polygon>
                    {/* Distance label */}
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

          {/* Plot Details - Enhanced */}
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

          {/* No Plot Allotted - Enhanced */}
          {!data.newPlot && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="anim-in opacity-0 gov-card p-8 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
                <Home className="w-8 h-8 text-slate-300" />
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
                  For relocation queries, contact the <span className="font-semibold">Rehabilitation & Resettlement Cell</span> at the Mandal Revenue Office or call the helpline at <span className="font-semibold text-[#0F2B46]">1800-XXX-XXXX</span> (toll-free).
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      <GovFooter />
    </div>
  );
}
