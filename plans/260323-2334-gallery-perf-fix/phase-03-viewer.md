# Phase 03: Viewer UX (Mobile + Desktop)
Status: ⬜ Pending
Dependencies: Phase 02

## Objective
- Fix bigImageUrl load ảnh gốc 30MB+ → giới hạn 1600px
- Mobile: thêm tap zones prev/next
- Desktop: preload ảnh kế tiếp

## Files to Modify
- `components/gallery/image-viewer.tsx`

## Implementation Steps

### Fix Image Size
1. [ ] L108-112: `bigImageUrl` luôn dùng `sz=s1600`, không load ảnh gốc
```diff
-const bigImageUrl = current.image_url.includes("lh3.googleusercontent.com")
-  ? current.image_url
-  : current.thumbnail_url
-    ? current.thumbnail_url.replace(/sz=s\d+/, "sz=s1600")
-    : current.image_url;
+const bigImageUrl = current.thumbnail_url
+  ? current.thumbnail_url.replace(/sz=s\d+/, "sz=s1600")
+  : current.image_url;
```

### Mobile Tap Zones
2. [ ] Thêm invisible tap areas trái 30% / phải 30% (md:hidden)
```tsx
<div className="md:hidden absolute inset-y-0 left-0 w-[30%] z-10"
  onClick={goPrev} />
<div className="md:hidden absolute inset-y-0 right-0 w-[30%] z-10"
  onClick={goNext} />
```

### Desktop Preload
3. [ ] useEffect preload next/prev image via `<link rel="prefetch">`

## Test Criteria
- [ ] Viewer ảnh load nhanh (1600px, không 30MB+)
- [ ] Mobile: tap trái/phải chuyển ảnh
- [ ] Desktop: bấm next → ảnh hiện ngay (preloaded)

---
Next Phase: phase-04-verify.md
