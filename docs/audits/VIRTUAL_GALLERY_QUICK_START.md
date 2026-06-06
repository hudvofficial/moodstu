# Virtual Gallery Quick Start

## What Changed?

The gallery now uses **TanStack Virtual** for rendering. This means:

- ✅ Only **15-20 images** are in the DOM at any time (instead of 100-400)
- ✅ **95% less DOM nodes** = faster scrolling and lower memory usage
- ✅ **No layout shifts** because we use DB dimensions (`width`, `height`)
- ✅ **All features preserved** (selection, watermark, etc.)

---

## For Developers

### Main Files

1. **`components/contracts/gallery/use-masonry-virtual.ts`** (NEW)
   - Hook that handles virtual scrolling + masonry layout
   - Uses `useVirtualizer` from `@tanstack/react-virtual`
   - Distributes images across columns (shortest column algorithm)

2. **`components/contracts/gallery/gallery-image-grid.tsx`** (UPDATED)
   - Renders the masonry grid
   - Uses `useMasonryVirtual` hook
   - Exact same UI/UX as before

3. **`components/contracts/gallery/gallery-image-grid-index.tsx`** (NO CHANGE)
   - Feature flag wrapper
   - Points to our virtualized implementation

### Key Concepts

#### 1. Column Distribution
Images are distributed across multiple columns using the "shortest column" algorithm:

```typescript
// Find shortest column
const targetColumn = columns.reduce((shortest, col, idx) =>
  col.height < columns[shortest].height ? idx : shortest
, 0);

// Add item to shortest column
columns[targetColumn].items.push({ group, globalIndex });
columns[targetColumn].height += estimatedHeight;
```

#### 2. Row-Based Virtualization
We virtualize by "row index" (not item index):

```
Before:              After (virtualized):
┌─────┬─────┬─────┐  ┌─────┬─────┬─────┐
│ 0   │ 1   │ 2   │  │ 0   │ 1   │ 2   │ ← Row 0 (visible)
├─────┼─────┼─────┤  ├─────┼─────┼─────┤
│ 3   │ 4   │ 5   │  │ 3   │ 4   │ 5   │ ← Row 1 (visible)
├─────┼─────┼─────┤  ├─────┼─────┼─────┤
│ 6   │ 7   │ 8   │  │ ... │ ... │ ... │ ← Row 2 (virtualized out)
├─────┼─────┼─────┤  └─────┴─────┴─────┘
│ ... │ ... │ ... │
└─────┴─────┴─────┘

ALL 400 items in DOM   Only ~18 items in DOM
```

#### 3. Dynamic Height Estimation
Each row's height is estimated by finding the tallest item in that row:

```typescript
estimateSize: (index) => {
  let maxHeight = 0;
  columnGroups.forEach(column => {
    const item = column.items[index];
    if (item) {
      const ratio = dbRatio || aspectRatios[item.group.fileGroup] || DEFAULT_ASPECT_RATIO;
      const estimatedHeight = columnWidth / Math.max(ratio, 0.25);
      maxHeight = Math.max(maxHeight, estimatedHeight);
    }
  });
  return maxHeight > 0 ? maxHeight + gutter : 300;
}
```

---

## Debugging

### Check Virtual Stats (Dev Mode Only)

In development, you'll see stats at the bottom of the gallery:

```
🚀 Virtual: Rendering 18/423 images (405 virtualized out, 6 visible rows)
```

This tells you:
- **18** = DOM nodes currently rendered
- **423** = Total images in gallery
- **405** = Images virtualized out (not in DOM)
- **6** = Visible rows

### Common Issues

#### Issue: Images not loading
**Solution**: Check that `width` and `height` are in the database:

```sql
SELECT id, file_name, width, height FROM gallery_images WHERE gallery_id = 'xxx';
```

If missing, run the backfill script:
```bash
node scripts/backfill-dimensions-sharp.mjs <gallery-id>
```

#### Issue: Layout shifts
**Solution**: Ensure DB dimensions are accurate. The hook uses `img.width / img.height` to calculate aspect ratios.

#### Issue: Scroll feels jumpy
**Solution**: Check that `estimateSize` is returning accurate heights. The closer the estimate to actual height, the smoother the scroll.

---

## Performance Monitoring

### Before Virtual (Incremental Loading)
```
DOM nodes: 100 → 150 → 200 → ... → 400
Memory: Increases with scroll
FPS: Drops as more images load
```

### After Virtual
```
DOM nodes: 15-20 (constant)
Memory: Constant
FPS: Smooth 60fps
```

### How to Measure

1. Open DevTools → Performance
2. Start recording
3. Scroll through gallery
4. Stop recording
5. Check:
   - **DOM nodes**: Should stay ~15-20
   - **FPS**: Should be 60fps
   - **Memory**: Should be constant

---

## Migration Notes

### If you need to revert
Change `gallery-image-grid-index.tsx`:
```typescript
// Revert to old incremental loading:
import GalleryImageGrid from "./gallery-image-grid";  // Old non-virtual version
export default GalleryImageGrid;
```

But don't do this! Virtual is better. 😄

---

## Next Steps

### Future Optimizations

1. **Preload adjacent images**: Load images in adjacent rows before they enter viewport
2. **Progressive JPEG**: Load low-quality image first, then high-quality
3. **WebP/AVIF**: Use modern image formats for smaller file sizes
4. **Image CDN**: Use a CDN with automatic resizing (e.g., Cloudinary, imgix)

### Already Optimized ✅

- DB dimensions (prevents layout shifts)
- BlurHash placeholders (instant feedback)
- Network-aware loading (adjusts for slow connections)
- Responsive thumbnails (DPR-aware)
- Content visibility (off-screen rendering optimization)
- Debounced resize (prevents thrashing)

---

## References

- [TanStack Virtual Docs](https://tanstack.com/virtual/latest)
- [Implementation Details](./TANSTACK_VIRTUAL_IMPLEMENTATION.md)
- [Virtual Scrolling Guide](./docs/VIRTUAL_SCROLLING_GUIDE.md)

---

**Questions?** Check the full implementation doc: `TANSTACK_VIRTUAL_IMPLEMENTATION.md`
