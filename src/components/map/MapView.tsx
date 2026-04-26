'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import ViewLayout from '@/components/shared/ViewLayout';
import { useTheme } from 'next-themes';
import { useAppStore } from '@/lib/store';
import {
  ChevronLeft,
  ChevronRight,
  X,
  MapPin,
  Home,
  Layers,
  BarChart3,
  Navigation,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Info,
  Users,
  LandPlot,
  CheckCircle2,
  Search,
  Ruler,
  XCircle,
  Navigation2,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────

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
    mandalStats: MandalStat[];
    totalMandals: number;
    totalVillages: number;
    center: [number, number];
    zoom: number;
  };
}

interface MandalStat {
  id: string;
  name: string;
  code: string;
  color: string;
  latitude: number;
  longitude: number;
  familyCount: number;
  villageCount: number;
  rrBreakdown: Record<string, number>;
  rrEligiblePct: number;
  firstSchemeCount: number;
  firstSchemePct: number;
  plotBreakdown: Record<string, number>;
}

// ─── Color helpers ──────────────────────────────────────────────────────

function rrEligibilityColor(pct: number): string {
  if (pct >= 75) return '#10B981';
  if (pct >= 50) return '#F59E0B';
  if (pct >= 25) return '#F97316';
  return '#EF4444';
}

// ─── Map Styles ──────────────────────────────────────────────────────────

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

// ─── MapView Component ──────────────────────────────────────────────────

