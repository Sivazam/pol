'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { SES_STATUS_CONFIG, ALLOTMENT_STATUS_CONFIG } from '@/lib/constants';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import {
  ChevronLeft, ChevronRight, Activity, Users, LandPlot, Home,
  Calendar, MapPin, FileText, ArrowRight, Star, CheckCircle2,
  Clock, Eye, User, Download, Printer, FileSpreadsheet,
  ShieldCheck, FileSearch, ShieldAlert, ShieldX,
} from 'lucide-react';
import GlobalSearch from '@/components/shared/GlobalSearch';
import Breadcrumb from '@/components/shared/Breadcrumb';
import GovFooter from '@/components/shared/GovFooter';
import SidebarNav from '@/components/shared/SidebarNav';
import MobileMenuButton from '@/components/shared/MobileMenuButton';
import ThemeToggle from '@/components/shared/ThemeToggle';

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

interface RelatedFamily {
  id: string;
  pdfNumber: string;
  headName: string;
  sesStatus: string;
  villageName?: string;
}

const TIMELINE_STEPS = [
  { key: 'SURVEYED', label: 'Surveyed', icon: FileText, date: 'Jan 2024', stepNum: 1 },
  { key: 'VERIFIED', label: 'Verified', icon: CheckCircle2, date: 'Mar 2024', stepNum: 2 },
  { key: 'APPROVED', label: 'Approved', icon: Star, date: 'Jun 2024', stepNum: 3 },
  { key: 'RELOCATED', label: 'Relocated', icon: Home, date: 'Sep 2024', stepNum: 4 },
];

// SES status icon mapping
const SES_STATUS_ICONS: Record<string, React.ElementType> = {
  APPROVED: ShieldCheck,
  VERIFIED: FileSearch,
  SURVEYED: FileText,
  REJECTED: ShieldX,
};

// SES status left border colors for related families
const SES_STATUS_BORDER: Record<string, string> = {
  APPROVED: 'border-l-green-500',
  VERIFIED: 'border-l-amber-500',
  SURVEYED: 'border-l-slate-400',
  REJECTED: 'border-l-red-500',
};

