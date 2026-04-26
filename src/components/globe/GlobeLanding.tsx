'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
} from 'react';
import gsap from 'gsap';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  Database,
  FileCheck2,
  Home,
  FastForward,
  LockKeyhole,
  MapPin,
  Route,
  ShieldCheck,
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
  { name: 'V. R. Puram', code: 'VRP', color: '#D97706', villages: 10, families: 5137, corridor: 'North bank' },
  { name: 'Chintoor', code: 'CHN', color: '#0D9488', villages: 11, families: 4512, corridor: 'Upper belt' },
  { name: 'Kunavaram', code: 'KUN', color: '#EA580C', villages: 9, families: 4312, corridor: 'River bend' },
];

const TOTAL_AFFECTED = MANDALS.reduce((sum, mandal) => sum + mandal.families, 0);
const BRIEF_REVEAL_FALLBACK_MS = 17800;
const FLOW_EASE = [0.22, 1, 0.36, 1] as const;
const briefContainerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
};
const flowInVariants = {
  hidden: { opacity: 0, y: 18, filter: 'blur(8px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.72, ease: FLOW_EASE },
  },
};
const panelVariants = {
  hidden: { opacity: 0, x: 28, filter: 'blur(10px)' },
  visible: {
    opacity: 1,
    x: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.86, ease: FLOW_EASE, delay: 0.1 },
  },
};
const targetVariants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.9, ease: FLOW_EASE },
  },
};

function useStats() {
  return {
    families: PROJECT_STATS.totalFamilies,
    mandals: PROJECT_STATS.totalMandals,
    villages: PROJECT_STATS.totalVillages,
  };
}

function CountUp({ value, prefix = '' }: { value: number; prefix?: string }) {
  return <span className="tabular-nums">{prefix}{value.toLocaleString()}</span>;
}

function LiveClock() {
  const [time, setTime] = useState('');

  useEffect(() => {
    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      hourCycle: 'h23',
    });
    const update = () => setTime(`${formatter.format(new Date())} IST`);
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return <span className="tabular-nums">{time || '--:--:-- IST'}</span>;
}

function AshokaChakra({ size = 30, color = '#1E3A5F' }: { size?: number; color?: string }) {
  const radius = size / 2;
  const innerRadius = radius * 0.34;
  const outerRadius = radius * 0.84;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={radius} cy={radius} r={outerRadius} fill="none" stroke={color} strokeWidth="1.1" />
      <circle cx={radius} cy={radius} r={innerRadius} fill="none" stroke={color} strokeWidth="1" opacity="0.75" />
      {Array.from({ length: 24 }, (_, index) => {
        const angle = (index * 2 * Math.PI) / 24;
        return (
          <line
            key={index}
            x1={radius + innerRadius * Math.cos(angle)}
            y1={radius + innerRadius * Math.sin(angle)}
            x2={radius + outerRadius * Math.cos(angle)}
            y2={radius + outerRadius * Math.sin(angle)}
            stroke={color}
            strokeWidth="0.75"
            opacity="0.8"
          />
        );
      })}
      <circle cx={radius} cy={radius} r={radius * 0.12} fill={color} />
    </svg>
  );
}

function HeroMetric({ label, value, icon: Icon }: { label: string; value: number; icon: ComponentType<{ className?: string; strokeWidth?: number }> }) {
  return (
    <div className="border-l border-white/16 pl-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-white/58">
        <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
        {label}
      </div>
      <div className="text-2xl font-semibold text-white sm:text-3xl">
        <CountUp value={value} />
      </div>
    </div>
  );
}

function MandalTrack({ mandal }: { mandal: MandalBrief }) {
  const width = `${Math.round((mandal.families / TOTAL_AFFECTED) * 100)}%`;

  return (
    <div className="border-t border-white/10 py-3 first:border-t-0">
      <div className="mb-2 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-white">{mandal.name}</div>
          <div className="mt-0.5 text-xs text-white/45">{mandal.corridor} / {mandal.villages} villages</div>
        </div>
        <div className="text-right text-sm font-semibold text-white tabular-nums">
          {mandal.families.toLocaleString()}
        </div>
      </div>
      <div className="h-1.5 overflow-hidden bg-white/12">
        <div className="h-full rounded-sm" style={{ width, backgroundColor: mandal.color }} />
      </div>
    </div>
  );
}

