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
    <div className="w-full min-h-screen bg-[#0A0F1E] flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-md">
        <div className="glow-card p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-7 h-7 text-amber-400" />
            </div>
            <h1 className="text-xl font-bold text-white">POLAVARAM R&R PORTAL</h1>
            <p className="text-xs text-gray-500 mt-2 tracking-widest uppercase" style={{ fontFamily: 'var(--font-jetbrains)' }}>Government of Andhra Pradesh</p>
            <div className="mt-3 mx-auto w-16 h-px bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs text-gray-400 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@polavaram.ap.gov.in" className="w-full pl-10 pr-4 py-3 bg-[#0A0F1E] border border-white/8 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/40 transition-colors" required />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" className="w-full pl-10 pr-12 py-3 bg-[#0A0F1E] border border-white/8 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/40 transition-colors" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {error && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-xs text-red-400">{error}</p>
              </motion.div>
            )}
            <button type="submit" disabled={loading} className="w-full py-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg text-sm font-medium tracking-wide hover:bg-amber-500/20 hover:border-amber-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? (<div className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />Authenticating...</div>) : 'Sign In to Portal'}
            </button>
          </form>
          <div className="mt-6 pt-4 border-t border-white/5 text-center">
            <p className="text-[10px] text-gray-600 tracking-widest uppercase">Water Resources Department — Government of Andhra Pradesh</p>
            <div className="flex items-center justify-center gap-1.5 mt-2 text-green-400 text-[10px]"><Activity className="w-2.5 h-2.5" /><span>SECURE PORTAL</span></div>
          </div>
        </div>
        <div className="text-center mt-4">
          <button onClick={() => { setAuthenticated(true); setView('dashboard'); }} className="text-xs text-gray-500 hover:text-gray-300 transition-colors underline">Skip login — Enter as viewer</button>
        </div>
      </motion.div>
    </div>
  );
}
