"use server";

import { createAdminClient } from "@/lib/supabase/server";
import sharp from "sharp";
import https from "https";
import http from "http";

/**
 * Fetch image buffer from URL (partial download for metadata)
 */
async function fetchImageBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;

    client.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }

      const chunks: Buffer[] = [];
      let size = 0;
      const maxSize = 100000; // 100KB enough for metadata

      res.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
        size += chunk.length;

        if (size > maxSize) {
          res.destroy();
        }
      });

      res.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      res.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Get image dimensions from URL using Sharp
 */
async function getDimensionsFromUrl(imageUrl: string): Promise<{ width: number; height: number }> {
  try {
    // For Google Drive, use thumbnail URL with decent size
    const url = imageUrl.includes('googleusercontent.com')
      ? imageUrl.split('=')[0] + '=s800'
      : imageUrl;

    const buffer = await fetchImageBuffer(url);
    const metadata = await sharp(buffer).metadata();

    return {
      width: metadata.width || 3000,
      height: metadata.height || 2000
    };
  } catch (error) {
    console.error(`Failed to get dimensions: ${error}`);
    // Fallback to 3:2 ratio
    return { width: 3000, height: 2000 };
  }
}

/**
 * Backfill dimensions for a specific gallery
 * Called after gallery creation to populate dimensions in background
 */
export async function backfillGalleryDimensions(galleryId: string) {
  try {
    const supabase = await createAdminClient();

    // Get images without dimensions
    const { data: images, error } = await supabase
      .from('gallery_images')
      .select('id, image_url, file_name')
      .eq('gallery_id', galleryId)
      .is('width', null)
      .limit(100);

    if (error) {
      console.error('Error fetching images:', error);
      return { success: false, error: error.message };
    }

    if (!images || images.length === 0) {
      return { success: true, processed: 0 };
    }

    console.log(`🖼️ Backfilling dimensions for ${images.length} images in gallery ${galleryId}...`);

    let processed = 0;
    let failed = 0;

    // Process in small batches to avoid timeout
    for (const img of images) {
      try {
        const dimensions = await getDimensionsFromUrl(img.image_url);

        const { error: updateError } = await supabase
          .from('gallery_images')
          .update({
            width: dimensions.width,
            height: dimensions.height
          })
          .eq('id', img.id);

        if (updateError) throw updateError;

        processed++;

        // Rate limit - be nice to Google Drive
        await new Promise(resolve => setTimeout(resolve, 150));
      } catch (err) {
        console.error(`Failed to process ${img.file_name}:`, err);
        failed++;
      }
    }

    console.log(`✅ Backfilled ${processed} images (${failed} failed)`);

    return {
      success: true,
      processed,
      failed,
      total: images.length
    };
  } catch (error) {
    console.error('Error in backfillGalleryDimensions:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Backfill dimensions for all galleries (admin tool)
 */
export async function backfillAllDimensions() {
  try {
    const supabase = await createAdminClient();

    // Get all galleries with images missing dimensions
    const { data: galleries, error } = await supabase
      .from('galleries')
      .select('id, title')
      .limit(10);

    if (error) {
      return { success: false, error: error.message };
    }

    const results = [];

    for (const gallery of galleries || []) {
      const result = await backfillGalleryDimensions(gallery.id);
      results.push({
        galleryId: gallery.id,
        title: gallery.title,
        ...result
      });
    }

    return {
      success: true,
      galleries: results
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
