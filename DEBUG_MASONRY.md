# Masonry Debug Analysis

## Current Setup
- **Breakpoints**: 
  - < 640px: 2 cols
  - < 768px: 3 cols  
  - < 1024px: 4 cols
  - < 1280px: 5 cols
  - >= 1280px: 6 cols (max)

## Screenshot Analysis
- **Visible columns**: 5
- **Right side**: Empty space
- **Left columns**: Full
- **Right column**: Fewer items

## Hypothesis

### 1. Container Width Issue ❌
Container ref gets `clientWidth` which is content width (excludes padding).
Parent has `px-3 md:px-6` but ref is on child with `width: 100%`.
→ Width calculation should be correct.

### 2. Column Overflow ✅ LIKELY
If screen is ~1280-1400px:
- Gets 5-6 columns
- Each column width = (1280 - 5*16) / 6 = ~200px
- But with 5 cols actual: (1280 - 4*16) / 5 = ~243px
- Items placed at x = col * (243 + 16) 
- Last column at x = 4 * 259 = 1036px
- Last item right edge = 1036 + 243 = 1279px ✅ fits
- BUT if container is actually wider (e.g. 1400px with padding)
  - Calculation uses 1400px
  - But CSS container is constrained
  - Items overflow!

### 3. Virtual Scrolling Cut Off ✅ POSSIBLE
Virtual scrolling filters by Y position but not X.
If items are placed beyond visible X, they still render.

### 4. Gap Mismatch ❌
Gap is hardcoded 16px in calculation.
No CSS gap applied - using absolute positioning.
→ Should be consistent.

## Recommended Fix

**Add container max-width constraint:**
```tsx
<div 
  ref={containerRef}
  style={{
    maxWidth: "100%",  // Ensure doesn't overflow parent
    width: "100%"
  }}
>
```

**Or: Measure parent instead of child:**
```tsx
const updateLayout = async (width: number) => {
  // Subtract padding from parent
  const paddingX = /* calculate based on breakpoint */;
  const actualWidth = width - paddingX;
  setContainerWidth(actualWidth);
};
```

## Action Items
1. [ ] Add console.log to see actual containerWidth value
2. [ ] Check if containerWidth > actual available space
3. [ ] Verify column count at current width
4. [ ] Test with explicit max-width
