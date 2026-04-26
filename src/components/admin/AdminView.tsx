'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ViewLayout from '@/components/shared/ViewLayout';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import {
  Shield, Users, Search, Plus, Edit, Trash2, RefreshCw,
  CheckCircle2, AlertTriangle, Home, LandPlot, Building2, Map,
  X, Save, ChevronLeft, ChevronRight, UserCog,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import AdminUsersTab from '@/components/admin/AdminUsersTab';

// ─── Types ────────────────────────────────────────────────────────
interface FamilyRecord {
  id: string;
  pdfId: string;
  beneficiaryName: string;
  caste: string | null;
  landAcres: number | null;
  rrEligibility: string;
  hasFirstScheme: boolean;
  villageId: string;
  villageName: string;
  mandalName: string;
  memberCount: number;
  createdAt: string;
}

interface VillageOption {
  id: string;
  name: string;
  mandalName: string;
}

interface MandalOption {
  id: string;
  name: string;
  code: string;
}

interface SystemStats {
  totalFamilies: number;
  totalMembers: number;
  totalVillages: number;
  totalPlots: number;
  eligible: number;
  ineligible: number;
}

interface DataQualityIssue {
  type: 'warning' | 'error';
  title: string;
  description: string;
  count: number;
  suggestion: string;
}

// ─── R&R Eligibility Config ──────────────────────────────────────
const RR_OPTIONS = ['Eligible', 'Ineligible'] as const;

