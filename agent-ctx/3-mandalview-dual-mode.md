---
Task ID: 3
Agent: MandalView Dual-Mode Rewrite Agent
Task: Rewrite MandalView to support two modes (no-mandal-selected overview and mandal-selected detail view) using ViewLayout

Work Log:
- Read worklog.md to understand project context and previous work
- Read existing MandalView.tsx (667 lines) with full mandal detail view including villages, SVG map, SES charts, export
- Read ViewLayout.tsx shared component for wrapper props (navTitle, navTitleColor, accentDotColor, etc.)
- Read store.ts for navigation methods (navigateToMandal, navigateToVillage, goBack)
- Read constants.ts for SES_STATUS_CONFIG, MANDAL_COLORS
- Read /api/mandals/route.ts to confirm data shape - found it was missing villageCount
- Read DashboardView.tsx for reference SVG map code for all-mandals overview map

Changes Made:

1. Updated /api/mandals/route.ts:
   - Added `villageCount: villageIds.length` to the API response
   - This was needed for the mandal cards in overview mode to show village count

2. Rewrote /src/components/mandal/MandalView.tsx with two modes:

   MODE 1: No mandal selected (selectedMandalId is null):
   - Removed the redirect `if (!selectedMandalId) setView('dashboard')`
   - Fetches all mandals from /api/mandals
   - Shows header section with "All Mandals" title and project-wide stats (total families, villages, first scheme)
   - Shows SVG map of all mandals with interactive polygon zones (reused from Dashboard map)
     - Mandal polygons with hover effects (fill opacity increase, stroke width increase)
     - Godavari river path with animation
     - Dam marker with pulse
     - Legend box
     - Hover info panel below map with "Explore" button
     - Click to navigate to mandal detail
   - Shows 3-column grid of mandal cards (1 col mobile, 2 md, 3 lg)
     - Each card: name, nameTelugu, stats row (families, villages, first scheme), SES mini bars, "View details" link
     - Border-left-4 with mandal accent color
     - Framer Motion staggered animations
   - Shows project-wide SES status breakdown with animated progress bars
   - All wrapped in ViewLayout with navTitle="ALL MANDALS", navTitleColor="#D97706", accentDotColor="#D97706"

   MODE 2: Mandal selected (selectedMandalId is set):
   - Kept all existing detail view functionality intact
   - Removed duplicate layout elements: SidebarNav, tricolor-bar, top navy nav, Breadcrumb, GovFooter
   - Wrapped content in ViewLayout with dynamic navTitle=mandalName, navTitleColor=accentColor, accentDotColor=accentColor
   - Preserved: village SVG map with GeoJSON boundary, village list, SES composition chart, SES breakdown, summary card, export button

3. Loading state refactored:
   - Replaced `loading`/`setLoading` boolean with derived loading state
   - Uses `loadedMandalId` to track which mandal's data is currently loaded
   - Uses `mandalsLoaded` to track if all-mandals data is ready
   - `loading = selectedMandalId ? loadedMandalId !== selectedMandalId : !mandalsLoaded`
   - This avoids calling setState in effect body (lint error)

4. Removed imports that are no longer needed:
   - SidebarNav, MobileMenuButton, GlobalSearch, ThemeToggle, Breadcrumb, GovFooter
   - These are all handled by ViewLayout

5. Added new imports:
   - ViewLayout from @/components/shared/ViewLayout
   - Building2, Landmark from lucide-react (for overview mode icons)
   - Removed ChevronLeft, Activity (handled by ViewLayout)

Lint Results:
- `bun run lint` passes with zero errors
- Dev server compiles successfully

Stage Summary:
- MandalView now supports two modes: all-mandals overview and mandal detail
- No-mandal-selected mode shows interactive map + mandal cards grid + project-wide SES stats
- Mandal-selected mode shows the full detail view with village map, list, charts, and export
- Both modes use ViewLayout wrapper for consistent layout (sidebar, tricolor, nav, breadcrumb, footer)
- Dynamic ViewLayout props change based on selected mandal (navTitle, navTitleColor, accentDotColor)
- All existing mandal detail functionality preserved
- API updated to include villageCount
- Zero lint errors
