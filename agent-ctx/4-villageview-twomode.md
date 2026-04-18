# Task 4: VillageView Two-Mode Rewrite

## Summary
Rewrote `/home/z/my-project/src/components/village/VillageView.tsx` to support two modes:
1. **No village selected** (selectedVillageId is null): Shows a searchable/filterable grid of ALL villages across all mandals
2. **Village selected** (selectedVillageId is set): Shows the existing detailed village view with family listing

## Changes Made

### Removed redirect
- Old: `if (!selectedVillageId) setView('dashboard')` — this redirected away when no village was selected
- New: Shows the all-villages list view instead

### Layout changes
- Wrapped everything in `ViewLayout` from `@/components/shared/ViewLayout`
- Removed SidebarNav, tricolor-bar, top nav, Breadcrumb, GovFooter from inside VillageView (ViewLayout handles them)
- Removed unused imports: `GlobalSearch`, `Breadcrumb`, `GovFooter`, `SidebarNav`, `MobileMenuButton`, `ThemeToggle`

### Mode 1: All Villages List (no village selected)
- Fetches all villages from `/api/villages?all=true`
- Header card with "All Villages" title, summary stats (village count, total families, first scheme eligible) with CountUp animations
- Search input: filters by village name, Telugu name, or code
- Mandal dropdown filter: dynamically populated from fetched village data
- Results summary bar showing filtered count
- Grid of village cards (responsive: 1-4 columns) with:
  - Village name + Telugu name
  - Mandal badge (colored by mandal code: amber for VRP, teal for CHN, orange for KUN)
  - Family count and first scheme eligible count
  - SES breakdown mini bars (stacked horizontal bar with SURVEYED/VERIFIED/APPROVED/REJECTED colors)
  - Left border colored by mandal color
  - Hover effects (scale, gradient, chevron animation)
  - Clickable → calls `navigateToVillage(v.id)`
- Empty state with clear filters button
- Framer Motion staggered grid animations

### Mode 2: Village Detail (village selected)
- Preserved all existing functionality:
  - Village header card with name, Telugu, mandal badge, GPS coordinates, stat counters
  - Status breakdown mini-bars
  - 4 stat summary cards (Total Families, First Scheme Eligible, Avg Family Size, Pending Plots)
  - Search & filter bar (PDF/name search, SES status filter, sort dropdown)
  - Family count summary bar with active filter badge
  - Family cards grid with PDF badge, head name, detail chips, status badge, hover effects
  - Empty state
  - Full pagination (first/prev/page/next/last)
- All wrapped inside ViewLayout instead of manual layout

### Nav title
- Mode 1: navTitle = "ALL VILLAGES", accentDot = amber
- Mode 2: navTitle = village name (uppercase), accentDot = mandal color, navSubtitle = mandal name

### GSAP animations
- Both modes use `.anim-in` class for entrance animations
- Animation triggers on loading state change and page change

### Lint
- Zero lint errors in VillageView.tsx
- Removed unused imports (ChevronLeft, Activity, Hash, MANDAL_COLORS, goBack, setView)
- Fixed potential setState-in-effect issue (removed setVillagesLoading from effect body)
