'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { SES_STATUS_CONFIG } from '@/lib/constants';
import CountUp from 'react-countup';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import {
  ChevronLeft, ChevronRight, Activity, Search, Filter,
  Users, Star, MapPin, X, LandPlot, Home,
} from 'lucide-react';
import GlobalSearch from '@/components/shared/GlobalSearch';
import Breadcrumb from '@/components/shared/Breadcrumb';

interface Family {
  id: string;
  pdfNumber: string;
  headName: string;
  headNameTelugu: string;
  caste: string | null;
  landAcres: number | null;
  houseType: string | null;
  sesStatus: string;
  firstSchemeEligible: boolean;
  memberCount: number;
}

interface VillageInfo {
  id: string;
  name: string;
  nameTelugu: string;
  code: string;
  latitude: number;
  longitude: number;
  totalFamilies: number;
  firstSchemeCount: number;
  statusBreakdown: Record<string, number>;
  mandal: { name: string; color: string };
}

export default function VillageView() {
  const selectedVillageId = useAppStore((s) => s.selectedVillageId);
  const navigateToFamily = useAppStore((s) => s.navigateToFamily);
  const goBack = useAppStore((s) => s.goBack);
  const setView = useAppStore((s) => s.setView);

  const [village, setVillage] = useState<VillageInfo | null>(null);
  const [families, setFamilies] = useState<Family[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sesFilter, setSesFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const limit = 20;

  // Redirect if no village selected
  useEffect(() => {
    if (!selectedVillageId) setView('dashboard');
  }, [selectedVillageId, setView]);

  // Fetch village info from mandals API + find village
  useEffect(() => {
    if (!selectedVillageId) return;
    fetch('/api/mandals')
      .then(r => r.json())
      .then(async (mandals: any[]) => {
        for (const m of mandals) {
          const vRes = await fetch(`/api/villages?mandalId=${m.id}`);
          const villages = await vRes.json();
          const found = villages.find((v: any) => v.id === selectedVillageId);
          if (found) { setVillage(found); break; }
        }
      })
      .catch(() => {});
  }, [selectedVillageId]);

  // Fetch families with pagination and search
  useEffect(() => {
    if (!selectedVillageId) return;
    let cancelled = false;
    const params = new URLSearchParams({
      villageId: selectedVillageId,
      page: String(page),
      limit: String(limit),
    });
    if (search) params.set('search', search);
    if (sesFilter) params.set('sesStatus', sesFilter);

    fetch(`/api/families?${params}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        setFamilies(data.families || []);
        setTotal(data.total || 0);
        setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedVillageId, page, search, sesFilter]);

  // GSAP entrance animation
  useEffect(() => {
    if (!loading && containerRef.current) {
      const els = containerRef.current.querySelectorAll('.anim-in');
      gsap.fromTo(
        els,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.06, ease: 'power3.out' }
      );
    }
  }, [loading, page]);

  const totalPages = Math.ceil(total / limit);
  const accentColor = village?.mandal?.color || '#D97706';

  // Status breakdown for village header
  const statusEntries = village?.statusBreakdown
    ? Object.entries(village.statusBreakdown).map(([key, count]) => ({
        key,
        count,
        config: SES_STATUS_CONFIG[key] || SES_STATUS_CONFIG.SURVEYED,
      }))
    : [];

  // Loading state
  if (loading && families.length === 0) {
    return (
      <div className="w-full min-h-screen bg-[#F0F4F8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-slate-200 border-t-[#1E3A5F] rounded-full animate-spin" />
          <p className="text-slate-400 text-sm tracking-widest uppercase" style={{ fontFamily: 'var(--font-jetbrains)' }}>Loading Village</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full min-h-screen bg-[#F0F4F8]">
      {/* Tricolor Bar */}
      <div className="tricolor-bar w-full sticky top-0 z-[60]" />

      {/* Top Nav Bar - Navy */}
      <div className="sticky top-[3px] z-50 bg-gradient-to-r from-[#0F2B46] to-[#1E3A5F] border-b border-[#0F2B46]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={goBack}
              className="text-white/70 hover:text-white transition-colors text-sm flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="w-px h-6 bg-white/20" />
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: accentColor }}
              />
              <span
                className="text-sm font-medium text-white tracking-wide"
                style={{ fontFamily: 'var(--font-jetbrains)' }}
              >
                {village?.name?.toUpperCase() || 'VILLAGE'}
              </span>
            </div>
          </div>
          <GlobalSearch />
          <div className="flex items-center gap-4 text-xs text-white/60">
            <span style={{ color: accentColor }} className="font-medium">
              {village?.mandal?.name}
            </span>
            <div className="flex items-center gap-1.5 text-emerald-400">
              <Activity className="w-3 h-3" />
              <span>LIVE</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><Breadcrumb /></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Village Header Card */}
        <div className="anim-in opacity-0 gov-card p-6 sm:p-8">
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2 mb-1">
              <MapPin className="w-5 h-5 text-[#D97706]" />
              <span className="text-xs font-medium text-[#D97706] tracking-wider uppercase">
                Village Profile
              </span>
            </div>
            <h1
              className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900"
            >
              {village?.name}
            </h1>
            <p className="text-slate-500 text-lg">{village?.nameTelugu}</p>

            {/* Divider */}
            <div className="ashoka-divider max-w-xs mx-auto" />

            {/* Stat Counters */}
            <div className="flex items-center justify-center gap-8 pt-3">
              <div className="flex flex-col items-center">
                <span className="counter-value text-2xl font-bold text-[#0F2B46]">
                  <CountUp end={total} duration={1.5} separator="," />
                </span>
                <span className="text-xs text-slate-400 mt-0.5">Total Families</span>
              </div>
              <div className="w-px h-10 bg-slate-200" />
              <div className="flex flex-col items-center">
                <span className="counter-value text-2xl font-bold text-emerald-700">
                  <CountUp end={village?.firstSchemeCount || 0} duration={1.5} separator="," />
                </span>
                <span className="text-xs text-slate-400 mt-0.5">First Scheme</span>
              </div>
            </div>
          </div>

          {/* Status Breakdown Mini-bars */}
          {statusEntries.length > 0 && (
            <div className="mt-6 pt-5 border-t border-slate-100">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {statusEntries.map(({ key, count, config }) => (
                  <div
                    key={key}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${config.bg} ${config.border}`}
                  >
                    <span className={`text-sm font-semibold ${config.color}`}>
                      {count}
                    </span>
                    <span className={`text-xs ${config.color} opacity-80`}>
                      {config.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Search & Filter Bar */}
        <div className="anim-in opacity-0 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by PDF number or family name..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); setLoading(true); }}
              className="w-full pl-10 pr-10 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F]/40 transition-all shadow-sm"
            />
            {search && (
              <button
                onClick={() => { setSearch(''); setPage(1); setLoading(true); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={sesFilter}
              onChange={e => { setSesFilter(e.target.value); setPage(1); setLoading(true); }}
              className="pl-10 pr-8 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-sm text-slate-900 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F]/40 transition-all shadow-sm"
            >
              <option value="">All Status</option>
              <option value="SURVEYED">Surveyed</option>
              <option value="VERIFIED">Verified</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        {/* Family Grid */}
        <motion.div
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.04 } },
          }}
          initial="hidden"
          animate="visible"
          key={page}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {families.map((f) => {
            const statusCfg = SES_STATUS_CONFIG[f.sesStatus] || SES_STATUS_CONFIG.SURVEYED;
            return (
              <motion.div
                key={f.id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="gov-card p-4 cursor-pointer group"
                onClick={() => navigateToFamily(f.pdfNumber, f.id)}
              >
                {/* PDF Badge & Star */}
                <div className="flex items-center justify-between mb-3">
                  <span className="gov-badge px-2.5 py-1 rounded-md border bg-amber-50 border-amber-300 text-amber-700 tracking-widest">
                    {f.pdfNumber}
                  </span>
                  {f.firstSchemeEligible && (
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  )}
                </div>

                {/* Family Head Name */}
                <p className="text-sm font-medium text-slate-900 leading-snug">
                  {f.headName}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{f.headNameTelugu}</p>

                {/* Detail Chips */}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                    <Users className="w-3 h-3 text-slate-400" />
                    {f.memberCount}
                  </span>
                  {f.landAcres && (
                    <span className="flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                      <LandPlot className="w-3 h-3 text-slate-400" />
                      {f.landAcres} acres
                    </span>
                  )}
                  {f.houseType && (
                    <span className="flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                      <Home className="w-3 h-3 text-slate-400" />
                      {f.houseType}
                    </span>
                  )}
                </div>

                {/* Status Badge & Arrow */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium border ${statusCfg.color} ${statusCfg.bg} ${statusCfg.border}`}
                  >
                    {statusCfg.label}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Empty State */}
        {families.length === 0 && !loading && (
          <div className="gov-card p-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
                <Search className="w-6 h-6 text-slate-300" />
              </div>
              <p className="text-slate-500 text-sm">No families found matching your criteria</p>
              <button
                onClick={() => { setSearch(''); setSesFilter(''); setPage(1); setLoading(true); }}
                className="text-xs text-[#D97706] hover:underline font-medium"
              >
                Clear filters
              </button>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => { setPage(p => Math.max(1, p - 1)); setLoading(true); }}
              disabled={page === 1}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              Previous
            </button>
            <div className="px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm">
              <span className="text-xs text-slate-500">
                Page <span className="font-semibold text-slate-700">{page}</span> of {totalPages}
              </span>
              <span className="text-xs text-slate-400 ml-2">({total} total)</span>
            </div>
            <button
              onClick={() => { setPage(p => Math.min(totalPages, p + 1)); setLoading(true); }}
              disabled={page === totalPages}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
