# Phase 01: RAW Filter (Server)
Status: ⬜ Pending
Dependencies: None

## Objective
Ẩn file RAW (.ARW, .CR2, .NEF...) khỏi gallery public. Admin vẫn thấy full.

## Files to Modify
- `app/actions/gallery-actions.ts`

## Implementation Steps
1. [ ] Thêm `RAW_EXTENSIONS` regex constant
2. [ ] Thêm `filterRawFiles()` helper function
3. [ ] Wrap trong `getPublicGallery()` L231
4. [ ] Wrap trong `verifyGalleryPassword()` L259

## Code
```typescript
const RAW_EXTENSIONS = /\.(arw|cr2|cr3|nef|raf|dng|rw2|orf|pef)$/i;
function filterRawFiles(images: any[]) {
  return images.filter(img => !RAW_EXTENSIONS.test(img.file_name || ""));
}

// L231: const images = filterRawFiles(await fetchAllGalleryImages(supabase, data.id));
// L259: const images = filterRawFiles(await fetchAllGalleryImages(supabase, data.id));
```

## Test Criteria
- [ ] Gallery public không hiện file .ARW
- [ ] Admin gallery vẫn hiện đầy đủ

---
Next Phase: phase-02-frontend.md
