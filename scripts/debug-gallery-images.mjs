#!/usr/bin/env node
import fetch from 'node-fetch';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

config({ path: join(rootDir, '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const GALLERY_ID = process.argv[2];
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(GALLERY_ID || '')) {
  console.error('Usage: node scripts/debug-gallery-images.mjs <gallery-uuid>');
  process.exit(1);
}

console.log('🔍 Debugging Gallery Images\n');

async function debugGallery() {
  // 1. Count total images in DB
  console.log('📊 Step 1: Count images in database...');
  const countRes = await fetch(`${SUPABASE_URL}/rest/v1/gallery_images?gallery_id=eq.${GALLERY_ID}&select=count`, {
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'Prefer': 'count=exact'
    }
  });

  const totalInDB = parseInt(countRes.headers.get('content-range')?.split('/')[1] || '0');
  console.log(`   Total images in DB: ${totalInDB}\n`);

  // 2. Test RPC with different page sizes
  console.log('📊 Step 2: Test RPC pagination...');

  for (const pageSize of [50, 100, 200]) {
    const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_gallery_data_v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify({
        p_gallery_id: GALLERY_ID,
        p_limit: pageSize,
        p_offset: 0
      })
    });

    const data = await rpcRes.json();

    if (rpcRes.ok) {
      console.log(`   pageSize=${pageSize}: loaded=${data.loadedCount}, total=${data.totalCount}, hasMore=${data.hasMore}`);
    } else {
      console.log(`   pageSize=${pageSize}: ERROR -`, data.message);
    }
  }

  // 3. Test pagination offset
  console.log('\n📊 Step 3: Test offset pagination...');

  const page0 = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_gallery_data_v2`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`
    },
    body: JSON.stringify({
      p_gallery_id: GALLERY_ID,
      p_limit: 100,
      p_offset: 0
    })
  }).then(r => r.json());

  const page1 = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_gallery_data_v2`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`
    },
    body: JSON.stringify({
      p_gallery_id: GALLERY_ID,
      p_limit: 100,
      p_offset: 100
    })
  }).then(r => r.json());

  console.log(`   Page 0 (offset=0): ${page0.images?.length || 0} images`);
  console.log(`   Page 1 (offset=100): ${page1.images?.length || 0} images`);

  // Check for duplicates
  if (page0.images && page1.images) {
    const page0Ids = new Set(page0.images.map(i => i.id));
    const page1Ids = page1.images.map(i => i.id);
    const duplicates = page1Ids.filter(id => page0Ids.has(id));
    console.log(`   Duplicates between pages: ${duplicates.length}`);
  }

  // 4. Check file types
  console.log('\n📊 Step 4: Analyze file types...');

  const allImages = await fetch(`${SUPABASE_URL}/rest/v1/gallery_images?gallery_id=eq.${GALLERY_ID}&select=file_name`, {
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`
    }
  }).then(r => r.json());

  if (Array.isArray(allImages)) {
    const rawExtensions = ['arw', 'cr2', 'cr3', 'nef', 'raf', 'dng', 'orf', 'rw2'];
    const raws = allImages.filter(img => {
      const ext = img.file_name?.split('.').pop()?.toLowerCase();
      return ext && rawExtensions.includes(ext);
    });
    const jpgs = allImages.filter(img => {
      const ext = img.file_name?.split('.').pop()?.toLowerCase();
      return ext && ['jpg', 'jpeg'].includes(ext);
    });

    console.log(`   Total files: ${allImages.length}`);
    console.log(`   RAW files: ${raws.length}`);
    console.log(`   JPG files: ${jpgs.length}`);
    console.log(`   Other: ${allImages.length - raws.length - jpgs.length}`);
  }

  // 5. Summary
  console.log('\n' + '='.repeat(50));
  console.log('📋 SUMMARY:');
  console.log('='.repeat(50));
  console.log(`Total in DB: ${totalInDB}`);
  console.log(`RPC returns: ${page0.totalCount || 0}`);
  console.log(`First page loads: ${page0.loadedCount || 0} images`);
  console.log(`Has more pages: ${page0.hasMore || false}`);

  if (totalInDB !== page0.totalCount) {
    console.log('\n⚠️  MISMATCH: DB count ≠ RPC totalCount');
  }

  if (page0.loadedCount < totalInDB && !page0.hasMore) {
    console.log('\n❌ BUG: hasMore=false but images remaining!');
  }

  console.log('\n');
}

debugGallery().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
