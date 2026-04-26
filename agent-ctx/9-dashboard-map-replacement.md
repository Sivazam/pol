# Task 9 - DashboardView Map Replacement Agent

## Task
Replace SVG map in DashboardView.tsx with ProjectMap component and fix data accuracy issues.

## What Was Done

### 1. SVG Map → ProjectMap Replacement
- Removed all hardcoded map data: MANDAL_GEOJSON, GODAVARI_PATH, DISTRICT_BOUNDARY, MAP_BOUNDS, SVG_W, SVG_H, MAP_PAD
- Removed all SVG helper functions: project(), polygonToSvgPath(), pathToSvgLine(), getCentroid()
- Removed SVG-related useMemo hooks: mandalPaths, districtPath, riverPath, damPoint, mandalCentroids
- Removed mandalColorMap variable and hoveredMandal state
- Removed entire `<svg>` block and hover info panel from the map section
- Added `<ProjectMap>` component with proper props and click handlers

### 2. Data Accuracy Fixes
- **Counter card trends**: Removed fake trend indicators (`+12 this week`, `+8 this week`, etc.), set trend to empty string, badge only renders when trend is non-empty
- **Timestamp**: Replaced "Data updated: Just now" with actual `lastUpdated` state populated from `new Date().toLocaleTimeString()` on fetch completion
- **Activity feed**: Replaced hardcoded `RECENT_ACTIVITIES` mock data with fetch from `/api/activity?limit=5`
  - Added `ACTIVITY_TYPE_CONFIG` mapping (STATUS→BadgeCheck/amber, ALLOTMENT→MapPinned/teal, REGISTRATION→ClipboardCheck/emerald)
  - Added `formatRelativeTime()` helper for ISO timestamp → relative time conversion
  - Added empty state handling

### 3. Cleanup
- Removed 12 unused lucide-react icon imports
- Removed unused `goBack` store subscription
- Added `navigateToVillage` import from store for ProjectMap callback

## Files Modified
- `/home/z/my-project/src/components/dashboard/DashboardView.tsx` — Complete rewrite of map section + data accuracy fixes
- `/home/z/my-project/worklog.md` — Added task 9 work log entry

## Verification
- ESLint: 0 errors
- Dev server: Running on port 3000, all APIs returning 200
- All GeoJSON endpoints working: /api/geojson/mandals, /api/geojson/villages, /api/geojson/river
- Activity API: /api/activity?limit=5 returning proper data
