'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SES_STATUS_CONFIG, ALLOTMENT_STATUS_CONFIG, MANDAL_COLORS } from '@/lib/constants';
import { Search, X, Download, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Users, Loader2 } from 'lucide-react';

interface FamilyRow {
  id: string;
  pdfNumber: string;
  headName: string;
  headNameTelugu?: string;
  sesStatus: string;
  landAcres: number | null;
  memberCount: number;
  villageName: string;
  mandalName: string;
  mandalCode: string;
  mandalColor: string;
  plotStatus: string;
  firstSchemeEligible: boolean;
}

interface DataTableViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mandalId?: string;
}

const PAGE_SIZE = 20;

const COLUMNS = [
  { key: 'pdfNumber', label: 'PDF Number', sortable: true },
  { key: 'headName', label: 'Head Name', sortable: true },
  { key: 'villageName', label: 'Village', sortable: false },
  { key: 'mandalName', label: 'Mandal', sortable: false },
  { key: 'sesStatus', label: 'SES Status', sortable: true },
  { key: 'landAcres', label: 'Land (acres)', sortable: true },
  { key: 'memberCount', label: 'Members', sortable: true },
  { key: 'plotStatus', label: 'Plot Status', sortable: false },
] as const;

type SortKey = 'pdfNumber' | 'headName' | 'sesStatus' | 'landAcres' | 'memberCount';

export default function DataTableView({ open, onOpenChange, mandalId }: DataTableViewProps) {
  const [families, setFamilies] = useState<FamilyRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [sesFilter, setSesFilter] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('pdfNumber');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(false);

  const fetchFamilies = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        sortBy,
        sortDir,
        all: 'true',
      });
      if (search) params.set('search', search);
      if (sesFilter) params.set('sesStatus', sesFilter);
      if (mandalId) {
        params.delete('all');
        params.set('mandalId', mandalId);
      }

      const res = await fetch(`/api/families?${params}`);
      const data = await res.json();
      setFamilies(data.families || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      setFamilies([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, sesFilter, sortBy, sortDir, mandalId]);

  useEffect(() => {
    if (open) {
      fetchFamilies();
    }
  }, [open, fetchFamilies]);

  const handleSort = (key: string) => {
    if (key === 'villageName' || key === 'mandalName' || key === 'plotStatus') return;
    const sortKey = key as SortKey;
    if (sortBy === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(sortKey);
      setSortDir('asc');
    }
    setPage(1);
  };

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleSesFilter = (val: string) => {
    setSesFilter(val);
    setPage(1);
  };

  const exportCSV = () => {
    const headers = ['PDF Number', 'Head Name', 'Village', 'Mandal', 'SES Status', 'Land (acres)', 'Members', 'Plot Status'];
    const rows = families.map(f => [
      f.pdfNumber,
      f.headName,
      f.villageName,
      f.mandalName,
      f.sesStatus,
      f.landAcres ?? 'N/A',
      f.memberCount,
      f.plotStatus,
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `families-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getSortIcon = (key: string) => {
    if (key !== sortBy) return <ArrowUpDown className="w-3 h-3 text-slate-300" />;
    return sortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 text-[#1E3A5F]" />
      : <ArrowDown className="w-3 h-3 text-[#1E3A5F]" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[95vw] lg:max-w-[1200px] max-h-[90vh] flex flex-col p-0 gap-0 bg-white border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-[#0F2B46] to-[#1E3A5F] rounded-t-lg">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              Family Data Table
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Browse and filter all families across the Polavaram rehabilitation project
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Filters Bar */}
        <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search PDF number or name..."
              value={search}
              onChange={e => handleSearch(e.target.value)}
              className="w-full pl-10 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F]/40 transition-all"
            />
            {search && (
              <button onClick={() => handleSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* SES Status Filter */}
          <div className="relative">
            <select
              value={sesFilter}
              onChange={e => handleSesFilter(e.target.value)}
              className="pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F]/40 transition-all"
            >
              <option value="">All SES Status</option>
              <option value="SURVEYED">Surveyed</option>
              <option value="VERIFIED">Verified</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {/* Result count */}
          <span className="text-xs text-slate-500" style={{ fontFamily: 'var(--font-jetbrains)' }}>
            {total.toLocaleString()} families
          </span>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Export CSV */}
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm font-medium"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                {COLUMNS.map(col => (
                  <TableHead
                    key={col.key}
                    className={`text-xs font-semibold text-slate-600 tracking-wider uppercase ${col.sortable ? 'cursor-pointer select-none hover:text-slate-900' : ''}`}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      {col.sortable && getSortIcon(col.key)}
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-48 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                      <span className="text-sm text-slate-400">Loading families...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : families.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-48 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Search className="w-8 h-8 text-slate-300" />
                      <span className="text-sm text-slate-500">No families found matching your criteria</span>
                      <button onClick={() => { handleSearch(''); handleSesFilter(''); }} className="text-xs text-[#D97706] hover:underline font-medium">
                        Clear filters
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                families.map(f => {
                  const statusCfg = SES_STATUS_CONFIG[f.sesStatus] || SES_STATUS_CONFIG.SURVEYED;
                  const plotCfg = ALLOTMENT_STATUS_CONFIG[f.plotStatus];
                  const mandalBorderColor = MANDAL_COLORS[f.mandalCode as keyof typeof MANDAL_COLORS] || f.mandalColor || '#64748B';

                  return (
                    <TableRow key={f.id} className="hover:bg-slate-50/80 transition-colors group">
                      <TableCell>
                        <span className="gov-badge px-2 py-0.5 rounded border bg-amber-50 border-amber-200 text-amber-700 tracking-wider text-xs font-semibold">
                          {f.pdfNumber}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{f.headName}</p>
                          {f.headNameTelugu && <p className="text-xs text-slate-400">{f.headNameTelugu}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{f.villageName}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center text-sm font-medium pl-2.5 border-l-3" style={{ borderLeftColor: mandalBorderColor, borderLeftWidth: 3 }}>
                          {f.mandalName}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${statusCfg.color} ${statusCfg.bg} ${statusCfg.border}`}>
                          {statusCfg.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-slate-700 font-mono">{f.landAcres != null ? f.landAcres.toFixed(2) : 'N/A'}</TableCell>
                      <TableCell className="text-sm text-slate-700 text-center">{f.memberCount}</TableCell>
                      <TableCell>
                        {plotCfg ? (
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${plotCfg.color} ${plotCfg.bg} ${plotCfg.border}`}>
                            {plotCfg.label}
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium border border-slate-200 bg-slate-50 text-slate-500">
                            Not Allotted
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="text-xs text-slate-500" style={{ fontFamily: 'var(--font-jetbrains)' }}>
            Page {page} of {totalPages} · {total.toLocaleString()} total
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-1"
            >
              <ChevronLeft className="w-3 h-3" /> Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-1"
            >
              Next <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
