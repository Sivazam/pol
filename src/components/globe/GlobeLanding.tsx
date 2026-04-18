'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import gsap from 'gsap';
import { Users, Map, Building2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { POLAVARAM_DAM, ANDHRA_PRADESH } from '@/lib/constants';
import { useIsMobile } from '@/hooks/use-mobile';

// Dynamically import globe.gl with SSR disabled
const Globe = dynamic(() => import('globe.gl'), { ssr: false });

// Dynamically import tsparticles
const Particles = dynamic(
  () => import('@tsparticles/react').then((mod) => mod.Particles),
  { ssr: false }
);

// Polavaram point data for the globe
const POLAVARAM_POINTS = [
  { lat: POLAVARAM_DAM.lat, lng: POLAVARAM_DAM.lng, size: 1, color: '#F59E0B' },
];

// Star field particle config (memoized outside component)
const STAR_PARTICLES_CONFIG = {
  fullScreen: { enable: false },
  fpsLimit: 30,
  particles: {
    number: {
      value: 150,
      density: {
        enable: false,
      },
    },
    color: {
      value: '#ffffff',
    },
    opacity: {
      value: 0.4,
    },
    size: {
      value: { min: 0.5, max: 1.5 },
    },
    move: {
      enable: false,
    },
    shape: {
      type: 'circle',
    },
  },
  detectRetina: true,
};

// ─────────────────────────────────────────────
// Ashoka Chakra SVG decorative element
// ─────────────────────────────────────────────
function AshokaChakra({ size = 48, className = '' }: { size?: number; className?: string }) {
  const spokes = 24;
  const r = size / 2;
  const innerR = r * 0.35;
  const outerR = r * 0.85;
  const spokeLines = Array.from({ length: spokes }, (_, i) => {
    const angle = (i * 2 * Math.PI) / spokes;
    const x1 = r + innerR * Math.cos(angle);
    const y1 = r + innerR * Math.sin(angle);
    const x2 = r + outerR * Math.cos(angle);
    const y2 = r + outerR * Math.sin(angle);
    return (
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="#D97706"
        strokeWidth={size > 40 ? 1 : 0.5}
        opacity={0.5}
      />
    );
  });

  return (
    <svg width={size} height={size} className={className} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={r} cy={r} r={r * 0.9} fill="none" stroke="#D97706" strokeWidth={1} opacity={0.35} />
      <circle cx={r} cy={r} r={innerR} fill="none" stroke="#D97706" strokeWidth={1} opacity={0.4} />
      {spokeLines}
      <circle cx={r} cy={r} r={r * 0.15} fill="#D97706" opacity={0.4} />
    </svg>
  );
}

// ─────────────────────────────────────────────
// Animated Stat Counters
// ─────────────────────────────────────────────
function StatCounters({ className = '' }: { className?: string }) {
  return (
    <div className={`inline-flex items-center justify-center gap-3 sm:gap-5 text-white/90 bg-white/5 backdrop-blur-sm rounded-full px-5 sm:px-8 py-2.5 ${className}`}>
      <div className="flex items-center gap-1.5">
        <Users className="w-3.5 h-3.5 text-amber-400/80" />
        <span className="text-amber-400 font-bold text-sm sm:text-base md:text-xl">750+</span>
        <span className="text-white/50 text-xs sm:text-sm">Affected</span>
      </div>
      <span className="text-white/20">|</span>
      <div className="flex items-center gap-1.5">
        <Map className="w-3.5 h-3.5 text-amber-400/80" />
        <span className="text-amber-400 font-bold text-sm sm:text-base md:text-xl">3</span>
        <span className="text-white/50 text-xs sm:text-sm">Mandals</span>
      </div>
      <span className="text-white/20">|</span>
      <div className="flex items-center gap-1.5">
        <Building2 className="w-3.5 h-3.5 text-amber-400/80" />
        <span className="text-amber-400 font-bold text-sm sm:text-base md:text-xl">15</span>
        <span className="text-white/50 text-xs sm:text-sm">Villages</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Floating Particles (CSS-only)
// ─────────────────────────────────────────────
function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 20 }, (_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${2 + Math.random() * 4}px`,
            height: `${2 + Math.random() * 4}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: `rgba(245, 158, 11, ${0.15 + Math.random() * 0.25})`,
            animation: `floatParticle ${6 + Math.random() * 8}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 5}s`,
          }}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Fallback Component (WebGL not available)
// ─────────────────────────────────────────────
function GlobeFallback({ onEnter }: { onEnter: () => void }) {
  const titleRef = useRef<HTMLDivElement>(null);
  const subtitleRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline({ delay: 0.5 });

    tl.fromTo(
      titleRef.current,
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out' }
    );

    tl.fromTo(
      subtitleRef.current,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' },
      '-=0.4'
    );

    tl.fromTo(
      statsRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' },
      '-=0.2'
    );

    tl.fromTo(
      buttonRef.current,
      { opacity: 0, scale: 0.9 },
      { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.7)' },
      '-=0.2'
    );

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ background: 'linear-gradient(135deg, #0F2B46 0%, #1E3A5F 40%, #0A1628 100%)' }}>
      {/* Animated gradient border around entire fallback */}
      <div className="absolute inset-0 z-[4] pointer-events-none">
        <div className="absolute inset-0 p-[2px] rounded-none animate-gradient-border" style={{ WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }} />
      </div>

      {/* Tricolor Bar at top */}
      <div className="absolute top-0 left-0 right-0 z-[5] h-[3px]" style={{ background: 'linear-gradient(90deg, #FF9933 0%, #FF9933 33%, #FFFFFF 33%, #FFFFFF 66%, #138808 66%, #138808 100%)' }} />

      {/* Government of Andhra Pradesh branding - top left */}
      <div className="absolute top-5 left-5 z-10 flex items-center gap-2">
        <div className="flex gap-[2px]">
          <div className="w-1 h-4 bg-[#FF9933] rounded-sm" />
          <div className="w-1 h-4 bg-white rounded-sm" />
          <div className="w-1 h-4 bg-[#138808] rounded-sm" />
        </div>
        <span className="text-[10px] sm:text-xs text-white/50 tracking-wider uppercase" style={{ fontFamily: 'var(--font-jetbrains)' }}>
          Government of Andhra Pradesh
        </span>
      </div>

      {/* Ashoka Chakra decorative - top right */}
      <div className="absolute top-4 right-6 z-10 opacity-30">
        <AshokaChakra size={56} />
      </div>

      {/* Floating particles */}
      <FloatingParticles />

      {/* India map watermark - enhanced visibility */}
      <div className="absolute inset-0">
        <div
          className="w-full h-full bg-cover bg-center opacity-25"
          style={{
            backgroundImage: `url('https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/India_location_map.svg/1280px-India_location_map.svg.png')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A1628] via-[#0A1628]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0F2B46]/40 to-transparent" />
      </div>

      {/* Polavaram marker pulse */}
      <div className="absolute" style={{ left: '62%', top: '48%' }}>
        <div className="relative">
          <div className="absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-amber-500 animate-pulse-glow" />
          <div className="absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-amber-500/30 animate-ping" />
        </div>
      </div>

      {/* Title card */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-4">
        <div ref={titleRef} className="text-center opacity-0">
          <h1
            className="text-2xl sm:text-3xl md:text-5xl font-bold text-white tracking-wide leading-tight"
            style={{ fontFamily: 'var(--font-inter)' }}
          >
            POLAVARAM PROJECT
          </h1>
          {/* Tricolor decorative line under title */}
          <div className="mt-3 mx-auto flex items-center justify-center gap-0">
            <div className="h-[2px] w-16 sm:w-24 bg-[#FF9933]" />
            <div className="h-[2px] w-16 sm:w-24 bg-white" />
            <div className="h-[2px] w-16 sm:w-24 bg-[#138808]" />
          </div>
          <p
            className="mt-3 text-sm sm:text-base md:text-lg text-gray-300 tracking-widest uppercase"
            style={{ fontFamily: 'var(--font-inter)' }}
          >
            Rehabilitation &amp; Resettlement Portal
          </p>
        </div>

        <div ref={subtitleRef} className="mt-4 opacity-0">
          <StatCounters />
        </div>

        <div className="mt-8 opacity-0 flex flex-col items-center" ref={buttonRef}>
          <button
            onClick={onEnter}
            className="group relative px-10 sm:px-14 py-4 rounded-lg
                       bg-gradient-to-r from-amber-500 to-amber-600
                       text-white text-sm sm:text-base tracking-[0.15em] uppercase font-semibold
                       shadow-lg shadow-amber-500/30
                       animate-shimmer-glow
                       transition-all duration-300 hover:from-amber-400 hover:to-amber-500
                       hover:shadow-xl hover:shadow-amber-500/40 hover:scale-105
                       cursor-pointer active:scale-100"
          >
            ENTER PORTAL →
          </button>
          <span className="mt-2 text-[10px] text-white/40 tracking-widest uppercase" style={{ fontFamily: 'var(--font-jetbrains)' }}>
            Government of Andhra Pradesh
          </span>
        </div>

        {/* Bottom Ashoka Chakra + government text */}
        <div className="mt-6 flex flex-col items-center gap-2 opacity-0" ref={statsRef}>
          <div className="flex items-center gap-3">
            {/* Ashoka emblem placeholder */}
            <div className="w-7 h-7 rounded-full border border-amber-600/30 flex items-center justify-center bg-amber-600/10">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-amber-500/60">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="currentColor" strokeWidth="1" opacity="0.5" />
                <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.4" />
              </svg>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-xs text-white/40 tracking-widest uppercase" style={{ fontFamily: 'var(--font-jetbrains)' }}>भारत सरकार</span>
                <span className="text-white/20">•</span>
                <span className="text-[10px] sm:text-xs text-white/40 tracking-widest uppercase" style={{ fontFamily: 'var(--font-jetbrains)' }}>GOVT. OF A.P.</span>
              </div>
              <span className="text-[9px] sm:text-[10px] text-white/30 tracking-wider" style={{ fontFamily: 'var(--font-jetbrains)' }}>Water Resources Department</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Mobile Globe View (simpler animation)
// ─────────────────────────────────────────────
function MobileGlobeView({ onEnter }: { onEnter: () => void }) {
  const globeRef = useRef<any>(null);
  const [particlesInit, setParticlesInit] = useState(false);
  const titleRef = useRef<HTMLDivElement>(null);
  const subtitleRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Init tsparticles
  useEffect(() => {
    async function init() {
      const { loadSlim } = await import('@tsparticles/slim');
      const { tsParticles } = await import('@tsparticles/engine');
      await loadSlim(tsParticles as any);
      setParticlesInit(true);
    }
    init();
  }, []);

  // Globe setup & animation
  useEffect(() => {
    if (!globeRef.current) return;

    const timeouts: NodeJS.Timeout[] = [];

    try {
      globeRef.current
        .globeImageUrl(
          'https://unpkg.com/globe.gl/example/img/earth-blue-marble.jpg'
        )
        .atmosphereColor('#1E90FF')
        .atmosphereAltitude(0.15)
        .backgroundColor('#020818')
        .pointsData(POLAVARAM_POINTS)
        .pointAltitude(0.02)
        .pointColor(() => '#F59E0B')
        .pointRadius(0.6);

      // Skip zoom animation on mobile, just show India
      const t1 = setTimeout(() => {
        if (globeRef.current) {
          globeRef.current.pointOfView(
            { lat: ANDHRA_PRADESH.lat, lng: ANDHRA_PRADESH.lng, altitude: 1.2 },
            2000
          );
        }
      }, 500);
      timeouts.push(t1);
    } catch {
      // Globe failed silently
    }

    // Show title card faster on mobile
    const t2 = setTimeout(() => {
      const tl = gsap.timeline();

      tl.fromTo(
        titleRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }
      );

      tl.fromTo(
        subtitleRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' },
        '-=0.3'
      );

      tl.fromTo(
        buttonRef.current,
        { opacity: 0, scale: 0.9 },
        { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.7)' },
        '-=0.2'
      );
    }, 2500);
    timeouts.push(t2);

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, []);

  const particlesLoaded = useCallback(async () => {}, []);

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ background: 'linear-gradient(135deg, #0F2B46 0%, #1E3A5F 40%, #0A1628 100%)' }}>
      {/* Tricolor Bar at top */}
      <div className="absolute top-0 left-0 right-0 z-[5] h-[3px]" style={{ background: 'linear-gradient(90deg, #FF9933 0%, #FF9933 33%, #FFFFFF 33%, #FFFFFF 66%, #138808 66%, #138808 100%)' }} />

      {/* Government branding top-left */}
      <div className="absolute top-5 left-4 z-10 flex items-center gap-1.5">
        <div className="flex gap-[1px]">
          <div className="w-[3px] h-3 bg-[#FF9933] rounded-sm" />
          <div className="w-[3px] h-3 bg-white rounded-sm" />
          <div className="w-[3px] h-3 bg-[#138808] rounded-sm" />
        </div>
        <span className="text-[9px] text-white/50 tracking-wider uppercase" style={{ fontFamily: 'var(--font-jetbrains)' }}>
          भारत सरकार • Govt. of A.P.
        </span>
      </div>

      {/* Star field */}
      {particlesInit && (
        <Particles
          id="tsparticles-mobile"
          particlesLoaded={particlesLoaded}
          options={STAR_PARTICLES_CONFIG as any}
          className="absolute inset-0"
        />
      )}

      {/* Globe */}
      <div className="absolute inset-0">
        <Globe
          ref={globeRef}
          width={typeof window !== 'undefined' ? window.innerWidth : 400}
          height={typeof window !== 'undefined' ? window.innerHeight * 0.6 : 400}
        />
      </div>

      {/* Gradient overlay for readability */}
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-[#0A1628] via-[#0A1628]/80 to-transparent pointer-events-none" />

      {/* Title card - positioned at bottom on mobile */}
      <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center z-10 px-6">
        <div ref={titleRef} className="text-center opacity-0">
          <h1
            className="text-xl font-bold text-white tracking-wide leading-tight"
            style={{ fontFamily: 'var(--font-inter)' }}
          >
            POLAVARAM PROJECT
          </h1>
          {/* Tricolor line */}
          <div className="mt-2 mx-auto flex items-center justify-center gap-0">
            <div className="h-[2px] w-8 bg-[#FF9933]" />
            <div className="h-[2px] w-8 bg-white" />
            <div className="h-[2px] w-8 bg-[#138808]" />
          </div>
          <p
            className="mt-1.5 text-xs text-gray-300 tracking-widest uppercase"
            style={{ fontFamily: 'var(--font-inter)' }}
          >
            Rehabilitation &amp; Resettlement Portal
          </p>
        </div>

        <div ref={subtitleRef} className="mt-3 opacity-0">
          <StatCounters className="text-xs" />
        </div>

        <div className="mt-5 opacity-0 flex flex-col items-center" ref={buttonRef}>
          <button
            onClick={onEnter}
            className="group relative px-8 sm:px-10 py-3 rounded-lg
                       bg-gradient-to-r from-amber-500 to-amber-600
                       text-white text-xs tracking-[0.15em] uppercase font-semibold
                       shadow-lg shadow-amber-500/30
                       animate-shimmer-glow
                       transition-all duration-300 hover:from-amber-400 hover:to-amber-500
                       hover:shadow-xl hover:shadow-amber-500/40 hover:scale-105
                       cursor-pointer active:scale-100"
          >
            ENTER PORTAL →
          </button>
          <span className="mt-1.5 text-[9px] text-white/35 tracking-widest uppercase" style={{ fontFamily: 'var(--font-jetbrains)' }}>
            Government of Andhra Pradesh
          </span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Desktop Globe View (full cinematic experience)
// ─────────────────────────────────────────────
function DesktopGlobeView({ onEnter }: { onEnter: () => void }) {
  const globeRef = useRef<any>(null);
  const [particlesInit, setParticlesInit] = useState(false);
  const [webglFailed, setWebglFailed] = useState(false);
  const titleRef = useRef<HTMLDivElement>(null);
  const subtitleRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  // Init tsparticles
  useEffect(() => {
    async function init() {
      try {
        const { loadSlim } = await import('@tsparticles/slim');
        const { tsParticles } = await import('@tsparticles/engine');
        await loadSlim(tsParticles as any);
        setParticlesInit(true);
      } catch (e) {
        console.warn('tsparticles init failed:', e);
      }
    }
    init();
  }, []);

  // Check WebGL availability
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl =
        canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebglFailed(true);
      }
    } catch {
      setWebglFailed(true);
    }
  }, []);

  // Animate title card (used by both globe path and fallback)
  const animateTitleCard = useCallback(() => {
    const tl = gsap.timeline();
    tl.fromTo(titleRef.current, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out' });
    tl.fromTo(subtitleRef.current, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, '-=0.5');
    tl.fromTo(statsRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, '-=0.3');
    setTimeout(() => {
      gsap.fromTo(buttonRef.current, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.7)' });
    }, 1000);
  }, []);

  // Globe setup & cinematic animation sequence
  useEffect(() => {
    if (webglFailed) {
      // If WebGL failed, show title card immediately
      const t = setTimeout(animateTitleCard, 500);
      return () => clearTimeout(t);
    }

    const timeouts: NodeJS.Timeout[] = [];
    let globeInitialized = false;

    // Wait for globe to mount (max 5 seconds)
    const waitForGlobe = setInterval(() => {
      if (globeRef.current) {
        clearInterval(waitForGlobe);
        globeInitialized = true;

        try {
          globeRef.current
            .globeImageUrl('https://unpkg.com/globe.gl/example/img/earth-blue-marble.jpg')
            .bumpImageUrl('https://unpkg.com/globe.gl/example/img/earth-topology.png')
            .atmosphereColor('#1E90FF')
            .atmosphereAltitude(0.15)
            .backgroundColor('#020818')
            .pointsData(POLAVARAM_POINTS)
            .pointAltitude(0.01)
            .pointColor(() => '#F59E0B')
            .pointRadius(0.5)
            .pointsMerge(false);

          globeRef.current.controls().autoRotate = true;
          globeRef.current.controls().autoRotateSpeed = 0.5;

          const t1 = setTimeout(() => {
            if (!globeRef.current) return;
            globeRef.current.controls().autoRotate = false;
            globeRef.current.pointOfView({ lat: ANDHRA_PRADESH.lat, lng: ANDHRA_PRADESH.lng, altitude: 1.5 }, 3000);
          }, 1500);
          timeouts.push(t1);

          const t2 = setTimeout(() => {
            if (!globeRef.current) return;
            globeRef.current.pointOfView({ lat: POLAVARAM_DAM.lat, lng: POLAVARAM_DAM.lng, altitude: 0.8 }, 3000);
            const t3 = setTimeout(() => {
              if (!globeRef.current) return;
              globeRef.current.pointsData(POLAVARAM_POINTS).pointAltitude(0.04).pointRadius(0.8);
            }, 2000);
            timeouts.push(t3);
          }, 4500);
          timeouts.push(t2);

          const t4 = setTimeout(animateTitleCard, 7500);
          timeouts.push(t4);
        } catch (e) {
          console.warn('Globe setup failed:', e);
          const tf = setTimeout(animateTitleCard, 500);
          timeouts.push(tf);
        }
      }
    }, 200);

    // Fallback: if globe doesn't initialize in 5s, show title card anyway
    const fallbackTimeout = setTimeout(() => {
      if (!globeInitialized) {
        clearInterval(waitForGlobe);
        animateTitleCard();
      }
    }, 5000);
    timeouts.push(fallbackTimeout);

    return () => {
      clearInterval(waitForGlobe);
      timeouts.forEach(clearTimeout);
    };
  }, [webglFailed, animateTitleCard]);

  const particlesLoaded = useCallback(async () => {}, []);

  // If WebGL failed, render fallback
  if (webglFailed) {
    return <GlobeFallback onEnter={onEnter} />;
  }

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ background: 'linear-gradient(135deg, #0F2B46 0%, #1E3A5F 40%, #0A1628 100%)' }}>
      {/* Star field particles */}
      {particlesInit && (
        <Particles
          id="tsparticles-desktop"
          particlesLoaded={particlesLoaded}
          options={STAR_PARTICLES_CONFIG as any}
          className="absolute inset-0 z-0"
        />
      )}

      {/* Globe container */}
      <div className="absolute inset-0 z-[1]">
        <Globe
          ref={globeRef}
          width={typeof window !== 'undefined' ? window.innerWidth : 1200}
          height={typeof window !== 'undefined' ? window.innerHeight : 800}
        />
      </div>

      {/* Top gradient for atmospheric feel */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#0A1628]/60 to-transparent z-[2] pointer-events-none" />

      {/* Bottom gradient for title readability */}
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-[#0A1628] via-[#0A1628]/70 to-transparent z-[2] pointer-events-none" />

      {/* Government of Andhra Pradesh branding - top left */}
      <div className="absolute top-5 left-6 z-[3] flex items-center gap-2.5">
        <div className="flex gap-[2px]">
          <div className="w-1 h-4 bg-[#FF9933] rounded-sm" />
          <div className="w-1 h-4 bg-white rounded-sm" />
          <div className="w-1 h-4 bg-[#138808] rounded-sm" />
        </div>
        <span className="text-[10px] sm:text-xs text-white/50 tracking-wider uppercase" style={{ fontFamily: 'var(--font-jetbrains)' }}>
          Government of Andhra Pradesh
        </span>
      </div>

      {/* LIVE PORTAL indicator - top right */}
      <div className="absolute top-4 right-6 z-[3] flex items-center gap-3">
        <div className="flex items-center gap-2 text-gray-400 text-xs">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span style={{ fontFamily: 'var(--font-jetbrains)' }}>LIVE PORTAL</span>
        </div>
        <div className="w-px h-4 bg-white/20" />
        <span className="text-[10px] text-white/40 tracking-wider uppercase" style={{ fontFamily: 'var(--font-jetbrains)' }}>भारत सरकार • GOVT. OF A.P.</span>
        <AshokaChakra size={28} className="opacity-30" />
      </div>

      {/* Title card overlay */}
      <div className="absolute bottom-16 left-0 right-0 flex flex-col items-center z-[3] px-4">
        <div ref={titleRef} className="text-center opacity-0">
          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-wider leading-tight"
            style={{ fontFamily: 'var(--font-inter)' }}
          >
            POLAVARAM PROJECT
          </h1>
          {/* Tricolor decorative line under title */}
          <div className="mt-3 mx-auto flex items-center justify-center gap-0">
            <div className="h-[2px] w-20 sm:w-28 bg-[#FF9933]" />
            <div className="h-[2px] w-20 sm:w-28 bg-white" />
            <div className="h-[2px] w-20 sm:w-28 bg-[#138808]" />
          </div>
          <p
            className="mt-3 text-base sm:text-lg md:text-xl text-gray-300 tracking-[0.25em] uppercase"
            style={{ fontFamily: 'var(--font-inter)' }}
          >
            Rehabilitation &amp; Resettlement Portal
          </p>
        </div>

        <div ref={subtitleRef} className="mt-5 opacity-0">
          <StatCounters />
        </div>

        <div className="mt-8 opacity-0 flex flex-col items-center" ref={buttonRef}>
          <button
            onClick={onEnter}
            className="group relative px-14 sm:px-16 py-4 rounded-lg
                       bg-gradient-to-r from-amber-500 to-amber-600
                       text-white text-sm tracking-[0.2em] uppercase font-semibold
                       shadow-lg shadow-amber-500/30
                       animate-shimmer-glow
                       transition-all duration-300 hover:from-amber-400 hover:to-amber-500
                       hover:shadow-xl hover:shadow-amber-500/40 hover:scale-105
                       cursor-pointer active:scale-100
                       backdrop-blur-sm"
          >
            ENTER PORTAL →
          </button>
          <span className="mt-2 text-[10px] text-white/40 tracking-widest uppercase" style={{ fontFamily: 'var(--font-jetbrains)' }}>
            Government of Andhra Pradesh
          </span>
        </div>

        {/* Government attribution */}
        <div ref={statsRef} className="mt-6 flex items-center gap-3 opacity-0">
          <AshokaChakra size={32} className="opacity-30" />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs text-white/50 tracking-widest uppercase" style={{ fontFamily: 'var(--font-jetbrains)' }}>भारत सरकार</span>
              <span className="text-white/20">•</span>
              <span className="text-[10px] sm:text-xs text-white/50 tracking-widest uppercase" style={{ fontFamily: 'var(--font-jetbrains)' }}>GOVT. OF A.P.</span>
            </div>
            <span className="text-[9px] sm:text-[10px] text-white/30 tracking-wider" style={{ fontFamily: 'var(--font-jetbrains)' }}>Government of Andhra Pradesh — Water Resources Department</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main GlobeLanding Component
// ─────────────────────────────────────────────
export default function GlobeLanding() {
  const setView = useAppStore((s) => s.setView);
  const setAuthenticated = useAppStore((s) => s.setAuthenticated);
  const setGlobeAnimComplete = useAppStore((s) => s.setGlobeAnimComplete);
  const isMobile = useIsMobile();

  const handleEnter = useCallback(() => {
    setGlobeAnimComplete(true);
    setAuthenticated(true);
    setView('dashboard');
  }, [setView, setAuthenticated, setGlobeAnimComplete]);

  // Mobile view
  if (isMobile) {
    return <MobileGlobeView onEnter={handleEnter} />;
  }

  // Desktop view (also used during SSR since isMobile defaults to false)
  return <DesktopGlobeView onEnter={handleEnter} />;
}
