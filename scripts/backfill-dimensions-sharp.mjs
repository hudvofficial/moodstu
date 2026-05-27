#!/usr/bin/env node
/**
 * Backfill image dimensions using Sharp (faster & more reliable)
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import sharp from 'sharp';
import https from 'https';
import http from 'http';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Fetch image buffer from URL
 */
async function fetchImageBuffer(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;

    client.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }

      const chunks = [];
      let size = 0;
      const maxSize = 100000; // 100KB should be enough for metadata

      res.on('data', (chunk) => {
        chunks.push(chunk);
        size += chunk.length;

        // Stop after 100KB - enough for Sharp to read metadata
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
 * Get dimensions using Sharp
 */
async function getDimensions(imageUrl) {
  try {
    // For Google Drive images, use thumbnail URL with decent size
    const url = imageUrl.includes('googleusercontent.com')
      ? imageUrl.split('=')[0] + '=s800'
      : imageUrl;

    const buffer = await fetchImageBuffer(url);
    const metadata = await sharp(buffer).metadata();

    return {
      width: metadata.width,
      height: metadata.height
    };
  } catch (error) {
    console.error(`    Failed to get dimensions: ${error.message}`);
    // Fallback: assume 3:2 ratio
    return { width: 3000, height: 2000 };
  }
}

async function backfillBatch(offset = 0, batchSize = 50) {
  console.log(`\n🔍 Processing batch ${offset / batchSize + 1}...\n`);

  const { data: images, error } = await supabase
    .from('gallery_images')
    .select('id, image_url, file_name')
    .is('width', null)
    .range(offset, offset + batchSize - 1);

  if (error) {
    console.error('❌ Error fetching images:', error);
    return { done: true, processed: 0 };
  }

  if (images.length === 0) {
    console.log('✨ No more images to process!');
    return { done: true, processed: 0 };
  }

  console.log(`📊 Processing ${images.length} images...\n`);

  let updated = 0;
  let failed = 0;

  for (const img of images) {
    try {
      process.stdout.write(`Processing: ${img.file_name}... `);

      const dimensions = await getDimensions(img.image_url);

      const { error: updateError } = await supabase
        .from('gallery_images')
        .update({
          width: dimensions.width,
          height: dimensions.height
        })
        .eq('id', img.id);

      if (updateError) throw updateError;

      console.log(`✅ ${dimensions.width}x${dimensions.height}`);
      updated++;

      // Rate limiting - be nice to Google
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (err) {
      console.log(`❌ ${err.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Batch summary:`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Failed: ${failed}`);

  return {
    done: images.length < batchSize,
    processed: images.length
  };
}

async function backfillAll() {
  console.log('🚀 Starting dimension backfill with Sharp...\n');

  let offset = 0;
  const batchSize = 50;
  let totalProcessed = 0;
  let totalUpdated = 0;

  while (true) {
    const result = await backfillBatch(offset, batchSize);
    totalProcessed += result.processed;

    if (result.done) break;
    offset += batchSize;
  }

  console.log(`\n\n✨ All done!`);
  console.log(`   Total processed: ${totalProcessed}`);
  console.log(`\n💡 Tip: Refresh your gallery page to see the masonry effect!`);
}

backfillAll().catch(console.error);
