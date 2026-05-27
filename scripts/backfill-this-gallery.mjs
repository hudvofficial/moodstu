#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import sharp from 'sharp';
import https from 'https';

config({ path: '.env.local' });

const GALLERY_ID = '0aaa52b4-7dac-4845-bf5a-dbc96640a35a';

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

async function backfill() {
  console.log(`🖼️  Backfilling gallery: ${GALLERY_ID}\n`);

  const { data: images, error } = await supabase
    .from('gallery_images')
    .select('id, image_url, file_name, width, height')
    .eq('gallery_id', GALLERY_ID)
    .order('sort_order');

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`📊 Found ${images.length} images`);
  const needsBackfill = images.filter(img => !img.width || !img.height);
  console.log(`🔧 Need backfill: ${needsBackfill.length} images\n`);

  let processed = 0;
  for (const img of needsBackfill) {
    try {
      process.stdout.write(`${img.file_name}... `);
      const dimensions = await getDimensions(img.image_url);
      const { error: updateError } = await supabase
        .from('gallery_images')
        .update({ width: dimensions.width, height: dimensions.height })
        .eq('id', img.id);
      if (updateError) throw updateError;
      console.log(`✅ ${dimensions.width}x${dimensions.height}`);
      processed++;
      await new Promise(resolve => setTimeout(resolve, 150));
    } catch (err) {
      console.log(`❌ ${err.message}`);
    }
  }

  console.log(`\n✨ Done! Processed: ${processed}`);
}

backfill().catch(console.error);
