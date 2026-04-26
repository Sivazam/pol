'use client';

import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useTheme } from 'next-themes';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Settings,
  Sun,
  Moon,
  Minimize2,
  Sparkles,
  Database,
  Bell,
  Volume2,
  Info,
  LayoutDashboard,
  Globe,
  ArrowUpDown,
  Hash,
} from 'lucide-react';

// ─── Database Stats Type ────────────────────────────────────────

interface DbStats {
  families: number;
  members: number;
  plots: number;
  mandals: number;
  villages: number;
}

// ─── Settings Section Wrapper ───────────────────────────────────

function SettingsSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Icon className="w-4 h-4 text-[#D97706]" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F2B46] dark:text-amber-400">
          {title}
        </h3>
      </div>
      <div className="bg-white dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
        {children}
      </div>
    </div>
  );
}

// ─── Settings Row ───────────────────────────────────────────────

function SettingsRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex-1 min-w-0 mr-3">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{label}</p>
        {description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN SETTINGS PANEL
// ═══════════════════════════════════════════════════════════════════

export default function SettingsPanel() {
  const {
    settingsPanelOpen,
    setSettingsPanelOpen,
    compactMode,
    setCompactMode,
    animationsEnabled,
    setAnimationsEnabled,
    defaultPageSize,
    setDefaultPageSize,
    defaultSortOrder,
    setDefaultSortOrder,
    defaultStartupView,
    setDefaultStartupView,
    notificationBannerVisible,
    setNotificationBannerVisible,
    notificationSoundEnabled,
    setNotificationSoundEnabled,
  } = useAppStore();

  const { theme, setTheme } = useTheme();
  const [dbStats, setDbStats] = useState<DbStats | null>(null);

  // Fetch database stats on open
  useEffect(() => {
    if (settingsPanelOpen) {
      fetch('/api/stats')
        .then((r) => r.json())
        .then((data) => {
          setDbStats({
            families: data.totalFamilies || 0,
            members: data.totalMembers || 0,
            plots: data.totalPlots || 0,
            mandals: data.totalMandals || 0,
            villages: data.totalVillages || 0,
          });
        })
        .catch(() => {});
    }
  }, [settingsPanelOpen]);

  const isDark = theme === 'dark';

  return (
    <Sheet open={settingsPanelOpen} onOpenChange={setSettingsPanelOpen}>
      <SheetContent
        side="right"
        className="w-[380px] sm:w-[420px] bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 p-0 overflow-y-auto"
      >
        {/* Header */}
        <SheetHeader className="bg-gradient-to-r from-[#0F2B46] to-[#1E3A5F] dark:from-slate-800 dark:to-slate-900 p-5 pb-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Settings className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <SheetTitle className="text-white text-lg font-bold tracking-tight">
                Settings
              </SheetTitle>
              <SheetDescription className="text-white/60 text-xs">
                Customize your Polavaram R&R Portal experience
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Settings Content */}
        <div className="p-5 space-y-6">
          {/* ═══ Display Settings ═══ */}
          <SettingsSection title="Display" icon={Sun}>
            {/* Theme Toggle */}
            <SettingsRow
              label="Theme"
              description={isDark ? 'Dark mode active' : 'Light mode active'}
            >
              <button
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-[#D97706] transition-colors"
                aria-label="Toggle theme"
              >
                {isDark ? (
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Moon className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                  {isDark ? 'Dark' : 'Light'}
                </span>
              </button>
            </SettingsRow>

            {/* Compact Mode */}
            <SettingsRow
              label="Compact Mode"
              description="Reduce card padding and font sizes"
            >
              <Switch
                checked={compactMode}
                onCheckedChange={setCompactMode}
                aria-label="Toggle compact mode"
              />
            </SettingsRow>

            {/* Animations */}
            <SettingsRow
              label="Animations"
              description="Enable GSAP and Framer Motion effects"
            >
              <div className="flex items-center gap-2">
                <Sparkles className={`w-3.5 h-3.5 ${animationsEnabled ? 'text-amber-500' : 'text-slate-400'}`} />
                <Switch
                  checked={animationsEnabled}
                  onCheckedChange={setAnimationsEnabled}
                  aria-label="Toggle animations"
                />
              </div>
            </SettingsRow>
          </SettingsSection>

          {/* ═══ Data Settings ═══ */}
          <SettingsSection title="Data" icon={Database}>
            {/* Default Page Size */}
            <SettingsRow
              label="Default Page Size"
              description="Rows per page in family listings"
            >
              <Select
                value={String(defaultPageSize)}
                onValueChange={(val) => setDefaultPageSize(Number(val))}
              >
                <SelectTrigger className="w-[80px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </SettingsRow>

            {/* Default Sort Order */}
            <SettingsRow
              label="Default Sort"
              description="Default sort order for families"
            >
              <Select
                value={defaultSortOrder}
                onValueChange={setDefaultSortOrder}
              >
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdfId">PDF ID</SelectItem>
                  <SelectItem value="beneficiaryName">Beneficiary Name</SelectItem>
                  <SelectItem value="rrEligibility">R&R Eligibility</SelectItem>
                  <SelectItem value="villageName">Village Name</SelectItem>
                </SelectContent>
              </Select>
            </SettingsRow>

            {/* Default Startup View */}
            <SettingsRow
              label="Startup View"
              description="Default view on app launch"
            >
              <Select
                value={defaultStartupView}
                onValueChange={setDefaultStartupView}
              >
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dashboard">Dashboard</SelectItem>
                  <SelectItem value="globe">Globe</SelectItem>
                </SelectContent>
              </Select>
            </SettingsRow>
          </SettingsSection>

          {/* ═══ Notification Settings ═══ */}
          <SettingsSection title="Notifications" icon={Bell}>
            {/* Notification Banner */}
            <SettingsRow
              label="Banner"
              description="Show notification banner on dashboard"
            >
              <Switch
                checked={notificationBannerVisible}
                onCheckedChange={setNotificationBannerVisible}
                aria-label="Toggle notification banner"
              />
            </SettingsRow>

            {/* Notification Sound */}
            <SettingsRow
              label="Sound"
              description="Play sound on new notifications"
            >
              <div className="flex items-center gap-2">
                <Volume2 className={`w-3.5 h-3.5 ${notificationSoundEnabled ? 'text-emerald-500' : 'text-slate-400'}`} />
                <Switch
                  checked={notificationSoundEnabled}
                  onCheckedChange={setNotificationSoundEnabled}
                  aria-label="Toggle notification sound"
                />
              </div>
            </SettingsRow>
          </SettingsSection>

          {/* ═══ About Section ═══ */}
          <SettingsSection title="About" icon={Info}>
            {/* App Version */}
            <SettingsRow label="App Version" description="Current software version">
              <span className="text-xs font-mono font-semibold text-[#0F2B46] dark:text-amber-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                v1.2.0
              </span>
            </SettingsRow>

            {/* Last Data Update */}
            <SettingsRow label="Last Data Update" description="When data was last refreshed">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                {new Date().toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </SettingsRow>

            {/* Database Stats */}
            <div className="px-4 py-3">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                Database Summary
              </p>
              {dbStats ? (
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Families', value: dbStats.families.toLocaleString('en-IN'), icon: Hash, color: 'text-amber-600 dark:text-amber-400' },
                    { label: 'Members', value: dbStats.members.toLocaleString('en-IN'), icon: Hash, color: 'text-teal-600 dark:text-teal-400' },
                    { label: 'Plots', value: dbStats.plots.toLocaleString('en-IN'), icon: Hash, color: 'text-green-600 dark:text-green-400' },
                    { label: 'Mandals', value: String(dbStats.mandals), icon: Hash, color: 'text-slate-600 dark:text-slate-300' },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700/50 rounded-md px-2.5 py-1.5"
                    >
                      <stat.icon className={`w-3 h-3 ${stat.color}`} />
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{stat.value}</p>
                        <p className="text-[10px] text-slate-400">{stat.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-3">
                  <div className="w-5 h-5 border-2 border-slate-200 border-t-amber-500 rounded-full animate-spin" />
                </div>
              )}
            </div>
          </SettingsSection>

          {/* Footer */}
          <Separator className="bg-slate-200 dark:bg-slate-700" />
          <div className="text-center pb-2">
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              Polavaram Irrigation Project — R&R Portal
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              Government of Andhra Pradesh
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
