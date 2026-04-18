# Task 6: RelocationView Two-Mode Rewrite

## Summary
Rewrote `/home/z/my-project/src/components/relocation/RelocationView.tsx` to support two modes:
1. **Overview dashboard** (no family selected) — plot allotment stats, mandal breakdown, searchable family list
2. **Detail view** (family selected) — existing relocation maps, arc, plot details

## Key Changes
- Replaced manual layout with `ViewLayout` wrapper (handles tricolor, navy nav, sidebar, breadcrumb, footer)
- Removed redirect when no family selected (`setView('dashboard')`) → now shows overview
- Added `RelocationOverview` component with stats cards (CountUp), mandal breakdown, search/filter, family cards
- Extracted `RelocationDetail` component from original code (takes familyId prop)
- Family cards in overview are clickable → `navigateToRelocation(family.id)`
- Dynamic ViewLayout props based on mode (title, color, maxWidth)

## Files Modified
- `src/components/relocation/RelocationView.tsx` — Complete rewrite (472 → ~430 lines, two sub-components)

## Verification
- `bun run lint` — zero errors
- Dev server compiles successfully
- API endpoints /api/stats and /api/families?all=true&limit=50 tested and returning data
