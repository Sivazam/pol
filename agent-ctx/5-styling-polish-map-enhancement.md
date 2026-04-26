# Task 5: Styling Polish + Map Enhancement Agent

## Summary
Polished MapLibre GL JS map styling, added dark mode support for map popups and controls, enhanced dashboard with maxBounds, retry button, and interaction hints.

## Changes Made

### ProjectMap.tsx
- Removed duplicate built-in `NavigationControl` (was rendering alongside custom React zoom/reset buttons)
- Fixed popup HTML dark mode: replaced hardcoded light colors with `isDark`-conditional variables:
  - `bgCard`: `isDark ? '#0F172A' : '#F0F4F8'`
  - `textPrimary`: `isDark ? '#F1F5F9' : '#0F2B46'`
  - `textSecondary`: `isDark ? '#94A3B8' : '#64748B'`

### DashboardView.tsx
- Added `maxBounds={{ sw: [81.10, 17.05], ne: [81.60, 17.35] }}` to ProjectMap
- Added `AlertCircle` import from lucide-react
- Replaced plain error text with rich error state (AlertCircle icon + "Retry" button)
- Updated map hint text: `Click on mandals to explore • Scroll to zoom • Drag to pan` with MapPinned icon

### globals.css
- Added `.dark .maplibregl-map { background: #0F172A; }` for dark mode map background
- Added dark mode MapLibre popup styles: `.dark .maplibregl-popup-content`, `.dark .maplibregl-popup-tip`, `.dark .maplibregl-popup-close-button`
- Added base `.maplibregl-popup-content` styles (rounded corners, shadow, no padding)

## Verification
- ESLint: 0 errors
- Dev server: running on port 3000
- API endpoints: all returning 200
- GeoJSON endpoints: /api/geojson/mandals, /api/geojson/villages, /api/geojson/river all working
