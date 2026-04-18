'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { SES_STATUS_CONFIG } from '@/lib/constants';
import CountUp from 'react-countup';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { Users, Home, CheckCircle2, Clock, ChevronRight, Activity } from 'lucide-react';

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

export default function DashboardView() {
  const navigateToMandal = useAppStore((s) => s.navigateToMandal);
  const goBack = useAppStore((s) => s.goBack);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
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

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#0A0F1E] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm tracking-widest uppercase" style={{ fontFamily: 'var(--font-jetbrains)' }}>Loading Dashboard</p>
        </div>
      </div>
    );
  }

  if (!stats) return <div className="w-full min-h-screen bg-[#0A0F1E] flex items-center justify-center"><p className="text-red-400">Failed to load data</p></div>;

  const counterCards = [
    { label: 'Total Families', value: stats.totalFamilies, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'First Scheme Eligible', value: stats.firstSchemeEligible, icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'Plots Allotted', value: stats.plotsAllotted + stats.plotsPossessionGiven, icon: Home, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Pending Allotments', value: stats.plotsPending, icon: Clock, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  ];

  const sesData = [
    { status: 'SURVEYED', count: stats.surveyed, ...SES_STATUS_CONFIG.SURVEYED },
    { status: 'VERIFIED', count: stats.verified, ...SES_STATUS_CONFIG.VERIFIED },
    { status: 'APPROVED', count: stats.approved, ...SES_STATUS_CONFIG.APPROVED },
    { status: 'REJECTED', count: stats.rejected, ...SES_STATUS_CONFIG.REJECTED },
  ];
  const maxSes = Math.max(...sesData.map(d => d.count), 1);

  return (
    <div ref={containerRef} className="w-full min-h-screen bg-[#0A0F1E]">
      {/* Top Nav */}
      <div className="sticky top-0 z-50 bg-[#0A0F1E]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-1">
              <ChevronRight className="w-4 h-4 rotate-180" /><span className="hidden sm:inline">Back</span>
            </button>
            <div className="w-px h-6 bg-white/10" />
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-sm font-medium text-white tracking-wide" style={{ fontFamily: 'var(--font-jetbrains)' }}>POLAVARAM R&R PORTAL</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="hidden md:inline">Government of Andhra Pradesh</span>
            <div className="flex items-center gap-1.5 text-green-400"><Activity className="w-3 h-3" /><span>LIVE</span></div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Counters */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {counterCards.map((card, i) => (
            <div key={i} className="anim-in opacity-0 glow-card p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${card.bg}`}><card.icon className={`w-4 h-4 ${card.color}`} /></div>
              </div>
              <div className="counter-value text-2xl sm:text-3xl font-bold text-white">
                <CountUp end={card.value} duration={2} separator="," />
              </div>
              <p className="mt-1 text-xs sm:text-sm text-gray-400">{card.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* SVG Map */}
          <div className="lg:col-span-2 anim-in opacity-0">
            <div className="glow-card p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-white tracking-wide">PROJECT AREA MAP</h2>
                <span className="text-xs text-gray-500" style={{ fontFamily: 'var(--font-jetbrains)' }}>WEST GODAVARI DISTRICT</span>
              </div>
              <div className="relative w-full h-[300px] sm:h-[400px] bg-[#0d1321] rounded-lg overflow-hidden border border-white/5">
                <svg viewBox="0 0 600 400" className="w-full h-full">
                  <defs>
                    <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5"/>
                    </pattern>
                    <radialGradient id="damGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.6"/>
                      <stop offset="100%" stopColor="#F59E0B" stopOpacity="0"/>
                    </radialGradient>
                    <filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                  </defs>
                  <rect width="600" height="400" fill="url(#grid)"/>
                  {/* Godavari River */}
                  <path d="M 50,80 Q 120,100 180,140 Q 240,180 280,200 Q 320,220 350,240 Q 400,260 450,280 Q 500,300 560,340" fill="none" stroke="#3B82F6" strokeWidth="3" opacity="0.6" strokeDasharray="800">
                    <animate attributeName="stroke-dashoffset" from="800" to="0" dur="3s" fill="freeze"/>
                  </path>
                  <path d="M 50,80 Q 120,100 180,140 Q 240,180 280,200 Q 320,220 350,240 Q 400,260 450,280 Q 500,300 560,340" fill="none" stroke="#60A5FA" strokeWidth="1" opacity="0.3"/>
                  <text x="160" y="110" fill="#60A5FA" fontSize="9" opacity="0.5">GODAVARI RIVER</text>
                  {/* Dam */}
                  <circle cx="280" cy="200" r="20" fill="url(#damGlow)"><animate attributeName="r" values="15;25;15" dur="2s" repeatCount="indefinite"/></circle>
                  <circle cx="280" cy="200" r="5" fill="#F59E0B" filter="url(#glow)"/>
                  <text x="295" y="195" fill="#F59E0B" fontSize="8" fontFamily="var(--font-jetbrains)" fontWeight="bold">POLAVARAM DAM</text>
                  {/* Mandal zones */}
                  {stats.mandals[0] && (
                    <g className="cursor-pointer" onClick={() => navigateToMandal(stats.mandals[0].id)}>
                      <ellipse cx="240" cy="170" rx="70" ry="50" fill="#F59E0B" opacity="0.08" stroke="#F59E0B" strokeWidth="1" strokeOpacity="0.3"><animate attributeName="opacity" values="0.08;0.15;0.08" dur="3s" repeatCount="indefinite"/></ellipse>
                      <circle cx="240" cy="170" r="4" fill="#F59E0B"/>
                      <text x="220" y="155" fill="#F59E0B" fontSize="9">Polavaram</text>
                      <text x="225" y="168" fill="#F59E0B" fontSize="7" opacity="0.6">{stats.mandals[0].familyCount} families</text>
                    </g>
                  )}
                  {stats.mandals[1] && (
                    <g className="cursor-pointer" onClick={() => navigateToMandal(stats.mandals[1].id)}>
                      <ellipse cx="340" cy="150" rx="65" ry="45" fill="#14B8A6" opacity="0.08" stroke="#14B8A6" strokeWidth="1" strokeOpacity="0.3"><animate attributeName="opacity" values="0.08;0.15;0.08" dur="3s" repeatCount="indefinite" begin="1s"/></ellipse>
                      <circle cx="340" cy="150" r="4" fill="#14B8A6"/>
                      <text x="315" y="138" fill="#14B8A6" fontSize="9">Velairpad</text>
                      <text x="323" y="151" fill="#14B8A6" fontSize="7" opacity="0.6">{stats.mandals[1].familyCount} families</text>
                    </g>
                  )}
                  {stats.mandals[2] && (
                    <g className="cursor-pointer" onClick={() => navigateToMandal(stats.mandals[2].id)}>
                      <ellipse cx="330" cy="270" rx="60" ry="45" fill="#F97316" opacity="0.08" stroke="#F97316" strokeWidth="1" strokeOpacity="0.3"><animate attributeName="opacity" values="0.08;0.15;0.08" dur="3s" repeatCount="indefinite" begin="2s"/></ellipse>
                      <circle cx="330" cy="270" r="4" fill="#F97316"/>
                      <text x="300" y="258" fill="#F97316" fontSize="9">Buttaigudem</text>
                      <text x="313" y="271" fill="#F97316" fontSize="7" opacity="0.6">{stats.mandals[2].familyCount} families</text>
                    </g>
                  )}
                  <rect x="10" y="350" width="140" height="40" rx="4" fill="rgba(0,0,0,0.4)"/>
                  <circle cx="25" cy="362" r="3" fill="#F59E0B"/><text x="32" y="365" fill="#9CA3AF" fontSize="7">Polavaram</text>
                  <circle cx="90" cy="362" r="3" fill="#14B8A6"/><text x="97" y="365" fill="#9CA3AF" fontSize="7">Velairpad</text>
                  <circle cx="25" cy="378" r="3" fill="#F97316"/><text x="32" y="381" fill="#9CA3AF" fontSize="7">Buttaigudem</text>
                  <line x1="90" y1="375" x2="110" y2="378" stroke="#3B82F6" strokeWidth="1.5" opacity="0.6"/><text x="112" y="381" fill="#9CA3AF" fontSize="7">River</text>
                </svg>
              </div>
              <p className="mt-2 text-xs text-gray-500 text-center">Click on any mandal zone to explore</p>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="anim-in opacity-0 glow-card p-4 sm:p-5">
              <h3 className="text-sm font-medium text-white tracking-wide mb-4">SES STATUS OVERVIEW</h3>
              <div className="space-y-3">
                {sesData.map((item) => (
                  <div key={item.status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-medium ${item.color}`}>{item.label}</span>
                      <span className="text-xs text-gray-400 counter-value"><CountUp end={item.count} duration={1.5} separator="," /></span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${(item.count / maxSes) * 100}%` }} transition={{ duration: 1, delay: 0.3 }} className={`h-full rounded-full ${item.bg.replace('/10', '/40')}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {stats.mandals.map((mandal, i) => (
                <motion.div key={mandal.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.15 }} className="glow-card p-4 cursor-pointer group" style={{ borderColor: `${mandal.color}20` }} onClick={() => navigateToMandal(mandal.id)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: mandal.color }} />
                      <div><p className="text-sm font-medium text-white">{mandal.name}</p><p className="text-xs text-gray-500">{mandal.villageCount} villages</p></div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-white counter-value"><CountUp end={mandal.familyCount} duration={1.5} separator="," /></p>
                      <p className="text-xs text-gray-500">families</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span className="text-green-400">{mandal.firstSchemeCount} eligible</span>
                    <span className="text-gray-600">|</span>
                    <span className="text-gray-400">First Scheme</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-xs text-gray-500 group-hover:text-gray-300 transition-colors"><span>View details</span><ChevronRight className="w-3 h-3" /></div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Plot Allotment */}
        <div className="anim-in opacity-0 glow-card p-4 sm:p-5">
          <h3 className="text-sm font-medium text-white tracking-wide mb-4">PLOT ALLOTMENT STATUS</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-amber-500/5 rounded-lg border border-amber-500/10">
              <div className="counter-value text-xl sm:text-2xl font-bold text-amber-400"><CountUp end={stats.plotsPending} duration={1.5} separator="," /></div>
              <p className="mt-1 text-xs text-gray-400">Pending</p>
            </div>
            <div className="text-center p-3 bg-blue-500/5 rounded-lg border border-blue-500/10">
              <div className="counter-value text-xl sm:text-2xl font-bold text-blue-400"><CountUp end={stats.plotsAllotted} duration={1.5} separator="," /></div>
              <p className="mt-1 text-xs text-gray-400">Allotted</p>
            </div>
            <div className="text-center p-3 bg-green-500/5 rounded-lg border border-green-500/10">
              <div className="counter-value text-xl sm:text-2xl font-bold text-green-400"><CountUp end={stats.plotsPossessionGiven} duration={1.5} separator="," /></div>
              <p className="mt-1 text-xs text-gray-400">Possession Given</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
