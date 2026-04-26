'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Search, X, Loader2, MapPin, Users, Building2, FileText, ArrowRight, Command, CornerDownLeft, Clock, Trash2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface AdvancedSearchResult {
  id: string;
  type: 'family' | 'village' | 'mandal';
  name: string;
  subtitle: string;
  matchField: string;
  matchFieldLabel: string;
  relevance: number;
  path: string;
}

interface AdvancedSearchResponse {
  results: {
    family: AdvancedSearchResult[];
    village: AdvancedSearchResult[];
    mandal: AdvancedSearchResult[];
  };
  counts: {
    family: number;
    village: number;
    mandal: number;
  };
  total: number;
  query: string;
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; label: string; borderColor: string }> = {
  mandal: { icon: MapPin, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Mandal', borderColor: 'border-amber-200' },
  village: { icon: Building2, color: 'text-teal-600', bg: 'bg-teal-50', label: 'Village', borderColor: 'border-teal-200' },
  family: { icon: FileText, color: 'text-[#1E3A5F]', bg: 'bg-slate-50', label: 'Family', borderColor: 'border-slate-200' },
};

type TypeFilter = 'all' | 'family' | 'village' | 'mandal';

const TYPE_FILTERS: { key: TypeFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'family', label: 'Families' },
  { key: 'village', label: 'Villages' },
  { key: 'mandal', label: 'Mandals' },
];

// ─── Helper: highlight matched text ──────────────────────────────────────────

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-amber-200/60 dark:bg-amber-700/40 text-inherit rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// ─── Helper: recent searches from localStorage ───────────────────────────────

function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem('polavaram-recent-searches');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  if (typeof window === 'undefined') return;
  try {
    const current = getRecentSearches();
    const updated = [query, ...current.filter((q) => q !== query)].slice(0, 5);
    localStorage.setItem('polavaram-recent-searches', JSON.stringify(updated));
  } catch { /* ignore */ }
}

