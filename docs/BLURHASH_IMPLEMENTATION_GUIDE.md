# BlurHash Implementation Guide

## Overview

BlurHash is now integrated into the gallery system to provide instant image placeholders while images load. This improves perceived performance and provides a better user experience.

## What is BlurHash?

BlurHash is a compact representation of a placeholder for an image. It:
- Encodes an image into a ~20 character string
- Decodes instantly on the client into a blurred placeholder
- Provides smooth loading transitions
- Improves perceived performance significantly

## Implementation

### 1. Database Schema

A `blur_hash` column has been added to the `gallery_images` table:

```sql
ALTER TABLE gallery_images
ADD COLUMN blur_hash TEXT;

CREATE INDEX idx_gallery_images_blur_hash_present
ON gallery_images(id)
WHERE blur_hash IS NOT NULL;
```

### 2. Server Actions

**Generate BlurHash**: [`app/actions/blurhash-actions.ts`](../app/actions/blurhash-actions.ts)

- `generateBlurHashFromUrl(imageUrl)` - Generate BlurHash from image URL
- `updateImageBlurHash(imageId, imageUrl)` - Update single image
- `batchUpdateGalleryBlurHashes(galleryId)` - Batch update for gallery

### 3. Client Components

**React Hook**: [`components/gallery/use-blurhash.ts`](../components/gallery/use-blurhash.ts)

```tsx
import { useBlurHash } from "@/components/gallery/use-blurhash";

// In your component
const blurHashDataUrl = useBlurHash(image.blur_hash, 32, 32, 1);
```

**Image Tile Component**: [`components/contracts/gallery/gallery-image-tile.tsx`](../components/contracts/gallery/gallery-image-tile.tsx)

This component handles BlurHash rendering automatically. It:
- Shows BlurHash placeholder while loading
- Fades to actual image when loaded
- Falls back to gradient skeleton if no BlurHash

### 4. Type Definitions

The `GalleryImage` type has been updated to include `blur_hash`:

```typescript
export interface GalleryImage {
  // ... other fields
  blur_hash?: string | null;
}
```

## Backfilling Existing Images

Run the backfill script to generate BlurHash for existing images:

```bash
# All galleries
node scripts/backfill-blurhash.mjs

# Single gallery
node scripts/backfill-blurhash.mjs <gallery-id>

# Limit number of images
node scripts/backfill-blurhash.mjs --limit 100
```

**Script features:**
- Processes images in order
- Uses thumbnails for faster processing
- Rate-limited to avoid API throttling
- Detailed progress logging
- Error handling per image

## New Gallery Creation

For new galleries, you can generate BlurHash:

1. **Manual approach**: Run backfill script after creating gallery
2. **Automated approach**: Add BlurHash generation to upload flow (future enhancement)

## Performance Considerations

- **Generation**: ~100-200ms per image (using thumbnail)
- **Decoding**: ~1-5ms per image (client-side)
- **Size**: ~20 characters per BlurHash
- **Rate limiting**: 100ms delay between requests in backfill script

## Best Practices

1. **Always use thumbnails** for BlurHash generation (faster, smaller)
2. **4x3 components** is optimal for quality/size tradeoff
3. **32x32 pixels** for encoding is sufficient
4. **Batch processing** during off-peak hours for large galleries
5. **Monitor errors** in backfill logs and retry failed images

## Troubleshooting

### BlurHash not showing

1. Check if `blur_hash` field is populated in database
2. Verify BlurHash string is valid (not null/empty)
3. Check browser console for decode errors

### Backfill errors

Common errors and solutions:

- **"Failed to fetch image"**: Check image URL is accessible
- **"Sharp error"**: Image file may be corrupted
- **"Rate limited"**: Increase delay between requests
- **"Memory error"**: Process fewer images at once (use --limit)

### Performance issues

If BlurHash decode is slow:

1. Reduce decode size (e.g., 16x16 instead of 32x32)
2. Use synchronous version sparingly
3. Memoize BlurHash data URLs

## Future Enhancements

- [ ] Auto-generate BlurHash on image upload
- [ ] Progressive BlurHash (multiple quality levels)
- [ ] BlurHash in image viewer lightbox
- [ ] BlurHash in admin gallery editor
- [ ] BlurHash for cover images

## References

- [BlurHash GitHub](https://github.com/woltapp/blurhash)
- [BlurHash npm package](https://www.npmjs.com/package/blurhash)
- [Sharp image processing](https://sharp.pixelplumbing.com/)
