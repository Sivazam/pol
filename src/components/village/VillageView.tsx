'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { SES_STATUS_CONFIG } from '@/lib/constants';
import CountUp from 'react-countup';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import {
  ChevronLeft, ChevronRight, Activity, Search, Filter,
  Users, Star, MapPin, Eye, X,
} from 'lucide-react';

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
    // We need to find the village - fetch all mandals, then all villages
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

  // GSAP entrance
  useEffect(() => {
    if (!loading && containerRef.current) {
      const els = containerRef.current.querySelectorAll('.anim-in');
      gsap.fromTo(els, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.06, ease: 'power3.out' });
    }
  }, [loading, page]);

  const totalPages = Math.ceil(total / limit);
  const accentColor = village?.mandal?.color || '#F59E0B';

  if (loading && families.length === 0) {
    return (
      <div className="w-full min-h-screen bg-[#0A0F1E] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm tracking-widest uppercase" style={{ fontFamily: 'var(--font-jetbrains)' }}>Loading Village</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full min-h-screen bg-[#0A0F1E]">
      {/* Top Nav */}
      <div className="sticky top-0 z-50 bg-[#0A0F1E]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" /><span className="hidden sm:inline">Back</span>
            </button>
            <div className="w-px h-6 bg-white/10" />
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
              <span className="text-sm font-medium text-white tracking-wide" style={{ fontFamily: 'var(--font-jetbrains)' }}>{village?.name?.toUpperCase() || 'VILLAGE'}</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span style={{ color: accentColor }}>{village?.mandal?.name}</span>
            <div className="flex items-center gap-1.5 text-green-400"><Activity className="w-3 h-3" /><span>LIVE</span></div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Village Header */}
        <div className="anim-in opacity-0 text-center space-y-2 py-2">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: accentColor }}>{village?.name}</h1>
          <p className="text-gray-400 text-lg">{village?.nameTelugu}</p>
          <div className="flex items-center justify-center gap-6 pt-2">
            <div className="flex flex-col items-center">
              <span className="counter-value text-2xl font-bold text-white"><CountUp end={total} duration={1.5} separator="," /></span>
              <span className="text-xs text-gray-500">Total Families</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="counter-value text-2xl font-bold text-green-400"><CountUp end={village?.firstSchemeCount || 0} duration={1.5} separator="," /></span>
              <span className="text-xs text-gray-500">First Scheme</span>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="anim-in opacity-0 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by PDF number or family name..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 bg-[#111827] border border-white/8 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/40 transition-colors"
            />
            {search && (
              <button onClick={() => { setSearch(''); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <select
              value={sesFilter}
              onChange={e => { setSesFilter(e.target.value); setPage(1); }}
              className="pl-10 pr-8 py-2.5 bg-[#111827] border border-white/8 rounded-lg text-sm text-white appearance-none cursor-pointer focus:outline-none focus:border-blue-500/40"
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
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.04 } } }}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {families.map((f) => {
            const statusCfg = SES_STATUS_CONFIG[f.sesStatus] || SES_STATUS_CONFIG.SURVEYED;
            return (
              <motion.div
                key={f.id}
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                className="glow-card p-4 cursor-pointer group"
                onClick={() => navigateToFamily(f.pdfNumber, f.id)}
              >
                {/* PDF Badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className="gov-badge px-2.5 py-1 rounded-md border bg-amber-500/10 border-amber-500/30 text-amber-400 tracking-widest">
                    {f.pdfNumber}
                  </span>
                  {f.firstSchemeEligible && (
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  )}
                </div>

                {/* Family Head */}
                <p className="text-sm font-medium text-white">{f.headName}</p>
                <p className="text-xs text-gray-500 mt-0.5">{f.headNameTelugu}</p>

                {/* Details */}
                <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{f.memberCount}</span>
                  {f.landAcres && <span>{f.landAcres} acres</span>}
                  {f.houseType && <span>{f.houseType}</span>}
                </div>

                {/* Status Badge */}
                <div className="mt-3 flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusCfg.color} ${statusCfg.bg} border ${statusCfg.border}`}>
                    {statusCfg.label}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-300 transition-colors" />
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Empty State */}
        {families.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-500">No families found matching your criteria</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-xs rounded border border-white/10 text-gray-400 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="text-xs text-gray-500">
              Page {page} of {totalPages} ({total} total)
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-xs rounded border border-white/10 text-gray-400 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
