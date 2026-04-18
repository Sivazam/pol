# Task 4: Globe Landing Page Component

## Summary
Created the cinematic Globe landing page component for the Polavaram Project Rehabilitation Portal.

## Files Created
- `/home/z/my-project/src/components/globe/GlobeLanding.tsx` — Main component (565 lines)
- `/home/z/my-project/src/app/page.tsx` — Updated to use GlobeLanding + store routing

## Component Architecture

### GlobeLanding (Main Export)
- Routes between `MobileGlobeView` and `DesktopGlobeView` using `useIsMobile()` hook
- Calls `useAppStore().setView('dashboard')`, `setAuthenticated(true)`, and `setGlobeAnimComplete(true)` on "Enter Portal →" click

### DesktopGlobeView (Full Cinematic Experience)
- **Star Field**: tsparticles with 150 white dots, opacity 0.4, size 0.5-1.5px, no movement
- **3D Globe**: globe.gl loaded dynamically with `ssr: false`
  - Earth texture: `earth-blue-marble.jpg` + `earth-topology.png` bump map
  - Blue atmosphere glow (#1E90FF) at altitude 0.15
  - Initial slow auto-rotation (0.5 speed)
  - **Animation Sequence**:
    1. 0-1.5s: Globe auto-rotates showing Earth
    2. 1.5s: Stop rotation, zoom to Andhra Pradesh (lat: 17.0005, lng: 81.8040, altitude: 1.5) over 3s
    3. 4.5s: Zoom further to Polavaram dam site (lat: 17.2473, lng: 81.7119, altitude: 0.8) over 3s
    4. 6.5s: Pulsing amber point at Polavaram increases altitude/size
    5. 7.5s: Title card fades in from bottom using GSAP
    6. Title → Subtitle (0.5s overlap) → Button (1s delay, with back.out bounce)
- **WebGL Fallback**: Detects WebGL availability; falls back to `GlobeFallback` if unavailable

### MobileGlobeView (Simplified)
- Same star field and globe but with simplified animation:
  - Quick zoom to Andhra Pradesh only (no double-zoom)
  - Title card appears at bottom of screen after 2.5s
  - Smaller text sizes, compact button

### GlobeFallback (WebGL Not Available)
- Static India map background with gradient overlays
- Pulsing amber marker at approximate Polavaram location
- GSAP-animated title card with same content
- Same "Enter Portal →" navigation

## Key Implementation Details
- globe.gl loaded via `dynamic(() => import('globe.gl'), { ssr: false })` to avoid SSR issues
- tsparticles initialized with `loadSlim` engine from `@tsparticles/slim`
- All timeouts cleaned up in useEffect return functions
- GSAP timeline used for title card animations with proper cleanup
- Responsive design with mobile-first approach
- Uses existing `useAppStore` for state management
- Uses existing constants from `@/lib/constants` (POLAVARAM_DAM, ANDHRA_PRADESH)

## Lint Status
✅ All ESLint checks pass (no errors or warnings)
