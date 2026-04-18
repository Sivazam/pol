'use client';
import { Shield, ExternalLink } from 'lucide-react';

export default function GovFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white lg:pl-[52px]">
      <div className="tricolor-bar" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-5 h-5 text-[#1E3A5F]" />
              <span className="text-sm font-bold text-[#0F2B46] tracking-wide">POLAVARAM R&R PORTAL</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Rehabilitation & Resettlement tracking portal for families affected by the Polavaram Irrigation Project on the Godavari River.
            </p>
          </div>
          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">Quick Links</h4>
            <div className="space-y-2">
              {['Project Overview', 'Mandal Reports', 'Village Details', 'Family Search', 'Plot Allotment Status'].map(link => (
                <div key={link} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#1E3A5F] cursor-pointer transition-colors">
                  <ExternalLink className="w-3 h-3" />{link}
                </div>
              ))}
            </div>
          </div>
          {/* Contact */}
          <div>
            <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">Contact</h4>
            <div className="space-y-2 text-xs text-slate-500">
              <p>Water Resources Department</p>
              <p>Government of Andhra Pradesh</p>
              <p className="text-slate-400" style={{ fontFamily: 'var(--font-jetbrains)' }}>polavaram-rr@ap.gov.in</p>
            </div>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[10px] text-slate-400" style={{ fontFamily: 'var(--font-jetbrains)' }}>© 2025 Government of Andhra Pradesh. All rights reserved.</p>
          <p className="text-[10px] text-slate-400">Designed & Developed for Water Resources Department</p>
        </div>
      </div>
    </footer>
  );
}
