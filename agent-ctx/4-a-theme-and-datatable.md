# Task 4-a: Family Data Table View + Theme Toggle

## Work Log

### Feature 1: Family Data Table View

1. **Updated `/api/families/route.ts`** to support:
   - `mandalId` query parameter — filters families by mandal through their village relationship (`where.village = { mandalId }`)
   - `sortDir` parameter — supports 'asc' and 'desc' sort directions
   - `all=true` parameter — fetches all families without requiring villageId
   - Additional sort fields: `landAcres`, `memberCount`
   - Extended select to include village name, mandal name/code/color, and plot status
   - Returns `villageName`, `mandalName`, `mandalCode`, `mandalColor`, `plotStatus` fields

2. **Created `/src/components/shared/DataTableView.tsx`**:
   - Modal dialog using shadcn/ui Dialog component
   - Table with 8 columns: PDF Number, Head Name, Village, Mandal, SES Status, Land (acres), Members, Plot Status
   - Column sorting (click header to sort asc/desc) with visual sort indicators (ArrowUp/ArrowDown/ArrowUpDown)
   - Global search filter at top (searches PDF number and head name)
   - SES Status filter dropdown
   - Pagination (20 rows per page) with Previous/Next buttons and page indicator
   - Color-coded status badges matching existing SES_STATUS_CONFIG
   - Mandal column with color-coded left border using MANDAL_COLORS
   - Plot status badges using ALLOTMENT_STATUS_CONFIG
   - Export to CSV button
   - Close button (from Dialog component)
   - Navy gradient header matching portal theme
   - Light government theme styling (white bg, slate borders, navy accents)

3. **Updated DashboardView.tsx**:
   - Added `showDataTable` state
   - Added "View All Families" button below counter cards section
   - Button styled with Users icon, navy text, white bg, hover effects
   - Added DataTableView component at bottom with open/onOpenChange props

### Feature 2: Theme Toggle (Light/Dark Mode)

1. **Created `/src/components/shared/ThemeToggle.tsx`**:
   - Uses `next-themes` useTheme hook
   - Sun/Moon icon toggle button in navy header bar
   - Uses `useSyncExternalStore` for mounted state (avoids lint error with setState in effect)
   - Accessible: keyboard navigable, aria-label with dynamic text
   - 32x32px button with bg-white/10 styling to match header aesthetic
   - Shows Sun icon (amber-300) in dark mode, Moon icon (white/70) in light mode

2. **Updated `/src/app/layout.tsx`**:
   - Added `ThemeProvider` from `next-themes`
   - Configured with `attribute="class"`, `defaultTheme="light"`, `enableSystem={false}`, `disableTransitionOnChange`
   - Wraps children and Toaster

3. **Updated `/src/app/globals.css`**:
   - Added `.dark` CSS variable section with dark government theme:
     - Background: #0F172A (slate-900)
     - Cards: #1E293B (slate-800) with slate-700 borders
     - Text: F1F5F9/slate-200 for primary, 94A3B8/slate-400 for secondary
     - Primary accent: #D97706 (amber)
   - Dark mode overrides for gov-card (slate-800 bg, slate-700 borders)
   - Dark mode scrollbar styles
   - Dark mode text color overrides (text-slate-900 → F1F5F9, etc.)
   - Dark mode background overrides (bg-white → slate-800, bg-slate-50 → slate-800)
   - Navy header and tricolor bar remain unchanged in dark mode
   - Sidebar stays navy gradient in dark mode

4. **Added ThemeToggle to all 6 view header components**:
   - DashboardView.tsx — next to LIVE indicator
   - MandalView.tsx — next to LIVE indicator
   - VillageView.tsx — next to LIVE indicator
   - FamilyView.tsx — next to LIVE indicator
   - MemberView.tsx — next to LIVE indicator
   - RelocationView.tsx — next to LIVE indicator

### Lint & Build
- All lint checks pass with zero errors
- Dev server compiles successfully
- API endpoints returning 200 with correct data
- DataTableView API calls working: `/api/families?all=true&page=1&limit=20&sortBy=pdfNumber&sortDir=asc`
