'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useAppStore } from '@/lib/store';
import { motion } from 'framer-motion';
import { Lock, Mail, Eye, EyeOff, Shield, Activity, AlertCircle } from 'lucide-react';

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
    try {
      const result = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });
      if (!result || result.error) {
        setError('Authentication failed. Please verify your credentials.');
        setLoading(false);
        return;
      }
      setAuthenticated(true);
      setView('dashboard');
    } catch {
      setError('Unable to reach the authentication server. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] flex items-center justify-center px-4 transition-colors duration-300">
      <div className="fixed top-0 left-0 right-0 tricolor-bar z-50" />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-md">
        <div className="gov-card p-8 border-t-4 border-t-[#1E3A5F] dark:border-t-amber-500">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-[#0F2B46] flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Shield className="w-8 h-8 text-amber-400" />
            </div>
            <h1 className="text-xl font-bold text-[#0F2B46] dark:text-slate-100">POLAVARAM R&amp;R PORTAL</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 tracking-widest uppercase" style={{ fontFamily: 'var(--font-jetbrains)' }}>Government of Andhra Pradesh</p>
            <div className="ashoka-divider mt-3 mx-auto w-24" />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">
              Authorized personnel only. Sign in with the credentials issued by your administrator to access protected sections.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" autoComplete="on">
            <div>
              <label htmlFor="login-email" className="block text-xs text-slate-600 dark:text-slate-300 font-medium mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@polavaram.ap.gov.in"
                  autoComplete="username"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#1E3A5F] focus:ring-1 focus:ring-[#1E3A5F]/30 transition-colors"
                />
              </div>
            </div>
            <div>
              <label htmlFor="login-password" className="block text-xs text-slate-600 dark:text-slate-300 font-medium mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  required
                  className="w-full pl-10 pr-12 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#1E3A5F] focus:ring-1 focus:ring-[#1E3A5F]/30 transition-colors"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {error && (
              <motion.div role="alert" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" aria-hidden="true" />
                <p className="text-xs text-red-700 dark:text-red-400 font-medium">{error}</p>
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
                  Authenticating…
                </div>
              ) : 'Sign In to Portal'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 text-center space-y-2">
            <p className="text-[10px] text-slate-400 tracking-widest uppercase">Water Resources Department — Government of Andhra Pradesh</p>
            <div className="flex items-center justify-center gap-1.5 text-green-700 dark:text-green-400 text-[10px] font-medium">
              <Activity className="w-2.5 h-2.5" aria-hidden="true" /><span>SECURE PORTAL · TLS REQUIRED</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Unauthorized access is prohibited under the IT Act, 2000. All activity is logged and audited.
            </p>
          </div>
        </div>

        <div className="text-center mt-4">
          <button
            type="button"
            onClick={() => setView('dashboard')}
            className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors underline"
          >
            Continue as public visitor (limited view)
          </button>
        </div>
      </motion.div>
    </div>
  );
}
