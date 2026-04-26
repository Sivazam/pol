# Task 9-a: Map Improvements Agent

## Summary
Improved map features across MapView.tsx and ProjectMap.tsx:

### Changes Made
1. **MapView.tsx**: Removed duplicate `{/* Map Container */}` comment (line 876), keeping only the descriptive comment
2. **ProjectMap.tsx - Reliability**: Added `preserveDrawingBuffer: true`, ResizeObserver on containerRef, `map.resize()` after load and theme change
3. **ProjectMap.tsx - Double listener fix**: Created `removeInteractions()` function, called before `wireInteractions()` in theme change handler
4. **ProjectMap.tsx - centerMarker prop**: Added CenterMarker interface, centerMarker prop, useEffect to add/update center-marker source with 3 layers (ring, dot, label)
5. **ProjectMap.tsx - Loading UX**: Replaced spinner with map outline skeleton + animated shimmer stripes
6. **globals.css**: Added `map-skeleton-shimmer` CSS class and `mapShimmerStripe` keyframe with dark mode support

### Files Modified
- `/src/components/map/MapView.tsx` - Removed duplicate comment
- `/src/components/map/ProjectMap.tsx` - All 5 improvements
- `/src/app/globals.css` - New shimmer CSS

### Lint Status
- 0 errors, 0 warnings
