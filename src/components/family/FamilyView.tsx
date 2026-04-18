'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { SES_STATUS_CONFIG, ALLOTMENT_STATUS_CONFIG } from '@/lib/constants';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import {
  ChevronLeft, ChevronRight, Activity, Users, LandPlot, Home,
  Calendar, MapPin, FileText, ArrowRight, Star, CheckCircle2,
  Clock, Eye, User, Download, Printer,
} from 'lucide-react';

interface FamilyMember {
  id: string;
  name: string;
  nameTelugu: string | null;
  relation: string;
  age: number;
  gender: string;
  aadhar: string | null;
  occupation: string | null;
  isMinor: boolean;
}

interface NewPlot {
  id: string;
  plotNumber: string | null;
  colonyName: string | null;
  latitude: number | null;
  longitude: number | null;
  areaSqYards: number | null;
  allotmentStatus: string;
  allotmentDate: string | null;
}

interface FamilyData {
  id: string;
  pdfNumber: string;
  headName: string;
  headNameTelugu: string;
  caste: string | null;
  landAcres: number | null;
  houseType: string | null;
  sesStatus: string;
  firstSchemeEligible: boolean;
  village: {
    id: string; name: string; nameTelugu: string; code: string;
    latitude: number; longitude: number;
    mandal: { id: string; name: string; nameTelugu: string; code: string; color: string; };
  };
  members: FamilyMember[];
  newPlot: NewPlot | null;
}

const TIMELINE_STEPS = [
  { key: 'SURVEYED', label: 'Surveyed', icon: FileText },
  { key: 'VERIFIED', label: 'Verified', icon: CheckCircle2 },
  { key: 'APPROVED', label: 'Approved', icon: Star },
  { key: 'RELOCATED', label: 'Relocated', icon: Home },
];

function getTimelinePosition(sesStatus: string): number {
  switch (sesStatus) {
    case 'SURVEYED': return 0;
    case 'VERIFIED': return 1;
    case 'APPROVED': return 2;
    case 'REJECTED': return -1;
    default: return 0;
  }
}

