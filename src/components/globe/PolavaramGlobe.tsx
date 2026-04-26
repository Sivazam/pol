'use client';

/**
 * PolavaramGlobe — cinematic pitched corridor (v4).
 *
 * Premium, light, no river. Cinematic flourishes:
 *   - Tight 3-phase descent: India → basin → pitched corridor.
 *   - Layered mandal vis: deep glow + tinted fill + halo + crisp 1.6px hairline +
 *     a *breathing* outer ring driven by JS for a living, premium pulse.
 *   - Polavaram dam: triple-ring radar ping + crisp white-stroked dot.
 *   - Slow idle camera "breathing" after settle (±0.7° pitch, ±0.5° bearing) for
 *     subtle parallax life — disabled on prefers-reduced-motion.
 *   - Cinematic vignette + warm/cool radial gradients overlaid over the basemap.
 *   - Scanline sweep — slow rotating conic-gradient washes the stage.
 *   - Voyager raster tinted into a film-grade light look.
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const POLAVARAM = { lat: 17.2516, lng: 81.6398, name: 'Polavaram Dam' };

// Per-mandal accent colors used by the draw animation (line-gradient needs
// a literal color value, not a feature expression).
const MANDAL_COLOR_BY_CODE: Record<string, string> = {
  CHN: '#0D9488',
  VRP: '#B45309',
  KUN: '#C2410C',
};

const INDIA_CENTER: [number, number] = [80.5, 19.4];
const APPROACH_CENTER: [number, number] = [81.45, 17.55];
const PROJECT_START_CENTER: [number, number] = [81.45, 17.65];

const PROJECT_BOUNDS: [[number, number], [number, number]] = [
  [81.04, 17.20],
  [81.84, 17.94],
];

const PHASE_INDIA_DURATION_MS = 1600;
const PHASE_APPROACH_DELAY_MS = PHASE_INDIA_DURATION_MS - 200;
const PHASE_APPROACH_DURATION_MS = 2400;
const PHASE_PITCH_DELAY_MS = PHASE_APPROACH_DELAY_MS + PHASE_APPROACH_DURATION_MS - 600;
const PHASE_PITCH_DURATION_MS = 2200;
// Cinematic reveal — each mandal takes its time: slow fill, tag pop, breathe,
// then the next one. After all 3, the dam reveals and the brief unlocks.
const POLYGON_DRAW_DELAY_MS = PHASE_PITCH_DELAY_MS + 900;
// One mandal fully fills (~2.4s) + tag pop + small hold before the next
const MANDAL_STAGGER_MS = 2600;
const MANDAL_REVEAL_ORDER = ['CHN', 'VRP', 'KUN'] as const;
// Tag appears toward the end of its mandal's fill, while the flash is still
// glowing — makes the chip feel born from the polygon.
const MARKER_AFTER_POLYGON_MS = 1500;
const FLASH_HOLD_MS = 1100;
const MANDAL_LAST_DELAY_MS = POLYGON_DRAW_DELAY_MS + (MANDAL_REVEAL_ORDER.length - 1) * MANDAL_STAGGER_MS;
// After last mandal’s tag, breathe for a beat, then bring in the dam
const DAM_REVEAL_DELAY_MS = MANDAL_LAST_DELAY_MS + 1700;
const DAM_MARKER_DELAY_MS = DAM_REVEAL_DELAY_MS + 1100;
const SKIP_INTRO_HIDE_DELAY_MS = POLYGON_DRAW_DELAY_MS - 200;

const FINAL_PITCH = 46;
const FINAL_BEARING = -10;

const BASEMAP_STYLE = {
  version: 8,
  projection: { type: 'globe' },
  sky: {
    'sky-color': '#e9eff8',
    'sky-horizon-blend': 0.7,
    'horizon-color': '#d5e1ee',
    'horizon-fog-blend': 0.6,
    'fog-color': '#f4ecdb',
    'fog-ground-blend': 0.5,
    'atmosphere-blend': [
      'interpolate', ['linear'], ['zoom'],
      0, 1, 4, 0.85, 7, 0.45, 10, 0.08,
    ],
  },
  sources: {
    voyager: {
      type: 'raster',
      tiles: ['https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png'],
      tileSize: 256,
      attribution: 'Carto Voyager, OpenStreetMap contributors',
    },
  },
  layers: [
    { id: 'paper-canvas', type: 'background', paint: { 'background-color': '#f4ecda' } },
    {
      id: 'voyager',
      type: 'raster',
      source: 'voyager',
      paint: {
        'raster-opacity': 0.93,
        'raster-saturation': -0.18,
        'raster-contrast': 0.06,
        'raster-brightness-min': 0.05,
        'raster-brightness-max': 0.98,
        'raster-hue-rotate': 6,
      },
    },
  ],
};

const FALLBACK_MANDALS = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'Chintoor', code: 'CHN', color: '#0D9488' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [81.086, 17.752], [81.180, 17.890], [81.360, 17.902], [81.540, 17.870],
          [81.700, 17.820], [81.809, 17.740], [81.780, 17.660], [81.620, 17.611],
          [81.440, 17.620], [81.260, 17.660], [81.140, 17.700], [81.086, 17.752],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'V. R. Puram', code: 'VRP', color: '#B45309' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [81.260, 17.580], [81.310, 17.690], [81.420, 17.701], [81.520, 17.660],
          [81.537, 17.580], [81.500, 17.500], [81.420, 17.461], [81.330, 17.475],
          [81.275, 17.520], [81.260, 17.580],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Kunavaram', code: 'KUN', color: '#C2410C' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [81.117, 17.660], [81.180, 17.747], [81.290, 17.740], [81.370, 17.700],
          [81.384, 17.630], [81.340, 17.580], [81.260, 17.564], [81.180, 17.590],
          [81.130, 17.620], [81.117, 17.660],
        ]],
      },
    },
  ],
};

const DAM_SOURCE = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: POLAVARAM.name },
      geometry: { type: 'Point', coordinates: [POLAVARAM.lng, POLAVARAM.lat] },
    },
  ],
};

export interface PolavaramGlobeHandle {
  flyToProject: (durationMs?: number) => void;
  skipOpening: () => void;
  refit: () => void;
}

export { SKIP_INTRO_HIDE_DELAY_MS };

interface PolavaramGlobeProps {
  paused?: boolean;
  interactive?: boolean;
  className?: string;
  focusProject?: boolean;
  framePadding?: { top?: number; right?: number; bottom?: number; left?: number };
  onOpeningComplete?: () => void;
}

async function loadGeoJson(url: string, fallback: object) {
  try {
    const res = await fetch(url);
    if (!res.ok) return fallback;
    return await res.json();
  } catch {
    return fallback;
  }
}

function easeOutQuint(t: number) { return 1 - Math.pow(1 - t, 5); }
function easeInOutQuart(t: number) {
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}

function addBoundaryLayers(map: maplibregl.Map, mandals: object) {
  const fc = mandals as GeoJSON.FeatureCollection;
  map.addSource('project-mandals', { type: 'geojson', data: fc });

  // Outer atmospheric halo — the only “glow”, blooms slowly with the fill.
  map.addLayer({
    id: 'project-mandal-outer-glow',
    type: 'line',
    source: 'project-mandals',
    paint: {
      'line-color': ['get', 'color'] as unknown as string,
      'line-width': 14,
      'line-blur': 16,
      'line-opacity': 0,
      'line-opacity-transition': { duration: 2000 },
    },
  });

  // Single base fill — no second “glow” fill stacked on top.
  map.addLayer({
    id: 'project-mandal-fill',
    type: 'fill',
    source: 'project-mandals',
    paint: {
      'fill-color': ['get', 'color'] as unknown as string,
      'fill-opacity': 0,
      'fill-opacity-transition': { duration: 2400, delay: 120 },
    },
  });

  // Subtle one-shot flash — a brief tonal lift at reveal, not a second tint.
  map.addLayer({
    id: 'project-mandal-flash',
    type: 'fill',
    source: 'project-mandals',
    paint: {
      'fill-color': '#FFFFFF',
      'fill-opacity': 0,
      'fill-opacity-transition': { duration: 700 },
    },
  });

  // White hot-edge sweep — fades in alongside the draw, then fades out.
  map.addLayer({
    id: 'project-mandal-sweep',
    type: 'line',
    source: 'project-mandals',
    paint: {
      'line-color': '#FFFFFF',
      'line-width': 18,
      'line-blur': 14,
      'line-opacity': 0,
      'line-opacity-transition': { duration: 700 },
    },
  });

  // Resting breath — a soft colored halo that pulses once polygons are settled.
  map.addLayer({
    id: 'project-mandal-breath',
    type: 'line',
    source: 'project-mandals',
    paint: {
      'line-color': ['get', 'color'] as unknown as string,
      'line-width': 2.5,
      'line-blur': 4,
      'line-opacity': 0,
      'line-opacity-transition': { duration: 1600, delay: 400 },
    },
  });

  // Per-feature LineString sources for the cinematic draw-outline.
  // line-gradient + line-progress requires a LineString source with lineMetrics.
  fc.features.forEach((f) => {
      const props = (f.properties ?? {}) as { code?: string; color?: string };
      const code = props.code;
      const color = props.color || '#0F172A';
      if (!code) return;
      let coords: [number, number][] | null = null;
      if (f.geometry.type === 'Polygon') {
        coords = f.geometry.coordinates[0] as [number, number][];
      } else if (f.geometry.type === 'MultiPolygon') {
        const rings = (f.geometry.coordinates as [number, number][][][]).map((p) => p[0]);
        coords = rings.sort((a, b) => b.length - a.length)[0] ?? null;
      }
      if (!coords || coords.length < 2) return;
      const sourceId = `project-mandal-line-${code}`;
      const layerId = `project-mandal-draw-${code}`;
      map.addSource(sourceId, {
        type: 'geojson',
        lineMetrics: true,
        data: {
          type: 'Feature',
          properties: { code, color },
          geometry: { type: 'LineString', coordinates: coords },
        },
      } as maplibregl.GeoJSONSourceSpecification);
      map.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-width': 2.4,
          'line-opacity': 0,
          'line-gradient': [
            'interpolate', ['linear'], ['line-progress'],
            0, color,
            0.0001, 'rgba(255,255,255,0)',
            1, 'rgba(255,255,255,0)',
          ] as unknown as string,
        },
      });
  });

  map.addSource('polavaram-dam', { type: 'geojson', data: DAM_SOURCE as GeoJSON.FeatureCollection });

  map.addLayer({
    id: 'polavaram-dam-ping-3', type: 'circle', source: 'polavaram-dam',
    paint: { 'circle-radius': 36, 'circle-color': '#B45309', 'circle-opacity': 0, 'circle-blur': 1.4 },
  });
  map.addLayer({
    id: 'polavaram-dam-ping-2', type: 'circle', source: 'polavaram-dam',
    paint: { 'circle-radius': 22, 'circle-color': '#B45309', 'circle-opacity': 0, 'circle-blur': 1.0 },
  });
  map.addLayer({
    id: 'polavaram-dam-ping-1', type: 'circle', source: 'polavaram-dam',
    paint: { 'circle-radius': 12, 'circle-color': '#B45309', 'circle-opacity': 0, 'circle-blur': 0.6 },
  });
  map.addLayer({
    id: 'polavaram-dam-point', type: 'circle', source: 'polavaram-dam',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 3.5, 10, 8] as unknown as number,
      'circle-color': '#92400E',
      'circle-stroke-width': 2,
      'circle-stroke-color': '#FFFFFF',
      'circle-opacity': 0,
      'circle-opacity-transition': { duration: 900, delay: 200 },
      'circle-stroke-opacity': 0,
    },
  });
}

function addMarker(
  map: maplibregl.Map,
  lngLat: [number, number],
  label: string,
  color: string,
  offset: [number, number],
) {
  // IMPORTANT: maplibre sets `transform: translate(...)` on the outer marker
  // element to position it. We must NOT overwrite that transform, or the
  // marker snaps to the map's top-left until the next frame. So the outer
  // element only handles visibility; an inner wrapper handles fade + pop.
  const el = document.createElement('div');
  el.className = 'polavaram-marker';
  el.style.pointerEvents = 'none';
  el.style.willChange = 'opacity';

  const inner = document.createElement('div');
  inner.dataset.revealed = '0';
  inner.style.display = 'flex';
  inner.style.alignItems = 'center';
  inner.style.gap = '8px';
  inner.style.opacity = '0';
  inner.style.visibility = 'hidden';
  inner.style.transformOrigin = 'center';
  inner.style.transform = 'translateY(8px) scale(0.9)';
  inner.style.transition =
    'opacity 1100ms ease-out, transform 1100ms cubic-bezier(0.22,1,0.36,1)';
  inner.style.willChange = 'opacity, transform';
  el.appendChild(inner);

  const dot = document.createElement('span');
  dot.style.width = '9px';
  dot.style.height = '9px';
  dot.style.borderRadius = '50%';
  dot.style.background = color;
  dot.style.boxShadow = `0 0 0 2px rgba(255,255,255,0.95), 0 0 18px ${color}88, 0 4px 12px rgba(15,23,42,0.20)`;
  inner.appendChild(dot);

  const conn = document.createElement('span');
  conn.style.width = '14px';
  conn.style.height = '1px';
  conn.style.background = `linear-gradient(90deg, ${color}cc, ${color}33)`;
  inner.appendChild(conn);

  const chip = document.createElement('span');
  chip.style.padding = '5px 11px';
  chip.style.border = `1px solid ${color}55`;
  chip.style.background = 'rgba(255,255,255,0.92)';
  chip.style.color = '#0F172A';
  chip.style.font = "600 9.5px/1 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace";
  chip.style.letterSpacing = '0.2em';
  chip.style.textTransform = 'uppercase';
  chip.style.whiteSpace = 'nowrap';
  chip.style.backdropFilter = 'blur(10px)';
  chip.style.boxShadow =
    '0 1px 0 rgba(255,255,255,0.95) inset, 0 10px 28px rgba(15,23,42,0.18), 0 2px 6px rgba(15,23,42,0.08)';
  chip.style.borderRadius = '999px';
  chip.textContent = label;
  inner.appendChild(chip);

  return new maplibregl.Marker({ element: el, anchor: 'center', offset })
    .setLngLat(lngLat)
    .addTo(map);
}

function revealMarker(marker: maplibregl.Marker) {
  const el = marker.getElement();
  const inner = el.firstElementChild as HTMLElement | null;
  if (!inner || inner.dataset.revealed === '1') return;
  inner.dataset.revealed = '1';
  inner.style.visibility = 'visible';
  // Force layout so the transition definitely fires
  void inner.offsetWidth;
  requestAnimationFrame(() => {
    inner.style.opacity = '1';
    inner.style.transform = 'translateY(0) scale(1)';
  });
  // Cinematic ring burst from the dot — purely decorative, removes itself.
  const dot = inner.firstElementChild as HTMLElement | null;
  if (dot) {
    const dotColor = dot.style.background || '#0F172A';
    const ring = document.createElement('span');
    ring.style.position = 'absolute';
    ring.style.width = '9px';
    ring.style.height = '9px';
    ring.style.left = '0';
    ring.style.top = '50%';
    ring.style.marginTop = '-4.5px';
    ring.style.borderRadius = '50%';
    ring.style.boxShadow = `0 0 0 1.5px ${dotColor}`;
    ring.style.pointerEvents = 'none';
    ring.style.opacity = '0.9';
    ring.style.transform = 'scale(0.6)';
    ring.style.transition = 'transform 1500ms cubic-bezier(0.22,1,0.36,1), opacity 1500ms ease-out';
    inner.style.position = 'relative';
    inner.appendChild(ring);
    requestAnimationFrame(() => {
      ring.style.transform = 'scale(7)';
      ring.style.opacity = '0';
    });
    window.setTimeout(() => ring.remove(), 1700);
  }
}

const PolavaramGlobe = forwardRef<PolavaramGlobeHandle, PolavaramGlobeProps>(
  function PolavaramGlobe(
    { interactive = true, className, focusProject = true, framePadding, onOpeningComplete },
    ref,
  ) {
    const rootRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const markersRef = useRef<maplibregl.Marker[]>([]);
    const timersRef = useRef<number[]>([]);
    const animFrameRef = useRef<number>(0);
    const idleAnimRef = useRef<number>(0);
    const pingActiveRef = useRef(false);
    const focusTriggeredRef = useRef(false);
    const revealedCodesRef = useRef<string[]>([]);
    const flashCodesRef = useRef<string[]>([]);
    const markersByCodeRef = useRef<Record<string, maplibregl.Marker>>({});
    const pointerOffsetRef = useRef({ x: 0, y: 0 });
    const initialFocusProjectRef = useRef(focusProject);
    const initialInteractiveRef = useRef(interactive);
    const onOpeningCompleteRef = useRef(onOpeningComplete);
    const framePaddingRef = useRef(framePadding);
    const openingDoneRef = useRef(false);

    useEffect(() => { onOpeningCompleteRef.current = onOpeningComplete; }, [onOpeningComplete]);
    useEffect(() => { framePaddingRef.current = framePadding; }, [framePadding]);

    const clearTimers = useCallback(() => {
      timersRef.current.forEach((t) => window.clearTimeout(t));
      timersRef.current = [];
    }, []);

    const queueStep = useCallback((cb: () => void, delay: number) => {
      const t = window.setTimeout(() => {
        timersRef.current = timersRef.current.filter((x) => x !== t);
        cb();
      }, delay);
      timersRef.current.push(t);
    }, []);

    const computeFitPadding = useCallback(() => {
      const rect = rootRef.current?.getBoundingClientRect();
      const w = rect?.width ?? 1200;
      const h = rect?.height ?? 800;
      const r = framePaddingRef.current ?? {};
      const rt = r.top ?? Math.round(h * 0.10);
      const rr = r.right ?? Math.round(w * 0.04);
      const rb = r.bottom ?? Math.round(h * 0.10);
      const rl = r.left ?? Math.round(w * 0.04);
      const breath = 0.05;
      const availW = Math.max(120, w - rl - rr);
      const availH = Math.max(120, h - rt - rb);
      return {
        top: rt + Math.round(availH * breath),
        right: rr + Math.round(availW * breath),
        bottom: rb + Math.round(availH * breath),
        left: rl + Math.round(availW * breath),
      };
    }, []);

    const flyToProject = useCallback(
      (durationMs = 1400, pitch = FINAL_PITCH, bearing = FINAL_BEARING) => {
        const map = mapRef.current;
        if (!map) return;
        if (!map.loaded() || !map.isStyleLoaded()) return;
        try {
          map.fitBounds(PROJECT_BOUNDS, {
            padding: computeFitPadding(),
            maxZoom: 9.4,
            bearing, pitch,
            duration: durationMs,
            essential: true,
          });
        } catch { /* transform not ready */ }
      },
      [computeFitPadding],
    );

    const refit = useCallback(() => {
      if (!openingDoneRef.current) return;
      flyToProject(450, FINAL_PITCH, FINAL_BEARING);
    }, [flyToProject]);

    const startLivingAnimations = useCallback(() => {
      cancelAnimationFrame(animFrameRef.current);
      const start = performance.now();
      const tick = (now: number) => {
        const map = mapRef.current;
        if (!map) return;
        const t = (now - start) / 1000;

        const breath = 0.5 + 0.5 * Math.sin(t * 1.2);
        try {
          // Only modulate width — opacity is owned by per-code reveal expression
          map.setPaintProperty('project-mandal-breath', 'line-width', 1.5 + breath * 3);
        } catch { /* not ready */ }

        const ringPhase = (offset: number) => {
          const p = ((t * 0.55 + offset) % 1);
          return { p, opacity: (1 - p) * 0.55 };
        };
        if (pingActiveRef.current) {
          try {
            const r1 = ringPhase(0);
            const r2 = ringPhase(0.33);
            const r3 = ringPhase(0.66);
            map.setPaintProperty('polavaram-dam-ping-1', 'circle-radius', 8 + r1.p * 22);
            map.setPaintProperty('polavaram-dam-ping-1', 'circle-opacity', r1.opacity);
            map.setPaintProperty('polavaram-dam-ping-2', 'circle-radius', 8 + r2.p * 28);
            map.setPaintProperty('polavaram-dam-ping-2', 'circle-opacity', r2.opacity * 0.85);
            map.setPaintProperty('polavaram-dam-ping-3', 'circle-radius', 8 + r3.p * 38);
            map.setPaintProperty('polavaram-dam-ping-3', 'circle-opacity', r3.opacity * 0.6);
          } catch { /* not ready */ }
        }

        animFrameRef.current = requestAnimationFrame(tick);
      };
      animFrameRef.current = requestAnimationFrame(tick);
    }, []);

    const startIdleCameraDrift = useCallback(() => {
      cancelAnimationFrame(idleAnimRef.current);
      const reduced = typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      const start = performance.now();
      let lastApply = 0;
      const tick = (now: number) => {
        const map = mapRef.current;
        if (!map || !openingDoneRef.current) {
          idleAnimRef.current = requestAnimationFrame(tick);
          return;
        }
        if (now - lastApply >= 33) {
          lastApply = now;
          const t = (now - start) / 1000;
          const dPitch = reduced ? 0 : Math.sin(t * 0.16) * 0.7;
          const dBearing = reduced ? 0 : Math.sin(t * 0.11 + 1.1) * 0.5;
          // Mouse parallax — ~3.5° bearing, 2° pitch swing toward pointer
          const px = pointerOffsetRef.current.x;
          const py = pointerOffsetRef.current.y;
          const parallaxBearing = px * 3.5;
          const parallaxPitch = -py * 2.0;
          try {
            map.setPitch(FINAL_PITCH + dPitch + parallaxPitch);
            map.setBearing(FINAL_BEARING + dBearing + parallaxBearing);
          } catch { /* ignore */ }
        }
        idleAnimRef.current = requestAnimationFrame(tick);
      };
      idleAnimRef.current = requestAnimationFrame(tick);
    }, []);

    // MapLibre allows at most ONE zoom-based interpolate/step, and it must be at
    // the OUTERMOST level. So we can't combine per-feature gating with a zoom
    // ramp — we use plain constants, gated by a `case` on the feature code, and
    // rely on `*-opacity-transition` for the fade. The camera is parked at the
    // corridor zoom anyway so the constants look right at all times.
    const buildPerCodeConstant = useCallback((revealedValue: number) => {
      const list = revealedCodesRef.current;
      if (list.length === 0) return 0 as unknown;
      return [
        'case',
        ['in', ['get', 'code'], ['literal', list]],
        revealedValue,
        0,
      ] as unknown;
    }, []);

    const applyMandalPaint = useCallback(() => {
      const map = mapRef.current;
      if (!map) return;
      try {
        map.setPaintProperty('project-mandal-outer-glow', 'line-opacity', buildPerCodeConstant(0.16) as unknown as number);
        map.setPaintProperty('project-mandal-fill', 'fill-opacity', buildPerCodeConstant(0.26) as unknown as number);
        map.setPaintProperty('project-mandal-breath', 'line-opacity', buildPerCodeConstant(0.55) as unknown as number);
      } catch { /* layers may not exist yet */ }
    }, [buildPerCodeConstant]);

    // Flash overlay paint — a soft white tonal lift, NOT a second color tint.
    const applyFlashPaint = useCallback(() => {
      const map = mapRef.current;
      if (!map) return;
      const list = flashCodesRef.current;
      try {
        map.setPaintProperty('project-mandal-flash', 'fill-opacity',
          (list.length === 0 ? 0 : (['case', ['in', ['get', 'code'], ['literal', list]], 0.22, 0] as unknown)) as unknown as number);
        map.setPaintProperty('project-mandal-sweep', 'line-opacity',
          (list.length === 0 ? 0 : (['case', ['in', ['get', 'code'], ['literal', list]], 0.55, 0] as unknown)) as unknown as number);
        map.setPaintProperty('project-mandal-sweep', 'line-width',
          (list.length === 0 ? 2 : (['case', ['in', ['get', 'code'], ['literal', list]], 16, 2] as unknown)) as unknown as number);
      } catch { /* not ready */ }
    }, []);

    // Animate the per-feature outline draw — line-gradient cutoff travels
    // around the polygon perimeter from start to end. After completion the
    // line settles to a fully-painted resting outline.
    const drawOutlineForCode = useCallback((code: string, color: string, durationMs = 2200) => {
      const map = mapRef.current;
      if (!map) return;
      const layerId = `project-mandal-draw-${code}`;
      if (!map.getLayer(layerId)) return;
      try { map.setPaintProperty(layerId, 'line-opacity', 1); } catch { /* */ }
      const start = performance.now();
      const tick = (now: number) => {
        if (!mapRef.current) return;
        const elapsed = now - start;
        const t = Math.min(1, elapsed / durationMs);
        const eased = easeInOutQuart(t);
        const cutoff = Math.max(0.0002, Math.min(0.9998, eased));
        const grad = [
          'interpolate', ['linear'], ['line-progress'],
          0, color,
          cutoff, color,
          Math.min(1, cutoff + 0.0001), 'rgba(255,255,255,0)',
          1, 'rgba(255,255,255,0)',
        ];
        try { map.setPaintProperty(layerId, 'line-gradient', grad as unknown as string); } catch { /* */ }
        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          try {
            map.setPaintProperty(layerId, 'line-gradient', [
              'interpolate', ['linear'], ['line-progress'], 0, color, 1, color,
            ] as unknown as string);
          } catch { /* */ }
        }
      };
      requestAnimationFrame(tick);
    }, []);

    const revealMandalCode = useCallback((code: string) => {
      if (!revealedCodesRef.current.includes(code)) {
        revealedCodesRef.current = [...revealedCodesRef.current, code];
      }
      applyMandalPaint();
      // Cinematic outline draw — trace boundary in sync with the fill
      const color = MANDAL_COLOR_BY_CODE[code] ?? '#0F172A';
      drawOutlineForCode(code, color, 2200);
      // Subtle flash + sweep ride alongside the draw
      flashCodesRef.current = [...flashCodesRef.current, code];
      applyFlashPaint();
      window.setTimeout(() => {
        flashCodesRef.current = flashCodesRef.current.filter((c) => c !== code);
        applyFlashPaint();
      }, FLASH_HOLD_MS);
      if (revealedCodesRef.current.length === 1) {
        startLivingAnimations();
      }
    }, [applyMandalPaint, applyFlashPaint, drawOutlineForCode, startLivingAnimations]);

    const revealDam = useCallback(() => {
      const map = mapRef.current;
      if (!map) return;
      pingActiveRef.current = true;
      try {
        map.setPaintProperty('polavaram-dam-point', 'circle-opacity', 1);
        map.setPaintProperty('polavaram-dam-point', 'circle-stroke-opacity', 1);
      } catch { /* not ready */ }
    }, []);

    const revealAllMandalsInstant = useCallback(() => {
      revealedCodesRef.current = [...MANDAL_REVEAL_ORDER];
      applyMandalPaint();
      startLivingAnimations();
      revealDam();
    }, [applyMandalPaint, revealDam, startLivingAnimations]);

    const revealAllMarkers = useCallback(() => {
      markersRef.current.forEach((m) => revealMarker(m));
    }, []);

    const revealMarkerByCode = useCallback((code: string) => {
      const m = markersByCodeRef.current[code];
      if (m) revealMarker(m);
    }, []);

    const skipOpening = useCallback(() => {
      const map = mapRef.current;
      if (!map) return;
      clearTimers();
      focusTriggeredRef.current = true;
      map.stop();
      map.setProjection({ type: 'mercator' });
      flyToProject(0, FINAL_PITCH, FINAL_BEARING);
      revealAllMandalsInstant();
      revealAllMarkers();
      openingDoneRef.current = true;
      onOpeningCompleteRef.current?.();
      startIdleCameraDrift();
    }, [clearTimers, flyToProject, revealAllMandalsInstant, revealAllMarkers, startIdleCameraDrift]);

    const runOpeningSequence = useCallback(() => {
      const map = mapRef.current;
      if (!map || focusTriggeredRef.current) return;
      focusTriggeredRef.current = true;
      clearTimers();

      queueStep(() => {
        mapRef.current?.easeTo({
          center: INDIA_CENTER, zoom: 3.6, bearing: -2, pitch: 8,
          duration: PHASE_INDIA_DURATION_MS, easing: easeOutQuint,
        });
      }, 100);

      queueStep(() => {
        mapRef.current?.easeTo({
          center: APPROACH_CENTER, zoom: 7.4, bearing: -6, pitch: 22,
          duration: PHASE_APPROACH_DURATION_MS, easing: easeInOutQuart,
        });
      }, PHASE_APPROACH_DELAY_MS);

      queueStep(() => {
        const map = mapRef.current;
        if (!map) return;
        map.fitBounds(PROJECT_BOUNDS, {
          padding: computeFitPadding(),
          maxZoom: 9.4,
          bearing: FINAL_BEARING,
          pitch: FINAL_PITCH,
          duration: PHASE_PITCH_DURATION_MS,
          essential: true,
        });
      }, PHASE_PITCH_DELAY_MS);

      // Cinematic mandal reveal — one polygon at a time, with its tag in sync
      MANDAL_REVEAL_ORDER.forEach((code, i) => {
        const at = POLYGON_DRAW_DELAY_MS + i * MANDAL_STAGGER_MS;
        queueStep(() => revealMandalCode(code), at);
        queueStep(() => revealMarkerByCode(code), at + MARKER_AFTER_POLYGON_MS);
      });

      // Dam reveal + its tag once all mandals are filled
      queueStep(revealDam, DAM_REVEAL_DELAY_MS);
      queueStep(() => revealMarkerByCode('DAM'), DAM_MARKER_DELAY_MS);

      queueStep(() => {
        openingDoneRef.current = true;
        onOpeningCompleteRef.current?.();
        startIdleCameraDrift();
      }, DAM_MARKER_DELAY_MS + 250);
    }, [
      clearTimers, computeFitPadding, queueStep,
      revealMandalCode, revealDam, revealMarkerByCode,
      startIdleCameraDrift,
    ]);

    useImperativeHandle(ref, () => ({ flyToProject, skipOpening, refit }));

    useEffect(() => {
      const map = mapRef.current;
      if (!map) return;
      const controls = [
        map.dragPan, map.scrollZoom, map.boxZoom,
        map.keyboard, map.doubleClickZoom, map.touchZoomRotate,
      ];
      controls.forEach((c) => { if (interactive) c.enable(); else c.disable(); });
      map.dragRotate.disable();
      map.touchZoomRotate.disableRotation();
    }, [interactive]);

    useEffect(() => {
      if (!containerRef.current || mapRef.current) return;

      let disposed = false;
      const shouldRunOpening = initialFocusProjectRef.current;
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: BASEMAP_STYLE as maplibregl.StyleSpecification,
        center: shouldRunOpening ? [76, 22] : PROJECT_START_CENTER,
        zoom: shouldRunOpening ? 2.6 : 6.15,
        minZoom: 2,
        maxZoom: 13,
        attributionControl: false,
        interactive: initialInteractiveRef.current,
        pitch: 0,
        bearing: 0,
        renderWorldCopies: false,
      });

      mapRef.current = map;
      map.dragRotate.disable();
      map.touchZoomRotate.disableRotation();

      map.once('load', async () => {
        const mandals = await loadGeoJson('/geojson/mandals.geojson', FALLBACK_MANDALS);
        if (disposed) return;

        addBoundaryLayers(map, mandals);

        const chn = addMarker(map, [81.450, 17.760], 'Chintoor', '#0D9488', [60, -10]);
        const kun = addMarker(map, [81.250, 17.660], 'Kunavaram', '#C2410C', [-62, -4]);
        const vrp = addMarker(map, [81.400, 17.580], 'V. R. Puram', '#B45309', [60, 16]);
        const dam = addMarker(map, [POLAVARAM.lng, POLAVARAM.lat], 'Polavaram Dam', '#92400E', [66, 12]);
        markersRef.current = [chn, kun, vrp, dam];
        markersByCodeRef.current = { CHN: chn, KUN: kun, VRP: vrp, DAM: dam };

        if (shouldRunOpening) {
          runOpeningSequence();
        } else {
          map.setProjection({ type: 'mercator' });
          flyToProject(0, FINAL_PITCH, FINAL_BEARING);
          revealAllMandalsInstant();
          revealAllMarkers();
          openingDoneRef.current = true;
          onOpeningCompleteRef.current?.();
          startIdleCameraDrift();
        }
      });

      const ro = new ResizeObserver(() => {
        if (!mapRef.current) return;
        mapRef.current.resize();
        if (openingDoneRef.current) {
          flyToProject(450, FINAL_PITCH, FINAL_BEARING);
        }
      });
      if (rootRef.current) ro.observe(rootRef.current);

      // Mouse parallax — update normalized pointer offset (-1..1)
      const pointerHandler = (e: PointerEvent) => {
        const r = rootRef.current?.getBoundingClientRect();
        if (!r) return;
        const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
        const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
        // Soft clamp + slight easing toward target via lerp in next frame
        const target = { x: Math.max(-1, Math.min(1, nx)), y: Math.max(-1, Math.min(1, ny)) };
        // Ease toward target so motion feels lazy rather than jittery
        pointerOffsetRef.current = {
          x: pointerOffsetRef.current.x * 0.7 + target.x * 0.3,
          y: pointerOffsetRef.current.y * 0.7 + target.y * 0.3,
        };
      };
      const pointerLeaveHandler = () => {
        pointerOffsetRef.current = { x: 0, y: 0 };
      };
      const root = rootRef.current;
      root?.addEventListener('pointermove', pointerHandler);
      root?.addEventListener('pointerleave', pointerLeaveHandler);

      return () => {
        disposed = true;
        ro.disconnect();
        root?.removeEventListener('pointermove', pointerHandler);
        root?.removeEventListener('pointerleave', pointerLeaveHandler);
        cancelAnimationFrame(animFrameRef.current);
        cancelAnimationFrame(idleAnimRef.current);
        clearTimers();
        markersRef.current.forEach((m) => m.remove());
        markersRef.current = [];
        map.remove();
        mapRef.current = null;
      };
    }, [clearTimers, flyToProject, revealAllMandalsInstant, revealAllMarkers, runOpeningSequence, startIdleCameraDrift]);

    return (
      <div
        ref={rootRef}
        className={`polavaram-landing-map relative overflow-hidden ${className ?? ''}`}
        style={{ width: '100%', height: '100%', backgroundColor: '#f4ecda' }}
      >
        <div ref={containerRef} className="absolute inset-0" />

        {/* Warm sun-side highlight */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'radial-gradient(70% 55% at 78% 22%, rgba(251,191,36,0.18) 0%, rgba(251,191,36,0.06) 30%, transparent 60%)',
            mixBlendMode: 'screen',
          }}
        />
        {/* Cool depth on lower left */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'radial-gradient(60% 50% at 18% 82%, rgba(56,89,148,0.10) 0%, transparent 55%)',
            mixBlendMode: 'multiply',
          }}
        />
        {/* Teal accent */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'radial-gradient(40% 40% at 60% 38%, rgba(13,148,136,0.06) 0%, transparent 60%)',
            mixBlendMode: 'multiply',
          }}
        />
        {/* Cinematic vignette */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 50% 50%, transparent 50%, rgba(63,46,18,0.18) 100%)',
          }}
        />
        {/* Slow rotating scanline */}
        <div className="polavaram-scanline pointer-events-none absolute inset-0" />
        {/* Light film grain */}
        <div className="polavaram-grain pointer-events-none absolute inset-0" />

        <style jsx global>{`
          .polavaram-landing-map .maplibregl-map,
          .polavaram-landing-map .maplibregl-canvas {
            border-radius: 0 !important;
            background-color: transparent !important;
          }
          .polavaram-landing-map .maplibregl-control-container { display: none !important; }

          .polavaram-scanline {
            background: conic-gradient(
              from 0deg at 50% 60%,
              transparent 0deg,
              rgba(255,255,255,0) 30deg,
              rgba(255,255,255,0.10) 50deg,
              rgba(255,200,120,0.06) 60deg,
              transparent 90deg,
              transparent 360deg
            );
            mix-blend-mode: screen;
            opacity: 0.55;
            animation: scanline-rotate 32s linear infinite;
            transform-origin: 50% 60%;
          }
          .polavaram-grain {
            opacity: 0.06;
            mix-blend-mode: multiply;
            background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.95' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.05 0 0 0 0 0.06 0 0 0 0 0.10 0 0 0 0.85 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
            background-size: 200px 200px;
          }
          @keyframes scanline-rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @media (prefers-reduced-motion: reduce) {
            .polavaram-scanline { animation: none; opacity: 0; }
          }
        `}</style>
      </div>
    );
  },
);

export default PolavaramGlobe;
