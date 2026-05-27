#!/usr/bin/env node
/**
 * Backfill image dimensions for existing gallery images
 * Fetches dimensions from Google Drive API
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import https from 'https';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Get image dimensions from googleusercontent URL
 * Google provides image metadata in response headers
 */
async function getImageDimensions(imageUrl) {
  return new Promise((resolve, reject) => {
    // Use googleusercontent URL with =s0 to get metadata
    const metadataUrl = imageUrl.includes('googleusercontent.com')
      ? imageUrl.split('=')[0] + '=s0-d'
      : imageUrl;

    https.get(metadataUrl, { method: 'HEAD' }, (res) => {
      // Try to parse from content-type or other headers
      // For images, we need to actually download a small portion to read dimensions
      // Fallback: use a small size to infer aspect ratio

      // For now, fetch with small size and use image processing
      const testUrl = imageUrl.includes('googleusercontent.com')
        ? imageUrl.split('=')[0] + '=s400'
        : imageUrl;

      // Download small version and check
      https.get(testUrl, (imgRes) => {
        const chunks = [];
        let size = 0;
        const maxSize = 50000; // 50KB should be enough for headers

        imgRes.on('data', (chunk) => {
          chunks.push(chunk);
          size += chunk.length;
          if (size > maxSize) {
            imgRes.destroy();
          }
        });

        imgRes.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const dimensions = getImageDimensionsFromBuffer(buffer);
          resolve(dimensions);
        });

        imgRes.on('error', reject);
      }).on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Extract image dimensions from buffer (JPEG/PNG)
 */
function getImageDimensionsFromBuffer(buffer) {
  // JPEG format
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
    for (let i = 2; i < buffer.length - 8; i++) {
      if (buffer[i] === 0xFF && buffer[i + 1] === 0xC0) {
        const height = buffer.readUInt16BE(i + 5);
        const width = buffer.readUInt16BE(i + 7);
        return { width, height };
      }
    }
  }

  // PNG format
  if (buffer.toString('ascii', 1, 4) === 'PNG') {
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { width, height };
  }

  // Default fallback - assume 3:2 aspect ratio
  return { width: 3000, height: 2000 };
}

async function backfillDimensions() {
  console.log('🔍 Finding images without dimensions...\n');

  const { data: images, error } = await supabase
    .from('gallery_images')
    .select('id, image_url, file_name')
    .is('width', null)
    .limit(100); // Process in batches

  if (error) {
    console.error('❌ Error fetching images:', error);
    return;
  }

  console.log(`📊 Found ${images.length} images to process\n`);

  let updated = 0;
  let failed = 0;

  for (const img of images) {
    try {
      console.log(`Processing: ${img.file_name}...`);

      const dimensions = await getImageDimensions(img.image_url);

      const { error: updateError } = await supabase
        .from('gallery_images')
        .update({
          width: dimensions.width,
          height: dimensions.height
        })
        .eq('id', img.id);

      if (updateError) throw updateError;

      console.log(`  ✅ ${dimensions.width}x${dimensions.height}`);
      updated++;

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (err) {
      console.error(`  ❌ Failed: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n✨ Done!`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Total: ${images.length}`);
}

backfillDimensions().catch(console.error);