function clearRecentSearches() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('polavaram-recent-searches');
  } catch { /* ignore */ }
}

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AdvancedSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigateToMandal = useAppStore((s) => s.navigateToMandal);
  const navigateToVillage = useAppStore((s) => s.navigateToVillage);
  const navigateToFamily = useAppStore((s) => s.navigateToFamily);
  const view = useAppStore((s) => s.view);

  // Load recent searches on mount
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('polavaram-recent-searches');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const searchAdvanced = useCallback(async (q: string) => {
    if (q.length < 2) { setResults(null); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search/advanced?q=${encodeURIComponent(q)}&limit=20`);
      if (res.ok) {
        const data: AdvancedSearchResponse = await res.json();
        setResults(data);
        setShowDropdown(true);
        setSelectedIndex(-1);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) searchAdvanced(query);
      else { setResults(null); setShowDropdown(false); }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, searchAdvanced]);

  // Close dropdown on outside click
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

  // Keyboard shortcut: Ctrl/Cmd+K to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setShowDropdown(true);
      }
      if (e.key === 'Escape') {
        setShowDropdown(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Filtered flat results based on type filter
  const filteredResults = useMemo(() => {
    if (!results) return [];
    if (typeFilter === 'all') {
      return [...results.results.mandal, ...results.results.village, ...results.results.family];
    }
    return results.results[typeFilter] || [];
  }, [results, typeFilter]);

  // Type filter counts
  const filterCounts = useMemo(() => {
    if (!results) return { all: 0, family: 0, village: 0, mandal: 0 };
    return {
      all: results.total,
      family: results.counts.family,
      village: results.counts.village,
      mandal: results.counts.mandal,
    };
  }, [results]);

  // Keyboard navigation within results
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && showDropdown && results) {
      // Switch type filter tabs with Tab
      e.preventDefault();
      const currentIdx = TYPE_FILTERS.findIndex((f) => f.key === typeFilter);
      const nextIdx = (currentIdx + 1) % TYPE_FILTERS.length;
      setTypeFilter(TYPE_FILTERS[nextIdx].key);
      setSelectedIndex(-1);
      return;
    }

    if (!showDropdown || filteredResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filteredResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(filteredResults[selectedIndex]);
    }
  };

  const handleSelect = (result: AdvancedSearchResult) => {
    const [type, ...pathParts] = result.path.split(':');
    if (type === 'mandal' && pathParts[0]) {
      navigateToMandal(pathParts[0]);
    } else if (type === 'village' && pathParts[0]) {
      navigateToVillage(pathParts[0]);
    } else if (type === 'family' && pathParts.length >= 2) {
      navigateToFamily(pathParts[0], pathParts[1]);
    }
    saveRecentSearch(query);
    setRecentSearches(getRecentSearches());
    setQuery('');
    setResults(null);
    setShowDropdown(false);
    setSelectedIndex(-1);
    setTypeFilter('all');
  };

  const handleRecentClick = (recentQuery: string) => {
    setQuery(recentQuery);
  };

  const handleClearRecent = () => {
    clearRecentSearches();
    setRecentSearches([]);
  };

  // Don't render on globe or login views
  if (view === 'globe' || view === 'login') return null;

  const hasResults = results && results.total > 0;

  return (
    <div className="relative">
      <div className="flex items-center bg-slate-100 dark:bg-white/10 rounded-lg border border-slate-200 dark:border-white/10 focus-within:border-amber-400/40 focus-within:bg-slate-50 dark:focus-within:bg-white/15 transition-all group/search">
        <Search className="w-3.5 h-3.5 text-slate-400 dark:text-white/40 ml-2.5 group-focus-within/search:text-amber-500 dark:group-focus-within/search:text-amber-400/60 transition-colors" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results && results.total > 0) setShowDropdown(true);
            else if (recentSearches.length > 0) setShowDropdown(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search PDF, village, mandal..."
          className="w-32 sm:w-48 lg:w-64 px-2.5 py-1.5 bg-transparent text-xs text-slate-700 dark:text-white placeholder-slate-400 dark:placeholder-white/30 focus:outline-none"
          aria-label="Global search"
          aria-expanded={showDropdown}
          aria-controls="global-search-listbox"
          aria-activedescendant={selectedIndex >= 0 ? `search-result-${selectedIndex}` : undefined}
          role="combobox"
        />
        {loading && <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin mr-2" />}
        {query && !loading && (
          <button
            onClick={() => { setQuery(''); setResults(null); setShowDropdown(false); setTypeFilter('all'); }}
            className="mr-1.5 text-slate-400 dark:text-white/30 hover:text-slate-600 dark:hover:text-white/60 transition-colors focus-ring rounded"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        {/* Keyboard shortcut hint */}
        {!query && (
          <div className="hidden sm:flex items-center gap-0.5 mr-2 px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-white/5 border border-slate-300 dark:border-white/10">
            <Command className="w-2.5 h-2.5 text-slate-400 dark:text-white/25" />
            <span className="text-[9px] text-slate-400 dark:text-white/25 font-medium" style={{ fontFamily: 'var(--font-jetbrains)' }}>K</span>
          </div>
        )}
      </div>

      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute top-full mt-1.5 right-0 w-80 sm:w-[420px] bg-white dark:bg-[#1E293B] rounded-xl shadow-2xl border border-slate-200/80 dark:border-slate-600/80 z-50 max-h-[480px] overflow-y-auto custom-scrollbar search-dropdown"
          id="global-search-listbox"
          role="listbox"
        >
          {/* No query yet — show recent searches */}
          {!query && recentSearches.length > 0 && (
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  Recent Searches
                </span>
                <button
                  onClick={handleClearRecent}
                  className="text-[10px] text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                  Clear
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recentSearches.map((rq) => (
                  <button
                    key={rq}
                    onClick={() => handleRecentClick(rq)}
                    className="px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-300 dark:hover:border-amber-700 transition-colors"
                  >
                    {rq}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No query, no recent searches */}
          {!query && recentSearches.length === 0 && (
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                <Search className="w-5 h-5 text-slate-300" />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Search anything</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Type at least 2 characters to search families, villages, and mandals</p>
              <div className="flex items-center justify-center gap-3 mt-3">
                {[
                  { icon: FileText, label: 'PDF ID', example: 'PDF-VRP-001' },
                  { icon: Building2, label: 'Village', example: 'Vemagiri' },
                  { icon: MapPin, label: 'Mandal', example: 'Chintoor' },
                ].map((hint) => (
                  <div key={hint.label} className="flex flex-col items-center gap-1">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center">
                      <hint.icon className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <span className="text-[9px] text-slate-400 font-medium">{hint.label}</span>
                    <span className="text-[8px] text-slate-300">{hint.example}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Type Filter Tabs (only show when we have results) */}
          {query.length >= 2 && hasResults && (
            <div className="sticky top-0 z-20 bg-white dark:bg-[#1E293B] border-b border-slate-100 dark:border-slate-700 px-3 py-2">
              <div className="flex items-center gap-1">
                {TYPE_FILTERS.map((tf) => {
                  const count = filterCounts[tf.key];
                  const isActive = typeFilter === tf.key;
                  return (
                    <button
                      key={tf.key}
                      onClick={() => { setTypeFilter(tf.key); setSelectedIndex(-1); }}
                      className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-colors ${
                        isActive
                          ? 'bg-[#0F2B46] dark:bg-amber-600 text-white'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {tf.label}
                      {count > 0 && (
                        <span className={`px-1 py-0 rounded text-[8px] ${
                          isActive ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'
                        }`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
                {/* Tab key hint */}
                <span className="ml-auto flex items-center gap-1 text-[8px] text-slate-300 dark:text-slate-600">
                  <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[7px] font-mono">Tab</kbd>
                  switch
                </span>
              </div>
            </div>
          )}

          {/* No results */}
          {query.length >= 2 && !loading && !hasResults && (
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                <Search className="w-5 h-5 text-slate-300" />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">No results found</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                No matches for &quot;{query}&quot;. Try a different search term or check the spelling.
              </p>
              <div className="mt-3 flex items-center justify-center gap-2">
                {['PDF ID', 'Village Name', 'Beneficiary Name'].map((suggestion) => (
                  <span key={suggestion} className="text-[10px] px-2 py-0.5 rounded bg-slate-50 dark:bg-slate-800 text-slate-400 border border-slate-100 dark:border-slate-700">
                    Try: {suggestion}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* No results for current type filter */}
          {query.length >= 2 && hasResults && filteredResults.length === 0 && (
            <div className="p-4 text-center">
              <p className="text-xs text-slate-400 dark:text-slate-500">
                No {typeFilter === 'all' ? '' : typeFilter} results. Try a different filter tab.
              </p>
            </div>
          )}

          {/* Results grouped by type */}
          {filteredResults.length > 0 && (() => {
            // Group filtered results by type for display
            const grouped: Record<string, AdvancedSearchResult[]> = {};
            filteredResults.forEach((r) => {
              if (!grouped[r.type]) grouped[r.type] = [];
              grouped[r.type].push(r);
            });

            return Object.entries(grouped).map(([type, items]) => {
              const config = TYPE_CONFIG[type] || TYPE_CONFIG.family;
              const Icon = config.icon;
              return (
                <div key={type}>
                  <div className="flex items-center gap-2 px-3.5 py-2 bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700 sticky top-[41px] z-10">
                    <div className={`w-5 h-5 rounded ${config.bg} flex items-center justify-center`}>
                      <Icon className={`w-3 h-3 ${config.color}`} />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{config.label}s</span>
                    <span className="text-[9px] text-slate-400 ml-auto px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700" style={{ fontFamily: 'var(--font-jetbrains)' }}>{items.length}</span>
                  </div>
                  {items.map((r) => {
                    const globalIdx = filteredResults.indexOf(r);
                    const isSelected = globalIdx === selectedIndex;
                    return (
                      <button
                        key={r.id}
                        onClick={() => handleSelect(r)}
                        className="w-full text-left px-3.5 py-2.5 transition-colors border-b border-slate-50 dark:border-slate-700/50 last:border-b-0 flex items-center gap-3 group ${
                          isSelected ? 'bg-amber-50/60 dark:bg-amber-900/20 border-l-2 border-l-amber-400' : 'hover:bg-slate-50 dark:hover:bg-slate-800 border-l-2 border-l-transparent'
                        }"
                        role="option"
                        id={`search-result-${globalIdx}`}
                        aria-selected={isSelected}
                      >
                        <div className={`w-8 h-8 rounded-lg ${config.bg} border ${config.borderColor} flex items-center justify-center shrink-0`}>
                          <Icon className={`w-4 h-4 ${config.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                            <HighlightedText text={r.name} query={query} />
                          </p>
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] text-slate-400 truncate">{r.subtitle}</p>
                            {r.matchFieldLabel && (
                              <span className="text-[8px] px-1 py-0 rounded bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shrink-0">
                                in {r.matchFieldLabel}
                              </span>
                            )}
                          </div>
                        </div>
                        {isSelected && (
                          <CornerDownLeft className="w-3 h-3 text-amber-500 shrink-0" />
                        )}
                        <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-slate-500 shrink-0 opacity-0 group-hover:opacity-100 transition-all" />
                      </button>
                    );
                  })}
                </div>
              );
            });
          })()}

          {/* Footer hint */}
          {filteredResults.length > 0 && (
            <div className="flex items-center justify-between px-3.5 py-2 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-[9px] text-slate-400">
                  <kbd className="px-1 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-[8px] font-mono">↑↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1 text-[9px] text-slate-400">
                  <kbd className="px-1 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-[8px] font-mono">↵</kbd>
                  Select
                </span>
                <span className="flex items-center gap-1 text-[9px] text-slate-400">
                  <kbd className="px-1 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-[8px] font-mono">Tab</kbd>
                  Filter
                </span>
                <span className="flex items-center gap-1 text-[9px] text-slate-400">
                  <kbd className="px-1 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-[8px] font-mono">esc</kbd>
                  Close
                </span>
              </div>
              <span className="text-[9px] text-slate-300" style={{ fontFamily: 'var(--font-jetbrains)' }}>{results?.total || 0} results</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
