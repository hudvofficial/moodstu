#!/usr/bin/env node
/**
 * Backfill ALL galleries in database
 * Run once to populate dimensions for existing galleries
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import sharp from 'sharp';
import https from 'https';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fetchImageBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const chunks = [];
      let size = 0;
      const maxSize = 100000;
      res.on('data', (chunk) => {
        chunks.push(chunk);
        size += chunk.length;
        if (size > maxSize) res.destroy();
      });
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function getDimensions(imageUrl) {
  try {
    const url = imageUrl.includes('googleusercontent.com')
      ? imageUrl.split('=')[0] + '=s800'
      : imageUrl;
    const buffer = await fetchImageBuffer(url);
    const metadata = await sharp(buffer).metadata();
    return { width: metadata.width || 3000, height: metadata.height || 2000 };
  } catch (error) {
    return { width: 3000, height: 2000 };
  }
}

async function backfillGallery(galleryId, galleryTitle) {
  const { data: images, error } = await supabase
    .from('gallery_images')
    .select('id, image_url, file_name, width, height')
    .eq('gallery_id', galleryId)
    .order('sort_order'); // No limit - process all images

  if (error) {
    console.error(`  ❌ Error fetching images:`, error.message);
    return { success: false, processed: 0 };
  }

  const needsBackfill = images.filter(img => !img.width || !img.height);

  if (needsBackfill.length === 0) {
    console.log(`  ✅ Already has dimensions (${images.length} images)`);
    return { success: true, processed: 0, skipped: images.length };
  }

  console.log(`  🔧 Processing ${needsBackfill.length}/${images.length} images...`);

  let processed = 0;
  let failed = 0;

  for (const img of needsBackfill) {
    try {
      const dimensions = await getDimensions(img.image_url);
      const { error: updateError } = await supabase
        .from('gallery_images')
        .update({ width: dimensions.width, height: dimensions.height })
        .eq('id', img.id);

      if (updateError) throw updateError;
      processed++;

      // Progress indicator every 10 images
      if (processed % 10 === 0) {
        console.log(`    Progress: ${processed}/${needsBackfill.length}...`);
      }

      await new Promise(resolve => setTimeout(resolve, 150));
    } catch (err) {
      failed++;
    }
  }

  console.log(`  ✅ Completed: ${processed} processed, ${failed} failed`);
  return { success: true, processed, failed };
}

async function main() {
  console.log('🚀 Starting bulk backfill for ALL galleries...\n');

  // Get all galleries
  const { data: galleries, error } = await supabase
    .from('galleries')
    .select('id, title, folder_type')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching galleries:', error);
    return;
  }

  console.log(`📊 Found ${galleries.length} galleries\n`);

  let totalProcessed = 0;
  let totalFailed = 0;
  let galleriesProcessed = 0;

  for (let i = 0; i < galleries.length; i++) {
    const gallery = galleries[i];
    console.log(`\n[${i + 1}/${galleries.length}] ${gallery.title || gallery.folder_type || 'Untitled'}`);
    console.log(`    ID: ${gallery.id}`);

    const result = await backfillGallery(gallery.id, gallery.title);

    if (result.processed > 0) {
      totalProcessed += result.processed;
      totalFailed += result.failed || 0;
      galleriesProcessed++;
    }

    // Rate limit between galleries
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n\n✨ SUMMARY');
  console.log('==================');
  console.log(`Total galleries: ${galleries.length}`);
  console.log(`Galleries processed: ${galleriesProcessed}`);
  console.log(`Images processed: ${totalProcessed}`);
  console.log(`Images failed: ${totalFailed}`);
  console.log('\n🎉 All done! Future galleries will auto-backfill on upload.');
}

main().catch(console.error);
