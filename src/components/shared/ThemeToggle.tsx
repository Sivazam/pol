'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  if (!mounted) {
    return (
      <button
        className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 transition-all"
        aria-label="Toggle theme"
      >
        <div className="w-4 h-4" />
      </button>
    );
  }

  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => {
        document.documentElement.classList.add('theme-transitioning');
        setTheme(isDark ? 'light' : 'dark');
        setTimeout(() => document.documentElement.classList.remove('theme-transitioning'), 300);
      }}
      className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/20 hover:border-slate-300 dark:hover:border-white/20 transition-all"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-300" />
      ) : (
        <Moon className="w-4 h-4 text-slate-500 dark:text-white/70" />
      )}
    </button>
  );
}
