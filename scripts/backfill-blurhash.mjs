#!/usr/bin/env node
/**
 * Backfill BlurHash for existing gallery images
 *
 * Usage:
 *   node scripts/backfill-blurhash.mjs                    # All galleries
 *   node scripts/backfill-blurhash.mjs <gallery-id>       # Single gallery
 *   node scripts/backfill-blurhash.mjs --limit=100        # Limit to 100 images
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { encode, decode } from "blurhash";
import sharp from "sharp";

// Load environment variables from .env.local
config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function generateBlurHash(imageUrl) {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Resize to small dimensions for fast encoding
    const { data, info } = await sharp(buffer)
      .resize(32, 32, { fit: "inside" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Encode to BlurHash
    const blurHash = encode(
      new Uint8ClampedArray(data),
      info.width,
      info.height,
      4,
      3
    );

    // Decode to data URL (server-side, SSR-safe)
    const dataUrl = await blurHashToDataUrl(blurHash, 32, 32);

    return { blurHash, dataUrl };
  } catch (error) {
    throw new Error(`BlurHash generation failed: ${error.message}`);
  }
}

async function blurHashToDataUrl(blurHash, width = 32, height = 32) {
  const pixels = decode(blurHash, width, height);

  // Convert RGBA pixels to PNG data URL
  const pngBuffer = await sharp(Buffer.from(pixels), {
    raw: { width, height, channels: 4 },
  })
    .png()
    .toBuffer();

  const base64 = pngBuffer.toString("base64");
  return `data:image/png;base64,${base64}`;
}

async function backfillGalleryBlurHash(galleryId, limit = null) {
  console.log(`\n🎨 Processing gallery: ${galleryId}`);

  // Fetch images without BlurHash
  let query = supabase
    .from("gallery_images")
    .select("id, image_url, thumbnail_url, file_name")
    .eq("gallery_id", galleryId)
    .is("blur_hash", null)
    .order("sort_order", { ascending: true });

  if (limit) {
    query = query.limit(limit);
  }

  const { data: images, error: fetchError } = await query;

  if (fetchError) {
    console.error(`❌ Error fetching images: ${fetchError.message}`);
    return { success: 0, failed: 0 };
  }

  if (!images || images.length === 0) {
    console.log("✅ No images to process");
    return { success: 0, failed: 0 };
  }

  console.log(`📸 Found ${images.length} images without BlurHash`);

  const stats = { success: 0, failed: 0 };

  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    const progress = `[${i + 1}/${images.length}]`;

    try {
      // Use thumbnail for faster processing
      const urlToUse = image.thumbnail_url || image.image_url;
      const { blurHash, dataUrl } = await generateBlurHash(urlToUse);

      // Update DB with both hash and data URL
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

      stats.success++;
      console.log(`${progress} ✅ ${image.file_name || image.id}`);

      // Rate limit: wait 100ms between requests
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      stats.failed++;
      console.error(`${progress} ❌ ${image.file_name || image.id}: ${error.message}`);
    }
  }

  return stats;
}

async function backfillAllGalleries(limit = null) {
  console.log("🎨 Backfilling BlurHash for all galleries");

  // Get all galleries
  const { data: galleries, error: galleriesError } = await supabase
    .from("galleries")
    .select("id, title")
    .order("created_at", { ascending: false });

  if (galleriesError) {
    console.error(`❌ Error fetching galleries: ${galleriesError.message}`);
    process.exit(1);
  }

  if (!galleries || galleries.length === 0) {
    console.log("No galleries found");
    process.exit(0);
  }

  console.log(`Found ${galleries.length} galleries\n`);

  const totalStats = { success: 0, failed: 0 };

  for (const gallery of galleries) {
    const stats = await backfillGalleryBlurHash(gallery.id, limit);
    totalStats.success += stats.success;
    totalStats.failed += stats.failed;
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🎉 Backfill complete!`);
  console.log(`✅ Success: ${totalStats.success}`);
  console.log(`❌ Failed: ${totalStats.failed}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

// Parse arguments
const args = process.argv.slice(2);
const galleryId = args.find((arg) => !arg.startsWith("--"));
const limitArg = args.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : null;

// Run
if (galleryId) {
  backfillGalleryBlurHash(galleryId, limit)
    .then((stats) => {
      console.log(`\n✅ Success: ${stats.success}, ❌ Failed: ${stats.failed}`);
      process.exit(stats.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error("❌ Fatal error:", error);
      process.exit(1);
    });
} else {
  backfillAllGalleries(limit)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Fatal error:", error);
      process.exit(1);
    });
}