export default function GlobeLanding() {
  const setView = useAppStore((state) => state.setView);
  const setGlobeAnimComplete = useAppStore((state) => state.setGlobeAnimComplete);
  const { families, mandals, villages } = useStats();

  const topBarRef = useRef<HTMLElement>(null);
  const mapLayerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const commandRef = useRef<HTMLElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<PolavaramGlobeHandle>(null);

  const [transitioning, setTransitioning] = useState(false);
  const [briefVisible, setBriefVisible] = useState(false);
  const [showSkipIntro, setShowSkipIntro] = useState(true);
  const prefersReducedMotion = useReducedMotion();

  const revealBrief = useCallback(() => {
    setBriefVisible(true);
  }, []);

  useEffect(() => {
    const previousBodyBackground = document.body.style.backgroundColor;
    const previousHtmlBackground = document.documentElement.style.backgroundColor;

    document.body.style.backgroundColor = '#06111f';
    document.documentElement.style.backgroundColor = '#06111f';

    return () => {
      document.body.style.backgroundColor = previousBodyBackground;
      document.documentElement.style.backgroundColor = previousHtmlBackground;
    };
  }, []);

  useEffect(() => {
    const fallbackTimer = window.setTimeout(revealBrief, BRIEF_REVEAL_FALLBACK_MS);
    return () => window.clearTimeout(fallbackTimer);
  }, [revealBrief]);

  useEffect(() => {
    if (prefersReducedMotion || briefVisible) {
      setShowSkipIntro(false);
      return;
    }

    setShowSkipIntro(true);
    const hideSkipTimer = window.setTimeout(() => {
      setShowSkipIntro(false);
    }, SKIP_INTRO_HIDE_DELAY_MS);

    return () => window.clearTimeout(hideSkipTimer);
  }, [briefVisible, prefersReducedMotion]);

  const handleSkipIntro = useCallback(() => {
    if (transitioning || briefVisible || !showSkipIntro) return;
    setShowSkipIntro(false);
    globeRef.current?.skipOpening();
  }, [briefVisible, showSkipIntro, transitioning]);

  const handleEnter = useCallback(() => {
    if (transitioning) return;
    setTransitioning(true);

    const timeline = gsap.timeline({
      onComplete: () => {
        setGlobeAnimComplete(true);
        setView('dashboard');
      },
    });

    const exitTargets = [topBarRef.current, heroRef.current, commandRef.current, targetRef.current].filter(Boolean);

    timeline.to(exitTargets, {
      opacity: 0,
      y: -18,
      filter: 'blur(7px)',
      duration: 0.85,
      ease: 'power2.inOut',
      stagger: 0.03,
    }, 0);
    timeline.to(mapLayerRef.current, {
      scale: 1.12,
      filter: 'saturate(1.15) contrast(1.08)',
      duration: 1.25,
      ease: 'power2.inOut',
    }, 0);
    timeline.to(flashRef.current, { opacity: 0.94, duration: 0.42, ease: 'power2.in' }, 0.9)
      .to(flashRef.current, { opacity: 0, duration: 0.55, ease: 'power2.out' }, 1.3);
  }, [transitioning, setGlobeAnimComplete, setView]);

  return (
    <div className="relative h-screen min-h-[100svh] w-full overflow-hidden bg-[#06111f] text-white">
      <div ref={mapLayerRef} className="absolute inset-0 will-change-transform">
        <PolavaramGlobe ref={globeRef} className="h-full w-full" interactive={!transitioning} focusProject onOpeningComplete={revealBrief} />
      </div>

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(5,14,27,0.98) 0%, rgba(5,14,27,0.94) 37%, rgba(5,14,27,0.44) 63%, rgba(5,14,27,0.05) 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgba(5,14,27,0.22) 0%, transparent 42%, rgba(5,14,27,0.72) 100%)' }}
      />
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-70" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-1 bg-[linear-gradient(90deg,#FF9933_0_33%,#FFFFFF_33%_66%,#138808_66%_100%)]" />

      {briefVisible && (
        <motion.div
          ref={targetRef}
          className="landing-target pointer-events-none absolute right-[17%] top-[42%] z-10 hidden h-[340px] w-[340px] -translate-y-1/2 md:block lg:h-[460px] lg:w-[460px]"
          variants={targetVariants}
          initial={prefersReducedMotion ? false : 'hidden'}
          animate="visible"
        >
          <div className="absolute inset-0 rounded-full border border-teal-300/30 shadow-[0_0_80px_rgba(13,148,136,0.16)]" />
          <div className="absolute inset-8 rounded-full border border-amber-300/34" />
          <div className="absolute inset-16 rounded-full border border-white/22" />
          <div className="absolute left-1/2 top-0 h-full w-px bg-white/22" />
          <div className="absolute left-0 top-1/2 h-px w-full bg-white/22" />
          <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 border-2 border-amber-300 bg-[#06111f]" />
          <div className="absolute -right-4 top-1/2 hidden -translate-y-1/2 border-l border-white/35 pl-3 text-xs font-semibold text-white/78 lg:block">
            Polavaram focus<br />17.25N / 81.64E
          </div>
        </motion.div>
      )}

      <div className="relative z-20 flex h-full flex-col px-4 pt-3 sm:px-8 sm:pt-4 lg:px-10">
        {showSkipIntro && !briefVisible && !transitioning && (
          <div className="pointer-events-none absolute right-4 top-5 z-30 sm:right-8 sm:top-6 lg:right-10">
            <button
              type="button"
              onClick={handleSkipIntro}
              className="pointer-events-auto inline-flex items-center gap-2 border border-white/16 bg-[#07182b]/78 px-3 py-2 text-xs font-medium text-white/78 backdrop-blur-md transition-colors hover:bg-[#0a2038] hover:text-white"
            >
              <FastForward className="h-3.5 w-3.5" strokeWidth={1.9} />
              Skip intro
            </button>
          </div>
        )}

        <header ref={topBarRef} className="flex shrink-0 items-center justify-between gap-4 border-b border-white/12 bg-[#07182b]/72 px-3 py-2 shadow-[0_20px_80px_rgba(0,0,0,0.22)] backdrop-blur-md sm:px-4 sm:py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-white/16 bg-white/8">
              <AshokaChakra size={27} color="#F8FAFC" />
            </div>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-sm font-semibold text-white">Government of Andhra Pradesh</div>
              <div className="truncate text-xs text-white/58">Polavaram Rehabilitation and Resettlement Portal</div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-4 text-xs font-medium text-white/72">
            <div className="hidden items-center gap-2 min-[600px]:flex">
              <Activity className="h-3.5 w-3.5 text-emerald-300" strokeWidth={2} />
              <LiveClock />
            </div>
            <div className="hidden h-6 w-px bg-white/14 min-[600px]:block" />
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              Operational
            </div>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 items-start gap-5 pb-4 pt-5 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center lg:gap-10 lg:pt-6">
          {briefVisible && (
          <motion.section
            ref={heroRef}
            className="max-w-[720px]"
            variants={briefContainerVariants}
            initial={prefersReducedMotion ? false : 'hidden'}
            animate="visible"
          >
            <motion.div variants={flowInVariants} className="mb-4 inline-flex items-center gap-2 border border-white/16 bg-white/8 px-3 py-2 text-xs font-medium text-white/78 backdrop-blur-md sm:mb-5 sm:text-sm">
              <ShieldCheck className="h-4 w-4 text-emerald-300" strokeWidth={1.8} />
              Official R&amp;R command brief
            </motion.div>

            <motion.h1 variants={flowInVariants} className="max-w-[760px] text-4xl font-semibold leading-[0.94] text-white sm:text-5xl lg:text-[84px]">
              Polavaram Rehabilitation Command
            </motion.h1>

            <motion.p variants={flowInVariants} className="mt-4 max-w-[610px] text-sm leading-6 text-white/68 sm:mt-5 sm:text-base md:text-lg md:leading-7">
              A verified command view for displaced families, affected villages, allotments and relocation corridors across the Godavari basin.
            </motion.p>

            <motion.div variants={flowInVariants} className="mt-5 flex max-w-[590px] overflow-hidden border border-white/12 bg-white/8 backdrop-blur-md sm:mt-7">
              <div className="h-2 flex-1 bg-[#FF9933]" />
              <div className="h-2 flex-1 bg-white" />
              <div className="h-2 flex-1 bg-[#138808]" />
            </motion.div>

            <motion.div variants={flowInVariants} className="mt-5 grid max-w-[620px] grid-cols-3 gap-3 sm:mt-8 sm:gap-4">
              <HeroMetric icon={Users} label="Families" value={families} />
              <HeroMetric icon={MapPin} label="Mandals" value={mandals} />
              <HeroMetric icon={Home} label="Villages" value={villages} />
            </motion.div>

            <motion.button
              variants={flowInVariants}
              type="button"
              onClick={handleEnter}
              disabled={transitioning}
              className="mt-5 inline-flex w-full items-center justify-between gap-3 bg-[#f7efe1] px-4 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 lg:hidden"
            >
              <span className="flex items-center gap-2">
                <LockKeyhole className="h-4 w-4" strokeWidth={2} />
                Enter Dashboard
              </span>
              <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
            </motion.button>
          </motion.section>
          )}

          {briefVisible && (
          <motion.aside
            ref={commandRef}
            className="hidden border border-white/16 bg-[#07182b]/84 shadow-[0_28px_90px_rgba(0,0,0,0.34)] backdrop-blur-xl lg:block"
            variants={panelVariants}
            initial={prefersReducedMotion ? false : 'hidden'}
            animate="visible"
          >
            <div className="border-b border-white/10 px-5 py-4">
              <div className="mb-3 flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-medium text-white/48">Project Overview / 2026</div>
                  <div className="mt-1 text-xl font-semibold text-white">Field readiness</div>
                </div>
                <div className="border border-amber-300/38 bg-amber-300/12 px-2.5 py-1 text-xs font-semibold text-amber-100">
                  OFFICIAL
                </div>
              </div>
              <div className="grid grid-cols-3 border border-white/10 bg-white/6 text-center">
                <div className="border-r border-white/10 px-3 py-3">
                  <Database className="mx-auto mb-1 h-4 w-4 text-white/58" strokeWidth={1.8} />
                  <div className="text-sm font-semibold text-white">Verified</div>
                </div>
                <div className="border-r border-white/10 px-3 py-3">
                  <Route className="mx-auto mb-1 h-4 w-4 text-white/58" strokeWidth={1.8} />
                  <div className="text-sm font-semibold text-white">Tracked</div>
                </div>
                <div className="px-3 py-3">
                  <FileCheck2 className="mx-auto mb-1 h-4 w-4 text-white/58" strokeWidth={1.8} />
                  <div className="text-sm font-semibold text-white">Audited</div>
                </div>
              </div>
            </div>

            <div className="px-5 py-4">
              <div className="mb-2 flex items-center justify-between text-xs font-medium text-white/48">
                <span>Affected mandals</span>
                <span>{TOTAL_AFFECTED.toLocaleString()} families</span>
              </div>
              {MANDALS.map((mandal) => (
                <MandalTrack key={mandal.code} mandal={mandal} />
              ))}
            </div>

            <div className="border-t border-white/10 px-5 py-4">
              <button
                type="button"
                onClick={handleEnter}
                disabled={transitioning}
                className="group inline-flex w-full items-center justify-between gap-3 bg-[#f7efe1] px-5 py-4 text-sm font-semibold text-slate-950 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex items-center gap-2">
                  <LockKeyhole className="h-4 w-4" strokeWidth={2} />
                  Enter Dashboard
                </span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={2.2} />
              </button>
              <div className="mt-3 flex items-center justify-between gap-3 text-xs text-white/42">
                <span>Authorised access</span>
                <span>Activity logged</span>
              </div>
            </div>
          </motion.aside>
          )}
        </div>

      </div>

      <div
        ref={flashRef}
        className="pointer-events-none absolute inset-0 z-40 opacity-0"
        style={{ background: 'linear-gradient(115deg, rgba(255,255,255,0.98), rgba(255,153,51,0.28) 44%, rgba(19,136,8,0.16) 100%)' }}
      />

      <style jsx>{`
        .landing-grid {
          background-image:
            linear-gradient(rgba(248, 250, 252, 0.075) 1px, transparent 1px),
            linear-gradient(90deg, rgba(248, 250, 252, 0.075) 1px, transparent 1px),
            linear-gradient(115deg, transparent 0%, transparent 54%, rgba(255, 153, 51, 0.16) 54%, rgba(255, 153, 51, 0.16) 54.4%, transparent 54.4%);
          background-size: 64px 64px, 64px 64px, 100% 100%;
        }

        .landing-target {
          animation: target-breathe 5.6s ease-in-out infinite;
          transform-origin: center;
        }

        @keyframes target-breathe {
          0%, 100% { transform: translateY(-50%) scale(1); }
          50% { transform: translateY(-50%) scale(1.025); }
        }
      `}</style>
    </div>
  );
}