export default function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const overviewContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const overviewMap = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);

  const { theme } = useTheme();
  const navigateToMandal = useAppStore((s) => s.navigateToMandal);
  const navigateToVillage = useAppStore((s) => s.navigateToVillage);

  const [mapData, setMapData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showMandals, setShowMandals] = useState(true);
  const [showVillages, setShowVillages] = useState(true);
  const [showDam, setShowDam] = useState(true);
  const [selectedMandal, setSelectedMandal] = useState<MandalStat | null>(null);
  const [hoveredVillage, setHoveredVillage] = useState<Record<string, unknown> | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapStyle, setMapStyle] = useState<string>('voyager');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string; mandalName: string; familyCount: number; sesPct: number; lng: number; lat: number }>>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Measure distance state
  const [measureMode, setMeasureMode] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<[number, number][]>([]);
  const [measureDistance, setMeasureDistance] = useState<number | null>(null);
  const measureMarkersRef = useRef<maplibregl.Marker[]>([]);
  const measureLineRef = useRef<maplibregl.GeoJSONSource | null>(null);

  // ─── Fetch map data ───────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        const res = await fetch('/api/map');
        if (!res.ok) throw new Error('Failed to fetch map data');
        const data: MapData = await res.json();
        if (!cancelled) {
          setMapData(data);
          setLoading(false);
        }
      } catch (err) {
        console.error('Map data fetch error:', err);
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, []);

  // ─── Search villages ──────────────────────────────────────────────────

  useEffect(() => {
    if (!searchQuery.trim() || !mapData) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const villageFeatures = mapData.features.filter(
      (f) => f.geometry.type === 'Point' && (f.properties as Record<string, unknown>).type !== 'dam'
    );

    const results = villageFeatures
      .map((f) => {
        const p = f.properties as Record<string, unknown>;
        const name = (p.name as string) || '';
        const mandalName = (p.mandalName as string) || '';
        if (name.toLowerCase().includes(query) || mandalName.toLowerCase().includes(query)) {
          const coords = (f.geometry.coordinates as number[]);
          return {
            id: p.id as string,
            name,
            mandalName,
            familyCount: (p.familyCount as number) || 0,
            sesPct: (p.rrEligiblePct as number) || 0,
            lng: coords[0],
            lat: coords[1],
          };
        }
        return null;
      })
      .filter(Boolean) as Array<{ id: string; name: string; mandalName: string; familyCount: number; sesPct: number; lng: number; lat: number }>;

    setSearchResults(results.slice(0, 8));
    setShowSearchDropdown(results.length > 0);
  }, [searchQuery, mapData]);

  // ─── Initialize map ──────────────────────────────────────────────────

  const initMap = useCallback(() => {
    if (!mapContainer.current || !mapData || map.current) return;

    const isDark = theme === 'dark';
    const primaryStyle = MAP_STYLES[mapStyle]?.url || (isDark
      ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
      : 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json');
    const fallbackStyle = isDark ? MAP_STYLES.osmDark.url : MAP_STYLES.osm.url;

    const mapInstance = new maplibregl.Map({
      container: mapContainer.current,
      style: primaryStyle,
      center: mapData.meta.center,
      zoom: mapData.meta.zoom,
      minZoom: 7,
      maxZoom: 15,
      attributionControl: false,
      pitch: 0,
      bearing: 0,
    });

    mapInstance.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

    mapInstance.on('load', () => {
      map.current = mapInstance;
      addSourcesAndLayers();
      setMapReady(true);
    });

    // Handle style load failure — fall back to OSM raster tiles
    let styleLoadFailed = false;
    const styleLoadTimeout = setTimeout(() => {
      if (!map.current && !styleLoadFailed) {
        styleLoadFailed = true;
        console.warn('Map style load timeout, falling back to OSM raster tiles');
        try {
          mapInstance.setStyle(fallbackStyle);
          mapInstance.on('load', () => {
            map.current = mapInstance;
            addSourcesAndLayers();
            setMapReady(true);
          });
        } catch { /* fallback failed */ }
      }
    }, 8000);

    mapInstance.on('load', () => { clearTimeout(styleLoadTimeout); });

    mapInstance.on('error', (e) => {
      const errMsg = e.error?.message || String(e.error || '');
      const isStyleError = errMsg.includes('style') && (
        errMsg.includes('Failed to fetch') ||
        errMsg.includes('Could not load') ||
        errMsg.includes('error')
      );
      if (isStyleError && !map.current && !styleLoadFailed) {
        styleLoadFailed = true;
        clearTimeout(styleLoadTimeout);
        console.warn('Map style failed, falling back to OSM raster tiles');
        try {
          mapInstance.setStyle(fallbackStyle);
          mapInstance.on('load', () => {
            map.current = mapInstance;
            addSourcesAndLayers();
            setMapReady(true);
          });
        } catch { /* fallback failed */ }
      }
    });

    return () => {
      mapInstance.remove();
      map.current = null;
    };
  }, [mapData, theme, mapStyle]);

  useEffect(() => {
    if (mapData && !map.current) {
      const cleanup = initMap();
      return () => { if (cleanup) cleanup(); };
    }
  }, [mapData, initMap]);

  // ─── Initialize overview (inset) map ─────────────────────────────────

  useEffect(() => {
    if (!overviewContainer.current || !mapData || !mapReady || overviewMap.current) return;

    const isDark = theme === 'dark';
    const styleUrl = isDark
      ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
      : 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';

    const overview = new maplibregl.Map({
      container: overviewContainer.current,
      style: styleUrl,
      center: mapData.meta.center,
      zoom: mapData.meta.zoom - 2,
      minZoom: 6,
      maxZoom: 12,
      attributionControl: false,
      interactive: false,
      pitch: 0,
      bearing: 0,
    });

    overview.on('load', () => {
      overviewMap.current = overview;

      // Add simplified mandal polygons to overview
      const mandalFeatures = mapData.features.filter(
        (f) => f.geometry.type === 'Polygon'
      );

      overview.addSource('mandals', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: mandalFeatures as unknown as GeoJSON.Feature[] },
      });

      overview.addLayer({
        id: 'mandal-fill-overview',
        type: 'fill',
        source: 'mandals',
        paint: {
          'fill-color': ['get', 'color'] as unknown as string,
          'fill-opacity': 0.25,
        },
      });

      overview.addLayer({
        id: 'mandal-border-overview',
        type: 'line',
        source: 'mandals',
        paint: {
          'line-color': ['get', 'color'] as unknown as string,
          'line-width': 1.5,
          'line-opacity': 0.6,
        },
      });

      // Add village dots
      const villageFeatures = mapData.features.filter(
        (f) => f.geometry.type === 'Point' && (f.properties as Record<string, unknown>).type !== 'dam'
      );

      overview.addSource('villages-overview', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: villageFeatures as unknown as GeoJSON.Feature[] },
      });

      overview.addLayer({
        id: 'village-dots-overview',
        type: 'circle',
        source: 'villages-overview',
        paint: {
          'circle-radius': 3.5,
          'circle-color': ['coalesce', ['get', 'mandalColor'], '#D97706'] as unknown as string,
          'circle-opacity': 0.78,
          'circle-stroke-width': 1,
          'circle-stroke-color': isDark ? '#0F172A' : '#FFFFFF',
        },
      });

      // Add viewport rectangle source
      overview.addSource('viewport', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      overview.addLayer({
        id: 'viewport-fill',
        type: 'fill',
        source: 'viewport',
        paint: {
          'fill-color': '#D97706',
          'fill-opacity': 0.1,
        },
      });

      overview.addLayer({
        id: 'viewport-border',
        type: 'line',
        source: 'viewport',
        paint: {
          'line-color': '#D97706',
          'line-width': 2,
          'line-opacity': 0.8,
          'line-dasharray': [3, 2],
        },
      });
    });

    return () => {
      overview.remove();
      overviewMap.current = null;
    };
  }, [mapData, mapReady, theme]);

  // ─── Sync overview map viewport rectangle ─────────────────────────────

  useEffect(() => {
    const m = map.current;
    const ov = overviewMap.current;
    if (!m || !ov) return;

    const updateViewport = () => {
      const bounds = m.getBounds();
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();

      const viewportGeoJSON: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [sw.lng, sw.lat],
              [ne.lng, sw.lat],
              [ne.lng, ne.lat],
              [sw.lng, ne.lat],
              [sw.lng, sw.lat],
            ]],
          },
          properties: {},
        }],
      };

      const src = ov.getSource('viewport') as maplibregl.GeoJSONSource;
      if (src) src.setData(viewportGeoJSON);
    };

    m.on('move', updateViewport);
    m.on('zoom', updateViewport);
    updateViewport();

    return () => {
      m.off('move', updateViewport);
      m.off('zoom', updateViewport);
    };
  }, [mapReady]);

  // ─── Re-style on theme change ────────────────────────────────────────

  useEffect(() => {
    if (!map.current || !mapReady) return;
    // Only auto-switch style on theme change if user hasn't manually selected a style
    // (voyager/dark are theme-linked; satellite/topo are user choices)
    if (mapStyle !== 'voyager' && mapStyle !== 'dark') return;
    
    const isDark = theme === 'dark';
    const newStyle = isDark ? 'dark' : 'voyager';
    setMapStyle(newStyle);
  }, [theme, mapReady]);

  // ─── Handle map style change ────────────────────────────────────────

  useEffect(() => {
    if (!map.current || !mapReady) return;
    const styleConfig = MAP_STYLES[mapStyle];
    if (!styleConfig) return;

    map.current.setStyle(styleConfig.url);
    map.current.once('style.load', () => {
      addSourcesAndLayers();
    });

    // Re-style overview map to match
    if (overviewMap.current) {
      const isDark = mapStyle === 'dark';
      const overviewStyle = isDark
        ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
        : 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';
      overviewMap.current.setStyle(overviewStyle);
    }
  }, [mapStyle]);

  // ─── Add map sources and layers ──────────────────────────────────────

  const addSourcesAndLayers = useCallback(() => {
    if (!map.current || !mapData) return;
    const m = map.current;

    // ── Mandal polygons ─────────────────────────────────────────────
    const mandalFeatures = mapData.features.filter(
      (f) => f.geometry.type === 'Polygon'
    );

    if (!m.getSource('mandals')) {
      m.addSource('mandals', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: mandalFeatures as unknown as GeoJSON.Feature[] },
      });
    }

    if (!m.getLayer('mandal-fill')) {
      m.addLayer({
        id: 'mandal-fill',
        type: 'fill',
        source: 'mandals',
        paint: {
          'fill-color': ['get', 'color'] as unknown as string,
          'fill-opacity': 0.12,
        },
      });
    }

    if (!m.getLayer('mandal-border')) {
      m.addLayer({
        id: 'mandal-border',
        type: 'line',
        source: 'mandals',
        paint: {
          'line-color': ['get', 'color'] as unknown as string,
          'line-width': 2.5,
          'line-opacity': 0.7,
          'line-dasharray': [3, 2],
        },
      });
    }

    // ── Village markers ─────────────────────────────────────────────
    const villageFeatures = mapData.features.filter(
      (f) => f.geometry.type === 'Point' &&
        (f.properties as Record<string, unknown>).type !== 'dam'
    );
    const familyCountExpression = ['to-number', ['coalesce', ['get', 'familyCount'], ['get', 'totalFamilies'], 1]];
    const rrEligibleExpression = ['to-number', ['coalesce', ['get', 'rrEligiblePct'], 0]];

    if (!m.getSource('villages')) {
      m.addSource('villages', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: villageFeatures as unknown as GeoJSON.Feature[] },
        cluster: true,
        clusterMaxZoom: 12,
        clusterRadius: 40,
      });
    }

    if (!m.getLayer('village-clusters')) {
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
    }

    if (!m.getLayer('village-cluster-count')) {
      m.addLayer({
        id: 'village-cluster-count',
        type: 'symbol',
        source: 'villages',
        filter: ['has', 'point_count'] as unknown as boolean,
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['Open Sans Bold'],
          'text-size': 12,
        },
        paint: { 'text-color': '#FFFFFF' },
      });
    }

    if (!m.getLayer('village-markers')) {
      m.addLayer({
        id: 'village-marker-halo',
        type: 'circle',
        source: 'villages',
        filter: ['!', ['has', 'point_count']] as unknown as boolean,
        paint: {
          'circle-radius': ['interpolate', ['linear'], familyCountExpression, 20, 7, 200, 9, 500, 12, 1000, 15, 1800, 18],
          'circle-color': ['coalesce', ['get', 'mandalColor'], '#0D9488'] as unknown as string,
          'circle-opacity': 0.16,
          'circle-blur': 0.35,
        },
      });

      m.addLayer({
        id: 'village-markers',
        type: 'circle',
        source: 'villages',
        filter: ['!', ['has', 'point_count']] as unknown as boolean,
        paint: {
          'circle-radius': ['interpolate', ['linear'], familyCountExpression, 20, 4.5, 200, 6.5, 500, 8.5, 1000, 11, 1800, 13],
          'circle-color': ['interpolate', ['linear'], rrEligibleExpression, 0, '#EF4444', 25, '#F97316', 50, '#F59E0B', 75, '#10B981', 100, '#059669'],
          'circle-stroke-width': 2,
          'circle-stroke-color': theme === 'dark' ? '#1E293B' : '#FFFFFF',
          'circle-opacity': 0.9,
        },
      });
    }

    if (!m.getLayer('village-labels')) {
      m.addLayer({
        id: 'village-labels',
        type: 'symbol',
        source: 'villages',
        filter: ['!', ['has', 'point_count']] as unknown as boolean,
        layout: {
          'text-field': ['get', 'name'] as unknown as string,
          'text-font': ['Open Sans Regular'],
          'text-size': 10,
          'text-offset': [0, 1.4],
          'text-anchor': 'top',
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': theme === 'dark' ? '#CBD5E1' : '#1E293B',
          'text-halo-color': theme === 'dark' ? '#0F172A' : '#FFFFFF',
          'text-halo-width': 1.5,
        },
      });
    }

    // ── Dam marker ──────────────────────────────────────────────────
    const damFeature = mapData.features.find((f) => f.properties.type === 'dam');
    if (damFeature && !m.getSource('dam')) {
      m.addSource('dam', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [damFeature] as unknown as GeoJSON.Feature[] },
      });
      m.addLayer({ id: 'dam-marker', type: 'circle', source: 'dam', paint: { 'circle-radius': 6, 'circle-color': '#DC2626', 'circle-stroke-width': 2, 'circle-stroke-color': '#FFFFFF' } });
      m.addLayer({
        id: 'dam-label', type: 'symbol', source: 'dam',
        layout: { 'text-field': 'Polavaram Dam', 'text-font': ['Open Sans Bold'], 'text-size': 11, 'text-offset': [0, 1.6], 'text-anchor': 'top' },
        paint: { 'text-color': '#DC2626', 'text-halo-color': theme === 'dark' ? '#0F172A' : '#FFFFFF', 'text-halo-width': 2 },
      });
    }

    // ── Interactions ────────────────────────────────────────────────

    m.on('click', 'mandal-fill', (e) => {
      if (measureMode) return;
      if (e.features && e.features[0]) {
        const props = e.features[0].properties as Record<string, unknown>;
        const code = props.code as string;
        const stat = mapData.meta.mandalStats.find((ms) => ms.code === code);
        if (stat) {
          setSelectedMandal(stat);
          m.flyTo({ center: [stat.longitude, stat.latitude], zoom: 11, duration: 1200, essential: true });
        }
      }
    });

    m.on('click', 'village-markers', (e) => {
      if (measureMode) return;
      if (e.features && e.features[0]) {
        const props = e.features[0].properties as Record<string, unknown>;
        const coords = (e.features[0].geometry as { coordinates: number[] }).coordinates.slice();
        const villageId = props.id as string;

        const rr = props.rrBreakdown as Record<string, number> || {};
        const totalFamilies = (props.familyCount as number) || 0;
        const sesPct = (props.rrEligiblePct as number) || 0;
        const isDark = theme === 'dark';
        const bgCard = isDark ? '#1E293B' : '#F0F4F8';
        const textPrimary = isDark ? '#F1F5F9' : '#0F2B46';
        const textSecondary = isDark ? '#94A3B8' : '#64748B';
        const borderColor = isDark ? '#334155' : '#E2E8F0';
        const btnBg = isDark ? '#D97706' : '#0F2B46';

        const popupHtml = `
          <div style="font-family: system-ui; min-width: 220px; padding: 4px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
              <div style="width:10px;height:10px;border-radius:50%;background:${props.mandalColor || '#1E3A5F'}"></div>
              <strong style="font-size:14px;color:${textPrimary}">${props.name || ''}</strong>
            </div>
            <div style="font-size:11px;color:${textSecondary};margin-bottom:8px;">${props.mandalName || ''} Mandal</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px;">
              <div style="background:${bgCard};padding:6px 8px;border-radius:6px;">
                <div style="font-size:10px;color:${textSecondary}">Families</div>
                <div style="font-size:16px;font-weight:700;color:${textPrimary}">${totalFamilies.toLocaleString()}</div>
              </div>
              <div style="background:${bgCard};padding:6px 8px;border-radius:6px;">
                <div style="font-size:10px;color:${textSecondary}">R&R Eligible</div>
                <div style="font-size:16px;font-weight:700;color:${rrEligibilityColor(sesPct)}">${sesPct}%</div>
              </div>
              <div style="background:${bgCard};padding:6px 8px;border-radius:6px;">
                <div style="font-size:10px;color:${textSecondary}">1st Scheme</div>
                <div style="font-size:16px;font-weight:700;color:#D97706">${props.firstSchemePct || 0}%</div>
              </div>
              <div style="background:${bgCard};padding:6px 8px;border-radius:6px;">
                <div style="font-size:10px;color:${textSecondary}">Plots Done</div>
                <div style="font-size:16px;font-weight:700;color:#0D9488">${props.plotAllottedPct || 0}%</div>
              </div>
            </div>
            <div style="border-top:1px solid ${borderColor};padding-top:8px;margin-bottom:6px;">
              <div style="font-size:10px;color:${textSecondary};margin-bottom:4px;">R&R Eligibility Breakdown</div>
              ${Object.entries(rr).map(([status, count]) => `
                <div style="display:flex;justify-content:space-between;font-size:11px;margin:2px 0;">
                  <span style="color:${textSecondary}">${status}</span>
                  <span style="font-weight:600;color:${textPrimary}">${count}</span>
                </div>
              `).join('')}
            </div>
            <button onclick="document.querySelector('[data-village-navigate]')?.setAttribute('data-village-id','${villageId}')"
              style="width:100%;padding:6px;background:${btnBg};color:#FFF;border:none;border-radius:6px;cursor:pointer;font-size:11px;margin-top:4px;">
              View Village Details →
            </button>
          </div>
        `;

        if (popupRef.current) popupRef.current.remove();
        popupRef.current = new maplibregl.Popup({ maxWidth: '300px', closeButton: true, offset: 12 })
          .setLngLat(coords as [number, number])
          .setHTML(popupHtml)
          .addTo(m);

        const navEl = document.querySelector('[data-village-navigate]');
        if (navEl) {
          const observer = new MutationObserver(() => {
            const vid = navEl.getAttribute('data-village-id');
            if (vid) {
              navigateToVillage(vid);
              navEl.removeAttribute('data-village-id');
            }
          });
          observer.observe(navEl, { attributes: true });
        }
      }
    });

    m.on('mouseenter', 'village-markers', () => { if (!measureMode) m.getCanvas().style.cursor = 'pointer'; });
    m.on('mouseleave', 'village-markers', () => { m.getCanvas().style.cursor = measureMode ? 'crosshair' : ''; });
    m.on('mouseenter', 'mandal-fill', () => { if (!measureMode) m.getCanvas().style.cursor = 'pointer'; });
    m.on('mouseleave', 'mandal-fill', () => { m.getCanvas().style.cursor = measureMode ? 'crosshair' : ''; });

    m.on('mousemove', 'village-markers', (e) => {
      if (e.features && e.features[0]) setHoveredVillage(e.features[0].properties as Record<string, unknown>);
    });
    m.on('mouseleave', 'village-markers', () => { setHoveredVillage(null); });

    // Click on clusters → enhanced cluster popup
    m.on('click', 'village-clusters', (e) => {
      if (measureMode) return;
      if (e.features && e.features[0]) {
        const clusterId = e.features[0].properties?.cluster_id;
        const pointCount = e.features[0].properties?.point_count as number || 0;
        const coords = (e.features[0].geometry as { coordinates: number[] }).coordinates.slice() as [number, number];
        const isDark = theme === 'dark';
        const textPrimary = isDark ? '#F1F5F9' : '#0F2B46';
        const textSecondary = isDark ? '#94A3B8' : '#64748B';
        const btnBg = isDark ? '#D97706' : '#0F2B46';

        const clusterPopupHtml = `
          <div style="font-family:system-ui;padding:10px;min-width:160px;text-align:center;">
            <div style="font-size:20px;font-weight:700;color:${textPrimary};margin-bottom:2px;">${pointCount}</div>
            <div style="font-size:11px;color:${textSecondary};margin-bottom:10px;">villages in this area</div>
            <button onclick="window.__mapViewClusterZoom && window.__mapViewClusterZoom(${clusterId})"
              style="padding:5px 14px;background:${btnBg};color:#FFF;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;">
              ⊕ Zoom In
            </button>
          </div>
        `;

        if (popupRef.current) popupRef.current.remove();
        popupRef.current = new maplibregl.Popup({ maxWidth: '220px', closeButton: true, offset: 12 })
          .setLngLat(coords)
          .setHTML(clusterPopupHtml)
          .addTo(m);

        (window as Record<string, unknown>).__mapViewClusterZoom = (cid: number) => {
          const villageSource = m.getSource('villages') as maplibregl.GeoJSONSource;
          villageSource.getClusterExpansionZoom(cid, (_err: unknown, zoom: number) => {
            if (_err) return;
            m.flyTo({ center: coords, zoom, duration: 800 });
            if (popupRef.current) popupRef.current.remove();
          });
        };
      }
    });

  }, [mapData, theme, navigateToVillage, measureMode]);

  // ─── Toggle layer visibility ────────────────────────────────────────

  useEffect(() => {
    if (!map.current || !mapReady) return;
    const m = map.current;

    const toggleLayer = (layerId: string, visible: boolean) => {
      if (m.getLayer(layerId)) {
        m.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
      }
    };

    toggleLayer('mandal-fill', showMandals);
    toggleLayer('mandal-border', showMandals);
    toggleLayer('village-clusters', showVillages);
    toggleLayer('village-cluster-count', showVillages);
    toggleLayer('village-marker-halo', showVillages);
    toggleLayer('village-markers', showVillages);
    toggleLayer('village-labels', showVillages);
    toggleLayer('dam-marker', showDam);
    toggleLayer('dam-label', showDam);
  }, [showMandals, showVillages, showDam, mapReady]);

  // ─── Measure distance tool ──────────────────────────────────────────

  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;

    if (measureMode) {
      m.getCanvas().style.cursor = 'crosshair';
    } else {
      m.getCanvas().style.cursor = '';
      // Clear measure state
      measureMarkersRef.current.forEach((marker) => marker.remove());
      measureMarkersRef.current = [];
      setMeasurePoints([]);
      setMeasureDistance(null);

      // Remove measure source/layer if exists
      if (m.getSource('measure-line')) {
        if (m.getLayer('measure-line-layer')) m.removeLayer('measure-line-layer');
        m.removeSource('measure-line');
      }
    }
  }, [measureMode, mapReady]);

  const handleMapClickForMeasure = useCallback((e: maplibregl.MapMouseEvent) => {
    if (!measureMode || !map.current) return;

    const coords: [number, number] = [e.lngLat.lng, e.lngLat.lat];
    const newPoints = [...measurePoints, coords];
    setMeasurePoints(newPoints);

    // Add marker
    const el = document.createElement('div');
    el.className = 'measure-tooltip';
    el.textContent = newPoints.length === 1 ? 'A' : 'B';
    const marker = new maplibregl.Marker({ element: el })
      .setLngLat(coords)
      .addTo(map.current);
    measureMarkersRef.current.push(marker);

    if (newPoints.length === 2) {
      // Calculate distance (Haversine formula)
      const [lon1, lat1] = newPoints[0];
      const [lon2, lat2] = newPoints[1];
      const R = 6371; // Earth radius in km
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;
      setMeasureDistance(distance);

      // Draw line
      const m = map.current;
      if (m.getSource('measure-line')) {
        if (m.getLayer('measure-line-layer')) m.removeLayer('measure-line-layer');
        m.removeSource('measure-line');
      }

      m.addSource('measure-line', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [newPoints[0], newPoints[1]],
            },
            properties: {},
          }],
        },
      });

      m.addLayer({
        id: 'measure-line-layer',
        type: 'line',
        source: 'measure-line',
        paint: {
          'line-color': '#D97706',
          'line-width': 3,
          'line-dasharray': [4, 3],
        },
      });

      // Show distance popup at midpoint
      const midLng = (lon1 + lon2) / 2;
      const midLat = (lat1 + lat2) / 2;
      const distText = distance >= 1
        ? `${distance.toFixed(2)} km`
        : `${(distance * 1000).toFixed(0)} m`;

      new maplibregl.Popup({
        closeButton: false,
        offset: 0,
        className: 'measure-distance-popup',
      })
        .setLngLat([midLng, midLat])
        .setHTML(`<div class="measure-tooltip">${distText}</div>`)
        .addTo(m);
    }
  }, [measureMode, measurePoints]);

  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;

    m.on('click', handleMapClickForMeasure);
    return () => {
      m.off('click', handleMapClickForMeasure);
    };
  }, [handleMapClickForMeasure, mapReady]);

  // ─── Reset view button ──────────────────────────────────────────────

  const resetView = () => {
    if (!map.current || !mapData) return;
    setSelectedMandal(null);
    map.current.flyTo({
      center: mapData.meta.center,
      zoom: mapData.meta.zoom,
      duration: 1200,
      essential: true,
    });
  };

  // ─── Navigate to selected mandal ─────────────────────────────────────

  const handleNavigateToMandal = () => {
    if (selectedMandal) {
      navigateToMandal(selectedMandal.id);
    }
  };

  // ─── Loading skeleton ────────────────────────────────────────────────

  if (loading) {
    return (
      <ViewLayout navTitle="PROJECT AREA MAP" navTitleColor="#D97706" accentDotColor="#10B981" hideBreadcrumb>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="w-full h-[70vh] bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
        </div>
      </ViewLayout>
    );
  }

  return (
    <ViewLayout navTitle="PROJECT AREA MAP" navTitleColor="#D97706" accentDotColor="#10B981" hideBreadcrumb>
      <div className="relative w-full" style={{ height: 'calc(100vh - 120px)' }}>
        {/* Hidden element for village navigation */}
        <div data-village-navigate style={{ display: 'none' }} />

        {/* Map container - use inline styles to prevent MapLibre CSS from overriding position:absolute */}
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden' }}>
          <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
        </div>

        {/* ─── Top bar overlay with Search ──────────────────────────── */}
        <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none gap-2">
          <div className="pointer-events-auto flex items-center gap-2 flex-1 min-w-0">
            <button
              onClick={resetView}
              className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-lg rounded-lg px-3 py-2 flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-600 shrink-0"
            >
              <Navigation className="w-3.5 h-3.5 text-amber-600" />
              Reset
            </button>

            {/* Search bar */}
            <div className="relative flex-1 max-w-xs">
              <div className="flex items-center bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-lg rounded-lg border border-slate-200 dark:border-slate-600">
                <Search className="w-3.5 h-3.5 text-slate-400 ml-2.5 shrink-0" />
                <input
                  type="text"
                  placeholder="Search villages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => { if (searchResults.length > 0) setShowSearchDropdown(true); }}
                  onBlur={() => { setTimeout(() => setShowSearchDropdown(false), 200); }}
                  className="w-full bg-transparent px-2 py-2 text-xs text-slate-700 dark:text-slate-200 placeholder:text-slate-400 outline-none"
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(''); setSearchResults([]); setShowSearchDropdown(false); }} className="pr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Search dropdown */}
              {showSearchDropdown && searchResults.length > 0 && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-white/97 dark:bg-slate-900/97 backdrop-blur-xl shadow-2xl rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden z-50 max-h-64 overflow-y-auto">
                  {searchResults.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => {
                        map.current?.flyTo({ center: [v.lng, v.lat], zoom: 13, duration: 1000 });
                        setSearchQuery('');
                        setSearchResults([]);
                        setShowSearchDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">{v.name}</div>
                          <div className="text-[10px] text-slate-400">{v.mandalName} · {v.familyCount} families</div>
                        </div>
                        <div className="text-[10px] font-bold" style={{ color: rrEligibilityColor(v.sesPct) }}>{v.sesPct}%</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedMandal && (
              <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-lg rounded-lg px-3 py-2 flex items-center gap-2 border border-slate-200 dark:border-slate-600 shrink-0">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedMandal.color }} />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{selectedMandal.name} Mandal</span>
                <button onClick={() => setSelectedMandal(null)} className="ml-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          <div className="pointer-events-auto flex items-center gap-1.5 shrink-0">
            {/* Measure distance button */}
            <button
              onClick={() => setMeasureMode(!measureMode)}
              className={`shadow-lg rounded-lg p-2 transition-all border ${
                measureMode
                  ? 'bg-amber-500 text-white border-amber-400 shadow-amber-500/25'
                  : 'bg-white/95 dark:bg-slate-800/95 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-700'
              }`}
              aria-label="Measure distance"
              title="Measure distance"
            >
              <Ruler className="w-4 h-4" />
            </button>
            <button onClick={() => map.current?.zoomIn({ duration: 300 })} className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-lg rounded-lg p-2 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-600" aria-label="Zoom in">
              <ZoomIn className="w-4 h-4" />
            </button>
            <button onClick={() => map.current?.zoomOut({ duration: 300 })} className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-lg rounded-lg p-2 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-600" aria-label="Zoom out">
              <ZoomOut className="w-4 h-4" />
            </button>
            <button onClick={resetView} className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-lg rounded-lg p-2 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-600" aria-label="Fit bounds">
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ─── Measure mode indicator ───────────────────────────────── */}
        {measureMode && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 bg-amber-500 dark:bg-amber-600 text-white shadow-lg rounded-full px-4 py-2 flex items-center gap-3 text-xs font-semibold">
            <Ruler className="w-3.5 h-3.5" />
            <span>{measurePoints.length === 0 ? 'Click first point' : measurePoints.length === 1 ? 'Click second point' : `Distance: ${measureDistance !== null ? (measureDistance >= 1 ? `${measureDistance.toFixed(2)} km` : `${(measureDistance * 1000).toFixed(0)} m`) : 'Calculating...'}`}</span>
            <button onClick={() => setMeasureMode(false)} className="bg-white/20 hover:bg-white/30 rounded-full p-0.5 transition-colors">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* ─── Map Style Switcher (bottom-left) ──────────────────────── */}
        <div className="absolute bottom-3 left-3 z-10">
          <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-lg rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden flex">
            {Object.entries(MAP_STYLES).map(([key, style]) => (
              <button
                key={key}
                onClick={() => setMapStyle(key)}
                className={`px-2.5 py-1.5 text-[10px] font-medium transition-colors ${
                  mapStyle === key 
                    ? 'bg-[#0F2B46] text-white' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>

        {/* ─── Sidebar toggle button ───────────────────────────────── */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`absolute top-1/2 -translate-y-1/2 z-10 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-lg rounded-lg p-2 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-600 ${sidebarOpen ? 'left-[340px]' : 'left-3'}`}
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {/* ─── Sidebar Panel ───────────────────────────────────────── */}
        <div className={`absolute top-3 left-3 bottom-3 z-10 w-[330px] transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-[350px]'}`}>
          <div className="h-full bg-white/97 dark:bg-slate-900/97 backdrop-blur-xl shadow-2xl rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-[#0F2B46] to-[#1E3A5F]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-bold text-white tracking-wide" style={{ fontFamily: 'var(--font-jetbrains)' }}>MAP CONTROLS</span>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="text-white/50 hover:text-white lg:hidden">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {/* ── Quick Stats ──────────────────────────────────── */}
              {mapData && (
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 mb-3">
                    <BarChart3 className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Quick Stats</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative overflow-hidden rounded-lg border border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-amber-100/60 dark:from-amber-900/20 dark:to-amber-800/10 p-2.5">
                      <div className="h-[2px] w-full absolute top-0 left-0 bg-amber-500" />
                      <div className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">Total Mandals</div>
                      <div className="text-lg font-bold text-amber-800 dark:text-amber-300">{mapData.meta.totalMandals}</div>
                    </div>
                    <div className="relative overflow-hidden rounded-lg border border-teal-200 dark:border-teal-800 bg-gradient-to-br from-teal-50 to-teal-100/60 dark:from-teal-900/20 dark:to-teal-800/10 p-2.5">
                      <div className="h-[2px] w-full absolute top-0 left-0 bg-teal-500" />
                      <div className="text-[10px] text-teal-700 dark:text-teal-400 font-medium">Total Villages</div>
                      <div className="text-lg font-bold text-teal-800 dark:text-teal-300">{mapData.meta.totalVillages}</div>
                    </div>
                    <div className="relative overflow-hidden rounded-lg border border-[#1E3A5F]/20 dark:border-slate-600 bg-gradient-to-br from-[#0F2B46]/[0.03] to-[#1E3A5F]/[0.08] dark:from-slate-800 dark:to-slate-800/50 p-2.5">
                      <div className="h-[2px] w-full absolute top-0 left-0 bg-[#1E3A5F]" />
                      <div className="text-[10px] text-[#1E3A5F] dark:text-slate-400 font-medium">Total Families</div>
                      <div className="text-lg font-bold text-slate-800 dark:text-slate-200">{mapData.meta.mandalStats.reduce((a, m) => a + m.familyCount, 0).toLocaleString()}</div>
                    </div>
                    <div className="relative overflow-hidden rounded-lg border border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-emerald-100/60 dark:from-emerald-900/20 dark:to-emerald-800/10 p-2.5">
                      <div className="h-[2px] w-full absolute top-0 left-0 bg-emerald-500" />
                      <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">Avg R&R %</div>
                      <div className="text-lg font-bold text-emerald-800 dark:text-emerald-300">{Math.round(mapData.meta.mandalStats.reduce((a, m) => a + m.rrEligiblePct, 0) / mapData.meta.mandalStats.length)}%</div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Layer Toggles ─────────────────────────────────── */}
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5 mb-3">
                  <Layers className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Layers</span>
                </div>
                <div className="space-y-2">
                  <LayerToggle label="Mandal Boundaries" icon={<Home className="w-3.5 h-3.5" />} active={showMandals} onToggle={() => setShowMandals(!showMandals)} color="#D97706" />
                  <LayerToggle label="Village Markers" icon={<MapPin className="w-3.5 h-3.5" />} active={showVillages} onToggle={() => setShowVillages(!showVillages)} color="#10B981" />
                  <LayerToggle label="Polavaram Dam" icon={<LandPlot className="w-3.5 h-3.5" />} active={showDam} onToggle={() => setShowDam(!showDam)} color="#DC2626" />
                </div>
              </div>

              {/* ── Legend ────────────────────────────────────────── */}
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5 mb-3">
                  <Info className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Legend</span>
                </div>
                <div className="mb-3">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-1.5 font-medium">R&R Eligibility %</div>
                  <div className="flex items-center gap-1">
                    <div className="flex-1 h-3 rounded-full" style={{ background: 'linear-gradient(to right, #EF4444, #F97316, #F59E0B, #10B981, #059669)' }} />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[9px] text-slate-400">0%</span>
                    <span className="text-[9px] text-slate-400">25%</span>
                    <span className="text-[9px] text-slate-400">50%</span>
                    <span className="text-[9px] text-slate-400">75%</span>
                    <span className="text-[9px] text-slate-400">100%</span>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-1.5 font-medium">Village Size (Families)</div>
                  <div className="flex items-end gap-3 ml-2">
                    <div className="flex flex-col items-center"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white" /><span className="text-[8px] text-slate-400 mt-1">&lt;200</span></div>
                    <div className="flex flex-col items-center"><div className="w-3.5 h-3.5 rounded-full bg-emerald-500 border border-white" /><span className="text-[8px] text-slate-400 mt-1">~500</span></div>
                    <div className="flex flex-col items-center"><div className="w-5 h-5 rounded-full bg-emerald-500 border border-white" /><span className="text-[8px] text-slate-400 mt-1">~1000</span></div>
                    <div className="flex flex-col items-center"><div className="w-6 h-6 rounded-full bg-emerald-500 border border-white" /><span className="text-[8px] text-slate-400 mt-1">1800+</span></div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-600 border-2 border-white" /><span className="text-[10px] text-slate-600 dark:text-slate-400">Polavaram Dam</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 border-2 border-dashed border-amber-600 rounded" /><span className="text-[10px] text-slate-600 dark:text-slate-400">Mandal Boundary</span></div>
                </div>
              </div>

              {/* ── Mandal Cards ──────────────────────────────────── */}
              {mapData && (
                <div className="px-4 py-3">
                  <div className="flex items-center gap-1.5 mb-3">
                    <Users className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Mandals</span>
                  </div>
                  <div className="space-y-2">
                    {mapData.meta.mandalStats.map((ms) => (
                      <button
                        key={ms.code}
                        onClick={() => {
                          setSelectedMandal(ms);
                          map.current?.flyTo({ center: [ms.longitude, ms.latitude], zoom: 11, duration: 1200 });
                        }}
                        className={`w-full text-left rounded-lg p-3 transition-all border ${
                          selectedMandal?.code === ms.code
                            ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 shadow-md'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ms.color }} />
                            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{ms.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">{ms.villageCount} villages</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div><div className="text-xs font-bold text-slate-700 dark:text-slate-200">{ms.familyCount.toLocaleString()}</div><div className="text-[9px] text-slate-400">Families</div></div>
                          <div><div className="text-xs font-bold" style={{ color: rrEligibilityColor(ms.rrEligiblePct) }}>{ms.rrEligiblePct}%</div><div className="text-[9px] text-slate-400">R&R Done</div></div>
                          <div><div className="text-xs font-bold text-amber-600">{ms.firstSchemePct}%</div><div className="text-[9px] text-slate-400">1st Scheme</div></div>
                        </div>
                        <div className="mt-2 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                          {Object.entries(ms.rrBreakdown).map(([status, count]) => {
                            const pct = ms.familyCount > 0 ? (count / ms.familyCount) * 100 : 0;
                            const barColor = status === 'Eligible' ? '#16A34A' : status === 'Ineligible' ? '#DC2626' : '#94A3B8';
                            return <div key={status} style={{ width: `${pct}%`, backgroundColor: barColor }} className="h-full" title={`${status}: ${count}`} />;
                          })}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── Hovered village tooltip ────────────────────────────────── */}
        {hoveredVillage && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-lg rounded-lg px-4 py-2.5 border border-slate-200 dark:border-slate-600 pointer-events-none tooltip-animate">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: (hoveredVillage.mandalColor as string) || '#1E3A5F' }} />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{hoveredVillage.name as string}</span>
              <span className="text-xs text-slate-400">{hoveredVillage.familyCount as number} families</span>
              <span className="text-xs font-medium" style={{ color: rrEligibilityColor(hoveredVillage.rrEligiblePct as number) }}>{hoveredVillage.rrEligiblePct as number}% R&R</span>
            </div>
          </div>
        )}

        {/* ─── Selected Mandal Detail Panel ───────────────────────────── */}
        {selectedMandal && (
          <div className="absolute bottom-4 right-4 z-10 w-[280px] bg-white/97 dark:bg-slate-900/97 backdrop-blur-xl shadow-2xl rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700" style={{ backgroundColor: selectedMandal.color + '15' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedMandal.color }} />
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{selectedMandal.name} Mandal</span>
                </div>
                <button onClick={() => setSelectedMandal(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-400" />
                  <div>
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-200">{selectedMandal.familyCount.toLocaleString()}</div>
                    <div className="text-[9px] text-slate-400">Families</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <div>
                    <div className="text-xs font-bold" style={{ color: rrEligibilityColor(selectedMandal.rrEligiblePct) }}>{selectedMandal.rrEligiblePct}%</div>
                    <div className="text-[9px] text-slate-400">R&R Done</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <LandPlot className="w-4 h-4 text-amber-500" />
                  <div>
                    <div className="text-xs font-bold text-amber-600">{selectedMandal.firstSchemePct}%</div>
                    <div className="text-[9px] text-slate-400">1st Scheme</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <div>
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-200">{selectedMandal.villageCount}</div>
                    <div className="text-[9px] text-slate-400">Villages</div>
                  </div>
                </div>
              </div>

              {/* R&R breakdown bars */}
              <div className="mb-3">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-1.5 font-medium">R&R Breakdown</div>
                {Object.entries(selectedMandal.rrBreakdown).map(([status, count]) => {
                  const pct = selectedMandal.familyCount > 0 ? Math.round((count / selectedMandal.familyCount) * 100) : 0;
                  const barColor = status === 'Eligible' ? '#16A34A' : status === 'Ineligible' ? '#DC2626' : '#94A3B8';
                  return (
                    <div key={status} className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: barColor }} />
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 w-16 truncate">{status}</span>
                      <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                      </div>
                      <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-200 w-8 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>

              {/* Plot allotment breakdown */}
              <div className="mb-3">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-1.5 font-medium">Plot Allotment</div>
                {Object.entries(selectedMandal.plotBreakdown).map(([status, count]) => (
                  <div key={status} className="flex justify-between text-[10px] mb-0.5">
                    <span className="text-slate-600 dark:text-slate-400">{status}</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{count}</span>
                  </div>
                ))}
              </div>

              {/* Navigate to Mandal button */}
              <button
                onClick={handleNavigateToMandal}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#0F2B46] to-[#1E3A5F] dark:from-amber-600 dark:to-amber-700 text-white rounded-lg py-2.5 text-xs font-semibold hover:opacity-90 transition-opacity shadow-md"
              >
                <Navigation2 className="w-3.5 h-3.5" />
                Navigate to Mandal
              </button>
            </div>
          </div>
        )}

        {/* ─── Overview / Inset Map (bottom-right) ──────────────────── */}
        <div className="absolute bottom-4 right-4 z-10 overview-map-border" style={{ width: selectedMandal ? 160 : 180, height: selectedMandal ? 120 : 140 }}>
          <div className="absolute top-1 left-2 z-10 text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-white/80 dark:bg-slate-800/80 px-1.5 py-0.5 rounded">
            Overview
          </div>
          <div ref={overviewContainer} style={{ width: '100%', height: '100%' }} />
        </div>

        {/* Adjust overview position when mandal panel is open */}
        {selectedMandal && (
          <style>{`.overview-map-border { bottom: 4px !important; right: 4px !important; }`}</style>
        )}
      </div>
    </ViewLayout>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────

function LayerToggle({ label, icon, active, onToggle, color }: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onToggle: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
        active
          ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
          : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
      }`}
    >
      <div className="text-slate-400">{icon}</div>
      <div
        className="w-2.5 h-2.5 rounded-full transition-all shrink-0"
        style={{ backgroundColor: active ? color : '#CBD5E1', opacity: active ? 1 : 0.4 }}
      />
      <span className="flex-1 text-left">{label}</span>
      <span className={`text-[9px] ${active ? 'text-emerald-500' : 'text-slate-300'}`}>
        {active ? 'ON' : 'OFF'}
      </span>
    </button>
  );
}
