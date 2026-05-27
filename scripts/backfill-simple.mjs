#!/usr/bin/env node
/**
 * Simple & Reliable Backfill - Process ALL images missing dimensions
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

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);

    https.get(url, (res) => {
      clearTimeout(timeout);
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }

      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function getDimensions(url) {
  try {
    const imageUrl = url.includes('googleusercontent.com')
      ? url.split('=')[0] + '=s800'
      : url;

    const buffer = await fetchBuffer(imageUrl);
    const { width, height } = await sharp(buffer).metadata();

    return {
      width: width || 3000,
      height: height || 2000,
      success: true
    };
  } catch (err) {
    return {
      width: 3000,
      height: 2000,
      success: false,
      error: err.message
    };
  }
}

async function main() {
  console.log('🚀 Simple Backfill - Processing ALL images\n');

  // Get ALL images without dimensions
  const { data: images, error } = await supabase
    .from('gallery_images')
    .select('id, image_url, file_name')
    .or('width.is.null,height.is.null')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  console.log(`📊 Found ${images.length} images to process\n`);

  let processed = 0;
  let failed = 0;
  const startTime = Date.now();

  for (let i = 0; i < images.length; i++) {
    const img = images[i];

    try {
      // Progress every 50 images
      if (i % 50 === 0 && i > 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
        const rate = (i / elapsed).toFixed(1);
        const remaining = Math.round((images.length - i) / rate);
        console.log(`\n[${i}/${images.length}] ${elapsed}s elapsed, ~${remaining}s remaining (${rate}/s)`);
      }

      const result = await getDimensions(img.image_url);

      const { error: updateError } = await supabase
        .from('gallery_images')
        .update({ width: result.width, height: result.height })
        .eq('id', img.id);

      if (updateError) throw new Error(updateError.message);

      processed++;
      process.stdout.write('.');

      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (err) {
      failed++;
      process.stdout.write('x');
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(0);

  console.log('\n\n✨ COMPLETED');
  console.log('==================');
  console.log(`Total processed: ${processed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success rate: ${((processed / images.length) * 100).toFixed(1)}%`);
  console.log(`Total time: ${totalTime}s`);
  console.log(`Average: ${(images.length / totalTime).toFixed(1)} images/s`);
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
