# Task 5: FamilyView Dual-Mode Rewrite

## Summary
Rewrote `/home/z/my-project/src/components/family/FamilyView.tsx` to support two modes:
1. **No family selected** → searchable/paginated grid of all families
2. **Family selected** → detailed family view with members, timeline, etc.

## Key Changes
- Removed redirect to dashboard when no family is selected
- Split into 3 components: `FamiliesListView`, `FamilyDetailView`, `FamilyView` (router)
- `FamiliesListView`: fetches all families via `/api/families?all=true`, shows card grid with search, SES filter, mandal filter, sort, pagination
- `FamilyDetailView`: existing detailed view wrapped in `ViewLayout`
- Both modes use `ViewLayout` wrapper (removes duplicate SidebarNav, tricolor-bar, top nav, Breadcrumb, GovFooter)
- Family cards show: PDF badge, head name, village, mandal badge, SES status, member count, first scheme star
- Clicking a family card calls `navigateToFamily(f.pdfNumber, f.id)`

## Files Modified
- `/home/z/my-project/src/components/family/FamilyView.tsx` — complete rewrite

## Lint
Zero errors

## Dev Server
Compiles successfully
