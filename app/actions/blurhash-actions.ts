"use server";

import { encode, decode } from "blurhash";
import { withAuth } from "@/lib/auth_utils";
import { createAdminClient } from "@/lib/supabase/server";

// Dynamic import for sharp (optional dependency for Vercel)
let sharp: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  sharp = require("sharp");
} catch {
  console.warn("Sharp module not available - blurhash features will be limited");
}

/**
 * Generate BlurHash AND data URL from image URL
 * Pre-computes everything server-side for SSR-safe client rendering
 */
export async function generateBlurHashFromUrl(
  imageUrl: string
): Promise<{ blurHash: string; dataUrl: string }> {
  if (!sharp) {
    throw new Error("Sharp module not available");
  }

  try {
    // Fetch image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Resize to small dimensions for fast BlurHash encoding (32x32 is optimal)
    const { data, info } = await sharp(buffer)
      .resize(32, 32, { fit: "inside" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Encode to BlurHash (4x3 components gives good quality/size tradeoff)
    const blurHash = encode(
      new Uint8ClampedArray(data),
      info.width,
      info.height,
      4,
      3
    );

    // Decode to data URL immediately (server-side, no hydration issues)
    const dataUrl = await blurHashToDataUrl(blurHash, 32, 32);

    return { blurHash, dataUrl };
  } catch (error) {
    console.error("Error generating BlurHash:", error);
    throw new Error(
      `BlurHash generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Decode BlurHash to base64 data URL (server-side only, using node-canvas)
 */
async function blurHashToDataUrl(
  blurHash: string,
  width: number = 32,
  height: number = 32
): Promise<string> {
  const pixels = decode(blurHash, width, height);

  // Convert RGBA pixels to PNG data URL using sharp
  const pngBuffer = await sharp(Buffer.from(pixels), {
    raw: { width, height, channels: 4 },
  })
    .png()
    .toBuffer();

  const base64 = pngBuffer.toString("base64");
  return `data:image/png;base64,${base64}`;
}

/**
 * Update BlurHash for a single gallery image
 */
export async function updateImageBlurHash(imageId: string, imageUrl: string) {
  return withAuth(async (supabase) => {
    const { blurHash, dataUrl } = await generateBlurHashFromUrl(imageUrl);

    const { error } = await supabase
      .from("gallery_images")
      .update({
        blur_hash: blurHash,
        blur_data_url: dataUrl
      })
      .eq("id", imageId);

    if (error) {
      throw new Error(`Failed to update BlurHash: ${error.message}`);
    }

    return { blurHash, dataUrl };
  });
}

/**
 * Backfill BlurHash for gallery — fire-and-forget background sau khi tạo/sync gallery.
 * Mirror pattern backfillGalleryDimensions: createAdminClient (no withAuth — auth context không cần cho service role),
 * cap 100 ảnh/lần, rate-limit 150ms để không spam lh3, log progress.
 * Idempotent: WHERE blur_hash IS NULL → chạy lại an toàn, chỉ xử lý ảnh còn thiếu.
 */
export async function backfillGalleryBlurhashes(galleryId: string) {
  try {
    const supabase = await createAdminClient();

    const { data: images, error } = await supabase
      .from('gallery_images')
      .select('id, image_url, thumbnail_url, file_name')
      .eq('gallery_id', galleryId)
      .is('blur_hash', null)
      .limit(100); // Cap để fit Vercel serverless timeout — gọi lại sau nếu còn

    if (error) {
      console.error('[backfillGalleryBlurhashes] Fetch error:', error.message);
      return { success: false, error: error.message };
    }

    if (!images || images.length === 0) {
      return { success: true, processed: 0 };
    }

    console.log(`🎨 Backfilling blurhash for ${images.length} images in gallery ${galleryId}...`);

    let processed = 0;
    let failed = 0;

    for (const img of images) {
      try {
        // Ưu tiên thumbnail_url (nhỏ + nhanh) → fallback image_url
        const urlToUse = img.thumbnail_url || img.image_url;
        const { blurHash, dataUrl } = await generateBlurHashFromUrl(urlToUse);

        const { error: updateError } = await supabase
          .from('gallery_images')
          .update({ blur_hash: blurHash, blur_data_url: dataUrl })
          .eq('id', img.id);

        if (updateError) throw updateError;
        processed++;

        // Rate limit lh3 / Drive — match pattern của backfillGalleryDimensions
        await new Promise(resolve => setTimeout(resolve, 150));
      } catch (err) {
        failed++;
        console.error(`[backfillGalleryBlurhashes] Failed ${img.file_name}:`, err instanceof Error ? err.message : err);
      }
    }

    console.log(`✅ Blurhash backfill done: ${processed} processed, ${failed} failed`);
    return { success: true, processed, failed, total: images.length };
  } catch (error) {
    console.error('[backfillGalleryBlurhashes] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Batch update BlurHash for multiple images in a gallery
 * Processes images sequentially to avoid rate limiting
 */
export async function batchUpdateGalleryBlurHashes(
  galleryId: string,
  onProgress?: (current: number, total: number) => void
) {
  return withAuth(async () => {
    const supabase = await createAdminClient();

    // Fetch images without BlurHash
    const { data: images, error: fetchError } = await supabase
      .from("gallery_images")
      .select("id, image_url, thumbnail_url")
      .eq("gallery_id", galleryId)
      .is("blur_hash", null);

    if (fetchError) {
      throw new Error(`Failed to fetch images: ${fetchError.message}`);
    }

    if (!images || images.length === 0) {
      return { processed: 0, message: "No images to process" };
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      try {
        // Use thumbnail for faster processing
        const urlToUse = image.thumbnail_url || image.image_url;
        const { blurHash, dataUrl } = await generateBlurHashFromUrl(urlToUse);

        const { error: updateError } = await supabase
          .from("gallery_images")
          .update({
            blur_hash: blurHash,
            blur_data_url: dataUrl
          })
          .eq("id", image.id);

        if (updateError) {
          throw updateError;
        }

        results.success++;
        onProgress?.(i + 1, images.length);
      } catch (error) {
        results.failed++;
        results.errors.push(
          `Image ${image.id}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
        console.error(`Failed to process image ${image.id}:`, error);
      }
    }

    return {
      processed: images.length,
      success: results.success,
      failed: results.failed,
      errors: results.errors,
    };
  });
}
