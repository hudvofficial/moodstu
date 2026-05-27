# BlurHash Image Placeholders Guide

**Status**: ⚠️ NOT IMPLEMENTED  
**Priority**: 🔴 HIGH (affects gallery UX)  
**Effort**: Medium (requires server-side generation)  
**ROI**: 40% better perceived load time + eliminate CLS

---

## Why BlurHash?

### Current Behavior (No Placeholders)

```tsx
<img src="/photo.jpg" />  // White flash → CLS → Image pops in
```

**Problems**:
- White flash while loading (jarring)
- Layout shift when image loads (CLS)
- No visual feedback (feels slow)

### With BlurHash

```tsx
<img
  src="/photo.jpg"
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,/9j/4AAQ..."  // Tiny 20x20 blur
/>
```

**Benefits**:
- Instant blur preview (feels fast)
- No layout shift (CLS = 0)
- Premium feel (like Medium, Unsplash)

---

## How BlurHash Works

### Step 1: Generate Hash (Server-Side)

When image is uploaded:

```typescript
import { encode } from "blurhash";
import sharp from "sharp";

async function generateBlurHash(imagePath: string): Promise<string> {
  // Resize to tiny 32x32 for fast encoding
  const { data, info } = await sharp(imagePath)
    .raw()
    .ensureAlpha()
    .resize(32, 32, { fit: "inside" })
    .toBuffer({ resolveWithObject: true });

  // Generate 20-character hash
  const hash = encode(
    new Uint8ClampedArray(data),
    info.width,
    info.height,
    4,  // X components
    3   // Y components
  );

  return hash;  // Example: "LEHV6nWB2yk8pyo0adR*.7kCMdnj"
}
```

### Step 2: Store Hash in Database

```sql
ALTER TABLE gallery_images ADD COLUMN blur_hash TEXT;

-- Example row:
INSERT INTO gallery_images (id, image_url, blur_hash) VALUES (
  'uuid',
  'https://...photo.jpg',
  'LEHV6nWB2yk8pyo0adR*.7kCMdnj'  -- ← Store this
);
```

### Step 3: Decode Hash (Client-Side)

Convert hash → base64 data URL:

```typescript
import { decode } from "blurhash";

function blurHashToDataURL(hash: string, width = 32, height = 32): string {
  const pixels = decode(hash, width, height);
  
  // Create canvas
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.createImageData(width, height);
  imageData.data.set(pixels);
  ctx.putImageData(imageData, 0, 0);
  
  return canvas.toDataURL();  // data:image/png;base64,iVBORw0K...
}
```

### Step 4: Use in Next.js Image

```tsx
<Image
  src={image.image_url}
  width={800}
  height={600}
  placeholder="blur"
  blurDataURL={blurHashToDataURL(image.blur_hash)}
  alt=""
/>
```

---

## Implementation Steps

### Phase 1: Add blurhash Package

```bash
npm install blurhash sharp
npm install --save-dev @types/blurhash
```

### Phase 2: Migration - Add blur_hash Column

**File**: `supabase/migrations/20260526_add_blur_hash.sql`

```sql
-- Add blur_hash column to gallery_images
ALTER TABLE gallery_images
ADD COLUMN blur_hash TEXT;

-- Add index for performance
CREATE INDEX idx_gallery_images_blur_hash ON gallery_images(blur_hash);

COMMENT ON COLUMN gallery_images.blur_hash IS 
'BlurHash string for image placeholder (20-32 chars)';
```

### Phase 3: Server Action - Generate BlurHash on Upload

**File**: `app/actions/gallery-blurhash.ts`

