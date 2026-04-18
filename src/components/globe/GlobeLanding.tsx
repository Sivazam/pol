'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import gsap from 'gsap';
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
// Fallback Component (WebGL not available)
// ─────────────────────────────────────────────
function GlobeFallback({ onEnter }: { onEnter: () => void }) {
  const titleRef = useRef<HTMLDivElement>(null);
  const subtitleRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

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
    <div className="relative w-full h-screen overflow-hidden" style={{ backgroundColor: '#020818' }}>
      {/* Tricolor Bar at top */}
      <div className="absolute top-0 left-0 right-0 z-[5] h-[3px]" style={{ background: 'linear-gradient(90deg, #FF9933 0%, #FF9933 33%, #FFFFFF 33%, #FFFFFF 66%, #138808 66%, #138808 100%)' }} />
      {/* Static map background */}
      <div className="absolute inset-0">
        <div
          className="w-full h-full bg-cover bg-center opacity-40"
          style={{
            backgroundImage: `url('https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/India_location_map.svg/1280px-India_location_map.svg.png')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#020818] via-[#020818]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#020818]/50 to-transparent" />
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
          <div className="mt-2 mx-auto w-48 sm:w-64 h-[1px] bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
          <p
            className="mt-3 text-sm sm:text-base md:text-lg text-gray-300 tracking-widest uppercase"
            style={{ fontFamily: 'var(--font-inter)' }}
          >
            Rehabilitation &amp; Resettlement Portal
          </p>
        </div>

        <div ref={subtitleRef} className="mt-6 opacity-0">
          <p className="text-amber-400/90 text-sm sm:text-base md:text-lg tracking-wide">
            14,000+ Families &nbsp;|&nbsp; 3 Mandals &nbsp;|&nbsp; 30 Villages
          </p>
        </div>

        <button
          ref={buttonRef}
          onClick={onEnter}
          className="mt-10 opacity-0 group relative px-8 py-3 border border-amber-500/50 rounded-lg
                     text-amber-400 text-sm sm:text-base tracking-wider uppercase
                     transition-all duration-300 hover:bg-amber-500/10 hover:border-amber-400
                     hover:shadow-[0_0_30px_rgba(245,158,11,0.2)] cursor-pointer"
        >
          Enter Portal →
          <span className="absolute inset-0 rounded-lg bg-amber-500/5 animate-pulse-glow opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
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
    <div className="relative w-full h-screen overflow-hidden" style={{ backgroundColor: '#020818' }}>
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
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-[#020818] via-[#020818]/80 to-transparent pointer-events-none" />

      {/* Title card - positioned at bottom on mobile */}
      <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center z-10 px-6">
        <div ref={titleRef} className="text-center opacity-0">
          <h1
            className="text-xl font-bold text-white tracking-wide leading-tight"
            style={{ fontFamily: 'var(--font-inter)' }}
          >
            POLAVARAM PROJECT
          </h1>
          <div className="mt-2 mx-auto w-32 h-[1px] bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
          <p
            className="mt-1.5 text-xs text-gray-300 tracking-widest uppercase"
            style={{ fontFamily: 'var(--font-inter)' }}
          >
            Rehabilitation &amp; Resettlement Portal
          </p>
        </div>

        <div ref={subtitleRef} className="mt-3 opacity-0">
          <p className="text-amber-400/90 text-xs tracking-wide">
            14,000+ Families | 3 Mandals | 30 Villages
          </p>
        </div>

        <button
          ref={buttonRef}
          onClick={onEnter}
          className="mt-5 opacity-0 group relative px-6 py-2.5 border border-amber-500/50 rounded-lg
                     text-amber-400 text-xs tracking-wider uppercase
                     transition-all duration-300 hover:bg-amber-500/10 hover:border-amber-400
                     hover:shadow-[0_0_30px_rgba(245,158,11,0.2)] cursor-pointer"
        >
          Enter Portal →
        </button>
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
    <div className="relative w-full h-screen overflow-hidden" style={{ backgroundColor: '#020818' }}>
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
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#020818]/60 to-transparent z-[2] pointer-events-none" />

      {/* Bottom gradient for title readability */}
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-[#020818] via-[#020818]/70 to-transparent z-[2] pointer-events-none" />

      {/* Title card overlay */}
      <div className="absolute bottom-16 left-0 right-0 flex flex-col items-center z-[3] px-4">
        <div ref={titleRef} className="text-center opacity-0">
          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-wider leading-tight"
            style={{ fontFamily: 'var(--font-inter)' }}
          >
            POLAVARAM PROJECT
          </h1>
          <div className="mt-3 mx-auto w-64 sm:w-80 h-[1px] bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
          <p
            className="mt-3 text-base sm:text-lg md:text-xl text-gray-300 tracking-[0.25em] uppercase"
            style={{ fontFamily: 'var(--font-inter)' }}
          >
            Rehabilitation &amp; Resettlement Portal
          </p>
        </div>

        <div ref={subtitleRef} className="mt-5 opacity-0">
          <p className="text-amber-400/90 text-base sm:text-lg tracking-wide">
            14,000+ Families &nbsp;|&nbsp; 3 Mandals &nbsp;|&nbsp; 30 Villages
          </p>
        </div>

        <button
          ref={buttonRef}
          onClick={onEnter}
          className="mt-8 opacity-0 group relative px-10 py-3.5 border border-amber-500/50 rounded-lg
                     text-amber-400 text-sm tracking-[0.2em] uppercase font-medium
                     transition-all duration-300 hover:bg-amber-500/10 hover:border-amber-400
                     hover:shadow-[0_0_40px_rgba(245,158,11,0.25)] cursor-pointer
                     backdrop-blur-sm"
        >
          Enter Portal →
          {/* Glow effect */}
          <span className="absolute -inset-px rounded-lg bg-gradient-to-r from-amber-500/0 via-amber-500/10 to-amber-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </button>

        {/* Government attribution */}
        <p className="mt-6 text-[10px] sm:text-xs text-gray-600 tracking-widest uppercase" style={{ fontFamily: 'var(--font-jetbrains)' }}>
          Government of Andhra Pradesh — Water Resources Department
        </p>
      </div>

      {/* Loading indicator for globe */}
      <div className="absolute top-4 right-4 z-[3] flex items-center gap-2 text-gray-500 text-xs">
        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        <span style={{ fontFamily: 'var(--font-jetbrains)' }}>LIVE PORTAL</span>
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
