# Task 1: Fix Sidebar/Updates Scroll Section Overlap

## Summary
Fixed the overlap between the desktop sidebar and the notification banner, added proper sidebar offset padding, made notification banner dismiss persistent via store, and corrected misleading counter label.

## Changes Made

### 1. `/src/lib/store.ts`
- Added `notificationBannerVisible: boolean` (default: true) to AppState
- Added `setNotificationBannerVisible: (val: boolean) => void` setter
- This allows sidebar to react to banner visibility changes

### 2. `/src/components/shared/SidebarNav.tsx`
- Read `notificationBannerVisible` from store
- Calculate `bannerActive = notificationBannerVisible && view === 'dashboard'`
- Set sidebar top dynamically: `style={{ top: bannerActive ? 95 : 59 }}`
- Removed hardcoded `top-[59px]` class
- Sidebar smoothly transitions between positions via existing `transition-all duration-300`

### 3. `/src/components/shared/ViewLayout.tsx`
- Added `lg:pl-[52px]` to sticky nav container div
- This offsets both nav bar and NotificationBanner from sidebar

### 4. `/src/components/shared/NotificationBanner.tsx`
- Replaced local `useState(true)` with `notificationBannerVisible` from Zustand store
- Dismiss calls `setNotificationBannerVisible(false)` instead of local setter
- Banner state now persists across navigation within session

### 5. `/src/components/dashboard/DashboardView.tsx`
- Changed "Plots Allotted" label to "Families Resettled" (value = plotsAllotted + plotsPossessionGiven)
- Updated tooltip description for accuracy

### 6. Verified
- GovFooter already has `lg:pl-[52px]` ✓
- Constants: totalFamilies=13961, firstSchemeEligibleMembers=9663, totalMandals=3, totalVillages=30 ✓

## Lint
- Zero errors