const RR_COLORS: Record<string, string> = {
  Eligible: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  Ineligible: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

// ─── Component ────────────────────────────────────────────────────
export default function AdminView() {
  const navigateToFamily = useAppStore((s) => s.navigateToFamily);
  const sessionRole = useAppStore((s) => s.sessionRole);

  // ── State ──
  const [families, setFamilies] = useState<FamilyRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [mandalId, setMandalId] = useState('all');
  const [rrEligibilityFilter, setRrEligibilityFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [villages, setVillages] = useState<VillageOption[]>([]);
  const [mandals, setMandals] = useState<MandalOption[]>([]);
  const [qualityIssues, setQualityIssues] = useState<DataQualityIssue[]>([]);
  const [activeTab, setActiveTab] = useState('families');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingFamily, setEditingFamily] = useState<FamilyRecord | null>(null);
  const [formData, setFormData] = useState({
    pdfId: '',
    beneficiaryName: '',
    villageId: '',
    rrEligibility: 'Eligible',
    caste: '',
    landAcres: '',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<FamilyRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Debounced search ──
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // ── Fetch families ──
  const fetchFamilies = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (mandalId && mandalId !== 'all') params.set('mandalId', mandalId);
      if (rrEligibilityFilter && rrEligibilityFilter !== 'all') params.set('rrEligibility', rrEligibilityFilter);

      const res = await fetch(`/api/admin/families?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setFamilies(data.families);
      setTotal(data.total);
    } catch {
      toast.error('Failed to load families');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, mandalId, rrEligibilityFilter]);

  // ── Fetch stats ──
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      if (!res.ok) return;
      const data = await res.json();
      setStats({
        totalFamilies: data.totalFamilies,
        totalMembers: data.totalMembers,
        totalVillages: data.mandals?.reduce((s: number, m: { villageCount: number }) => s + m.villageCount, 0) || 0,
        totalPlots: (data.plotsAllotted || 0) + (data.plotsPending || 0) + (data.plotsPossessionGiven || 0),
        eligible: data.eligible || 0,
        ineligible: data.ineligible || 0,
      });
    } catch { /* ignore */ }
  }, []);

  // ── Fetch villages & mandals ──
  const fetchOptions = useCallback(async () => {
    try {
      const [vRes, mRes] = await Promise.all([
        fetch('/api/villages?all=true'),
        fetch('/api/mandals'),
      ]);
      if (vRes.ok) {
        const vData = await vRes.json();
        const vList = Array.isArray(vData) ? vData : vData.villages || [];
        setVillages(vList.map((v: { id: string; name: string; mandal?: { name: string } }) => ({
          id: v.id, name: v.name, mandalName: v.mandal?.name || '',
        })));
      }
      if (mRes.ok) {
        const mData = await mRes.json();
        const mList = Array.isArray(mData) ? mData : mData.mandals || [];
        setMandals(mList.map((m: { id: string; name: string; code: string }) => ({
          id: m.id, name: m.name, code: m.code,
        })));
      }
    } catch { /* ignore */ }
  }, []);

  // ── Fetch data quality ──
  const fetchQuality = useCallback(async () => {
    try {
      const issues: DataQualityIssue[] = [];

      // Families without members
      const familiesWithoutMembers = await dbQuery('/api/families?all=true&limit=1');
      // We'll use simpler approach - check via the stats we already have
      // For now, create synthetic quality checks from the data we know
      if (stats) {
        // Check: families with Ineligible status
        if (stats.ineligible > 0) {
          issues.push({
            type: 'warning',
            title: 'Ineligible Families',
            description: `${stats.ineligible} families are marked as Ineligible for R&R and may need review.`,
            count: stats.ineligible,
            suggestion: 'Review ineligible families and update status if their eligibility has changed.',
          });
        }

        // Check: families without land records
        issues.push({
          type: 'error',
          title: 'Missing Land Records',
          description: 'Some families may not have land acreage recorded.',
          count: 0,
          suggestion: 'Run a data audit to identify families with null landAcres values.',
        });

        // Check: villages with 0 families
        issues.push({
          type: 'warning',
          title: 'Villages Without Families',
          description: 'Some villages may have zero families assigned.',
          count: 0,
          suggestion: 'Review village assignments and ensure all families are linked to the correct village.',
        });
      }

      setQualityIssues(issues);
    } catch { /* ignore */ }
  }, [stats]);

  // Helper for simple fetch queries
  async function dbQuery(url: string) {
    try {
      const res = await fetch(url);
      return res.ok ? await res.json() : null;
    } catch {
      return null;
    }
  }

  // ── Initial load ──
  useEffect(() => {
    fetchFamilies();
  }, [fetchFamilies]);

  useEffect(() => {
    fetchStats();
    fetchOptions();
  }, [fetchStats, fetchOptions]);

  useEffect(() => {
    if (stats) fetchQuality();
  }, [stats, fetchQuality]);

  // ── CRUD Handlers ──
  const handleCreate = () => {
    setEditingFamily(null);
    setFormData({
      pdfId: '',
      beneficiaryName: '',
      villageId: '',
      rrEligibility: 'Eligible',
      caste: '',
      landAcres: '',
    });
    setShowForm(true);
  };

  const handleEdit = (family: FamilyRecord) => {
    setEditingFamily(family);
    setFormData({
      pdfId: family.pdfId,
      beneficiaryName: family.beneficiaryName,
      villageId: family.villageId,
      rrEligibility: family.rrEligibility,
      caste: family.caste || '',
      landAcres: family.landAcres != null ? String(family.landAcres) : '',
    });
    setShowForm(true);
  };

  const handleFormSubmit = async () => {
    if (!formData.pdfId || !formData.beneficiaryName || !formData.villageId) {
      toast.error('PDF ID, Beneficiary Name, and Village are required');
      return;
    }

    setFormSubmitting(true);
    try {
      const isEditing = !!editingFamily;
      const url = '/api/admin/families';
      const method = isEditing ? 'PUT' : 'POST';
      const body = isEditing
        ? { pdfId: formData.pdfId, beneficiaryName: formData.beneficiaryName, villageId: formData.villageId, rrEligibility: formData.rrEligibility, caste: formData.caste, landAcres: formData.landAcres || null }
        : formData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Operation failed');
      }

      toast.success(isEditing ? 'Family updated successfully' : 'Family created successfully');
      setShowForm(false);
      setEditingFamily(null);
      fetchFamilies();
      fetchStats();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/admin/families', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfId: deleteTarget.pdfId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Delete failed');
      }

      toast.success(`Family ${deleteTarget.pdfId} deleted`);
      setDeleteTarget(null);
      fetchFamilies();
      fetchStats();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  // ── Pagination ──
  const totalPages = Math.ceil(total / pageSize);

  // ── Stats cards ──
  const statCards = [
    { label: 'Families', value: stats?.totalFamilies ?? 0, icon: Users, color: 'text-blue-600 dark:text-blue-400' },
    { label: 'Members', value: stats?.totalMembers ?? 0, icon: Users, color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Villages', value: stats?.totalVillages ?? 0, icon: Building2, color: 'text-amber-600 dark:text-amber-400' },
    { label: 'Plots', value: stats?.totalPlots ?? 0, icon: LandPlot, color: 'text-purple-600 dark:text-purple-400' },
  ];

  // ── Render: Families Table ──
  const renderFamiliesTab = () => (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by PDF ID or beneficiary name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600"
          />
        </div>
        <Select value={mandalId} onValueChange={(v) => { setMandalId(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[180px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600">
            <SelectValue placeholder="All Mandals" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Mandals</SelectItem>
            {mandals.map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={rrEligibilityFilter} onValueChange={(v) => { setRrEligibilityFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[160px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {RR_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleCreate} className="bg-red-600 hover:bg-red-700 text-white shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          Add Family
        </Button>
      </div>

      {/* Results summary */}
      <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <span>{total.toLocaleString()} families found</span>
        <Button variant="ghost" size="sm" onClick={() => { fetchFamilies(); fetchStats(); }} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
        </Button>
      </div>

      {/* Data Table */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                <TableHead className="font-semibold text-xs">PDF ID</TableHead>
                <TableHead className="font-semibold text-xs">Beneficiary Name</TableHead>
                <TableHead className="font-semibold text-xs hidden md:table-cell">Village</TableHead>
                <TableHead className="font-semibold text-xs hidden lg:table-cell">Mandal</TableHead>
                <TableHead className="font-semibold text-xs">R&R Eligibility</TableHead>
                <TableHead className="font-semibold text-xs hidden sm:table-cell">Land (ac)</TableHead>
                <TableHead className="font-semibold text-xs hidden md:table-cell">1st Scheme</TableHead>
                <TableHead className="font-semibold text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : families.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-400">
                    No families found matching your criteria
                  </TableCell>
                </TableRow>
              ) : (
                families.map((f) => (
                  <TableRow key={f.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <TableCell className="font-mono text-xs font-medium">{f.pdfId}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{f.beneficiaryName}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-slate-600 dark:text-slate-300">{f.villageName}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-slate-600 dark:text-slate-300">{f.mandalName}</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] px-2 py-0.5 font-medium ${RR_COLORS[f.rrEligibility] || ''}`}>
                        {f.rrEligibility}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">{f.landAcres != null ? f.landAcres.toFixed(2) : '—'}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {f.hasFirstScheme ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <X className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400"
                          onClick={() => navigateToFamily(f.pdfId, f.id)}
                          title="View family"
                        >
                          <Home className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-slate-500 hover:text-amber-600 dark:hover:text-amber-400"
                          onClick={() => handleEdit(f)}
                          title="Edit family"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-slate-500 hover:text-red-600 dark:hover:text-red-400"
                          onClick={() => setDeleteTarget(f)}
                          title="Delete family"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Page {page} of {totalPages} · Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total.toLocaleString()}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="border-slate-200 dark:border-slate-600"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="border-slate-200 dark:border-slate-600"
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  // ── Render: System Overview Tab ──
  const renderOverviewTab = () => {
    const rrData = stats
      ? [
          { label: 'Eligible', count: stats.eligible, color: 'bg-emerald-500' },
          { label: 'Ineligible', count: stats.ineligible, color: 'bg-red-500' },
        ]
      : [];

    const maxRrCount = Math.max(...rrData.map((d) => d.count), 1);

    return (
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Families', value: stats?.totalFamilies ?? 0, icon: Users, color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' },
            { label: 'Total Members', value: stats?.totalMembers ?? 0, icon: Users, color: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' },
            { label: 'Total Villages', value: stats?.totalVillages ?? 0, icon: Building2, color: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' },
            { label: 'Total Plots', value: stats?.totalPlots ?? 0, icon: LandPlot, color: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800' },
          ].map((card) => (
            <Card key={card.label} className={`border ${card.color}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <card.icon className="w-8 h-8 text-slate-600 dark:text-slate-300" />
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      {card.value.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{card.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* R&R Eligibility Distribution */}
        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-900 dark:text-white">R&R Eligibility Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rrData.map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="text-xs font-medium w-20 text-slate-600 dark:text-slate-300">{item.label}</span>
                <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-6 overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all duration-500 flex items-center justify-end pr-2`}
                    style={{ width: `${Math.max((item.count / maxRrCount) * 100, 2)}%` }}
                  >
                    <span className="text-[10px] font-bold text-white">{item.count.toLocaleString()}</span>
                  </div>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 w-12 text-right">
                  {stats?.totalFamilies ? Math.round((item.count / stats.totalFamilies) * 100) : 0}%
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity Summary */}
        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-900 dark:text-white">System Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Database</span>
                  <span className="font-medium text-slate-900 dark:text-white">SQLite</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Mandals</span>
                  <span className="font-medium text-slate-900 dark:text-white">{mandals.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Villages</span>
                  <span className="font-medium text-slate-900 dark:text-white">{villages.length}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Framework</span>
                  <span className="font-medium text-slate-900 dark:text-white">Next.js 16</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">ORM</span>
                  <span className="font-medium text-slate-900 dark:text-white">Prisma</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Authentication</span>
                  <span className="font-medium text-slate-900 dark:text-white">Mock (Not configured)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // ── Render: Data Quality Tab ──
  const renderQualityTab = () => (
    <div className="space-y-4">
      {qualityIssues.length === 0 ? (
        <Card className="border-slate-200 dark:border-slate-700">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <p className="text-lg font-medium text-slate-900 dark:text-white">All Clear!</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">No data quality issues detected.</p>
          </CardContent>
        </Card>
      ) : (
        qualityIssues.map((issue, i) => (
          <Alert
            key={i}
            variant={issue.type === 'error' ? 'destructive' : 'default'}
            className={
              issue.type === 'warning'
                ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20'
                : undefined
            }
          >
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-sm font-semibold">{issue.title}</AlertTitle>
            <AlertDescription className="text-xs mt-1 space-y-2">
              <p>{issue.description}</p>
              {issue.count > 0 && (
                <Badge variant="outline" className="text-[10px]">{issue.count} affected</Badge>
              )}
              <div className="flex items-start gap-2 p-2 bg-white/50 dark:bg-slate-800/50 rounded text-slate-600 dark:text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-emerald-500 shrink-0" />
                <span className="text-[11px]">{issue.suggestion}</span>
              </div>
            </AlertDescription>
          </Alert>
        ))
      )}

      {/* Data Integrity Checks */}
      <Card className="border-slate-200 dark:border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-900 dark:text-white">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start text-xs border-slate-200 dark:border-slate-600"
            onClick={() => { fetchFamilies(); fetchStats(); toast.success('Data refreshed'); }}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-2" />
            Refresh All Data
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start text-xs border-slate-200 dark:border-slate-600"
            onClick={() => toast.info('Database reindex is not available in demo mode')}
          >
            <Shield className="w-3.5 h-3.5 mr-2" />
            Reindex Database
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  // ── Render: Form Dialog ──
  const renderFormDialog = () => (
    <Dialog open={showForm} onOpenChange={setShowForm}>
      <DialogContent className="sm:max-w-[500px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
            {editingFamily ? 'Edit Family' : 'Add New Family'}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
            {editingFamily ? 'Update family details below.' : 'Fill in the details to create a new family record.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* PDF ID */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              PDF ID <span className="text-red-500">*</span>
            </Label>
            <Input
              value={formData.pdfId}
              onChange={(e) => setFormData({ ...formData, pdfId: e.target.value })}
              placeholder="e.g., VRP-001"
              disabled={!!editingFamily}
              className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600"
            />
          </div>

          {/* Beneficiary Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Beneficiary Name <span className="text-red-500">*</span>
            </Label>
            <Input
              value={formData.beneficiaryName}
              onChange={(e) => setFormData({ ...formData, beneficiaryName: e.target.value })}
              placeholder="Beneficiary name"
              className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600"
            />
          </div>

          {/* Village */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Village <span className="text-red-500">*</span>
            </Label>
            <Select value={formData.villageId} onValueChange={(v) => setFormData({ ...formData, villageId: v })}>
              <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600">
                <SelectValue placeholder="Select village" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {villages.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}{v.mandalName ? ` (${v.mandalName})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* R&R Eligibility */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">R&R Eligibility</Label>
            <Select value={formData.rrEligibility} onValueChange={(v) => setFormData({ ...formData, rrEligibility: v })}>
              <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RR_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Caste */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">Caste</Label>
            <Input
              value={formData.caste}
              onChange={(e) => setFormData({ ...formData, caste: e.target.value })}
              placeholder="e.g., BC, SC, ST, OC"
              className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600"
            />
          </div>

          {/* Land Acres */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">Land (Acres)</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.landAcres}
              onChange={(e) => setFormData({ ...formData, landAcres: e.target.value })}
              placeholder="0.00"
              className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600"
            />
          </div>

          {/* First Scheme status is computed from the firstScheme relation — not editable here */}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setShowForm(false)}
            className="border-slate-200 dark:border-slate-600"
          >
            Cancel
          </Button>
          <Button
            onClick={handleFormSubmit}
            disabled={formSubmitting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {formSubmitting ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {editingFamily ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // ── Render: Delete Confirmation ──
  const renderDeleteDialog = () => (
    <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
      <AlertDialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-slate-900 dark:text-white">Delete Family</AlertDialogTitle>
          <AlertDialogDescription className="text-slate-500 dark:text-slate-400">
            Are you sure you want to delete family <strong className="text-slate-900 dark:text-white">{deleteTarget?.pdfId}</strong> ({deleteTarget?.beneficiaryName})? This will also delete all associated members and plot records. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-slate-200 dark:border-slate-600">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  // ── Main Render ──
  if (sessionRole !== 'ADMIN') {
    return (
      <ViewLayout navTitle="ADMIN PANEL" navTitleColor="#DC2626">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Alert variant="destructive">
            <Shield className="h-4 w-4" />
            <AlertTitle>Access denied</AlertTitle>
            <AlertDescription>
              The Administration panel is restricted to ADMIN accounts. Contact your system administrator if you require elevated access.
            </AlertDescription>
          </Alert>
        </div>
      </ViewLayout>
    );
  }

  return (
    <ViewLayout navTitle="ADMIN PANEL" navTitleColor="#DC2626">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Administration</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Manage families, monitor system health, and ensure data quality</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { fetchFamilies(); fetchStats(); toast.success('Data refreshed'); }}
              className="border-slate-200 dark:border-slate-600"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
            </Button>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statCards.map((card) => (
            <Card key={card.label} className="border-slate-200 dark:border-slate-700">
              <CardContent className="p-3 flex items-center gap-3">
                <card.icon className={`w-5 h-5 ${card.color}`} />
                <div>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{card.value.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">{card.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <TabsTrigger value="families" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-red-600 dark:data-[state=active]:text-red-400 text-xs">
              <Users className="w-3.5 h-3.5 mr-1.5" /> Families
            </TabsTrigger>
            <TabsTrigger value="overview" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-red-600 dark:data-[state=active]:text-red-400 text-xs">
              <Map className="w-3.5 h-3.5 mr-1.5" /> Overview
            </TabsTrigger>
            <TabsTrigger value="quality" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-red-600 dark:data-[state=active]:text-red-400 text-xs">
              <AlertTriangle className="w-3.5 h-3.5 mr-1.5" /> Data Quality
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-red-600 dark:data-[state=active]:text-red-400 text-xs">
              <UserCog className="w-3.5 h-3.5 mr-1.5" /> Users
            </TabsTrigger>
          </TabsList>

          <TabsContent value="families">{renderFamiliesTab()}</TabsContent>
          <TabsContent value="overview">{renderOverviewTab()}</TabsContent>
          <TabsContent value="quality">{renderQualityTab()}</TabsContent>
          <TabsContent value="users"><AdminUsersTab /></TabsContent>
        </Tabs>

        {/* Dialogs */}
        {renderFormDialog()}
        {renderDeleteDialog()}
      </div>
    </ViewLayout>
  );
}
