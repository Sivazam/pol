'use client';
import React, { useState, useEffect } from 'react';
import { Shield, ExternalLink, Globe, Phone, Mail, MapPin, ArrowUp } from 'lucide-react';
import { PROJECT_STATS } from '@/lib/constants';

export default function GovFooter() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Fetch live stats instead of using hardcoded values
  const [stats, setStats] = useState<{ totalFamilies: number; totalMandals: number; totalVillages: number; hasFirstScheme: number } | null>(null);

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(data => {
        const totalVillages = data.mandals?.reduce((sum: number, m: { villageCount: number }) => sum + m.villageCount, 0) ?? PROJECT_STATS.totalVillages;
        setStats({
          totalFamilies: data.totalFamilies,
          totalMandals: data.mandals?.length ?? PROJECT_STATS.totalMandals,
          totalVillages,
          hasFirstScheme: data.firstSchemeCount,
        });
      })
      .catch(() => setStats(null));
  }, []);

  const totalFamilies = stats?.totalFamilies ?? PROJECT_STATS.totalFamilies;
  const totalMandals = stats?.totalMandals ?? PROJECT_STATS.totalMandals;
  const totalVillages = stats?.totalVillages ?? PROJECT_STATS.totalVillages;
  const hasFirstScheme = stats?.hasFirstScheme ?? PROJECT_STATS.rrEligibleMembers;

  return (
    <footer className="mt-auto border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] lg:pl-[52px] transition-colors duration-300 relative">
      {/* Animated Tricolor bar */}
      <div className="animated-tricolor w-full" />
      {/* Subtle gradient overlay at top */}
      <div className="absolute top-[3px] left-0 right-0 h-8 bg-gradient-to-b from-slate-100/50 to-transparent dark:from-slate-800/30 dark:to-transparent pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand & Mission */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-[#0F2B46] flex items-center justify-center">
                <Shield className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <span className="text-sm font-bold text-[#0F2B46] dark:text-slate-100 tracking-wide block leading-tight text-gradient">POLAVARAM</span>
                <span className="text-[9px] text-slate-400 tracking-widest uppercase" style={{ fontFamily: 'var(--font-jetbrains)' }}>R&R Portal</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mt-3">
              Rehabilitation & Resettlement tracking portal for families affected by the Polavaram Irrigation Project on the Godavari River.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex gap-[2px]">
                <div className="w-1.5 h-4 bg-[#FF9933] rounded-sm" />
                <div className="w-1.5 h-4 bg-white border border-slate-200 dark:border-slate-600 rounded-sm" />
                <div className="w-1.5 h-4 bg-[#138808] rounded-sm" />
              </div>
              <span className="text-[10px] text-slate-400 tracking-wider" style={{ fontFamily: 'var(--font-jetbrains)' }}>
                Government of Andhra Pradesh
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-2">
              <div className="w-1 h-3 bg-[#D97706] rounded-full" />
              Portal Navigation
            </h4>
            <div className="space-y-2.5">
              {[
                { label: 'Dashboard Overview', desc: 'Project statistics & maps' },
                { label: 'Mandal Reports', desc: `${totalMandals} mandal details` },
                { label: 'Village Details', desc: `${totalVillages} villages tracked` },
                { label: 'Family Search', desc: `${totalFamilies.toLocaleString()} families` },
                { label: 'Plot Allotment', desc: 'Rehabilitation status' },
              ].map(link => (
                <div key={link.label} className="flex items-start gap-2 text-xs text-slate-500 hover:text-[#1E3A5F] cursor-pointer transition-colors group">
                  <ExternalLink className="w-3 h-3 mt-0.5 shrink-0 text-slate-300 group-hover:text-[#1E3A5F] transition-transform group-hover:scale-110" />
                  <div>
                    <p className="font-medium text-slate-700 dark:text-slate-300 group-hover:text-[#0F2B46] dark:group-hover:text-slate-100 relative inline-block">{link.label}<span className="absolute bottom-0 left-0 w-0 h-px bg-[#1E3A5F] dark:bg-amber-400 group-hover:w-full transition-all duration-300" /></p>
                    <p className="text-[10px] text-slate-400">{link.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-2">
              <div className="w-1 h-3 bg-teal-500 rounded-full" />
              Contact
            </h4>
            <div className="space-y-3">
              <div className="flex items-start gap-2.5 border-l-2 border-teal-400/50 pl-2.5 py-0.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">Water Resources Department</p>
                  <p className="text-[10px] text-slate-400">Government of Andhra Pradesh</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 border-l-2 border-teal-400/50 pl-2.5 py-0.5">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <p className="text-xs text-slate-600 dark:text-slate-400" style={{ fontFamily: 'var(--font-jetbrains)' }}>polavaram-rr@ap.gov.in</p>
              </div>
              <div className="flex items-center gap-2.5 border-l-2 border-teal-400/50 pl-2.5 py-0.5">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <p className="text-xs text-slate-600 dark:text-slate-400">08812-252020</p>
              </div>
              <div className="flex items-center gap-2.5 border-l-2 border-teal-400/50 pl-2.5 py-0.5">
                <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <p className="text-xs text-blue-600 hover:underline cursor-pointer">apwrims.ap.gov.in</p>
              </div>
            </div>
          </div>

          {/* Project Stats */}
          <div>
            <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-2">
              <div className="w-1 h-3 bg-emerald-500 rounded-full" />
              Project Statistics
            </h4>
            <div className="space-y-2.5">
              {[
                { label: 'Affected Families', value: totalFamilies.toLocaleString(), color: 'text-[#0F2B46]' },
                { label: 'SES Survey', value: '100% Complete', color: 'text-emerald-600' },
                { label: 'First Scheme', value: hasFirstScheme.toLocaleString(), color: 'text-amber-600' },
                { label: 'Mandals / Villages', value: `${totalMandals} / ${totalVillages}`, color: 'text-teal-600' },
              ].map(stat => (
                <div key={stat.label} className="footer-stat-hover hover-lift flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">{stat.label}</span>
                  <span className={`text-xs font-bold ${stat.color}`} style={{ fontFamily: 'var(--font-jetbrains)' }}>{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <p className="text-[10px] text-slate-400" style={{ fontFamily: 'var(--font-jetbrains)' }}>© 2025 Government of Andhra Pradesh. All rights reserved.</p>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-[10px] text-slate-400">Designed & Developed by Project Nexus</p>
            <button
              onClick={scrollToTop}
              className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all cursor-pointer scroll-top-btn group"
              title="Back to top"
            >
              <ArrowUp className="w-3 h-3 text-slate-400 dark:text-slate-500 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:rotate-180" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
