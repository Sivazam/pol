'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTheme } from 'next-themes';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Compass,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────

interface CenterMarker {
  longitude: number;
  latitude: number;
  label?: string;
}

interface ProjectMapProps {
  center?: [number, number];
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  maxBounds?: { sw: [number, number]; ne: [number, number] };
  height?: string;
  showMandals?: boolean;
  showVillages?: boolean;
  showVillagePolygons?: boolean;
  showDam?: boolean;
  selectedMandalCode?: string | null;
  selectedVillageId?: string | null;
  highlightMandalVillages?: boolean;
  /** When set, only this mandal's boundary is shown (others hidden).
   *  Villages are filtered to only this mandal's villages.
   *  Map auto-centers on this mandal. */
  focusMandalCode?: string | null;
  onMandalClick?: (mandalCode: string, mandalId: string) => void;
  onVillageClick?: (villageId: string, villageName: string) => void;
  centerMarker?: CenterMarker | null;
  showControls?: boolean;
  showLegend?: boolean;
  showLayerToggles?: boolean;
  show3D?: boolean;
  className?: string;
}

interface MapFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: number[] | number[][] | number[][][];
  };
  properties: Record<string, unknown>;
}

interface MapData {
  type: string;
  features: MapFeature[];
  meta: {
    mandalStats: Array<{
      id: string;
      name: string;
      code: string;
      color: string;
      latitude: number;
      longitude: number;
      familyCount: number;
      villageCount: number;
      rrEligiblePct: number;
      firstSchemePct: number;
    }>;
    center: [number, number];
    zoom: number;
  };
}

// ─── Color helpers ──────────────────────────────────────────────────────

function sesCompletionColor(pct: number): string {
  if (pct >= 75) return '#10B981';
  if (pct >= 50) return '#F59E0B';
  if (pct >= 25) return '#F97316';
  return '#EF4444';
}

// ─── Map Style Options ──────────────────────────────────────────────────

// Fallback OSM raster style (works when CARTO CDN is unavailable)
const OSM_RASTER_STYLE_OBJ = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

const OSM_DARK_STYLE_OBJ = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png'],
      tileSize: 256,
      attribution: '© Stadia Maps © OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm-dark', type: 'raster', source: 'osm' }],
};

const SATELLITE_STYLE_OBJ = {
  version: 8,
  sources: {
    satellite: {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      attribution: 'Esri World Imagery',
    },
  },
  layers: [{ id: 'satellite', type: 'raster', source: 'satellite' }],
};