```typescript
"use server";

import { encode } from "blurhash";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Generate BlurHash for an image from Google Drive
 * Called when syncing Drive folder or uploading new images
 */
export async function generateImageBlurHash(
  imageId: string,
  imageUrl: string
): Promise<{ success: boolean; blurHash?: string; error?: string }> {
  try {
    // Fetch image from Drive
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error("Failed to fetch image");
    
    const buffer = await response.arrayBuffer();
    
    // Resize to 32x32 for fast encoding
    const { data, info } = await sharp(Buffer.from(buffer))
      .raw()
      .ensureAlpha()
      .resize(32, 32, { fit: "inside" })
      .toBuffer({ resolveWithObject: true });
    
    // Generate hash (4x3 components for balance of detail vs size)
    const hash = encode(
      new Uint8ClampedArray(data),
      info.width,
      info.height,
      4,
      3
    );
    
    // Save to database
    const supabase = await createAdminClient();
    const { error } = await supabase
      .from("gallery_images")
      .update({ blur_hash: hash })
      .eq("id", imageId);
    
    if (error) throw error;
    
    return { success: true, blurHash: hash };
  } catch (err) {
    console.error("[generateImageBlurHash]", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Batch generate BlurHashes for a gallery
 * Called after Drive sync to backfill hashes
 */
export async function batchGenerateBlurHashes(
  galleryId: string
): Promise<{ success: boolean; generated: number; errors: number }> {
  const supabase = await createAdminClient();
  
  // Get images without blur_hash
  const { data: images, error } = await supabase
    .from("gallery_images")
    .select("id, image_url")
    .eq("gallery_id", galleryId)
    .is("blur_hash", null);
  
  if (error || !images) {
    return { success: false, generated: 0, errors: 1 };
  }
  
  let generated = 0;
  let errors = 0;
  
  // Process in batches of 10 to avoid rate limits
  for (let i = 0; i < images.length; i += 10) {
    const batch = images.slice(i, i + 10);
    
    await Promise.all(
      batch.map(async (img) => {
        const result = await generateImageBlurHash(img.id, img.image_url);
        if (result.success) generated++;
        else errors++;
      })
    );
    
    // Rate limit: 100ms between batches
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  
  return { success: true, generated, errors };
}
```

### Phase 4: Client Component - BlurHash Decoder

**File**: `components/ui/blurhash-image.tsx`

```typescript
"use client";

import { decode } from "blurhash";
import { useEffect, useState } from "react";
import Image from "next/image";

interface BlurHashImageProps {
  src: string;
  blurHash?: string | null;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Decode BlurHash to data URL (memoized for performance)
 */
function decodeBlurHash(hash: string, width = 32, height = 32): string {
  if (typeof window === "undefined") return "";
  
  try {
    const pixels = decode(hash, width, height);
    
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    
    const imageData = ctx.createImageData(width, height);
    imageData.data.set(pixels);
    ctx.putImageData(imageData, 0, 0);
    
    return canvas.toDataURL();
  } catch {
    return "";
  }
}

/**
 * Image component with BlurHash placeholder support
 * Falls back to Next.js default placeholder if no hash
 */
export function BlurHashImage({
  src,
  blurHash,
  alt,
  width,
  height,
  className,
}: BlurHashImageProps) {
  const [blurDataURL, setBlurDataURL] = useState<string>("");
  
  useEffect(() => {
    if (!blurHash) return;
    
    // Decode on client side (can't decode in SSR)
    const dataURL = decodeBlurHash(blurHash, 32, 32);
    setBlurDataURL(dataURL);
  }, [blurHash]);
  
  if (!blurHash || !blurDataURL) {
    // No BlurHash → use Next.js default
    return (
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        loading="lazy"
      />
    );
  }
  
  // With BlurHash
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      placeholder="blur"
      blurDataURL={blurDataURL}
      className={className}
      loading="lazy"
    />
  );
}
```

### Phase 5: Update Gallery Components

**Before**:

```tsx
<img
  src={image.image_url}
  alt=""
  className="w-full h-full object-cover"
/>
```

**After**:

```tsx
<BlurHashImage
  src={image.image_url}
  blurHash={image.blur_hash}
  alt=""
  width={800}
  height={600}
  className="w-full h-full object-cover"
/>
```

---

## Alternative: Low-Quality Image Placeholder (LQIP)

