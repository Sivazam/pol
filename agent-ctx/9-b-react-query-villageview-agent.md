# Task 9-b: React Query + VillageView Enhancement Agent

## Work Completed

### Part 1: React Query Provider
1. **Created `/src/lib/query-provider.tsx`**: Client component wrapping `QueryClientProvider` with `QueryClient` configured with:
   - `staleTime: 60 * 1000` (1 minute)
   - `refetchOnWindowFocus: false`
   - `retry: 1`
   - Uses `useState` to avoid recreating `QueryClient` on re-renders

2. **Created `/src/hooks/use-queries.ts`**: Custom React Query hooks:
   - `useStats()` — fetches `/api/stats` with typed response
   - `useMandals()` — fetches `/api/mandals` with typed response including statusBreakdown
   - `useVillages(mandalId?)` — fetches `/api/villages` with optional mandalId filter, with `enabled` guard
   - `useActivity(params?)` — fetches `/api/activity` with type/limit/mandalCode params via URLSearchParams
   - All hooks use a shared `fetchJson<T>()` helper

3. **Modified `/src/app/layout.tsx`**: Added `QueryProvider` import and wrapped `{children}` + `<ThemeProvider>` inside `<QueryProvider>` in the layout body

### Part 2: VillageView Mini-Map Enhancement
4. **Modified `/src/components/village/VillageView.tsx`**:
   - Added `import ProjectMap from '@/components/map/ProjectMap'`
   - Added "Village Location Map" section in Village Detail mode, after Quick Stats row and before Demographics section
   - Map uses `center={[village?.longitude ?? 81.44, village?.latitude ?? 17.18]}` and `zoom={12}`
   - Compact height of 250px with `showMandals`, `showVillages`, `showVillagePolygons`, `showRiver`, `showDam`, `showControls` enabled
   - `showLegend` and `showLayerToggles` disabled for compact view
   - Caption below map shows village name and mandal with `MapPin` icon
   - Full dark mode support via `dark:` classes

## Verification
- ESLint passes with 0 errors
- Dev server running successfully with no compilation errors
- All API routes returning 200

## Files Created
- `/src/lib/query-provider.tsx`
- `/src/hooks/use-queries.ts`

## Files Modified
- `/src/app/layout.tsx`
- `/src/components/village/VillageView.tsx`
