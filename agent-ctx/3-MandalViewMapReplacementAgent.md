# Task 3: MandalView Map Replacement Agent

## Task
Replace SVG maps in MandalView.tsx with ProjectMap component

## Work Summary
- Removed all SVG map code from MandalView.tsx (MANDAL_GEOJSON, GODAVARI_PATH, helper functions, useMemo hooks, tooltip/hover states)
- Replaced both SVG maps with ProjectMap component instances
- MODE 1 (Overview): ProjectMap with center=[81.44, 17.18], zoom=9.5, all features enabled
- MODE 2 (Detail): ProjectMap with mandal-specific center, zoom=11, highlightMandalVillages=true, selectedMandalCode set
- Kept all non-map sections intact (headers, cards, charts, lists, export)
- File reduced from 999 to ~460 lines
- ESLint clean, dev server running
