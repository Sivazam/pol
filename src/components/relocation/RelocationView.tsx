'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { ALLOTMENT_STATUS_CONFIG } from '@/lib/constants';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import {
  ChevronLeft, Activity, MapPin, Home, LandPlot, Calendar,
  AlertTriangle, ArrowRight, CheckCircle2, Clock, Ruler, Building2,
} from 'lucide-react';

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

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#0A0F1E] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm tracking-widest uppercase" style={{ fontFamily: 'var(--font-jetbrains)' }}>Loading Relocation Data</p>
        </div>
      </div>
    );
  }

  if (!data) return <div className="w-full min-h-screen bg-[#0A0F1E] flex items-center justify-center"><p className="text-red-400">Data not found</p></div>;

  const hasCoordinates = data.newPlot?.latitude != null && data.newPlot?.longitude != null;
  const allotCfg = data.newPlot ? ALLOTMENT_STATUS_CONFIG[data.newPlot.allotmentStatus] : null;

  return (
    <div ref={containerRef} className="w-full min-h-screen bg-[#0A0F1E]">
      {/* Top Nav */}
      <div className="sticky top-0 z-50 bg-[#0A0F1E]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" /><span className="hidden sm:inline">Back</span>
            </button>
            <div className="w-px h-6 bg-white/10" />
            <span className="text-sm text-gray-400">Relocation</span>
            <span className="text-sm font-medium text-amber-400">{data.family.pdfNumber}</span>
          </div>
          <div className="flex items-center gap-1.5 text-green-400 text-xs"><Activity className="w-3 h-3" /><span>LIVE</span></div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Family Info */}
        <div className="anim-in opacity-0 glow-card p-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="gov-badge px-3 py-1.5 rounded-md border bg-amber-500/10 border-amber-500/30 text-amber-400 tracking-widest text-sm">
              {data.family.pdfNumber}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white">{data.family.headName}</h1>
          <p className="text-gray-400 mt-1">{data.family.headNameTelugu}</p>
        </div>

        {/* Geo Warning */}
        {(!hasCoordinates || !data.newPlot) && (
          <div className="anim-in opacity-0 border border-amber-500/30 bg-amber-500/5 rounded-xl p-5 flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-400 font-medium">Geo-coordinates pending</p>
              <p className="text-sm text-gray-400 mt-1">
                {!data.newPlot
                  ? 'No plot has been allotted to this family yet.'
                  : 'Plot allotted but location not yet mapped. Coordinates will be updated after geo-survey verification.'}
              </p>
            </div>
          </div>
        )}

        {/* Before / After Map */}
        {hasCoordinates && data.newPlot && (
          <div className="anim-in opacity-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Original Location */}
              <div className="glow-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-4 h-4 text-red-400" />
                  <h3 className="text-sm font-medium text-white tracking-wide">ORIGINAL VILLAGE</h3>
                </div>
                <div className="relative w-full h-[200px] bg-[#0d1321] rounded-lg overflow-hidden border border-white/5">
                  <svg viewBox="0 0 400 200" className="w-full h-full">
                    <defs>
                      <pattern id="reloc-grid1" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5"/>
                      </pattern>
                      <radialGradient id="origGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#EF4444" stopOpacity="0.5"/>
                        <stop offset="100%" stopColor="#EF4444" stopOpacity="0"/>
                      </radialGradient>
                    </defs>
                    <rect width="400" height="200" fill="url(#reloc-grid1)"/>
                    <circle cx="200" cy="100" r="40" fill="url(#origGlow)">
                      <animate attributeName="r" values="30;45;30" dur="2s" repeatCount="indefinite"/>
                    </circle>
                    <circle cx="200" cy="100" r="6" fill="#EF4444"/>
                    <text x="200" y="130" fill="#EF4444" fontSize="10" textAnchor="middle">{data.originalLocation.name}</text>
                    <text x="200" y="145" fill="#EF4444" fontSize="7" textAnchor="middle" opacity="0.6">{data.originalLocation.nameTelugu}</text>
                    <text x="200" y="160" fill="#9CA3AF" fontSize="6" textAnchor="middle" style={{ fontFamily: 'var(--font-jetbrains)' }}>
                      {data.originalLocation.latitude.toFixed(4)}°N, {data.originalLocation.longitude.toFixed(4)}°E
                    </text>
                  </svg>
                </div>
              </div>

              {/* New Plot Location */}
              <div className="glow-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Home className="w-4 h-4 text-green-400" />
                  <h3 className="text-sm font-medium text-white tracking-wide">NEW PLOT LOCATION</h3>
                </div>
                <div className="relative w-full h-[200px] bg-[#0d1321] rounded-lg overflow-hidden border border-white/5">
                  <svg viewBox="0 0 400 200" className="w-full h-full">
                    <defs>
                      <pattern id="reloc-grid2" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5"/>
                      </pattern>
                      <radialGradient id="newGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#22C55E" stopOpacity="0.5"/>
                        <stop offset="100%" stopColor="#22C55E" stopOpacity="0"/>
                      </radialGradient>
                    </defs>
                    <rect width="400" height="200" fill="url(#reloc-grid2)"/>
                    {/* Animated drop pin */}
                    <circle cx="200" cy="100" r="40" fill="url(#newGlow)">
                      <animate attributeName="r" values="30;45;30" dur="2s" repeatCount="indefinite"/>
                    </circle>
                    <circle cx="200" cy="100" r="6" fill="#22C55E">
                      <animate attributeName="r" values="5;8;5" dur="1.5s" repeatCount="indefinite"/>
                    </circle>
                    <text x="200" y="130" fill="#22C55E" fontSize="10" textAnchor="middle">{data.newPlot.colonyName || 'New Plot'}</text>
                    <text x="200" y="145" fill="#22C55E" fontSize="7" textAnchor="middle" opacity="0.6">{data.newPlot.plotNumber || 'Plot pending'}</text>
                    <text x="200" y="160" fill="#9CA3AF" fontSize="6" textAnchor="middle" style={{ fontFamily: 'var(--font-jetbrains)' }}>
                      {data.newPlot.latitude!.toFixed(4)}°N, {data.newPlot.longitude!.toFixed(4)}°E
                    </text>
                  </svg>
                </div>
              </div>
            </div>

            {/* Relocation Arc Visualization */}
            <div className="glow-card p-5 mt-4">
              <h3 className="text-sm font-medium text-white tracking-wide mb-4">RELOCATION PATH</h3>
              <div className="relative w-full h-[120px] bg-[#0d1321] rounded-lg overflow-hidden border border-white/5">
                <svg viewBox="0 0 600 120" className="w-full h-full">
                  <defs>
                    <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#EF4444"/>
                      <stop offset="50%" stopColor="#F59E0B"/>
                      <stop offset="100%" stopColor="#22C55E"/>
                    </linearGradient>
                  </defs>
                  {/* Original point */}
                  <circle cx="100" cy="90" r="5" fill="#EF4444"/>
                  <text x="100" y="108" fill="#EF4444" fontSize="8" textAnchor="middle">{data.originalLocation.name}</text>
                  {/* New point */}
                  <circle cx="500" cy="90" r="5" fill="#22C55E"/>
                  <text x="500" y="108" fill="#22C55E" fontSize="8" textAnchor="middle">{data.newPlot.colonyName || 'New Plot'}</text>
                  {/* Arc */}
                  <path d="M 100,85 Q 300,10 500,85" fill="none" stroke="url(#arcGrad)" strokeWidth="2" strokeDasharray="600">
                    <animate attributeName="stroke-dashoffset" from="600" to="0" dur="2s" fill="freeze"/>
                  </path>
                  {/* Arrow at end */}
                  <polygon points="498,82 504,87 498,92" fill="#22C55E" opacity="0">
                    <animate attributeName="opacity" from="0" to="1" dur="0.3s" begin="2s" fill="freeze"/>
                  </polygon>
                  {/* Distance label */}
                  <text x="300" y="40" fill="#F59E0B" fontSize="8" textAnchor="middle" opacity="0">
                    RELocATION PATH
                    <animate attributeName="opacity" from="0" to="0.8" dur="0.5s" begin="1.5s" fill="freeze"/>
                  </text>
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* Plot Details */}
        {data.newPlot && (
          <div className="anim-in opacity-0 glow-card p-6">
            <h3 className="text-sm font-medium text-white tracking-wide mb-5">PLOT DETAILS</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { label: 'Plot Number', value: data.newPlot.plotNumber || 'Pending', icon: LandPlot, color: 'text-blue-400' },
                { label: 'Colony Name', value: data.newPlot.colonyName || 'Pending', icon: Building2, color: 'text-purple-400' },
                { label: 'Area', value: data.newPlot.areaSqYards ? `${data.newPlot.areaSqYards} sq. yards` : 'Pending', icon: Ruler, color: 'text-teal-400' },
                { label: 'Allotment Status', value: allotCfg?.label || data.newPlot.allotmentStatus, icon: allotCfg?.label === 'Possession Given' ? CheckCircle2 : Clock, color: allotCfg?.color || 'text-gray-400' },
                { label: 'Allotment Date', value: data.newPlot.allotmentDate ? new Date(data.newPlot.allotmentDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Pending', icon: Calendar, color: 'text-amber-400' },
                { label: 'Coordinates', value: hasCoordinates ? `${data.newPlot.latitude!.toFixed(4)}°N, ${data.newPlot.longitude!.toFixed(4)}°E` : 'Pending', icon: MapPin, color: 'text-green-400' },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  className="p-3 bg-white/[0.02] rounded-lg border border-white/5"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <item.icon className={`w-4 h-4 ${item.color}`} />
                    <span className="text-xs text-gray-500">{item.label}</span>
                  </div>
                  <p className="text-sm text-white font-medium">{item.value}</p>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* No Plot Allotted */}
        {!data.newPlot && (
          <div className="anim-in opacity-0 glow-card p-8 text-center">
            <Home className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white">No Plot Allotted Yet</h3>
            <p className="text-sm text-gray-400 mt-2 max-w-md mx-auto">
              This family&apos;s SES status needs to reach &quot;Approved&quot; before a new plot can be allotted under the rehabilitation scheme.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
