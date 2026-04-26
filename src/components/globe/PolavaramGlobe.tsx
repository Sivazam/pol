'use client';

/**
 * PolavaramGlobe - opening globe descent into the Polavaram project GIS map.
 *
 * The component name is retained for compatibility with the landing screen,
 * while MapLibre now owns the full globe-to-map camera path.
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
const GLOBE_START_CENTER: [number, number] = [-84, 8];
const GLOBE_SPIN_CENTER: [number, number] = [38, 11];
const INDIA_OVERVIEW_CENTER: [number, number] = [78.9629, 20.5937];
const PROJECT_START_CENTER: [number, number] = [80.65, 17.95];
const PROJECT_BOUNDS: [[number, number], [number, number]] = [
  [81.08, 17.12],
  [81.74, 17.86],
];
const GLOBE_SPIN_DELAY_MS = 420;
const GLOBE_SPIN_DURATION_MS = 4600;
const INDIA_APPROACH_DELAY_MS = GLOBE_SPIN_DELAY_MS + GLOBE_SPIN_DURATION_MS - 520;
const INDIA_APPROACH_DURATION_MS = 6200;
const PROJECT_FOCUS_DURATION_MS = 8600;
const PROJECT_FOCUS_DELAY_MS = INDIA_APPROACH_DELAY_MS + INDIA_APPROACH_DURATION_MS - 340;
const MARKER_REVEAL_DELAY_MS = PROJECT_FOCUS_DELAY_MS + 5200;
const SKIP_INTRO_HIDE_DELAY_MS = MARKER_REVEAL_DELAY_MS - 2200;
const BASEMAP_STYLE = {
  version: 8,
  projection: { type: 'globe' },
  sky: {
    'sky-color': '#EAF3FF',
    'sky-horizon-blend': 0.72,
    'horizon-color': '#FFFFFF',
    'horizon-fog-blend': 0.34,
    'fog-color': '#EFF6FF',
    'fog-ground-blend': 0.18,
    'atmosphere-blend': [
      'interpolate',
      ['linear'],
      ['zoom'],
      0,
      0.9,
      6,
      0.6,
      9,
      0,
    ],
  },
  sources: {
    carto: {
      type: 'raster',
      tiles: ['https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png'],
      tileSize: 256,
      attribution: 'Carto Voyager, OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'carto-voyager',
      type: 'raster',
      source: 'carto',
      paint: {
        'raster-opacity': 0.98,
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
          [81.310, 17.800], [81.330, 17.802], [81.350, 17.798], [81.370, 17.790],
          [81.390, 17.778], [81.410, 17.762], [81.425, 17.745], [81.438, 17.725],
          [81.445, 17.705], [81.448, 17.685], [81.445, 17.670], [81.435, 17.660],
          [81.420, 17.655], [81.400, 17.652], [81.380, 17.653], [81.360, 17.658],
          [81.340, 17.667], [81.325, 17.678], [81.312, 17.692], [81.305, 17.708],
          [81.300, 17.725], [81.298, 17.742], [81.300, 17.758], [81.305, 17.775],
          [81.310, 17.800],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'V. R. Puram', code: 'VRP', color: '#D97706' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [81.250, 17.658], [81.268, 17.660], [81.285, 17.655], [81.305, 17.648],
          [81.325, 17.640], [81.340, 17.630], [81.355, 17.615], [81.365, 17.598],
          [81.370, 17.578], [81.368, 17.558], [81.360, 17.540], [81.348, 17.525],
          [81.332, 17.515], [81.315, 17.508], [81.298, 17.505], [81.280, 17.508],
          [81.265, 17.518], [81.252, 17.530], [81.242, 17.545], [81.235, 17.560],
          [81.232, 17.575], [81.235, 17.590], [81.240, 17.605], [81.245, 17.620],
          [81.248, 17.640], [81.250, 17.658],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Kunavaram', code: 'KUN', color: '#EA580C' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [81.155, 17.552], [81.172, 17.558], [81.190, 17.560], [81.208, 17.558],
          [81.225, 17.552], [81.238, 17.542], [81.248, 17.530], [81.255, 17.518],
          [81.260, 17.505], [81.262, 17.492], [81.258, 17.478], [81.250, 17.465],
          [81.240, 17.455], [81.228, 17.448], [81.215, 17.443], [81.200, 17.442],
          [81.185, 17.445], [81.172, 17.452], [81.162, 17.462], [81.155, 17.475],
          [81.150, 17.490], [81.148, 17.505], [81.150, 17.520], [81.152, 17.535],
          [81.155, 17.552],
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
}

export { SKIP_INTRO_HIDE_DELAY_MS };

interface PolavaramGlobeProps {
  paused?: boolean;
  interactive?: boolean;
  className?: string;
  focusProject?: boolean;
  onOpeningComplete?: () => void;
}

async function loadGeoJson(url: string, fallback: object) {
  try {
    const response = await fetch(url);
    if (!response.ok) return fallback;
    return await response.json();
  } catch {
    return fallback;
  }
}

function smoothEasing(progress: number) {
  return progress * progress * (3 - 2 * progress);
}

function addBoundaryLayers(mapInstance: maplibregl.Map, mandals: object) {
  mapInstance.addSource('project-mandals', {
    type: 'geojson',
    data: mandals as GeoJSON.FeatureCollection,
  });

  mapInstance.addLayer({
    id: 'project-mandal-fill',
    type: 'fill',
    source: 'project-mandals',
    paint: {
      'fill-color': ['get', 'color'] as unknown as string,
      'fill-opacity': ['interpolate', ['linear'], ['zoom'], 5.8, 0, 8.3, 0.16] as unknown as number,
    },
  });

  mapInstance.addLayer({
    id: 'project-mandal-outline',
    type: 'line',
    source: 'project-mandals',
    paint: {
      'line-color': ['get', 'color'] as unknown as string,
      'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.45, 10, 2] as unknown as number,
      'line-opacity': ['interpolate', ['linear'], ['zoom'], 5.8, 0, 8.2, 0.9] as unknown as number,
    },
  });

  mapInstance.addSource('polavaram-dam', {
    type: 'geojson',
    data: DAM_SOURCE as GeoJSON.FeatureCollection,
  });

  mapInstance.addLayer({
    id: 'polavaram-dam-point',
    type: 'circle',
    source: 'polavaram-dam',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 2, 10, 6] as unknown as number,
      'circle-color': '#B45309',
      'circle-stroke-width': 2,
      'circle-stroke-color': '#FFFFFF',
      'circle-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0, 8.6, 1] as unknown as number,
      'circle-stroke-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0, 8.6, 1] as unknown as number,
    },
  });
}

function addProjectMarker(
  mapInstance: maplibregl.Map,
  lngLat: [number, number],
  label: string,
  color: string,
  offset: [number, number] = [0, 0],
) {
  const markerEl = document.createElement('div');
  markerEl.style.display = 'flex';
  markerEl.style.alignItems = 'center';
  markerEl.style.gap = '6px';
  markerEl.style.padding = '4px 7px';
  markerEl.style.border = '1px solid rgba(15,23,42,0.18)';
  markerEl.style.borderLeft = `3px solid ${color}`;
  markerEl.style.borderRadius = '4px';
  markerEl.style.background = 'rgba(248,250,252,0.9)';
  markerEl.style.boxShadow = '0 6px 16px rgba(15,23,42,0.12)';
  markerEl.style.color = '#0F172A';
  markerEl.style.font = '650 9px/1 ui-sans-serif, system-ui, sans-serif';
  markerEl.style.letterSpacing = '0.06em';
  markerEl.style.textTransform = 'uppercase';
  markerEl.style.whiteSpace = 'nowrap';
  markerEl.textContent = label;

  return new maplibregl.Marker({ element: markerEl, anchor: 'center', offset })
    .setLngLat(lngLat)
    .addTo(mapInstance)
    .setOpacity(0);
}

const PolavaramGlobe = forwardRef<PolavaramGlobeHandle, PolavaramGlobeProps>(
  function PolavaramGlobe({ interactive = true, className, focusProject = true, onOpeningComplete }, ref) {
    const rootRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const markersRef = useRef<maplibregl.Marker[]>([]);
    const openingTimersRef = useRef<number[]>([]);
    const focusTriggeredRef = useRef(false);
    const initialFocusProjectRef = useRef(focusProject);
    const initialInteractiveRef = useRef(interactive);
    const onOpeningCompleteRef = useRef(onOpeningComplete);

    useEffect(() => {
      onOpeningCompleteRef.current = onOpeningComplete;
    }, [onOpeningComplete]);

    const clearOpeningTimers = useCallback(() => {
      openingTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      openingTimersRef.current = [];
    }, []);

    const queueOpeningStep = useCallback((callback: () => void, delayMs: number) => {
      const timer = window.setTimeout(() => {
        openingTimersRef.current = openingTimersRef.current.filter((currentTimer) => currentTimer !== timer);
        callback();
      }, delayMs);
      openingTimersRef.current.push(timer);
    }, []);

    const flyToProject = useCallback((durationMs = PROJECT_FOCUS_DURATION_MS) => {
      const mapInstance = mapRef.current;
      if (!mapInstance) return;
      const rect = rootRef.current?.getBoundingClientRect();
      const isFullStage = Boolean(rect && rect.width >= 900 && rect.height >= 460);
      const stageLeftPadding = rect ? Math.min(620, Math.max(380, rect.width * 0.42)) : 520;

      mapInstance.fitBounds(PROJECT_BOUNDS, {
        padding: isFullStage
          ? { top: 116, right: 168, bottom: 136, left: stageLeftPadding }
          : { top: 34, right: 58, bottom: 38, left: 58 },
        maxZoom: isFullStage ? 9.55 : 10.05,
        bearing: 0,
        pitch: 0,
        duration: durationMs,
        easing: smoothEasing,
      });
    }, []);

    const revealProjectMarkers = useCallback(() => {
      markersRef.current.forEach((marker) => marker.setOpacity(1));
    }, []);

    const skipOpening = useCallback(() => {
      const mapInstance = mapRef.current;
      if (!mapInstance) return;

      clearOpeningTimers();
      focusTriggeredRef.current = true;
      mapInstance.stop();
      mapInstance.setProjection({ type: 'mercator' });
      flyToProject(0);
      revealProjectMarkers();
      onOpeningCompleteRef.current?.();
    }, [clearOpeningTimers, flyToProject, revealProjectMarkers]);

    const runOpeningSequence = useCallback(() => {
      const mapInstance = mapRef.current;
      if (!mapInstance || focusTriggeredRef.current) return;

      focusTriggeredRef.current = true;
      clearOpeningTimers();
      markersRef.current.forEach((marker) => marker.setOpacity(0));

      queueOpeningStep(() => {
        mapRef.current?.easeTo({
          center: GLOBE_SPIN_CENTER,
          zoom: -0.08,
          bearing: -18,
          pitch: 0,
          duration: GLOBE_SPIN_DURATION_MS,
          easing: smoothEasing,
        });
      }, GLOBE_SPIN_DELAY_MS);

      queueOpeningStep(() => {
        mapRef.current?.easeTo({
          center: INDIA_OVERVIEW_CENTER,
          zoom: 2.7,
          bearing: -6,
          pitch: 0,
          duration: INDIA_APPROACH_DURATION_MS,
          easing: smoothEasing,
        });
      }, INDIA_APPROACH_DELAY_MS);

      queueOpeningStep(() => flyToProject(), PROJECT_FOCUS_DELAY_MS);
      queueOpeningStep(() => {
        revealProjectMarkers();
        onOpeningCompleteRef.current?.();
      }, MARKER_REVEAL_DELAY_MS);
    }, [clearOpeningTimers, flyToProject, queueOpeningStep, revealProjectMarkers]);

    useImperativeHandle(ref, () => ({
      flyToProject,
      skipOpening,
    }));

    useEffect(() => {
      const mapInstance = mapRef.current;
      if (!mapInstance) return;
      const controls = [
        mapInstance.dragPan,
        mapInstance.scrollZoom,
        mapInstance.boxZoom,
        mapInstance.keyboard,
        mapInstance.doubleClickZoom,
        mapInstance.touchZoomRotate,
      ];
      controls.forEach((control) => {
        if (interactive) control.enable();
        else control.disable();
      });
      mapInstance.dragRotate.disable();
      mapInstance.touchZoomRotate.disableRotation();
    }, [interactive]);

    useEffect(() => {
      if (!containerRef.current || mapRef.current) return;

      let disposed = false;
      const shouldRunOpening = initialFocusProjectRef.current;
      const mapInstance = new maplibregl.Map({
        container: containerRef.current,
        style: BASEMAP_STYLE as maplibregl.StyleSpecification,
        center: shouldRunOpening ? GLOBE_START_CENTER : PROJECT_START_CENTER,
        zoom: shouldRunOpening ? -0.28 : 6.15,
        minZoom: shouldRunOpening ? -1 : 5,
        maxZoom: 13,
        attributionControl: false,
        interactive: initialInteractiveRef.current,
        pitch: 0,
        bearing: shouldRunOpening ? -42 : 0,
        renderWorldCopies: false,
        aroundCenter: true,
      });

      mapRef.current = mapInstance;
      mapInstance.dragRotate.disable();
      mapInstance.touchZoomRotate.disableRotation();

      mapInstance.once('load', async () => {
        const mandals = await loadGeoJson('/geojson/mandals.geojson', FALLBACK_MANDALS);
        if (disposed) return;

        addBoundaryLayers(mapInstance, mandals);
        markersRef.current = [
          addProjectMarker(mapInstance, [81.370, 17.730], 'Chintoor', '#0D9488', [30, 0]),
          addProjectMarker(mapInstance, [81.300, 17.580], 'V. R. Puram', '#D97706', [-46, -4]),
          addProjectMarker(mapInstance, [81.205, 17.500], 'Kunavaram', '#EA580C', [-48, 20]),
          addProjectMarker(mapInstance, [POLAVARAM.lng, POLAVARAM.lat], 'Polavaram Dam', '#B45309', [78, 10]),
        ];

        if (shouldRunOpening) {
          runOpeningSequence();
        } else {
          mapInstance.setProjection({ type: 'mercator' });
          flyToProject(0);
          revealProjectMarkers();
          onOpeningCompleteRef.current?.();
        }
      });

      return () => {
        disposed = true;
        clearOpeningTimers();
        markersRef.current.forEach((marker) => marker.remove());
        markersRef.current = [];
        mapInstance.remove();
        mapRef.current = null;
      };
    }, [clearOpeningTimers, flyToProject, revealProjectMarkers, runOpeningSequence]);

    return (
      <div
        ref={rootRef}
        className={`polavaram-landing-map relative overflow-hidden ${className ?? ''}`}
        style={{ width: '100%', height: '100%' }}
      >
        <div ref={containerRef} className="absolute inset-0" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_46%,transparent_48%,rgba(15,23,42,0.08)_72%,rgba(15,23,42,0.16)_100%)]" />
        <style jsx global>{`
          .polavaram-landing-map .maplibregl-map,
          .polavaram-landing-map .maplibregl-canvas {
            border-radius: 0 !important;
          }

          .polavaram-landing-map .maplibregl-control-container {
            display: none !important;
          }
        `}</style>
      </div>
    );
  },
);

export default PolavaramGlobe;
