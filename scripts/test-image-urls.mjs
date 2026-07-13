#!/usr/bin/env node
/**
 * Test Image URLs - Kiểm tra xem URLs từ database có load được không
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GALLERY_ID = process.argv[2];
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(GALLERY_ID || '')) {
  console.error('Usage: node scripts/test-image-urls.mjs <gallery-uuid>');
  process.exit(1);
}

async function testImageUrls() {
  console.log('🧪 Testing Image URLs from Database\n');

  // Get first image
  const { data: images } = await supabase
    .from('gallery_images')
    .select('id, file_name, image_url, thumbnail_url, drive_file_id')
    .eq('gallery_id', GALLERY_ID)
    .order('sort_order', { ascending: true })
    .limit(1);

  if (!images || images.length === 0) {
    console.log('❌ No images found');
    return;
  }

  const img = images[0];
  console.log('📸 Testing first image:');
  console.log(`   File: ${img.file_name}`);
  console.log(`   ID: ${img.id}`);
  console.log(`   Drive File ID: ${img.drive_file_id}\n`);

  // Test thumbnail_url
  console.log('1️⃣  Testing thumbnail_url:');
  console.log(`   URL: ${img.thumbnail_url}`);

  try {
    const res = await fetch(img.thumbnail_url, { method: 'HEAD' });
    console.log(`   Status: ${res.status} ${res.statusText}`);
    console.log(`   Content-Type: ${res.headers.get('content-type')}`);

    if (res.status === 200) {
      console.log('   ✅ Thumbnail URL works!\n');
    } else {
      console.log('   ❌ Thumbnail URL failed!\n');
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}\n`);
  }

  // Test image_url
  console.log('2️⃣  Testing image_url:');
  console.log(`   URL: ${img.image_url}`);

  try {
    const res = await fetch(img.image_url, { method: 'HEAD' });
    console.log(`   Status: ${res.status} ${res.statusText}`);
    console.log(`   Content-Type: ${res.headers.get('content-type')}`);

    if (res.status === 200) {
      console.log('   ✅ Image URL works!\n');
    } else {
      console.log('   ❌ Image URL failed!\n');
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}\n`);
  }

  // Test lh3.googleusercontent.com (proxy strategy)
  const lh3Url = `https://lh3.googleusercontent.com/d/${img.drive_file_id}=s800`;
  console.log('3️⃣  Testing lh3.googleusercontent.com:');
  console.log(`   URL: ${lh3Url}`);

  try {
    const res = await fetch(lh3Url, { method: 'HEAD', redirect: 'follow' });
    console.log(`   Status: ${res.status} ${res.statusText}`);
    console.log(`   Content-Type: ${res.headers.get('content-type')}`);

    if (res.status === 200) {
      console.log('   ✅ lh3 URL works!\n');
    } else {
      console.log('   ❌ lh3 URL failed!\n');
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}\n`);
  }

  // Summary
  console.log('─'.repeat(80));
  console.log('\n💡 Recommendation:');
  console.log('   If all URLs work → Problem is with Next.js Image config');
  console.log('   If URLs fail → Problem is with Drive permissions/sharing\n');
}

testImageUrls().catch(console.error);