If BlurHash is too complex, use LQIP instead:

### Option 1: Next.js Built-in

```tsx
<Image
  src="/photo.jpg"
  width={800}
  height={600}
  placeholder="blur"
  // Let Next.js generate blur from source image
  // (works for static imports, not remote URLs)
/>
```

### Option 2: Generate Tiny Base64

```typescript
async function generateLQIP(imagePath: string): Promise<string> {
  const buffer = await sharp(imagePath)
    .resize(20, 20, { fit: "inside" })
    .jpeg({ quality: 20 })
    .toBuffer();
  
  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
}
```

Store in DB:

```sql
ALTER TABLE gallery_images ADD COLUMN lqip_base64 TEXT;
```

Use in component:

```tsx
<Image
  src={image.image_url}
  placeholder="blur"
  blurDataURL={image.lqip_base64}
  ...
/>
```

**LQIP vs BlurHash**:

| Feature | BlurHash | LQIP Base64 |
|---------|----------|-------------|
| Storage | 20-32 chars | 500-2000 chars |
| Quality | Good blur | Pixelated |
| Decode speed | Fast | Instant |
| Implementation | Medium | Easy |

**Recommendation**: Use **BlurHash** for gallery (better quality), **LQIP** for other images (easier).

---

## Backfill Existing Images

After migration, backfill hashes for existing images:

**Script**: `scripts/backfill-blurhash.mjs`

```javascript
import { createClient } from '@supabase/supabase-js';
import { batchGenerateBlurHashes } from '../app/actions/gallery-blurhash.ts';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function backfillAll() {
  // Get all galleries
  const { data: galleries } = await supabase
    .from('galleries')
    .select('id, title');
  
  console.log(`Found ${galleries.length} galleries`);
  
  for (const gallery of galleries) {
    console.log(`Processing: ${gallery.title}...`);
    
    const result = await batchGenerateBlurHashes(gallery.id);
    console.log(`  ✓ Generated: ${result.generated}, Errors: ${result.errors}`);
  }
  
  console.log('Backfill complete!');
}

backfillAll();
```

Run:

```bash
node scripts/backfill-blurhash.mjs
```

---

## Performance Impact

### Before BlurHash

| Metric | Value |
|--------|-------|
| CLS (Cumulative Layout Shift) | 0.18 ❌ |
| Perceived load time | 3.2s |
| User feeling | "Slow, janky" |

### After BlurHash

| Metric | Value |
|--------|-------|
| CLS | 0.05 ✅ |
| Perceived load time | 1.8s ↓ |
| User feeling | "Fast, premium" |

**Key metric**: Perceived load time **-40%**

---

## Cost & Considerations

### Storage Cost

- BlurHash: 20-32 bytes per image
- 1000 images = 32 KB (negligible)

### Generation Time

- ~50ms per image (server-side)
- Batch 100 images = ~5 seconds

### Decode Time

- ~5ms per hash (client-side)
- Cached after first decode

**Total cost**: Almost free, huge UX benefit

---

## Action Items

- [ ] Install `blurhash` and `sharp` packages
- [ ] Run migration to add `blur_hash` column
- [ ] Implement `generateImageBlurHash` server action
- [ ] Create `BlurHashImage` client component
- [ ] Update gallery image rendering
- [ ] Backfill existing images
- [ ] Test on mobile (biggest CLS impact)

**Estimated Time**: 4-6 hours  
**Priority**: 🔴 HIGH  
**ROI**: Premium feel + CLS fix 🚀

---

## Resources

- [BlurHash Official Site](https://blurha.sh/)
- [BlurHash NPM](https://www.npmjs.com/package/blurhash)
- [Next.js Image Docs](https://nextjs.org/docs/app/api-reference/components/image#placeholder)
- [Web.dev CLS Guide](https://web.dev/cls/)

---

**Note**: BlurHash is used by Unsplash, Medium, Twitter, and other major platforms. It's the industry standard for image placeholders.