export default function FamilyView() {
  const selectedFamilyPdf = useAppStore((s) => s.selectedFamilyPdf);
  const selectedFamilyId = useAppStore((s) => s.selectedFamilyId);
  const navigateToMember = useAppStore((s) => s.navigateToMember);
  const navigateToRelocation = useAppStore((s) => s.navigateToRelocation);
  const goBack = useAppStore((s) => s.goBack);
  const setView = useAppStore((s) => s.setView);

  const [family, setFamily] = useState<FamilyData | null>(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedFamilyPdf) { setView('dashboard'); return; }
    fetch(`/api/family/${encodeURIComponent(selectedFamilyPdf)}`)
      .then(r => r.json())
      .then(data => { setFamily(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedFamilyPdf, setView]);

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
          <p className="text-gray-500 text-sm tracking-widest uppercase" style={{ fontFamily: 'var(--font-jetbrains)' }}>Loading Family</p>
        </div>
      </div>
    );
  }

  if (!family) {
    return (
      <div className="w-full min-h-screen bg-[#0A0F1E] flex items-center justify-center">
        <p className="text-red-400">Family not found</p>
      </div>
    );
  }

  const accentColor = family.village.mandal.color;
  const statusCfg = SES_STATUS_CONFIG[family.sesStatus] || SES_STATUS_CONFIG.SURVEYED;
  const timelinePos = getTimelinePosition(family.sesStatus);
  const isRejected = family.sesStatus === 'REJECTED';

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
            <span className="text-sm text-gray-400">{family.village.mandal.name}</span>
            <ChevronRight className="w-3 h-3 text-gray-600" />
            <span className="text-sm text-gray-400">{family.village.name}</span>
            <ChevronRight className="w-3 h-3 text-gray-600" />
            <span className="text-sm font-medium" style={{ color: accentColor }}>{family.pdfNumber}</span>
          </div>
          <div className="flex items-center gap-1.5 text-green-400 text-xs"><Activity className="w-3 h-3" /><span>LIVE</span></div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header Section */}
        <div className="anim-in opacity-0 glow-card p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="gov-badge px-3 py-1.5 rounded-md border bg-amber-500/10 border-amber-500/30 text-amber-400 tracking-widest text-sm">
                  {family.pdfNumber}
                </span>
                {family.firstSchemeEligible && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/30">
                    <Star className="w-3 h-3 fill-amber-400" /> First Scheme Eligible
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{family.headName}</h1>
              <p className="text-gray-400 mt-1">{family.headNameTelugu}</p>
              <p className="text-xs text-gray-500 mt-2">
                <MapPin className="w-3 h-3 inline mr-1" />
                {family.village.name} ({family.village.nameTelugu}), {family.village.mandal.name} Mandal
              </p>
            </div>
            <div className={`px-4 py-2 rounded-lg border ${statusCfg.color} ${statusCfg.bg} ${statusCfg.border}`}>
              <span className="text-sm font-semibold">{statusCfg.label}</span>
            </div>
          </div>
        </div>

        {/* Status Timeline */}
        <div className="anim-in opacity-0 glow-card p-6">
          <h3 className="text-sm font-medium text-white tracking-wide mb-6">STATUS TIMELINE</h3>
          <div className="relative">
            <div className="flex items-center justify-between">
              {TIMELINE_STEPS.map((step, i) => {
                const isCompleted = !isRejected && i <= timelinePos;
                const isCurrent = !isRejected && i === timelinePos;
                const Icon = step.icon;
                return (
                  <div key={step.key} className="flex flex-col items-center relative z-10">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                      isCompleted ? `border-green-500 bg-green-500/20` :
                      isCurrent ? `border-amber-500 bg-amber-500/20 animate-pulse` :
                      'border-gray-700 bg-gray-800'
                    }`}>
                      <Icon className={`w-4 h-4 ${isCompleted ? 'text-green-400' : isCurrent ? 'text-amber-400' : 'text-gray-600'}`} />
                    </div>
                    <span className={`text-xs mt-2 ${isCompleted ? 'text-green-400' : isCurrent ? 'text-amber-400' : 'text-gray-600'}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
            {/* Progress line */}
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-700 -z-0">
              {!isRejected && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(timelinePos / 3) * 100}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                  className="h-full bg-green-500"
                />
              )}
              {isRejected && (
                <div className="h-full bg-red-500 w-full opacity-50" />
              )}
            </div>
          </div>
          {isRejected && (
            <p className="mt-4 text-xs text-red-400 text-center">Application rejected — review required</p>
          )}
        </div>

        {/* Family Details */}
        <div className="anim-in opacity-0 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="glow-card p-5">
            <h3 className="text-sm font-medium text-white tracking-wide mb-4">FAMILY DETAILS</h3>
            <div className="space-y-3">
              {[
                { label: 'Caste Category', value: family.caste || 'N/A', icon: Users },
                { label: 'Land Holding', value: family.landAcres ? `${family.landAcres} acres` : 'N/A', icon: LandPlot },
                { label: 'House Type', value: family.houseType || 'N/A', icon: Home },
                { label: 'Total Members', value: String(family.members.length), icon: Users },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 flex items-center gap-2">
                    <item.icon className="w-3.5 h-3.5" />{item.label}
                  </span>
                  <span className="text-sm text-white font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="glow-card p-5">
            <h3 className="text-sm font-medium text-white tracking-wide mb-4">NEW PLOT STATUS</h3>
            {family.newPlot ? (
              <div className="space-y-3">
                {[
                  { label: 'Plot Number', value: family.newPlot.plotNumber || 'Pending', icon: LandPlot },
                  { label: 'Colony', value: family.newPlot.colonyName || 'Pending', icon: Home },
                  { label: 'Area', value: family.newPlot.areaSqYards ? `${family.newPlot.areaSqYards} sq. yards` : 'Pending', icon: LandPlot },
                  { label: 'Allotment Status', value: family.newPlot.allotmentStatus, icon: Clock },
                ].map((item, i) => {
                  const allotCfg = i === 3 ? ALLOTMENT_STATUS_CONFIG[item.value] : null;
                  return (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-xs text-gray-400 flex items-center gap-2">
                        <item.icon className="w-3.5 h-3.5" />{item.label}
                      </span>
                      {allotCfg ? (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${allotCfg.color} ${allotCfg.bg} border ${allotCfg.border}`}>
                          {allotCfg.label}
                        </span>
                      ) : (
                        <span className="text-sm text-white font-medium">{item.value}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center py-6 text-center">
                <Clock className="w-8 h-8 text-gray-600 mb-2" />
                <p className="text-sm text-gray-400">No plot allotted yet</p>
                <p className="text-xs text-gray-600 mt-1">Pending SES verification</p>
              </div>
            )}
          </div>
        </div>

        {/* Members Table */}
        <div className="anim-in opacity-0 glow-card p-5">
          <h3 className="text-sm font-medium text-white tracking-wide mb-4">FAMILY MEMBERS ({family.members.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-white/5">
                  <th className="text-left pb-3 font-medium">Name</th>
                  <th className="text-left pb-3 font-medium hidden sm:table-cell">Relation</th>
                  <th className="text-left pb-3 font-medium">Age</th>
                  <th className="text-left pb-3 font-medium hidden md:table-cell">Gender</th>
                  <th className="text-left pb-3 font-medium hidden lg:table-cell">Aadhaar</th>
                  <th className="text-left pb-3 font-medium hidden md:table-cell">Occupation</th>
                  <th className="text-right pb-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {family.members.map((m, i) => (
                  <motion.tr
                    key={m.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-white/5 hover:bg-white/[0.02] cursor-pointer group"
                    onClick={() => navigateToMember(m.id)}
                  >
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: `${accentColor}20`, color: accentColor }}>
                          {m.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-white text-sm">{m.name}</p>
                          {m.nameTelugu && <p className="text-gray-500 text-xs">{m.nameTelugu}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 hidden sm:table-cell">
                      <span className={`text-xs px-2 py-0.5 rounded ${m.relation === 'Head' ? 'bg-blue-500/10 text-blue-400' : 'bg-gray-500/10 text-gray-400'}`}>
                        {m.relation}
                      </span>
                    </td>
                    <td className="py-3 text-gray-300">{m.age}{m.isMinor ? ' (Minor)' : ''}</td>
                    <td className="py-3 hidden md:table-cell text-gray-400">{m.gender}</td>
                    <td className="py-3 hidden lg:table-cell">
                      <span className="gov-badge text-gray-500">{m.aadhar || 'N/A'}</span>
                    </td>
                    <td className="py-3 hidden md:table-cell text-gray-400">{m.occupation || 'N/A'}</td>
                    <td className="py-3 text-right">
                      <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-300 transition-colors inline" />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Bar */}
        <div className="anim-in opacity-0 flex flex-wrap gap-3">
          {family.newPlot && (
            <button
              onClick={() => navigateToRelocation(family.id)}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg text-sm hover:bg-green-500/20 transition-colors"
            >
              <MapPin className="w-4 h-4" /> View New Plot
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
          <button className="flex items-center gap-2 px-5 py-2.5 bg-[#111827] border border-white/8 text-gray-300 rounded-lg text-sm hover:border-white/20 transition-colors">
            <Download className="w-4 h-4" /> Download Data
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-[#111827] border border-white/8 text-gray-300 rounded-lg text-sm hover:border-white/20 transition-colors">
            <Printer className="w-4 h-4" /> Print SES Sheet
          </button>
        </div>
      </div>
    </div>
  );
}
