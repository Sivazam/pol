'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { motion } from 'framer-motion';
import { Lock, Mail, Eye, EyeOff, Shield, Activity } from 'lucide-react';

export default function LoginView() {
  const setView = useAppStore((s) => s.setView);
  const setAuthenticated = useAppStore((s) => s.setAuthenticated);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (email === 'admin@polavaram.ap.gov.in' && password === 'admin123') {
      setAuthenticated(true);
      setView('dashboard');
    } else {
      setError('Invalid credentials. Use admin@polavaram.ap.gov.in / admin123');
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#F0F4F8] flex items-center justify-center px-4">
      {/* Tricolor Bar at top */}
      <div className="fixed top-0 left-0 right-0 tricolor-bar z-50" />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-md">
        <div className="gov-card p-8 border-t-4 border-t-[#1E3A5F]">
          {/* Government Branding */}
          <div className="text-center mb-8">
            {/* Ashoka emblem-inspired shield icon */}
            <div className="w-16 h-16 rounded-full bg-[#0F2B46] flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Shield className="w-8 h-8 text-amber-400" />
            </div>
            <h1 className="text-xl font-bold text-[#0F2B46]">POLAVARAM R&R PORTAL</h1>
            <p className="text-xs text-slate-400 mt-2 tracking-widest uppercase" style={{ fontFamily: 'var(--font-jetbrains)' }}>Government of Andhra Pradesh</p>
            {/* Ashoka-inspired divider */}
            <div className="ashoka-divider mt-3 mx-auto w-24" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs text-slate-500 font-medium mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@polavaram.ap.gov.in"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1E3A5F] focus:ring-1 focus:ring-[#1E3A5F]/30 transition-colors"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-500 font-medium mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full pl-10 pr-12 py-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1E3A5F] focus:ring-1 focus:ring-[#1E3A5F]/30 transition-colors"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {error && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-700 font-medium">{error}</p>
              </motion.div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#1E3A5F] text-white rounded-lg text-sm font-semibold tracking-wide hover:bg-[#0F2B46] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating...
                </div>
              ) : 'Sign In to Portal'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-200 text-center">
            <p className="text-[10px] text-slate-400 tracking-widest uppercase">Water Resources Department — Government of Andhra Pradesh</p>
            <div className="flex items-center justify-center gap-1.5 mt-2 text-green-700 text-[10px] font-medium"><Activity className="w-2.5 h-2.5" /><span>SECURE PORTAL</span></div>
          </div>
        </div>
        <div className="text-center mt-4">
          <button onClick={() => { setAuthenticated(true); setView('dashboard'); }} className="text-xs text-slate-400 hover:text-slate-600 transition-colors underline">
            Skip login — Enter as viewer
          </button>
        </div>
      </motion.div>
    </div>
  );
}
