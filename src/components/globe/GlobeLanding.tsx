'use client';

/**
 * GlobeLanding v3 — light, premium, completely reimagined.
 *
 * Layout strategy: a strict 3-row flex column (header / body / rail). Nothing
 * is absolutely positioned over the body, so the bottom rail can never overlap
 * the "Enter Dashboard" button at any browser zoom level.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import gsap from 'gsap';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Activity,
  ArrowUpRight,
  Database,
  FileCheck2,
  Home,
  LockKeyhole,
  MapPin,
  Radio,
  Route,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import PolavaramGlobe, { SKIP_INTRO_HIDE_DELAY_MS, type PolavaramGlobeHandle } from '@/components/globe/PolavaramGlobe';
import { useAppStore } from '@/lib/store';
import { PROJECT_STATS } from '@/lib/constants';

interface MandalBrief {
  name: string;
  code: string;
  color: string;
  villages: number;
  families: number;
  corridor: string;
}

const MANDALS: MandalBrief[] = [
  { name: 'V. R. Puram', code: 'VRP', color: '#B45309', villages: 10, families: 5137, corridor: 'North bank' },
  { name: 'Chintoor', code: 'CHN', color: '#0D9488', villages: 11, families: 4512, corridor: 'Upper belt' },
  { name: 'Kunavaram', code: 'KUN', color: '#C2410C', villages: 9, families: 4312, corridor: 'River bend' },
];

const TOTAL_AFFECTED = MANDALS.reduce((s, m) => s + m.families, 0);
const BRIEF_REVEAL_FALLBACK_MS = 14500;
const FLOW_EASE = [0.22, 1, 0.36, 1] as const;

const TRANSMISSION_LOG: string[] = [
  'Verified beneficiary ledger synchronised · 13,961 families',
  'Plot allotments cross-checked against district registry',
  'Relocation corridor telemetry nominal · 3 mandals online',
  'PII vault sealed · AES-256-GCM · access audited',
  'Field readiness index recomputed · all corridors green',
];

const briefContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.18 } },
};
// Left column — sweeps in from the left edge with a gentle blur clear
const heroSectionVariants = {
  hidden: { opacity: 0, x: -64, filter: 'blur(12px)' },
  visible: {
    opacity: 1, x: 0, filter: 'blur(0px)',
    transition: { duration: 1.05, ease: FLOW_EASE },
  },
};
// Each line/element inside the hero stages in from the left as well
const flowInVariants = {
  hidden: { opacity: 0, x: -22, filter: 'blur(6px)' },
  visible: { opacity: 1, x: 0, filter: 'blur(0px)', transition: { duration: 0.85, ease: FLOW_EASE } },
};
const wordRiseVariants = {
  hidden: { opacity: 0, y: '0.55em' },
  visible: { opacity: 1, y: '0em', transition: { duration: 0.95, ease: FLOW_EASE } },
};
// Right command panel — slides in from the right with a subtle parallax depth
const panelVariants = {
  hidden: { opacity: 0, x: 96, filter: 'blur(14px)' },
  visible: {
    opacity: 1, x: 0, filter: 'blur(0px)',
    transition: { duration: 1.15, ease: FLOW_EASE, delay: 0.28 },
  },
};

function useStats() {
  return {
    families: PROJECT_STATS.totalFamilies,
    mandals: PROJECT_STATS.totalMandals,
    villages: PROJECT_STATS.totalVillages,
  };
}

function CountUp({ value }: { value: number }) {
  return <span className="tabular-nums">{value.toLocaleString()}</span>;
}

function LiveClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false, hourCycle: 'h23',
    });
    const u = () => setTime(`${fmt.format(new Date())} IST`);
    u();
    const t = window.setInterval(u, 1000);
    return () => window.clearInterval(t);
  }, []);
  return <span className="tabular-nums">{time || '--:--:-- IST'}</span>;
}

function AshokaChakra({ size = 28, color = '#0F172A' }: { size?: number; color?: string }) {
  const r = size / 2;
  const inner = r * 0.34;
  const outer = r * 0.84;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={r} cy={r} r={outer} fill="none" stroke={color} strokeWidth="1.1" />
      <circle cx={r} cy={r} r={inner} fill="none" stroke={color} strokeWidth="1" opacity="0.75" />
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i * 2 * Math.PI) / 24;
        return (
          <line key={i}
            x1={r + inner * Math.cos(a)} y1={r + inner * Math.sin(a)}
            x2={r + outer * Math.cos(a)} y2={r + outer * Math.sin(a)}
            stroke={color} strokeWidth="0.75" opacity="0.85"
          />
        );
      })}
      <circle cx={r} cy={r} r={r * 0.12} fill={color} />
    </svg>
  );
}

function MandalRow({ mandal }: { mandal: MandalBrief }) {
  const w = `${Math.round((mandal.families / TOTAL_AFFECTED) * 100)}%`;
  return (
    <div className="border-t border-slate-900/8 py-2.5 first:border-t-0">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: mandal.color, boxShadow: `0 0 0 3px ${mandal.color}1a` }} />
          <div className="min-w-0">
            <div className="truncate text-[12.5px] font-semibold tracking-tight text-slate-900">
              {mandal.name}
            </div>
            <div className="text-[9px] font-medium uppercase tracking-[0.18em] text-slate-500"
              style={{ fontFamily: 'var(--font-jetbrains)' }}>
              {mandal.code} · {mandal.villages} villages
            </div>
          </div>
        </div>
        <div className="text-right text-[12.5px] font-semibold tabular-nums text-slate-900"
          style={{ fontFamily: 'var(--font-jetbrains)' }}>
          {mandal.families.toLocaleString()}
        </div>
      </div>
      <div className="relative h-[3px] overflow-hidden rounded-full bg-slate-900/[0.06]">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: w, background: `linear-gradient(90deg, ${mandal.color}, ${mandal.color}cc)` }} />
      </div>
    </div>
  );
}

function SkipIntroChip({
  visible, durationMs, onSkip,
}: { visible: boolean; durationMs: number; onSkip: () => void }) {
  const [progress, setProgress] = useState(0);
  const startRef = useRef<number | null>(null);
  useEffect(() => {
    if (!visible) { startRef.current = null; setProgress(0); return; }
    let raf = 0;
    const tick = (t: number) => {
      if (startRef.current == null) startRef.current = t;
      const p = Math.min(1, (t - startRef.current) / durationMs);
      setProgress(p);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible, durationMs]);
  if (!visible) return null;
  const radius = 9;
  const c = 2 * Math.PI * radius;
  const dash = c * (1 - progress);
  return (
    <div className="pointer-events-none absolute right-5 top-5 z-50 sm:right-8 sm:top-8">
      <button
        type="button"
        onClick={onSkip}
        className="pointer-events-auto group inline-flex items-center gap-3 rounded-full border border-slate-900/10 bg-white/75 px-4 py-2.5 text-[10px] font-medium uppercase tracking-[0.22em] text-slate-700 shadow-[0_8px_30px_rgba(15,23,42,0.10)] backdrop-blur-xl transition-all duration-300 hover:border-amber-700/30 hover:bg-white hover:text-amber-800"
        style={{ fontFamily: 'var(--font-jetbrains)' }}
        aria-label="Skip the intro animation"
      >
        <svg width="22" height="22" viewBox="0 0 22 22" className="-ml-0.5">
          <circle cx="11" cy="11" r={radius} fill="none" stroke="rgba(15,23,42,0.12)" strokeWidth="1.2" />
          <circle cx="11" cy="11" r={radius} fill="none"
            stroke="#B45309" strokeWidth="1.6" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={dash}
            transform="rotate(-90 11 11)" style={{ transition: 'stroke-dashoffset 0.12s linear' }} />
          <path d="M 9 7.5 L 13.5 11 L 9 14.5 Z" fill="#B45309" />
        </svg>
        <span>Skip intro</span>
      </button>
    </div>
  );
}

function Ticker() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setI((x) => (x + 1) % TRANSMISSION_LOG.length), 4400);
    return () => window.clearInterval(t);
  }, []);
  return (
    <div className="relative flex items-center gap-2.5 overflow-hidden text-[10px] font-medium uppercase tracking-[0.18em] text-slate-600"
      style={{ fontFamily: 'var(--font-jetbrains)' }}>
      <Radio className="h-3 w-3 shrink-0 text-amber-700" strokeWidth={2} />
      <span className="text-amber-800">REC</span>
      <span className="h-1 w-1 shrink-0 rounded-full bg-amber-600" />
      <div className="relative h-4 min-w-0 flex-1">
        {TRANSMISSION_LOG.map((line, idx) => (
          <span key={idx}
            className="absolute inset-0 truncate transition-all duration-700"
            style={{ opacity: idx === i ? 1 : 0, transform: idx === i ? 'translateY(0)' : 'translateY(8px)' }}>
            {line}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function GlobeLanding() {
  const setView = useAppStore((s) => s.setView);
  const setGlobeAnimComplete = useAppStore((s) => s.setGlobeAnimComplete);
  const { families, mandals, villages } = useStats();

  const rootRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const commandRef = useRef<HTMLElement>(null);
  const mapLayerRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<PolavaramGlobeHandle>(null);

  const [transitioning, setTransitioning] = useState(false);
  const [briefVisible, setBriefVisible] = useState(false);
  const [showSkipIntro, setShowSkipIntro] = useState(true);
  const prefersReducedMotion = useReducedMotion();

  const [framePadding, setFramePadding] = useState({ top: 88, right: 32, bottom: 64, left: 32 });

  const missionId = useMemo(() => {
    const d = new Date();
    const y = String(d.getFullYear()).slice(-2);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const seq = Math.floor(Math.random() * 9000 + 1000);
    return `POL · RR · ${y}${m}${day}-${seq}`;
  }, []);

  const revealBrief = useCallback(() => setBriefVisible(true), []);

  useEffect(() => {
    const pb = document.body.style.backgroundColor;
    const ph = document.documentElement.style.backgroundColor;
    document.body.style.backgroundColor = '#f6efe1';
    document.documentElement.style.backgroundColor = '#f6efe1';
    return () => {
      document.body.style.backgroundColor = pb;
      document.documentElement.style.backgroundColor = ph;
    };
  }, []);

  useEffect(() => {
    const t = window.setTimeout(revealBrief, BRIEF_REVEAL_FALLBACK_MS);
    return () => window.clearTimeout(t);
  }, [revealBrief]);

  useEffect(() => {
    if (prefersReducedMotion || briefVisible) { setShowSkipIntro(false); return; }
    setShowSkipIntro(true);
    const t = window.setTimeout(() => setShowSkipIntro(false), SKIP_INTRO_HIDE_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [briefVisible, prefersReducedMotion]);

  // Measure overlay panel rects so the globe always fits the visible stage
  useLayoutEffect(() => {
    const compute = () => {
      const root = rootRef.current;
      if (!root) return;
      const rect = root.getBoundingClientRect();
      const h = headerRef.current?.getBoundingClientRect();
      const cmd = briefVisible ? commandRef.current?.getBoundingClientRect() : null;
      const hero = briefVisible ? heroRef.current?.getBoundingClientRect() : null;
      const r = railRef.current?.getBoundingClientRect();
      const isLg = rect.width >= 1024;

      const top = h ? Math.max(72, h.bottom - rect.top + 12) : 84;
      const bottom = r ? Math.max(64, rect.bottom - r.top + 12) : 72;
      const right = isLg && cmd ? Math.max(120, rect.right - cmd.left + 24) : 32;
      const left = isLg && hero ? Math.max(80, hero.right - rect.left + 24) : 32;

      // Below lg the brief panel sits above the map; reserve top half
      const finalTop = isLg ? top : (briefVisible ? Math.max(top, Math.round(rect.height * 0.50)) : top);

      setFramePadding({ top: finalTop, right, bottom, left });
    };

    compute();
    const ro = new ResizeObserver(compute);
    if (rootRef.current) ro.observe(rootRef.current);
    if (commandRef.current) ro.observe(commandRef.current);
    if (heroRef.current) ro.observe(heroRef.current);
    if (headerRef.current) ro.observe(headerRef.current);
    if (railRef.current) ro.observe(railRef.current);
    window.addEventListener('resize', compute);
    return () => { ro.disconnect(); window.removeEventListener('resize', compute); };
  }, [briefVisible]);

  useEffect(() => {
    globeRef.current?.refit();
  }, [framePadding.top, framePadding.right, framePadding.bottom, framePadding.left]);

  // Mouse parallax — drift hero and command panel by tiny amounts based on
  // pointer position. Uses requestAnimationFrame + ref-driven CSS transform so
  // we don't rerender on every mousemove. Disabled during the GSAP exit so it
  // doesn't fight with the transition.
  useEffect(() => {
    if (prefersReducedMotion || transitioning || !briefVisible) return;
    const root = rootRef.current;
    if (!root) return;
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let raf = 0;
    const apply = () => {
      current.x += (target.x - current.x) * 0.08;
      current.y += (target.y - current.y) * 0.08;
      const hero = heroRef.current;
      const cmd = commandRef.current;
      const head = headerRef.current;
      if (hero) hero.style.transform = `translate3d(${current.x * -8}px, ${current.y * -6}px, 0)`;
      if (cmd) cmd.style.transform = `translate3d(${current.x * 14}px, ${current.y * 10}px, 0)`;
      if (head) head.style.transform = `translate3d(${current.x * -3}px, ${current.y * -2}px, 0)`;
      raf = requestAnimationFrame(apply);
    };
    raf = requestAnimationFrame(apply);
    const onMove = (e: PointerEvent) => {
      const r = root.getBoundingClientRect();
      target.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      target.y = ((e.clientY - r.top) / r.height) * 2 - 1;
    };
    const onLeave = () => { target.x = 0; target.y = 0; };
    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerleave', onLeave);
      // Clear any leftover parallax transform so GSAP/motion own the element again
      const hero = heroRef.current; if (hero) hero.style.transform = '';
      const cmd = commandRef.current; if (cmd) cmd.style.transform = '';
      const head = headerRef.current; if (head) head.style.transform = '';
    };
  }, [prefersReducedMotion, briefVisible, transitioning]);

  const handleSkipIntro = useCallback(() => {
    if (transitioning || briefVisible || !showSkipIntro) return;
    setShowSkipIntro(false);
    globeRef.current?.skipOpening();
  }, [briefVisible, showSkipIntro, transitioning]);

  const handleEnter = useCallback(() => {
    if (transitioning) return;
    setTransitioning(true);
    const tl = gsap.timeline({
      onComplete: () => { setGlobeAnimComplete(true); setView('dashboard'); },
    });
    const exit = [headerRef.current, heroRef.current, commandRef.current, railRef.current].filter(Boolean);
    tl.to(exit, { opacity: 0, y: -22, filter: 'blur(8px)', duration: 0.85, ease: 'power2.inOut', stagger: 0.04 }, 0);
    tl.to(mapLayerRef.current, { scale: 1.10, filter: 'saturate(1.05) brightness(1.04)', duration: 1.2, ease: 'power2.inOut' }, 0);
    tl.to(flashRef.current, { opacity: 0.95, duration: 0.4, ease: 'power2.in' }, 0.85)
      .to(flashRef.current, { opacity: 0, duration: 0.55, ease: 'power2.out' }, 1.25);
  }, [transitioning, setGlobeAnimComplete, setView]);

  const subtitleWords = ['Rehabilitation', '&', 'Resettlement', 'Command'];

  return (
    <div
      ref={rootRef}
      className="relative flex h-screen min-h-[100svh] w-full flex-col overflow-hidden text-slate-900"
      style={{ background: 'linear-gradient(180deg, #fbf6ec 0%, #f6efe1 28%, #efe5d2 100%)' }}
    >
      {/* Globe layer */}
      <div ref={mapLayerRef} className="absolute inset-0 will-change-transform">
        <PolavaramGlobe
          ref={globeRef}
          className="h-full w-full"
          interactive={!transitioning}
          focusProject
          framePadding={framePadding}
          onOpeningComplete={revealBrief}
        />
      </div>

      {/* Soft luminous wash */}
      <div className="pointer-events-none absolute inset-0"
        style={{ background: 'linear-gradient(100deg, rgba(251,246,236,0.78) 0%, rgba(251,246,236,0.36) 30%, rgba(251,246,236,0.06) 56%, transparent 76%, rgba(239,229,210,0.42) 100%)' }} />
      <div className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(120% 80% at 78% 36%, rgba(217,119,6,0.10) 0%, rgba(217,119,6,0.03) 30%, transparent 62%)' }} />
      <div className="landing-grain pointer-events-none absolute inset-0" />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-[2px] bg-[linear-gradient(90deg,#FF9933_0_33%,#F8FAFC_33%_66%,#138808_66%_100%)] opacity-90" />

      <SkipIntroChip
        visible={showSkipIntro && !briefVisible && !transitioning}
        durationMs={SKIP_INTRO_HIDE_DELAY_MS}
        onSkip={handleSkipIntro}
      />

      {/* HEADER (row 1) */}
      <header
        ref={headerRef}
        className="relative z-20 flex shrink-0 items-center justify-between gap-6 px-5 py-4 sm:px-10 lg:px-14"
      >
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-900/10 bg-white/85 shadow-[0_4px_18px_rgba(15,23,42,0.06)] backdrop-blur-xl">
            <AshokaChakra size={26} color="#0F172A" />
          </div>
          <div className="min-w-0 leading-tight">
            <div className="text-[10px] font-medium uppercase tracking-[0.28em] text-slate-500"
              style={{ fontFamily: 'var(--font-jetbrains)' }}>
              Government of Andhra Pradesh
            </div>
            <div className="mt-0.5 truncate text-[15px] font-semibold tracking-tight text-slate-900">
              Polavaram Rehabilitation &amp; Resettlement Portal
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2.5 text-[10px] font-medium uppercase tracking-[0.18em]"
          style={{ fontFamily: 'var(--font-jetbrains)' }}>
          <div className="hidden flex-col items-end leading-tight text-slate-400 lg:flex">
            <span className="tracking-[0.24em]">Mission</span>
            <span className="text-slate-700 tracking-[0.18em]">{missionId}</span>
          </div>
          <div className="hidden h-7 w-px bg-slate-900/10 lg:block" />
          <div className="hidden items-center gap-1.5 rounded-full border border-amber-700/25 bg-white/75 px-3 py-1.5 text-amber-800 backdrop-blur-xl sm:flex">
            <span className="h-1 w-1 rounded-full bg-amber-600" />
            Official · Classified
          </div>
          <div className="hidden items-center gap-1.5 rounded-full border border-slate-900/10 bg-white/75 px-3 py-1.5 text-slate-600 backdrop-blur-xl min-[700px]:flex">
            <Activity className="h-3 w-3 text-emerald-600" strokeWidth={2} />
            <LiveClock />
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-600/25 bg-white/80 px-3 py-1.5 text-emerald-700 backdrop-blur-xl">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500 opacity-60" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Operational
          </div>
        </div>
      </header>

      {/* BODY (row 2) — flex-1 so rail at bottom never overlaps */}
      <div
        ref={bodyRef}
        className="relative z-20 flex min-h-0 flex-1 flex-col px-5 py-3 sm:px-10 lg:flex-row lg:items-stretch lg:gap-10 lg:px-14 lg:py-5"
      >
        {briefVisible && (
          <motion.section
            ref={heroRef}
            className="flex w-full max-w-[640px] flex-col justify-center"
            variants={heroSectionVariants}
            initial={prefersReducedMotion ? false : 'hidden'}
            animate="visible"
          >
            <motion.div
              variants={briefContainerVariants}
              initial={prefersReducedMotion ? false : 'hidden'}
              animate="visible"
            >
            <motion.div
              variants={flowInVariants}
              className="mb-4 inline-flex w-fit items-center gap-3 rounded-full border border-slate-900/10 bg-white/65 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.28em] text-amber-800 backdrop-blur-xl"
              style={{ fontFamily: 'var(--font-jetbrains)' }}
            >
              <Sparkles className="h-3 w-3" strokeWidth={2} />
              Official R&amp;R Command Brief · FY 2026
            </motion.div>

            <h1 className="font-semibold leading-[0.95] tracking-[-0.025em] text-slate-900 text-[40px] sm:text-[54px] lg:text-[68px] xl:text-[78px]">
              <span className="block overflow-hidden">
                <motion.span variants={wordRiseVariants} className="inline-block">
                  Polavaram
                </motion.span>
              </span>
              <span className="mt-2 block overflow-hidden text-[18px] font-light leading-[1.05] text-slate-600 sm:text-[24px] lg:text-[30px]">
                {subtitleWords.map((w, i) => (
                  <motion.span key={i} variants={wordRiseVariants} className="mr-[0.28em] inline-block">
                    {w}
                  </motion.span>
                ))}
              </span>
            </h1>

            <motion.div variants={flowInVariants} className="mt-5 h-px w-24 bg-gradient-to-r from-amber-700 via-amber-500/55 to-transparent" />

            <motion.p
              variants={flowInVariants}
              className="mt-4 max-w-[520px] text-[14.5px] font-light leading-[1.65] text-slate-600 sm:text-[15px]"
            >
              A verified command view of displaced families, affected villages, allotments and relocation
              corridors across the Godavari basin — built for officers, audited for the public record.
            </motion.p>

            <motion.div
              variants={flowInVariants}
              className="mt-5 flex max-w-[380px] overflow-hidden rounded-full border border-slate-900/8 shadow-[0_2px_8px_rgba(15,23,42,0.05)]"
            >
              <div className="h-[3px] flex-1 bg-[#FF9933]" />
              <div className="h-[3px] flex-1 bg-white" />
              <div className="h-[3px] flex-1 bg-[#138808]" />
            </motion.div>

            <motion.div variants={flowInVariants} className="mt-5 grid max-w-[600px] grid-cols-3 gap-3">
              <GlassMetric icon={Users} label="Families" value={families} footnote="Recorded · Apr '26" />
              <GlassMetric icon={MapPin} label="Mandals" value={mandals} footnote="3 corridors" />
              <GlassMetric icon={Home} label="Villages" value={villages} footnote="Surveyed" />
            </motion.div>

            {/* Mobile CTA */}
            <motion.button
              variants={flowInVariants}
              type="button"
              onClick={handleEnter}
              disabled={transitioning}
              className="group mt-6 inline-flex w-full items-center justify-between gap-3 overflow-hidden rounded-full border border-amber-800/40 bg-gradient-to-br from-amber-700 via-amber-600 to-amber-700 px-5 py-3.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-white shadow-[0_18px_44px_rgba(180,83,9,0.30)] transition-all hover:shadow-[0_24px_60px_rgba(180,83,9,0.42)] disabled:cursor-not-allowed disabled:opacity-60 lg:hidden"
              style={{ fontFamily: 'var(--font-jetbrains)' }}
            >
              <span className="flex items-center gap-2.5">
                <LockKeyhole className="h-3.5 w-3.5" strokeWidth={2.2} />
                Enter Dashboard
              </span>
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2.2} />
            </motion.button>
            </motion.div>
          </motion.section>
        )}

        {briefVisible && (
          <motion.aside
            ref={commandRef}
            className="relative ml-auto hidden w-[420px] shrink-0 flex-col self-center overflow-hidden rounded-[20px] border border-white/60 bg-white/55 shadow-[0_30px_80px_rgba(15,23,42,0.14),0_4px_16px_rgba(15,23,42,0.06)] backdrop-blur-2xl lg:flex"
            variants={panelVariants}
            initial={prefersReducedMotion ? false : 'hidden'}
            animate="visible"
          >
            <div className="pointer-events-none absolute inset-0 rounded-[20px] bg-gradient-to-br from-white/70 via-white/10 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-700/40 to-transparent" />

            <div className="relative border-b border-slate-900/8 px-5 py-4">
              <div className="mb-3 flex items-center justify-between gap-4">
                <div>
                  <div className="text-[9px] font-medium uppercase tracking-[0.32em] text-slate-500"
                    style={{ fontFamily: 'var(--font-jetbrains)' }}>
                    Telemetry Deck · FY 2026
                  </div>
                  <div className="mt-1 text-[16px] font-semibold tracking-tight text-slate-900">
                    Field readiness
                  </div>
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-amber-700/30 bg-amber-50 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.24em] text-amber-800"
                  style={{ fontFamily: 'var(--font-jetbrains)' }}>
                  <span className="h-1 w-1 rounded-full bg-amber-600" />
                  Official
                </div>
              </div>
              <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-slate-900/8 bg-white/60 text-center">
                <div className="border-r border-slate-900/8 px-2 py-2.5">
                  <Database className="mx-auto mb-1 h-3.5 w-3.5 text-amber-700" strokeWidth={1.8} />
                  <div className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-slate-700"
                    style={{ fontFamily: 'var(--font-jetbrains)' }}>Verified</div>
                </div>
                <div className="border-r border-slate-900/8 px-2 py-2.5">
                  <Route className="mx-auto mb-1 h-3.5 w-3.5 text-amber-700" strokeWidth={1.8} />
                  <div className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-slate-700"
                    style={{ fontFamily: 'var(--font-jetbrains)' }}>Tracked</div>
                </div>
                <div className="px-2 py-2.5">
                  <FileCheck2 className="mx-auto mb-1 h-3.5 w-3.5 text-amber-700" strokeWidth={1.8} />
                  <div className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-slate-700"
                    style={{ fontFamily: 'var(--font-jetbrains)' }}>Audited</div>
                </div>
              </div>
            </div>

            <div className="relative px-5 py-3">
              <div className="mb-2 flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.22em] text-slate-500"
                style={{ fontFamily: 'var(--font-jetbrains)' }}>
                <span>Affected mandals</span>
                <span className="tabular-nums text-slate-700">{TOTAL_AFFECTED.toLocaleString()} families</span>
              </div>
              {MANDALS.map((m) => <MandalRow key={m.code} mandal={m} />)}
            </div>

            <div className="relative border-t border-slate-900/8 px-5 py-4">
              <button
                type="button"
                onClick={handleEnter}
                disabled={transitioning}
                className="group relative inline-flex w-full items-center justify-between gap-3 overflow-hidden rounded-full border border-amber-800/40 bg-gradient-to-br from-amber-700 via-amber-600 to-amber-700 px-5 py-3.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-white shadow-[0_18px_44px_rgba(180,83,9,0.32)] transition-all duration-300 hover:shadow-[0_28px_70px_rgba(180,83,9,0.46)] disabled:cursor-not-allowed disabled:opacity-60"
                style={{ fontFamily: 'var(--font-jetbrains)' }}
              >
                <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
                <span className="relative flex items-center gap-2.5">
                  <LockKeyhole className="h-3.5 w-3.5" strokeWidth={2.2} />
                  Enter Dashboard
                </span>
                <ArrowUpRight className="relative h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2.2} />
              </button>
              <div className="mt-2.5 flex items-center justify-between gap-3 text-[9px] font-medium uppercase tracking-[0.24em] text-slate-500"
                style={{ fontFamily: 'var(--font-jetbrains)' }}>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-2.5 w-2.5 text-emerald-600" strokeWidth={2.2} />
                  Authorised Access
                </span>
                <span>Activity Logged</span>
              </div>
            </div>
          </motion.aside>
        )}
      </div>

      {/* RAIL (row 3) — flow-positioned, never overlaps anything */}
      <div
        ref={railRef}
        className="relative z-20 shrink-0 px-5 pb-4 pt-2 sm:px-10 lg:px-14"
      >
        {briefVisible ? (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: FLOW_EASE, delay: 0.5 }}
            className="rounded-full border border-slate-900/8 bg-white/70 px-5 py-2 shadow-[0_18px_50px_rgba(15,23,42,0.10)] backdrop-blur-2xl"
          >
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-6">
              <div className="hidden items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-600 md:flex"
                style={{ fontFamily: 'var(--font-jetbrains)' }}>
                <span className="h-1 w-1 rounded-full bg-amber-600" />
                17.2516°N · 81.6398°E
                <span className="mx-2 h-3 w-px bg-slate-900/12" />
                Build v2026.04
              </div>
              <Ticker />
              <div className="hidden items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-600 md:flex"
                style={{ fontFamily: 'var(--font-jetbrains)' }}>
                Channel · 07
                <span className="mx-2 h-3 w-px bg-slate-900/12" />
                <span className="text-emerald-700">Secure</span>
              </div>
            </div>
          </motion.div>
        ) : !prefersReducedMotion ? (
          <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.22em] text-slate-500"
            style={{ fontFamily: 'var(--font-jetbrains)' }}>
            <span className="flex items-center gap-2">
              <span className="landing-pulse-dot relative flex h-1.5 w-1.5">
                <span className="absolute inset-0 rounded-full bg-amber-600/85" />
              </span>
              Initialising satellite imagery
              <span className="landing-ellipsis tabular-nums">...</span>
            </span>
            <span className="hidden md:inline tracking-[0.18em] text-slate-400">{missionId}</span>
          </div>
        ) : null}
      </div>

      <div
        ref={flashRef}
        className="pointer-events-none absolute inset-0 z-40 opacity-0"
        style={{ background: 'linear-gradient(115deg, rgba(255,255,255,0.97), rgba(255,153,51,0.30) 44%, rgba(19,136,8,0.18) 100%)' }}
      />

      <style jsx>{`
        .landing-grain {
          opacity: 0.05;
          mix-blend-mode: multiply;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.92' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.05 0 0 0 0 0.06 0 0 0 0 0.10 0 0 0 0.85 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
          background-size: 180px 180px;
        }

        .landing-pulse-dot::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          background: rgba(217, 119, 6, 0.7);
          animation: pulse-dot 1.6s ease-in-out infinite;
        }

        .landing-ellipsis::after {
          content: '';
          animation: ellipsis 1.4s steps(4, end) infinite;
        }

        @keyframes pulse-dot {
          0%, 100% { transform: scale(1); opacity: 0.85; }
          50% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes ellipsis {
          0% { content: ''; }
          25% { content: '.'; }
          50% { content: '..'; }
          75% { content: '...'; }
          100% { content: ''; }
        }
      `}</style>
    </div>
  );
}

function GlassMetric({
  label, value, icon: Icon, footnote,
}: {
  label: string; value: number; footnote: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/70 bg-white/65 px-3.5 py-3 shadow-[0_8px_30px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl">
      <div className="mb-1.5 flex items-center gap-1.5 text-[9.5px] font-medium uppercase tracking-[0.20em] text-slate-500"
        style={{ fontFamily: 'var(--font-jetbrains)' }}>
        <Icon className="h-3 w-3 text-amber-700" strokeWidth={1.8} />
        {label}
      </div>
      <div className="text-[22px] font-semibold leading-none tracking-[-0.02em] text-slate-900 sm:text-[26px]"
        style={{ fontFamily: 'var(--font-jetbrains)' }}>
        <CountUp value={value} />
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 text-[9px] font-medium uppercase tracking-[0.16em] text-slate-500"
        style={{ fontFamily: 'var(--font-jetbrains)' }}>
        <span className="h-px w-3 bg-amber-700/55" />
        {footnote}
      </div>
    </div>
  );
}