// Map styles: 'url' can be either a remote URL string or a local inline style object
const MAP_STYLES: Record<string, { label: string; url: string | object }> = {
  voyager: { label: 'Map', url: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json' },
  dark: { label: 'Dark', url: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json' },
  satellite: { label: 'Satellite', url: SATELLITE_STYLE_OBJ },
  osm: { label: 'Street', url: OSM_RASTER_STYLE_OBJ },
  osmDark: { label: 'Street Dark', url: OSM_DARK_STYLE_OBJ },
};

// ─── MapPopup Component (React overlay, outside overflow:hidden) ─────────

interface MapPopupProps {
  x: number;
  y: number;
  type: 'mandal' | 'village' | 'cluster';
  props: Record<string, unknown>;
  isDark: boolean;
  containerHeight: number;
  onMandalClick?: (code: string, id: string) => void;
  onVillageClick?: (id: string, name: string) => void;
  onClusterZoom?: (clusterId: number) => void;
  onClose: () => void;
}

function MapPopup({
  x, y, type, props, isDark, containerHeight,
  onMandalClick, onVillageClick, onClusterZoom, onClose,
}: MapPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  // Smart positioning: show popup above click point, or below if too close to top
  const [position, setPosition] = useState<{ top?: number; bottom?: number; left: number; maxHeight?: number }>(() => {
    const estimatedHeight = type === 'cluster' ? 100 : 220;
    const left = Math.max(8, Math.min(x - 110, (window.innerWidth || 400) - 240));
    const margin = 12;
    // Try to show above the click point
    if (y - estimatedHeight > margin) {
      return { bottom: containerHeight - y + margin, left };
    }
    // Otherwise show below
    return { top: y + margin, left };
  });

  // After render, check if popup needs to be repositioned to fit container
  useEffect(() => {
    if (!popupRef.current) return;
    const el = popupRef.current;
    const elHeight = el.offsetHeight;
    const margin = 12;

    setPosition((prev) => {
      // If positioned from bottom (above click point) and popup goes above container
      if (prev.bottom !== undefined) {
        const bottomValue = typeof prev.bottom === 'number' ? prev.bottom : parseInt(String(prev.bottom));
        if (bottomValue - elHeight < margin) {
          // Not enough space above - switch to positioning from top instead
          return { top: margin, left: prev.left, maxHeight: containerHeight - margin * 2 };
        }
      }
      // If positioned from top (below click point) and popup goes below container
      if (prev.top !== undefined) {
        const topValue = typeof prev.top === 'number' ? prev.top : parseInt(String(prev.top));
        if (topValue + elHeight > containerHeight - margin) {
          return { ...prev, maxHeight: containerHeight - topValue - margin };
        }
      }
      return prev;
    });
  }, [containerHeight]);

  // Click outside to dismiss
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay to avoid the same click that opened the popup
    const timer = setTimeout(() => {
      document.addEventListener('click', handler, true);
    }, 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handler, true);
    };
  }, [onClose]);

  const bg = isDark ? '#1E293B' : '#FFFFFF';
  const textPrimary = isDark ? '#F1F5F9' : '#0F2B46';
  const textSecondary = isDark ? '#94A3B8' : '#64748B';
  const borderColor = isDark ? '#334155' : '#E2E8F0';
  const statBg = isDark ? '#0F172A' : '#F0F4F8';
  const btnBg = isDark ? '#D97706' : '#0F2B46';

  const totalFamilies = (props.familyCount as number) || 0;
  const eligiblePct = ((props.rrEligiblePct as number) ?? (props.sesCompletionPct as number)) || 0;
  const firstPct = (props.firstSchemePct as number) || 0;

  // Determine the accent color for the top bar (mandal color or default)
  const accentColor = (props.color as string) || (props.mandalColor as string) || '#D97706';

  return (
    <div
      ref={popupRef}
      className="absolute z-30 map-popup-animate"
      style={{
        ...position,
        background: bg,
        border: `1px solid ${borderColor}`,
        borderRadius: 10,
        boxShadow: isDark
          ? '0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)'
          : '0 8px 24px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
        minWidth: 210,
        maxWidth: 250,
        maxHeight: position.maxHeight || undefined,
        overflowY: position.maxHeight ? 'auto' : 'visible',
        padding: 0,
        fontFamily: 'system-ui',
      }}
    >
      {/* Colored accent bar at top */}
      <div style={{
        height: 3,
        background: `linear-gradient(90deg, ${accentColor}, ${accentColor}88)`,
        borderRadius: '10px 10px 0 0',
      }} />

      <div style={{ padding: '8px 10px 10px' }}>
        {/* Close button */}
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          style={{ color: textSecondary, fontSize: 14, lineHeight: 1, border: 'none', background: 'transparent', cursor: 'pointer', zIndex: 1 }}
        >
          ×
        </button>

        {type === 'mandal' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: (props.color as string) || '#1E3A5F', boxShadow: `0 0 6px ${(props.color as string) || '#1E3A5F'}44` }} />
              <strong style={{ fontSize: 13, color: textPrimary }}>{(props.name as string) || ''}</strong>
              <span style={{ fontSize: 9, color: textSecondary, marginLeft: 'auto', marginRight: 16 }}>{(props.code as string) || ''}</span>
            </div>
            <div style={{ fontSize: 9, color: textSecondary, marginBottom: 6 }}>{(props.villageCount as number) || 0} Villages</div>
            {/* Section divider */}
            <div style={{ height: 1, background: borderColor, margin: '4px 0 6px' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 8 }}>
              <div style={{ background: statBg, padding: '4px 6px', borderRadius: 5 }}><div style={{ fontSize: 8, color: textSecondary, marginBottom: 1 }}>Families</div><div style={{ fontSize: 14, fontWeight: 700, color: textPrimary }}>{totalFamilies.toLocaleString()}</div></div>
              <div style={{ background: statBg, padding: '4px 6px', borderRadius: 5 }}><div style={{ fontSize: 8, color: textSecondary, marginBottom: 1 }}>R&amp;R</div><div style={{ fontSize: 14, fontWeight: 700, color: sesCompletionColor(eligiblePct) }}>{eligiblePct}%</div></div>
              <div style={{ background: statBg, padding: '4px 6px', borderRadius: 5 }}><div style={{ fontSize: 8, color: textSecondary, marginBottom: 1 }}>1st Scheme</div><div style={{ fontSize: 14, fontWeight: 700, color: '#D97706' }}>{firstPct}%</div></div>
              <div style={{ background: statBg, padding: '4px 6px', borderRadius: 5 }}><div style={{ fontSize: 8, color: textSecondary, marginBottom: 1 }}>Villages</div><div style={{ fontSize: 14, fontWeight: 700, color: textPrimary }}>{(props.villageCount as number) || 0}</div></div>
            </div>
            {onMandalClick && (
              <button
                onClick={(e) => { e.stopPropagation(); onMandalClick(props.code as string, props.id as string); }}
                style={{ width: '100%', padding: '6px 8px', background: btnBg, color: '#FFF', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 10, fontWeight: 600, transition: 'filter 0.15s' }}
                onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.filter = 'brightness(1.1)'; }}
                onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.filter = 'brightness(1)'; }}
              >
                View Mandal →
              </button>
            )}
          </>
        )}

        {type === 'village' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: (props.mandalColor as string) || '#1E3A5F', boxShadow: `0 0 6px ${(props.mandalColor as string) || '#1E3A5F'}44` }} />
              <strong style={{ fontSize: 13, color: textPrimary }}>{(props.name as string) || ''}</strong>
            </div>
            <div style={{ fontSize: 9, color: textSecondary, marginBottom: 4 }}>{(props.mandalName as string) || ''} Mandal</div>
            {/* Section divider */}
            <div style={{ height: 1, background: borderColor, margin: '4px 0 6px' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 8 }}>
              <div style={{ background: statBg, padding: '4px 6px', borderRadius: 5 }}><div style={{ fontSize: 8, color: textSecondary, marginBottom: 1 }}>Families</div><div style={{ fontSize: 14, fontWeight: 700, color: textPrimary }}>{totalFamilies.toLocaleString()}</div></div>
              <div style={{ background: statBg, padding: '4px 6px', borderRadius: 5 }}><div style={{ fontSize: 8, color: textSecondary, marginBottom: 1 }}>R&amp;R</div><div style={{ fontSize: 14, fontWeight: 700, color: sesCompletionColor(eligiblePct) }}>{eligiblePct}%</div></div>
              <div style={{ background: statBg, padding: '4px 6px', borderRadius: 5 }}><div style={{ fontSize: 8, color: textSecondary, marginBottom: 1 }}>1st Scheme</div><div style={{ fontSize: 14, fontWeight: 700, color: '#D97706' }}>{firstPct}%</div></div>
              <div style={{ background: statBg, padding: '4px 6px', borderRadius: 5 }}><div style={{ fontSize: 8, color: textSecondary, marginBottom: 1 }}>Plots</div><div style={{ fontSize: 14, fontWeight: 700, color: '#0D9488' }}>{(props.plotAllottedPct as number) || 0}%</div></div>
            </div>
            {onVillageClick && (
              <button
                onClick={(e) => { e.stopPropagation(); onVillageClick(props.id as string, props.name as string); }}
                style={{ width: '100%', padding: '6px 8px', background: btnBg, color: '#FFF', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 10, fontWeight: 600, transition: 'filter 0.15s' }}
                onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.filter = 'brightness(1.1)'; }}
                onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.filter = 'brightness(1)'; }}
              >
                View Details →
              </button>
            )}
          </>
        )}

        {type === 'cluster' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: textPrimary, marginBottom: 2 }}>{(props.pointCount as number) || 0}</div>
            <div style={{ fontSize: 10, color: textSecondary }}>villages in this area</div>
            {/* Section divider */}
            <div style={{ height: 1, background: borderColor, margin: '6px 0' }} />
            <div style={{ fontSize: 9, color: textSecondary }}>Use zoom controls to explore</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────

