'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface SearchResult {
  pdfNumber: string;
  headName: string;
  villageName: string;
  familyId: string;
}

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigateToFamily = useAppStore((s) => s.navigateToFamily);
  const view = useAppStore((s) => s.view);

  const searchFamilies = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/families/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.families || []);
        setShowDropdown(true);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) searchFamilies(query);
      else { setResults([]); setShowDropdown(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, searchFamilies]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (result: SearchResult) => {
    navigateToFamily(result.pdfNumber, result.familyId);
    setQuery('');
    setResults([]);
    setShowDropdown(false);
  };

  // Don't render on globe or login views
  if (view === 'globe' || view === 'login') return null;

  return (
    <div className="relative">
      <div className="flex items-center bg-white/10 rounded-lg border border-white/10 focus-within:border-amber-400/40 focus-within:bg-white/15 transition-all">
        <Search className="w-3.5 h-3.5 text-white/40 ml-2.5" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          placeholder="Search PDF or name..."
          className="w-28 sm:w-44 lg:w-56 px-2.5 py-1.5 bg-transparent text-xs text-white placeholder-white/30 focus:outline-none"
        />
        {loading && <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin mr-2" />}
        {query && !loading && (
          <button onClick={() => { setQuery(''); setResults([]); setShowDropdown(false); }} className="mr-2 text-white/30 hover:text-white/60">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {showDropdown && results.length > 0 && (
        <div ref={dropdownRef} className="absolute top-full mt-1 right-0 w-72 bg-white rounded-lg shadow-xl border border-slate-200 z-50 max-h-64 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.pdfNumber}
              onClick={() => handleSelect(r)}
              className="w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
            >
              <p className="text-xs font-mono font-semibold text-amber-700">{r.pdfNumber}</p>
              <p className="text-xs text-slate-900">{r.headName}</p>
              <p className="text-[10px] text-slate-400">{r.villageName}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