// Quick stat color configs
const QUICK_STAT_CONFIGS = [
  { key: 'members', icon: Users, iconColor: 'text-slate-600', circleBg: 'bg-slate-100', gradient: 'from-slate-50 to-white', topBorder: 'border-t-slate-400' },
  { key: 'minors', icon: Users, iconColor: 'text-amber-600', circleBg: 'bg-amber-100', gradient: 'from-amber-50/50 to-white', topBorder: 'border-t-amber-400' },
  { key: 'land', icon: LandPlot, iconColor: 'text-teal-600', circleBg: 'bg-teal-100', gradient: 'from-teal-50/50 to-white', topBorder: 'border-t-teal-400' },
  { key: 'plot', icon: Home, iconColor: 'text-green-600', circleBg: 'bg-green-100', gradient: 'from-green-50/50 to-white', topBorder: 'border-t-green-400' },
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
  const navigateToFamily = useAppStore((s) => s.navigateToFamily);
  const goBack = useAppStore((s) => s.goBack);
  const setView = useAppStore((s) => s.setView);

  const [family, setFamily] = useState<FamilyData | null>(null);
  const [relatedFamilies, setRelatedFamilies] = useState<RelatedFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedFamilyPdf) { setView('dashboard'); return; }
    fetch(`/api/family/${encodeURIComponent(selectedFamilyPdf)}`)
      .then(r => r.json())
      .then(data => { setFamily(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedFamilyPdf, setView]);

  // Fetch related families from the same village
  useEffect(() => {
    if (!family?.village?.id) return;
    fetch(`/api/families?villageId=${family.village.id}&limit=50`)
      .then(r => r.json())
      .then(data => {
        const allFamilies: RelatedFamily[] = (data.families || [])
          .filter((f: any) => f.pdfNumber !== family.pdfNumber)
          .map((f: any) => ({
            id: f.id,
            pdfNumber: f.pdfNumber,
            headName: f.headName,
            sesStatus: f.sesStatus,
            villageName: family.village.name,
          }));
        // Pick 3 random families
        const shuffled = allFamilies.sort(() => 0.5 - Math.random());
        setRelatedFamilies(shuffled.slice(0, 3));
      })
      .catch(() => {});
  }, [family?.village?.id, family?.pdfNumber, family?.village?.name]);

  useEffect(() => {
    if (!loading && containerRef.current) {
      const els = containerRef.current.querySelectorAll('.anim-in');
      gsap.fromTo(els, { opacity: 0, y: 25 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power3.out' });
    }
  }, [loading]);

  // Print handler
  const handlePrint = () => {
    window.print();
  };

  // JSON Download handler
  const handleDownload = () => {
    if (!family) return;
    const dataStr = JSON.stringify(family, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${family.pdfNumber}-data.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // CSV Download handler
  const handleDownloadCSV = () => {
    if (!family) return;
    const headers = ['Name', 'Relation', 'Age', 'Gender', 'Aadhaar', 'Occupation'];
    const rows = family.members.map(m => [m.name, m.relation, m.age, m.gender, m.aadhar || 'N/A', m.occupation || 'N/A']);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${family.pdfNumber}-members.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#F0F4F8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm tracking-widest uppercase" style={{ fontFamily: 'var(--font-jetbrains)' }}>Loading Family</p>
        </div>
      </div>
    );
  }

  if (!family) {
    return (
      <div className="w-full min-h-screen bg-[#F0F4F8] flex items-center justify-center">
        <p className="text-red-600 font-medium">Family not found</p>
      </div>
    );
  }

  const accentColor = family.village.mandal.color;
  const statusCfg = SES_STATUS_CONFIG[family.sesStatus] || SES_STATUS_CONFIG.SURVEYED;
  const timelinePos = getTimelinePosition(family.sesStatus);
  const isRejected = family.sesStatus === 'REJECTED';
  const StatusIcon = SES_STATUS_ICONS[family.sesStatus] || FileText;

  return (
    <div ref={containerRef} className="w-full min-h-screen bg-[#F0F4F8] flex flex-col">
      {/* Sidebar Navigation */}
      <SidebarNav />

      {/* Tricolor Bar */}
      <div className="tricolor-bar w-full" />

      {/* Top Nav - Navy gradient */}
      <div className="sticky top-[3px] z-50 bg-gradient-to-r from-[#0F2B46] to-[#1E3A5F] shadow-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MobileMenuButton />
            <button onClick={goBack} className="text-white/70 hover:text-white transition-colors text-sm flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" /><span className="hidden sm:inline">Back</span>
            </button>
            <div className="w-px h-6 bg-white/20" />
            <span className="text-sm text-white/60">{family.village.mandal.name}</span>
            <ChevronRight className="w-3 h-3 text-white/40" />
            <span className="text-sm text-white/60">{family.village.name}</span>
            <ChevronRight className="w-3 h-3 text-white/40" />
            <span className="text-sm font-medium text-amber-300">{family.pdfNumber}</span>
          </div>
          <GlobalSearch />
          <div className="flex items-center gap-1.5 text-green-300 text-xs"><Activity className="w-3 h-3" /><span>LIVE</span></div>
          <ThemeToggle />
        </div>
      </div>
      <div className="flex-1 lg:pl-[52px]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6"><Breadcrumb /></div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ===== A. Header Card Enhancement ===== */}
        <div className="anim-in opacity-0 gov-card p-6 border-l-[6px] border-l-[#D97706] relative overflow-hidden">
          {/* Subtle gradient accent at top */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D97706] via-[#1E3A5F] to-[#D97706] opacity-30" />
          
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 relative z-[1]">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="gov-badge px-3 py-1.5 rounded-md border bg-amber-50 border-amber-300 text-amber-700 tracking-widest text-sm font-semibold flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Family #{family.pdfNumber}
                </span>
                {family.firstSchemeEligible && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-amber-700 bg-amber-50 border border-amber-300">
                    <Star className="w-3 h-3 fill-amber-600 text-amber-600" /> First Scheme Eligible
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{family.headName}</h1>
              <p className="text-slate-500 mt-1">{family.headNameTelugu}</p>
              
              {/* Breadcrumb-style chips for mandal and village */}
              <div className="flex items-center gap-2 mt-3">
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  <MapPin className="w-3 h-3" />
                  {family.village.mandal.name} Mandal
                </span>
                <ChevronRight className="w-3 h-3 text-slate-300" />
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  <Home className="w-3 h-3" />
                  {family.village.name}
                </span>
              </div>
            </div>
            {/* Larger SES status badge with icon */}
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border ${statusCfg.color} ${statusCfg.bg} ${statusCfg.border}`}>
              <StatusIcon className="w-5 h-5" />
              <span className="text-sm font-bold">{statusCfg.label}</span>
            </div>
          </div>
        </div>

        {/* ===== B. Quick Stats Row Enhancement ===== */}
        <div className="anim-in opacity-0 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Members */}
          <div className={`flex items-center gap-3 bg-gradient-to-br ${QUICK_STAT_CONFIGS[0].gradient} border border-slate-200 border-t-2 ${QUICK_STAT_CONFIGS[0].topBorder} rounded-lg px-4 py-3.5`}>
            <div className={`w-10 h-10 rounded-full ${QUICK_STAT_CONFIGS[0].circleBg} flex items-center justify-center`}>
              <Users className={`w-5 h-5 ${QUICK_STAT_CONFIGS[0].iconColor}`} />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">{family.members.length}</p>
              <p className="text-xs text-slate-500">Members</p>
            </div>
          </div>
          {/* Minors */}
          <div className={`flex items-center gap-3 bg-gradient-to-br ${QUICK_STAT_CONFIGS[1].gradient} border border-slate-200 border-t-2 ${QUICK_STAT_CONFIGS[1].topBorder} rounded-lg px-4 py-3.5`}>
            <div className={`w-10 h-10 rounded-full ${QUICK_STAT_CONFIGS[1].circleBg} flex items-center justify-center`}>
              <Users className={`w-5 h-5 ${QUICK_STAT_CONFIGS[1].iconColor}`} />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">{family.members.filter(m => m.isMinor).length}</p>
              <p className="text-xs text-slate-500">Minors</p>
            </div>
          </div>
          {/* Land */}
          <div className={`flex items-center gap-3 bg-gradient-to-br ${QUICK_STAT_CONFIGS[2].gradient} border border-slate-200 border-t-2 ${QUICK_STAT_CONFIGS[2].topBorder} rounded-lg px-4 py-3.5`}>
            <div className={`w-10 h-10 rounded-full ${QUICK_STAT_CONFIGS[2].circleBg} flex items-center justify-center`}>
              <LandPlot className={`w-5 h-5 ${QUICK_STAT_CONFIGS[2].iconColor}`} />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">{family.landAcres || 0} acres</p>
              <p className="text-xs text-slate-500">Land</p>
            </div>
          </div>
          {/* Plot */}
          <div className={`flex items-center gap-3 bg-gradient-to-br ${QUICK_STAT_CONFIGS[3].gradient} border border-slate-200 border-t-2 ${QUICK_STAT_CONFIGS[3].topBorder} rounded-lg px-4 py-3.5`}>
            <div className={`w-10 h-10 rounded-full ${QUICK_STAT_CONFIGS[3].circleBg} flex items-center justify-center`}>
              <Home className={`w-5 h-5 ${QUICK_STAT_CONFIGS[3].iconColor}`} />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">{family.newPlot ? family.newPlot.allotmentStatus : 'Not Allotted'}</p>
              <p className="text-xs text-slate-500">Plot</p>
            </div>
          </div>
        </div>

        {/* ===== C. Timeline Enhancement ===== */}
        <div className="anim-in opacity-0 gov-card p-6">
          <h3 className="text-sm font-semibold text-slate-900 tracking-wide mb-6">STATUS TIMELINE</h3>
          <div className="relative">
            <div className="flex items-center justify-between">
              {TIMELINE_STEPS.map((step, i) => {
                const isCompleted = !isRejected && i <= timelinePos;
                const isCurrent = !isRejected && i === timelinePos;
                const isFuture = !isRejected && i > timelinePos;
                const Icon = step.icon;
                return (
                  <div key={step.key} className="flex flex-col items-center relative z-10">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center border-2 transition-all relative ${
                      isCompleted && !isCurrent ? 'border-green-600 bg-green-600' :
                      isCurrent ? 'border-amber-600 bg-amber-500 animate-pulse shadow-lg shadow-amber-300/50 ring-4 ring-amber-100' :
                      'border-slate-300 bg-slate-100'
                    }`}>
                      {/* Step number inside the circle */}
                      <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center ${
                        isCompleted && !isCurrent ? 'bg-green-800 text-white' :
                        isCurrent ? 'bg-amber-700 text-white' :
                        'bg-slate-300 text-slate-600'
                      }`}>
                        {step.stepNum}
                      </span>
                      <Icon className={`w-4 h-4 ${
                        isCompleted && !isCurrent ? 'text-white' :
                        isCurrent ? 'text-white' :
                        'text-slate-400'
                      }`} />
                    </div>
                    <span className={`text-xs mt-2.5 font-medium ${
                      isCompleted && !isCurrent ? 'text-green-700' :
                      isCurrent ? 'text-amber-700' :
                      'text-slate-400'
                    }`}>
                      {step.label}
                    </span>
                    <span className={`text-[10px] mt-0.5 ${
                      isCompleted || isCurrent ? 'text-slate-500' : 'text-slate-300'
                    }`}>
                      {step.date}
                    </span>
                    {/* Pending label on future steps */}
                    {isFuture && (
                      <span className="text-[9px] mt-1 text-slate-300 font-medium uppercase tracking-wider">Pending</span>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Progress line - now dotted for uncompleted parts */}
            <div className="absolute top-[22px] left-0 right-0 h-0.5 -z-0 flex">
              {/* Completed section - solid */}
              {!isRejected && timelinePos > 0 && (
                <div
                  className="h-full bg-green-600"
                  style={{ width: `${(timelinePos / 3) * 100}%` }}
                />
              )}
              {/* Remaining section - dotted */}
              {!isRejected && (
                <div
                  className="h-full border-t-2 border-dashed border-slate-300"
                  style={{ width: `${((3 - timelinePos) / 3) * 100}%` }}
                />
              )}
              {isRejected && (
                <div className="h-full bg-red-500 w-full" />
              )}
            </div>
            {/* Dotted connecting lines between each step */}
            {!isRejected && TIMELINE_STEPS.map((_, i) => {
              if (i >= TIMELINE_STEPS.length - 1) return null;
              const segmentCompleted = i < timelinePos;
              return (
                <div
                  key={`line-${i}`}
                  className="absolute top-[22px] -z-0"
                  style={{
                    left: `${(i / 3) * 100 + (100 / 6)}%`,
                    width: `${100 / 3}%`,
                  }}
                >
                  <div className={`h-0.5 w-full ${segmentCompleted ? 'bg-green-600' : 'border-t-2 border-dashed border-slate-300'}`} />
                </div>
              );
            })}
          </div>
          {/* Current step glow effect indicator */}
          {!isRejected && timelinePos >= 0 && (
            <div className="flex justify-center mt-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Current: {TIMELINE_STEPS[timelinePos]?.label}
              </span>
            </div>
          )}
          {isRejected && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-center">
              <p className="text-xs text-red-700 font-medium">Application rejected — review required</p>
            </div>
          )}
        </div>

        {/* ===== D. Family Details & New Plot Cards Enhancement ===== */}
        <div className="anim-in opacity-0 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="gov-card p-5">
            <h3 className="text-sm font-semibold text-slate-900 tracking-wide mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#0F2B46]" />
              FAMILY DETAILS
            </h3>
            <div className="space-y-0">
              {[
                { label: 'Caste Category', value: family.caste || 'N/A', icon: Users },
                { label: 'Land Holding', value: family.landAcres ? `${family.landAcres} acres` : 'N/A', icon: LandPlot },
                { label: 'House Type', value: family.houseType || 'N/A', icon: Home },
                { label: 'Total Members', value: String(family.members.length), icon: Users },
              ].map((item, i) => (
                <div key={i} className={`flex items-center justify-between py-2.5 px-2 rounded-md ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                  <span className="text-xs text-slate-500 flex items-center gap-2">
                    <item.icon className="w-3.5 h-3.5 text-slate-400" />{item.label}
                  </span>
                  <span className="text-sm text-slate-900 font-medium bg-slate-50 px-2 py-0.5 rounded">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="gov-card p-5">
            <h3 className="text-sm font-semibold text-slate-900 tracking-wide mb-4 flex items-center gap-2">
              <Home className="w-4 h-4 text-[#0F2B46]" />
              NEW PLOT STATUS
            </h3>
            {family.newPlot ? (
              <div className="space-y-0">
                {[
                  { label: 'Plot Number', value: family.newPlot.plotNumber || 'Pending', icon: LandPlot },
                  { label: 'Colony', value: family.newPlot.colonyName || 'Pending', icon: Home },
                  { label: 'Area', value: family.newPlot.areaSqYards ? `${family.newPlot.areaSqYards} sq. yards` : 'Pending', icon: LandPlot },
                  { label: 'Allotment Status', value: family.newPlot.allotmentStatus, icon: Clock },
                ].map((item, i) => {
                  const allotCfg = i === 3 ? ALLOTMENT_STATUS_CONFIG[item.value] : null;
                  return (
                    <div key={i} className={`flex items-center justify-between py-2.5 px-2 rounded-md ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                      <span className="text-xs text-slate-500 flex items-center gap-2">
                        <item.icon className="w-3.5 h-3.5 text-slate-400" />{item.label}
                      </span>
                      {allotCfg ? (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${allotCfg.color} ${allotCfg.bg} border ${allotCfg.border}`}>
                          {allotCfg.label}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-900 font-medium bg-slate-50 px-2 py-0.5 rounded">{item.value}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center py-6 text-center">
                <Clock className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">No plot allotted yet</p>
                <p className="text-xs text-slate-400 mt-1">Pending SES verification</p>
              </div>
            )}
          </div>
        </div>

        {/* ===== E. Members Table Enhancement ===== */}
        <div className="anim-in opacity-0 gov-card p-5 overflow-hidden">
          <h3 className="text-sm font-semibold text-slate-900 tracking-wide mb-4">FAMILY MEMBERS ({family.members.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                  <th className="text-left pb-3 pt-2 px-2 font-medium">#</th>
                  <th className="text-left pb-3 pt-2 px-2 font-medium">Name</th>
                  <th className="text-left pb-3 pt-2 px-2 font-medium hidden sm:table-cell">Relation</th>
                  <th className="text-left pb-3 pt-2 px-2 font-medium">Age</th>
                  <th className="text-left pb-3 pt-2 px-2 font-medium hidden md:table-cell">Gender</th>
                  <th className="text-left pb-3 pt-2 px-2 font-medium hidden lg:table-cell">Aadhaar</th>
                  <th className="text-left pb-3 pt-2 px-2 font-medium hidden md:table-cell">Occupation</th>
                  <th className="text-right pb-3 pt-2 px-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {family.members.map((m, i) => (
                  <motion.tr
                    key={m.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer group transition-colors relative"
                    onClick={() => navigateToMember(m.id)}
                  >
                    {/* Row number */}
                    <td className="py-3 px-2 text-slate-400 text-xs font-mono">{i + 1}</td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-amber-100 text-amber-700">
                          {m.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-slate-900 text-sm font-medium">{m.name}</p>
                          {m.nameTelugu && <p className="text-slate-400 text-xs">{m.nameTelugu}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 hidden sm:table-cell">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        m.relation === 'Head' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {m.relation}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-slate-700">{m.age}{m.isMinor ? ' (Minor)' : ''}</td>
                    <td className="py-3 px-2 hidden md:table-cell">
                      <span className="text-slate-500 flex items-center gap-1">
                        {m.gender === 'Male' ? (
                          <span className="text-blue-500">♂</span>
                        ) : m.gender === 'Female' ? (
                          <span className="text-pink-500">♀</span>
                        ) : null}
                        {m.gender}
                      </span>
                    </td>
                    <td className="py-3 px-2 hidden lg:table-cell">
                      <span className="gov-badge text-slate-400">{m.aadhar || 'N/A'}</span>
                    </td>
                    <td className="py-3 px-2 hidden md:table-cell text-slate-500">{m.occupation || 'N/A'}</td>
                    <td className="py-3 px-2 text-right">
                      <span className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Click to view</span>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ===== F. Action Bar Enhancement ===== */}
        <div className="anim-in opacity-0 flex flex-wrap gap-3 no-print">
          {family.newPlot && (
            <button
              onClick={() => navigateToRelocation(family.id)}
              className="flex items-center gap-2.5 px-6 py-3 bg-white border border-green-300 text-green-700 rounded-lg text-sm font-medium hover:bg-green-50 hover:shadow-md transition-all shadow-sm"
            >
              <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
                <MapPin className="w-3.5 h-3.5 text-green-600" />
              </div>
              View New Plot
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={handleDownload}
            className="flex items-center gap-2.5 px-6 py-3 bg-white border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 hover:shadow-md transition-all shadow-sm"
          >
            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center">
              <Download className="w-3.5 h-3.5 text-slate-500" />
            </div>
            Download Data
          </button>
          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-2.5 px-6 py-3 bg-white border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 hover:shadow-md transition-all shadow-sm"
          >
            <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center">
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-500" />
            </div>
            Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2.5 px-6 py-3 bg-white border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 hover:shadow-md transition-all shadow-sm"
          >
            <div className="w-7 h-7 rounded-full bg-amber-50 flex items-center justify-center">
              <Printer className="w-3.5 h-3.5 text-amber-600" />
            </div>
            Print SES Sheet
          </button>
        </div>

        {/* ===== G. Related Families Enhancement ===== */}
        {relatedFamilies.length > 0 && (
          <div className="anim-in opacity-0 gov-card p-6">
            <h3 className="text-sm font-semibold text-slate-900 tracking-wide mb-4">NEARBY FAMILIES</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {relatedFamilies.map((rf) => {
                const rfStatusCfg = SES_STATUS_CONFIG[rf.sesStatus] || SES_STATUS_CONFIG.SURVEYED;
                const rfBorderClass = SES_STATUS_BORDER[rf.sesStatus] || 'border-l-slate-300';
                return (
                  <button
                    key={rf.id}
                    onClick={() => navigateToFamily(rf.pdfNumber, rf.id)}
                    className={`flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 border-l-4 ${rfBorderClass} rounded-lg hover:bg-slate-100 hover:border-slate-300 hover:shadow-sm transition-all text-left group`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono font-semibold text-amber-700 tracking-wider">{rf.pdfNumber}</p>
                      <p className="text-sm text-slate-900 font-medium truncate mt-0.5">{rf.headName}</p>
                      {rf.villageName && (
                        <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5" />
                          {rf.villageName}
                        </p>
                      )}
                    </div>
                    <span className={`shrink-0 px-2.5 py-1 rounded text-[10px] font-medium border ${rfStatusCfg.color} ${rfStatusCfg.bg} ${rfStatusCfg.border}`}>
                      {rfStatusCfg.label}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0 mt-0.5" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      </div>
      <GovFooter />
    </div>
  );
}