export default function ProjectMap({
  center = [81.32, 17.63],
  zoom = 9.5,
  minZoom = 8,
  maxZoom = 15,
  maxBounds,
  height = '400px',
  showMandals = true,
  showVillages = true,
  showVillagePolygons = false,
  showDam = true,
  selectedMandalCode = null,
  selectedVillageId = null,
  highlightMandalVillages = false,
  focusMandalCode = null,
  onMandalClick,
  onVillageClick,
  centerMarker = null,
  showControls = true,
  showLegend = false,
  showLayerToggles = false,
  show3D = false,
  className,
}: ProjectMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dataRef = useRef<MapData | null>(null);
  const initializedRef = useRef(false);

  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredFeature, setHoveredFeature] = useState<Record<string, unknown> | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [legendCollapsed, setLegendCollapsed] = useState(false);
  const [popupData, setPopupData] = useState<{
    x: number;
    y: number;
    type: 'mandal' | 'village' | 'cluster';
    props: Record<string, unknown>;
  } | null>(null);

  // Layer visibility state
  const [layerMandals, setLayerMandals] = useState(showMandals);
  const [layerVillages, setLayerVillages] = useState(showVillages);
  const [layerVillagePolygons, setLayerVillagePolygons] = useState(showVillagePolygons);
  const [layerDam, setLayerDam] = useState(showDam);

  // ─── Client-only mount ────────────────────────────────────────────
  useEffect(() => { setMounted(true); }, []);

  // ─── Sync external props to internal layer state ──────────────────
  useEffect(() => { setLayerMandals(showMandals); }, [showMandals]);
  useEffect(() => { setLayerVillages(showVillages); }, [showVillages]);
  useEffect(() => { setLayerVillagePolygons(showVillagePolygons); }, [showVillagePolygons]);
  useEffect(() => { setLayerDam(showDam); }, [showDam]);

  // (Click handlers are now managed by the MapPopup React component directly)

  // ─── Core: Initialize map + fetch data ────────────────────────────
  useEffect(() => {
    if (!mounted || initializedRef.current) return;

    let cancelled = false;

    const init = async () => {
      try {
        // 1. Fetch map data first (don't need mapContainer for this)
        const res = await fetch('/api/map');
        if (!res.ok) throw new Error(`Map API returned ${res.status}`);
        const data: MapData = await res.json();
        if (cancelled) return;

        dataRef.current = data;
        setLoading(false);

        // 2. Wait for mapContainer to be available
        const waitForContainer = () => new Promise<void>((resolve) => {
          const check = () => {
            if (mapContainer.current) {
              resolve();
            } else {
              requestAnimationFrame(check);
            }
          };
          check();
        });

        await waitForContainer();
        if (cancelled) return;

        const container = mapContainer.current!;

        // 2. Create map — try CARTO style first, fall back to OSM raster on failure
        const isDark = theme === 'dark';
        const primaryStyle = isDark ? MAP_STYLES.dark.url : MAP_STYLES.voyager.url;
        const fallbackStyle = isDark ? MAP_STYLES.osmDark.url : MAP_STYLES.osm.url;

        const mapOptions: maplibregl.MapOptions = {
          container,
          style: primaryStyle,
          center: center as [number, number],
          zoom,
          minZoom,
          maxZoom,
          attributionControl: false,
          pitch: show3D ? 30 : 0,
          bearing: 0,
          preserveDrawingBuffer: true,
        };

        if (maxBounds) {
          mapOptions.maxBounds = [
            maxBounds.sw as [number, number],
            maxBounds.ne as [number, number],
          ];
        }

        const mapInstance = new maplibregl.Map(mapOptions);
        // Don't add NavigationControl - we have custom zoom buttons in the top-right
        mapInstance.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
        mapInstance.scrollZoom.enable();
        // boxZoom can stay disabled as it conflicts with drag selection
        mapInstance.boxZoom.disable();

        // 3. On map load, add all sources and layers
        mapInstance.on('load', () => {
          if (cancelled) return;
          mapRef.current = mapInstance;
          initializedRef.current = true;

          addAllSourcesAndLayers(mapInstance, data, isDark, focusMandalCode, showVillages);

          // Wire up interactions
          wireInteractions(mapInstance, data, isDark, (type, props, lngLat) => {
            const point = mapInstance.project(lngLat as [number, number]);
            setPopupData({ x: point.x, y: point.y, type, props });
          }, !!onMandalClick);

          // Dismiss popup on map drag/zoom
          mapInstance.on('movestart', () => { setPopupData(null); });

          // Resize map to fit container after loading
          mapInstance.resize();

          setMapReady(true);
        });

        // Handle style load failure — fall back to OSM raster tiles
        let styleLoadFailed = false;
        const styleLoadTimeout = setTimeout(() => {
          // If map hasn't loaded after 8 seconds, try fallback style
          if (!initializedRef.current && !cancelled && !styleLoadFailed) {
            styleLoadFailed = true;
            console.warn('CARTO style load timeout, falling back to OSM raster tiles');
            try {
              mapInstance.setStyle(fallbackStyle);
              mapInstance.on('load', () => {
                if (cancelled) return;
                mapRef.current = mapInstance;
                initializedRef.current = true;
                addAllSourcesAndLayers(mapInstance, data, isDark, focusMandalCode, showVillages);
                wireInteractions(mapInstance, data, isDark, (type, props, lngLat) => {
                  const point = mapInstance.project(lngLat as [number, number]);
                  setPopupData({ x: point.x, y: point.y, type, props });
                }, !!onMandalClick);
                mapInstance.on('movestart', () => { setPopupData(null); });
                mapInstance.resize();
                setMapReady(true);
              });
            } catch {
              // Fallback also failed
            }
          }
        }, 8000);

        // Clear timeout when map loads successfully
        mapInstance.on('load', () => { clearTimeout(styleLoadTimeout); });

        mapInstance.on('error', (e) => {
          // MapLibre fires error events for non-critical issues (missing sprites, tile retries, etc.)
          // Only treat truly fatal errors as blocking — don't show error overlay for transient issues
          const errMsg = e.error?.message || String(e.error || '');
          const isStyleError = errMsg.includes('style') && (
            errMsg.includes('Failed to fetch') ||
            errMsg.includes('Could not load') ||
            errMsg.includes('error')
          );

          console.warn('MapLibre event:', errMsg);

          // If style fails to load, try fallback
          if (isStyleError && !initializedRef.current && !styleLoadFailed && !cancelled) {
            styleLoadFailed = true;
            clearTimeout(styleLoadTimeout);
            console.warn('CARTO style failed, falling back to OSM raster tiles');
            try {
              mapInstance.setStyle(fallbackStyle);
              mapInstance.on('load', () => {
                if (cancelled) return;
                mapRef.current = mapInstance;
                initializedRef.current = true;
                addAllSourcesAndLayers(mapInstance, data, isDark, focusMandalCode, showVillages);
                wireInteractions(mapInstance, data, isDark, (type, props, lngLat) => {
                  const point = mapInstance.project(lngLat as [number, number]);
                  setPopupData({ x: point.x, y: point.y, type, props });
                }, !!onMandalClick);
                mapInstance.on('movestart', () => { setPopupData(null); });
                mapInstance.resize();
                setMapReady(true);
              });
            } catch {
              // Fallback also failed
            }
            return;
          }
        });

      } catch (err) {
        console.error('Map initialization failed:', err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load map');
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      initializedRef.current = false;
    };
  }, [mounted]); // Only re-run when mounted changes

  // ─── ResizeObserver on container ──────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      mapRef.current?.resize();
    });
    observer.observe(container);

    return () => { observer.disconnect(); };
  }, [mounted]);

  // ─── Re-style on theme change ─────────────────────────────────────
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !mapReady) return;

    const isDark = theme === 'dark';
    const styleUrl = isDark
      ? MAP_STYLES.dark.url
      : MAP_STYLES.voyager.url;

    m.setStyle(styleUrl);
    m.once('style.load', () => {
      if (dataRef.current) {
        removeInteractions(m);
        addAllSourcesAndLayers(m, dataRef.current, isDark, focusMandalCode, showVillages);
        wireInteractions(m, dataRef.current, isDark, (type, props, lngLat) => {
          const point = m.project(lngLat as [number, number]);
          setPopupData({ x: point.x, y: point.y, type, props });
        }, !!onMandalClick);
        m.scrollZoom.enable();
        m.resize();
      }
    });
  }, [theme, mapReady]);

  // ─── Toggle 3D pitch ─────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.easeTo({ pitch: show3D ? 30 : 0, duration: 800 });
  }, [show3D]);

  // ─── Toggle layer visibility ─────────────────────────────────────
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !mapReady) return;

    const toggle = (layerId: string, visible: boolean) => {
      if (m.getLayer(layerId)) {
        m.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
      }
    };

    toggle('mandal-fill', layerMandals);
    toggle('mandal-border', layerMandals);
    toggle('mandal-labels', layerMandals);
    toggle('village-clusters', layerVillages);
    toggle('village-cluster-count', layerVillages);
    toggle('village-marker-halo', layerVillages);
    toggle('village-markers', layerVillages);
    toggle('village-labels', layerVillages);
    toggle('dam-marker', layerDam && !focusMandalCode);
    toggle('dam-label', layerDam && !focusMandalCode);
  }, [layerMandals, layerVillages, layerVillagePolygons, layerDam, focusMandalCode, mapReady]);

  // ─── Zoom to selected mandal ─────────────────────────────────────
  useEffect(() => {
    const m = mapRef.current;
    const data = dataRef.current;
    if (!m || !data || !selectedMandalCode || !mapReady) return;

    const feature = data.features.find(
      (f) => f.geometry.type === 'Polygon' && (f.properties as Record<string, unknown>).code === selectedMandalCode
    );
    if (!feature) return;

    const coords = (feature.geometry.coordinates as number[][][])[0];
    const centroidLng = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
    const centroidLat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;

    m.flyTo({
      center: [centroidLng, centroidLat],
      zoom: 11,
      duration: 1200,
      essential: true,
    });
  }, [selectedMandalCode, mapReady]);

  // ─── Zoom to focused mandal on mount — fitBounds to show mandal + all villages ──
  useEffect(() => {
    const m = mapRef.current;
    const data = dataRef.current;
    if (!m || !data || !focusMandalCode || !mapReady) return;

    // Collect all points: mandal polygon + village points for this mandal
    const allLngs: number[] = [];
    const allLats: number[] = [];

    // Mandal polygon vertices
    const mandalFeature = data.features.find(
      (f) => f.geometry.type === 'Polygon' && (f.properties as Record<string, unknown>).code === focusMandalCode
    );
    if (mandalFeature) {
      const coords = (mandalFeature.geometry.coordinates as number[][][])[0];
      for (const c of coords) {
        allLngs.push(c[0]);
        allLats.push(c[1]);
      }
    }

    // Village points for this mandal
    const mandalVillages = data.features.filter(
      (f) => f.geometry.type === 'Point' &&
        (f.properties as Record<string, unknown>).type !== 'dam' &&
        (f.properties as Record<string, unknown>).mandalCode === focusMandalCode
    );
    for (const vf of mandalVillages) {
      const vc = (vf.geometry.coordinates as number[]);
      allLngs.push(vc[0]);
      allLats.push(vc[1]);
    }

    if (allLngs.length === 0) return;

    // Calculate bounding box with padding
    const minLng = Math.min(...allLngs);
    const maxLng = Math.max(...allLngs);
    const minLat = Math.min(...allLats);
    const maxLat = Math.max(...allLats);

    // Add 15% padding around the bounds so villages aren't at the very edge
    const lngPad = (maxLng - minLng) * 0.15;
    const latPad = (maxLat - minLat) * 0.15;

    m.fitBounds(
      [
        [minLng - lngPad, minLat - latPad],
        [maxLng + lngPad, maxLat + latPad],
      ],
      {
        duration: 1500,
        essential: true,
        padding: { top: 40, bottom: 40, left: 40, right: 40 },
        maxZoom: 13, // Don't zoom in too much for small mandals
      }
    );
  }, [focusMandalCode, mapReady]);

  // ─── Zoom to selected village ─────────────────────────────────────
  const prevVillageRef = useRef<string | null>(null);
  useEffect(() => {
    const m = mapRef.current;
    const data = dataRef.current;
    if (!m || !data || !selectedVillageId || !mapReady) return;
    if (prevVillageRef.current === selectedVillageId) return;
    prevVillageRef.current = selectedVillageId;

    const feature = data.features.find(
      (f) => f.geometry.type === 'Point' &&
        (f.properties as Record<string, unknown>).type !== 'dam' &&
        (f.properties as Record<string, unknown>).id === selectedVillageId
    );
    if (!feature) return;

    const coords = (feature.geometry.coordinates as number[]).slice() as [number, number];
    m.flyTo({ center: coords, zoom: 13, duration: 1200, essential: true });
  }, [selectedVillageId, mapReady]);

  // (Pulse animation is handled by the animated pulse effect below)

  // ─── Reset view ──────────────────────────────────────────────────
  const resetView = useCallback(() => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center: center as [number, number],
      zoom,
      duration: 1200,
      essential: true,
    });
  }, [center, zoom]);

  // ─── Fullscreen toggle ──────────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
    setTimeout(() => { mapRef.current?.resize(); }, 350);
  }, []);

  // ─── Pulse animation for selected village ──────────────────────────
  useEffect(() => {
    const m = mapRef.current;
    const data = dataRef.current;
    if (!m || !data || !mapReady) return;

    // Clean up previous pulse layer/source
    if (m.getLayer('selected-village-pulse')) m.removeLayer('selected-village-pulse');
    if (m.getLayer('selected-village-ring')) m.removeLayer('selected-village-ring');
    if (m.getSource('selected-village')) m.removeSource('selected-village');

    if (!selectedVillageId) return;

    const feature = data.features.find(
      (f) => f.geometry.type === 'Point' &&
        (f.properties as Record<string, unknown>).type !== 'dam' &&
        (f.properties as Record<string, unknown>).id === selectedVillageId
    );
    if (!feature) return;

    const coords = (feature.geometry.coordinates as number[]).slice() as [number, number];

    m.addSource('selected-village', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'Point', coordinates: coords },
          properties: {},
        }],
      },
    });

    // Pulsing outer ring - animated via requestAnimationFrame
    m.addLayer({
      id: 'selected-village-pulse',
      type: 'circle',
      source: 'selected-village',
      paint: {
        'circle-radius': 25,
        'circle-color': '#D97706',
        'circle-opacity': 0.15,
        'circle-blur': 0.5,
      },
    });

    // Static highlight ring
    m.addLayer({
      id: 'selected-village-ring',
      type: 'circle',
      source: 'selected-village',
      paint: {
        'circle-radius': 22,
        'circle-color': 'transparent',
        'circle-stroke-width': 2.5,
        'circle-stroke-color': '#D97706',
        'circle-stroke-opacity': 0.7,
      },
    });

    // Animate pulse radius
    let animId: number;
    let start: number | null = null;
    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const cycle = 2000; // 2 second cycle
      const progress = (elapsed % cycle) / cycle;
      // Smooth pulse: expand from 22 to 35, opacity fade from 0.25 to 0
      const radius = 22 + 13 * Math.sin(progress * Math.PI);
      const opacity = 0.25 * (1 - progress);
      if (m.getLayer('selected-village-pulse')) {
        m.setPaintProperty('selected-village-pulse', 'circle-radius', radius);
        m.setPaintProperty('selected-village-pulse', 'circle-opacity', opacity);
      }
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [selectedVillageId, mapReady]);

  // ─── Hover feature state for village markers ──────────────────────
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !mapReady) return;

    const onMouseMove = (e: maplibregl.MapLayerEventType['mousemove']) => {
      if (e.features && e.features[0]) {
        setHoveredFeature(e.features[0].properties as Record<string, unknown>);
      }
    };

    const onMouseLeave = () => {
      setHoveredFeature(null);
    };

    m.on('mousemove', 'village-markers', onMouseMove);
    m.on('mouseleave', 'village-markers', onMouseLeave);

    return () => {
      m.off('mousemove', 'village-markers', onMouseMove);
      m.off('mouseleave', 'village-markers', onMouseLeave);
    };
  }, [mapReady]);

  // ─── Center marker ──────────────────────────────────────────────
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !mapReady) return;

    // Remove existing center marker source/layer if they exist
    if (m.getLayer('center-marker-label')) m.removeLayer('center-marker-label');
    if (m.getLayer('center-marker-dot')) m.removeLayer('center-marker-dot');
    if (m.getLayer('center-marker-ring')) m.removeLayer('center-marker-ring');
    if (m.getSource('center-marker')) m.removeSource('center-marker');

    if (!centerMarker) return;

    const isDark = theme === 'dark';

    m.addSource('center-marker', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [centerMarker.longitude, centerMarker.latitude],
          },
          properties: {
            label: centerMarker.label || '',
          },
        }],
      },
    });

    // Outer ring (pulsing effect)
    m.addLayer({
      id: 'center-marker-ring',
      type: 'circle',
      source: 'center-marker',
      paint: {
        'circle-radius': 16,
        'circle-color': '#D97706',
        'circle-opacity': 0.2,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#D97706',
        'circle-stroke-opacity': 0.6,
      },
    });

    // Center dot
    m.addLayer({
      id: 'center-marker-dot',
      type: 'circle',
      source: 'center-marker',
      paint: {
        'circle-radius': 7,
        'circle-color': '#D97706',
        'circle-stroke-width': 2.5,
        'circle-stroke-color': isDark ? '#0F172A' : '#FFFFFF',
      },
    });

    // Label
    if (centerMarker.label) {
      m.addLayer({
        id: 'center-marker-label',
        type: 'symbol',
        source: 'center-marker',
        layout: {
          'text-field': ['get', 'label'] as unknown as string,
          'text-size': 12,
          'text-offset': [0, 2],
          'text-anchor': 'top',
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#D97706',
          'text-halo-color': isDark ? '#0F172A' : '#FFFFFF',
          'text-halo-width': 2,
        },
      });
    }
  }, [centerMarker, mapReady, theme]);

  // ─── SSR guard ─────────────────────────────────────────────────────
  if (!mounted) {
    return (
      <div
        className={`relative bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden ${className || ''}`}
        style={{ height }}
      >
        {/* Map outline skeleton with shimmer */}
        <div className="absolute inset-0">
          {/* Simulated map background */}
          <div className="w-full h-full bg-slate-200/70 dark:bg-slate-700/50 rounded-xl overflow-hidden relative">
            {/* Shimmer stripes */}
            <div className="absolute inset-0 map-skeleton-shimmer" />
            {/* Simulated landmass shapes */}
            <div className="absolute top-[15%] left-[10%] w-[35%] h-[40%] bg-slate-300/50 dark:bg-slate-600/40 rounded-lg" />
            <div className="absolute top-[20%] right-[15%] w-[25%] h-[30%] bg-slate-300/50 dark:bg-slate-600/40 rounded-lg" />
            <div className="absolute bottom-[15%] left-[30%] w-[30%] h-[25%] bg-slate-300/50 dark:bg-slate-600/40 rounded-lg" />
            {/* Simulated village dots */}
            <div className="absolute top-[25%] left-[20%] w-2 h-2 bg-amber-400/40 rounded-full" />
            <div className="absolute top-[35%] left-[40%] w-2.5 h-2.5 bg-amber-400/40 rounded-full" />
            <div className="absolute top-[50%] left-[55%] w-2 h-2 bg-amber-400/40 rounded-full" />
            <div className="absolute top-[30%] right-[25%] w-2 h-2 bg-amber-400/40 rounded-full" />
            <div className="absolute top-[60%] left-[35%] w-2 h-2 bg-amber-400/40 rounded-full" />
            {/* Simulated dam marker */}
            <div className="absolute top-[48%] left-[46%] w-3 h-3 bg-red-400/40 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className={`relative ${isFullscreen ? 'fixed inset-0 z-50' : ''} ${className || ''}`}
      style={isFullscreen ? { height: '100vh' } : { height }}
    >
      {/* Map container - use inline styles to prevent MapLibre CSS from overriding position:absolute */}
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden', borderRadius: isFullscreen ? 0 : undefined }}>
        <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
      </div>

      {/* Custom React popup overlay - outside overflow:hidden so it never gets clipped */}
      {popupData && (
        <MapPopup
          x={popupData.x}
          y={popupData.y}
          type={popupData.type}
          props={popupData.props}
          isDark={theme === 'dark'}
          containerHeight={isFullscreen ? window.innerHeight : parseInt(height)}
          onMandalClick={onMandalClick ? (code, id) => { setPopupData(null); onMandalClick(code, id); } : undefined}
          onVillageClick={onVillageClick ? (id, name) => { setPopupData(null); onVillageClick(id, name); } : undefined}
          onClose={() => setPopupData(null)}
        />
      )}

      {/* ─── Loading overlay ────────────────────────────────────── */}
      {loading && (
        <div className="absolute inset-0 z-20 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden">
          {/* Map outline skeleton with shimmer */}
          <div className="w-full h-full bg-slate-200/70 dark:bg-slate-700/50 rounded-xl overflow-hidden relative">
            {/* Shimmer stripes */}
            <div className="absolute inset-0 map-skeleton-shimmer" />
            {/* Simulated landmass shapes */}
            <div className="absolute top-[15%] left-[10%] w-[35%] h-[40%] bg-slate-300/50 dark:bg-slate-600/40 rounded-lg" />
            <div className="absolute top-[20%] right-[15%] w-[25%] h-[30%] bg-slate-300/50 dark:bg-slate-600/40 rounded-lg" />
            <div className="absolute bottom-[15%] left-[30%] w-[30%] h-[25%] bg-slate-300/50 dark:bg-slate-600/40 rounded-lg" />
            {/* Simulated village dots */}
            <div className="absolute top-[25%] left-[20%] w-2 h-2 bg-amber-400/40 rounded-full" />
            <div className="absolute top-[35%] left-[40%] w-2.5 h-2.5 bg-amber-400/40 rounded-full" />
            <div className="absolute top-[50%] left-[55%] w-2 h-2 bg-amber-400/40 rounded-full" />
            <div className="absolute top-[30%] right-[25%] w-2 h-2 bg-amber-400/40 rounded-full" />
            <div className="absolute top-[60%] left-[35%] w-2 h-2 bg-amber-400/40 rounded-full" />
            {/* Simulated dam marker */}
            <div className="absolute top-[48%] left-[46%] w-3 h-3 bg-red-400/40 rounded-full" />
            {/* Error overlay */}
            {error && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100/80 dark:bg-slate-800/80">
                <div className="text-center">
                  <p className="text-xs text-red-500 font-medium">Failed to load map</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-2 px-3 py-1.5 text-xs bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Error state (when not loading but error exists) ──── */}
      {error && !loading && (
        <div className="absolute inset-0 z-20 bg-slate-100 dark:bg-slate-800/95 rounded-xl flex items-center justify-center">
          <div className="text-center p-4">
            <p className="text-sm text-red-500 font-medium">Map failed to load</p>
            <p className="text-xs text-slate-400 mt-1">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 px-3 py-1.5 text-xs bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* ─── Zoom Controls (top-right) ──────────────────────────── */}
      {showControls && (
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
          <button
            onClick={() => mapRef.current?.zoomIn({ duration: 300 })}
            className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-lg rounded-lg p-2 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-600"
            aria-label="Zoom in"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => mapRef.current?.zoomOut({ duration: 300 })}
            className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-lg rounded-lg p-2 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-600"
            aria-label="Zoom out"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={resetView}
            className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-lg rounded-lg p-2 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-600"
            aria-label="Reset view"
            title="Reset View / Re-center Map"
          >
            <Compass className="w-4 h-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-lg rounded-lg p-2 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-600"
            aria-label="Toggle fullscreen"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      )}

      {/* ─── Layer Toggles (top-left) ──────────────────────────── */}
      {showLayerToggles && (
        <div className="absolute top-3 left-3 z-10">
          <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-lg rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden">
            <button
              onClick={() => setLegendCollapsed(!legendCollapsed)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 w-full hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Layers className="w-3.5 h-3.5" />
              Layers
              {legendCollapsed ? <ChevronDown className="w-3 h-3 ml-auto" /> : <ChevronUp className="w-3 h-3 ml-auto" />}
            </button>
            {!legendCollapsed && (
              <div className="px-3 pb-2 space-y-1.5 border-t border-slate-100 dark:border-slate-700">
                {[
                  { label: 'Mandals', checked: layerMandals, onChange: setLayerMandals },
                  { label: 'Villages', checked: layerVillages, onChange: setLayerVillages },
                  { label: 'River', checked: layerRiver, onChange: setLayerRiver },
                  { label: 'Dam', checked: layerDam, onChange: setLayerDam },
                ].map((item) => (
                  <label key={item.label} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={(e) => item.onChange(e.target.checked)}
                      className="w-3.5 h-3.5 rounded accent-amber-500"
                    />
                    <span className="text-[11px] text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">{item.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Legend (bottom-right) ─────────────────────────────── */}
      {showLegend && (
        <div className="absolute bottom-3 right-3 z-10">
          <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-lg rounded-lg border border-slate-200 dark:border-slate-600 p-3 max-w-[200px]">
            <button
              onClick={() => setLegendCollapsed(!legendCollapsed)}
              className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 w-full mb-1"
            >
              Legend
              {legendCollapsed ? <ChevronDown className="w-3 h-3 ml-auto" /> : <ChevronUp className="w-3 h-3 ml-auto" />}
            </button>
            {!legendCollapsed && (
              <div className="space-y-2 mt-2">
                {/* R&R Color Scale */}
                <div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 font-medium">R&amp;R Eligible</p>
                  <div className="flex items-center gap-0.5">
                    <div className="h-2 flex-1 rounded-l bg-gradient-to-r from-red-500 via-orange-500 via-amber-500 to-emerald-500" />
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
                    <span>0%</span><span>50%</span><span>100%</span>
                  </div>
                </div>
                {/* Marker size */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-teal-500 ring-2 ring-white dark:ring-slate-800" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-800" />
                    <div className="w-4 h-4 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-800" />
                  </div>
                  <span className="text-[9px] text-slate-400">Family count</span>
                </div>
                {/* Special markers */}
                {layerDam && !focusMandalCode && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-600" />
                    <span className="text-[9px] text-slate-400">Polavaram Dam</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Hover tooltip ────────────────────────────────────── */}
      {hoveredFeature && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-lg rounded-lg px-3 py-1.5 border border-slate-200 dark:border-slate-600 pointer-events-none">
          <div className="flex items-center gap-2 text-xs">
            {(hoveredFeature.color || hoveredFeature.mandalColor) && (
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: (hoveredFeature.color || hoveredFeature.mandalColor) as string }} />
            )}
            <span className="font-medium text-slate-700 dark:text-slate-200">
              {hoveredFeature.name as string}
            </span>
            {hoveredFeature.familyCount != null && (
              <span className="text-slate-400">
                • {(hoveredFeature.familyCount as number).toLocaleString()} families
              </span>
            )}
            {(((hoveredFeature.rrEligiblePct as number | undefined) ?? (hoveredFeature.sesCompletionPct as number | undefined)) != null) && (
              <span className="font-semibold" style={{ color: sesCompletionColor(((hoveredFeature.rrEligiblePct as number | undefined) ?? (hoveredFeature.sesCompletionPct as number)) || 0) }}>
                {((hoveredFeature.rrEligiblePct as number | undefined) ?? (hoveredFeature.sesCompletionPct as number)) || 0}%
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// STANDALONE FUNCTIONS (outside component to avoid re-creation)
// ═══════════════════════════════════════════════════════════════════════

function addAllSourcesAndLayers(
  m: maplibregl.Map,
  data: MapData,
  isDark: boolean,
  focusMandalCode?: string | null,
  includeVillages?: boolean
) {
  let mandalFeatures = data.features.filter((f) => f.geometry.type === 'Polygon');
  let villageFeatures = data.features.filter(
    (f) => f.geometry.type === 'Point' && (f.properties as Record<string, unknown>).type !== 'dam'
  );
  const damFeature = data.features.find((f) => (f.properties as Record<string, unknown>).type === 'dam');
  const familyCountExpression = ['to-number', ['coalesce', ['get', 'familyCount'], ['get', 'totalFamilies'], 1]];
  const rrEligibleExpression = ['to-number', ['coalesce', ['get', 'rrEligiblePct'], ['get', 'sesCompletionPct'], 0]];

  // When focusMandalCode is set, filter to only that mandal and its villages
  if (focusMandalCode) {
    mandalFeatures = mandalFeatures.filter(
      (f) => (f.properties as Record<string, unknown>).code === focusMandalCode
    );
    villageFeatures = villageFeatures.filter(
      (f) => (f.properties as Record<string, unknown>).mandalCode === focusMandalCode
    );
  }

  const isFocused = !!focusMandalCode;
  // Don't show dam marker when focused on a single mandal (dam is far away)
  const showDamInContext = !isFocused;

  // ── Mandal polygons ──
  if (mandalFeatures.length > 0) {
    m.addSource('mandals', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: mandalFeatures as unknown as GeoJSON.Feature[] },
    });

    m.addLayer({
      id: 'mandal-fill',
      type: 'fill',
      source: 'mandals',
      paint: {
        'fill-color': ['get', 'color'] as unknown as string,
        'fill-opacity': isFocused ? 0.25 : 0.15,
      },
    });

    m.addLayer({
      id: 'mandal-border',
      type: 'line',
      source: 'mandals',
      paint: {
        'line-color': ['get', 'color'] as unknown as string,
        'line-width': isFocused ? 4 : 2.5,
        'line-opacity': isFocused ? 1.0 : 0.7,
      },
    });

    if (!isFocused) {
      m.addLayer({
        id: 'mandal-labels',
        type: 'symbol',
        source: 'mandals',
        layout: {
          'text-field': ['get', 'name'] as unknown as string,
          'text-size': 12,
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': isDark ? '#E2E8F0' : '#1E293B',
          'text-halo-color': isDark ? '#0F172A' : '#FFFFFF',
          'text-halo-width': 2,
        },
      });
    }
  }

  // ── Village markers ──
  if (villageFeatures.length > 0 && includeVillages !== false) {
    // When focused on a single mandal, disable clustering so all villages are visible without zooming
    const shouldCluster = !isFocused;
    m.addSource('villages', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: villageFeatures as unknown as GeoJSON.Feature[] },
      cluster: shouldCluster,
      clusterMaxZoom: shouldCluster ? 12 : undefined,
      clusterRadius: shouldCluster ? 40 : undefined,
    });

    // Clustered circles
    m.addLayer({
      id: 'village-clusters',
      type: 'circle',
      source: 'villages',
      filter: ['has', 'point_count'] as unknown as boolean,
      paint: {
        'circle-color': '#1E3A5F',
        'circle-radius': ['step', ['get', 'point_count'], 14, 5, 18, 10, 22, 30, 28],
        'circle-opacity': 0.7,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#D97706',
      },
    });

    m.addLayer({
      id: 'village-cluster-count',
      type: 'symbol',
      source: 'villages',
      filter: ['has', 'point_count'] as unknown as boolean,
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-size': 12,
      },
      paint: {
        'text-color': '#FFFFFF',
      },
    });

    // Soft mandal-colored halo behind each village marker
    m.addLayer({
      id: 'village-marker-halo',
      type: 'circle',
      source: 'villages',
      filter: ['!', ['has', 'point_count']] as unknown as boolean,
      paint: {
        'circle-radius': isFocused
          ? [
              'interpolate', ['linear'], familyCountExpression,
              20, 10, 200, 12, 500, 15, 1000, 18, 1800, 21,
            ]
          : [
              'interpolate', ['linear'], familyCountExpression,
              20, 7, 200, 9, 500, 12, 1000, 15, 1800, 18,
            ],
        'circle-color': ['coalesce', ['get', 'mandalColor'], '#0D9488'] as unknown as string,
        'circle-opacity': isFocused ? 0.22 : 0.16,
        'circle-blur': 0.35,
      },
    });

    // Unclustered village markers
    m.addLayer({
      id: 'village-markers',
      type: 'circle',
      source: 'villages',
      filter: ['!', ['has', 'point_count']] as unknown as boolean,
      paint: {
        'circle-radius': isFocused
          ? [
              'interpolate', ['linear'], familyCountExpression,
              20, 6, 200, 8, 500, 10, 1000, 12, 1800, 14,
            ]
          : [
              'interpolate', ['linear'], familyCountExpression,
              20, 4.5, 200, 6.5, 500, 8.5, 1000, 11, 1800, 13,
            ],
        'circle-color': [
          'interpolate', ['linear'], rrEligibleExpression,
          0, '#EF4444', 25, '#F97316', 50, '#F59E0B', 75, '#10B981', 100, '#059669',
        ],
        'circle-stroke-width': isFocused ? 2.5 : 2,
        'circle-stroke-color': isDark ? '#1E293B' : '#FFFFFF',
        'circle-opacity': isFocused ? 0.96 : 0.9,
      },
    });

    m.addLayer({
      id: 'village-labels',
      type: 'symbol',
      source: 'villages',
      filter: ['!', ['has', 'point_count']] as unknown as boolean,
      layout: {
        'text-field': ['get', 'name'] as unknown as string,
        'text-size': isFocused ? 11 : 10,
        'text-offset': [0, 1.25],
        'text-anchor': 'top',
        'text-allow-overlap': false,
        'text-optional': true,
      },
      paint: {
        'text-color': isDark ? '#CBD5E1' : '#1E293B',
        'text-halo-color': isDark ? '#0F172A' : '#FFFFFF',
        'text-halo-width': isFocused ? 2.25 : 1.5,
      },
    });
  }

  // ── Dam marker (only show on overview, not when focused on a mandal) ──
  if (damFeature && showDamInContext) {
    m.addSource('dam', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [damFeature] as unknown as GeoJSON.Feature[] },
    });

    m.addLayer({
      id: 'dam-marker',
      type: 'circle',
      source: 'dam',
      paint: {
        'circle-radius': 6,
        'circle-color': '#DC2626',
        'circle-stroke-width': 2,
        'circle-stroke-color': isDark ? '#1E293B' : '#FFFFFF',
      },
    });

    m.addLayer({
      id: 'dam-label',
      type: 'symbol',
      source: 'dam',
      layout: {
        'text-field': 'Polavaram Dam',
        'text-size': 11,
        'text-offset': [0, 1.6],
        'text-anchor': 'top',
      },
      paint: {
        'text-color': '#DC2626',
        'text-halo-color': isDark ? '#0F172A' : '#FFFFFF',
        'text-halo-width': 2,
      },
    });
  }
}

function removeInteractions(m: maplibregl.Map) {
  // Remove all interaction listeners to prevent double-registration on theme change
  const interactionLayers = [
    { layer: 'mandal-fill', events: ['click', 'mouseenter', 'mouseleave'] },
    { layer: 'village-markers', events: ['click', 'mouseenter', 'mouseleave', 'mousemove'] },
    { layer: 'village-clusters', events: ['click'] },
  ];

  for (const { layer, events } of interactionLayers) {
    for (const event of events) {
      m.off(event as keyof maplibregl.MapLayerEventType, layer);
    }
  }
}

type ShowPopupCallback = (type: 'mandal' | 'village' | 'cluster', props: Record<string, unknown>, lngLat: [number, number]) => void;

function wireInteractions(m: maplibregl.Map, data: MapData, _isDark: boolean, showPopup: ShowPopupCallback, enableMandalClick: boolean = true) {
  // ── Mandal click & hover ── (only when mandal popup is enabled, e.g. not on mandal detail page)
  if (enableMandalClick) {
    m.on('click', 'mandal-fill', (e) => {
      if (!e.features || !e.features[0]) return;
      const props = e.features[0].properties as Record<string, unknown>;
      const coords = (e.features[0].geometry as { coordinates: number[][] })?.coordinates?.[0];

      let centroid: [number, number] = [81.32, 17.63];
      if (coords && coords.length > 0) {
        const lngSum = coords.reduce((s: number, c: number[]) => s + c[0], 0);
        const latSum = coords.reduce((s: number, c: number[]) => s + c[1], 0);
        centroid = [lngSum / coords.length, latSum / coords.length];
      }

      showPopup('mandal', { ...props, lng: centroid[0], lat: centroid[1] }, centroid);
    });

    m.on('mouseenter', 'mandal-fill', () => { m.getCanvas().style.cursor = 'pointer'; });
    m.on('mouseleave', 'mandal-fill', () => { m.getCanvas().style.cursor = ''; });
  }

  // ── Village click ──
  m.on('click', 'village-markers', (e) => {
    if (!e.features || !e.features[0]) return;
    const props = e.features[0].properties as Record<string, unknown>;
    const coords = (e.features[0].geometry as { coordinates: number[] }).coordinates.slice() as [number, number];

    showPopup('village', { ...props, lng: coords[0], lat: coords[1] }, coords);
  });

  // ── Cluster click (zoom into cluster instead of showing popup) ──
  m.on('click', 'village-clusters', (e) => {
    if (!e.features || !e.features[0]) return;
    const clusterId = e.features[0].properties?.cluster_id as number;
    const villagesSource = m.getSource('villages') as maplibregl.GeoJSONSource;
    if (villagesSource && clusterId !== undefined) {
      villagesSource.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) return;
        const coords = (e.features![0].geometry as { coordinates: number[] }).coordinates.slice() as [number, number];
        m.easeTo({ center: coords, zoom: zoom + 1, duration: 500 });
      });
    }
  });

  // ── Village hover effects ──
  m.on('mouseenter', 'village-markers', () => { m.getCanvas().style.cursor = 'pointer'; });
  m.on('mouseleave', 'village-markers', () => { m.getCanvas().style.cursor = ''; });
}
