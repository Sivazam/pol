# Task 2 - Geographic Coordinates Fix Agent

## Summary
Fixed ALL geographic coordinates in the Polavaram Irrigation Project management system to match real-world geography.

## Files Modified
1. `prisma/seed.ts` - Updated MANDALS (3) and VILLAGES (30) with correct lat/lng
2. `src/app/api/map/route.ts` - Updated mandal polygons, river path, dam location, map center
3. `public/geojson/godavari.geojson` - Updated Godavari River path
4. `public/geojson/mandals.geojson` - Updated mandal polygons with real names
5. `src/components/dashboard/DashboardView.tsx` - Updated map center/zoom/bounds
6. `src/components/map/ProjectMap.tsx` - Updated default center and fallback centroid
7. `src/components/relocation/RelocationView.tsx` - Updated map center/zoom/bounds
8. `src/components/village/VillageView.tsx` - Updated map center/zoom/bounds
9. `src/components/mandal/MandalView.tsx` - Updated map center and fallback coordinates

## Key Changes
- VR Puram: 17.230°N, 81.460°E → 17.566°N, 81.298°E
- Chintoor: 17.185°N, 81.390°E → 17.750°N, 81.400°E
- Kunavaram: 17.110°N, 81.320°E → 17.583°N, 81.267°E
- Polavaram Dam: 81.40°E, 17.15°N → 81.65°E, 17.25°N
- Map center: [81.44, 17.18] → [81.32, 17.63]

## Verification
- Database re-seeded: 13,961 families, 36,293 members, 4,593 plots
- API /api/mandals returns correct coordinates
- API /api/map returns correct center, dam, river, and features
- ESLint: 0 errors
- Dev server: running

