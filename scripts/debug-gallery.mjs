#!/usr/bin/env node
/**
 * Debug Gallery - Check what's happening with gallery a50f0b0d-52df-49b5-af9e-952972ba4585
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local from project root
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GALLERY_ID = 'a50f0b0d-52df-49b5-af9e-952972ba4585';

async function debugGallery() {
  console.log('🔍 Debugging Gallery:', GALLERY_ID);
  console.log('─'.repeat(80));

  // 1. Check gallery record
  console.log('\n1️⃣  Gallery Record:');
  const { data: gallery, error: galleryError } = await supabase
    .from('galleries')
    .select('*')
    .eq('id', GALLERY_ID)
    .single();

  if (galleryError) {
    console.error('❌ Error fetching gallery:', galleryError);
    return;
  }
  console.log('✅ Gallery exists:');
  console.log(`   - Title: ${gallery.title}`);
  console.log(`   - Status: ${gallery.status}`);
  console.log(`   - Folder Type: ${gallery.folder_type}`);
  console.log(`   - Drive Folder ID: ${gallery.drive_folder_id}`);

  // 2. Check images count
  console.log('\n2️⃣  Gallery Images Count:');
  const { count, error: countError } = await supabase
    .from('gallery_images')
    .select('*', { count: 'exact', head: true })
    .eq('gallery_id', GALLERY_ID);

  if (countError) {
    console.error('❌ Error counting images:', countError);
    return;
  }
  console.log(`   Total images: ${count}`);

  // 3. Sample first 5 images to check structure
  console.log('\n3️⃣  Sample Images (first 5):');
  const { data: images, error: imagesError } = await supabase
    .from('gallery_images')
    .select('id, file_name, image_url, thumbnail_url, drive_file_id, width, height, sort_order')
    .eq('gallery_id', GALLERY_ID)
    .order('sort_order', { ascending: true })
    .limit(5);

  if (imagesError) {
    console.error('❌ Error fetching images:', imagesError);
    return;
  }

  if (images && images.length > 0) {
    images.forEach((img, idx) => {
      console.log(`\n   Image ${idx + 1}:`);
      console.log(`   - ID: ${img.id}`);
      console.log(`   - File: ${img.file_name}`);
      console.log(`   - image_url: ${img.image_url ? '✅ EXISTS' : '❌ MISSING'}`);
      console.log(`   - thumbnail_url: ${img.thumbnail_url ? '✅ EXISTS' : '❌ MISSING'}`);
      console.log(`   - drive_file_id: ${img.drive_file_id ? '✅ EXISTS' : '❌ MISSING'}`);
      console.log(`   - width: ${img.width || 'null'}`);
      console.log(`   - height: ${img.height || 'null'}`);
      console.log(`   - sort_order: ${img.sort_order}`);
    });
  } else {
    console.log('   ❌ No images found!');
  }

  // 4. Test the RPC function
  console.log('\n4️⃣  Testing get_gallery_data_v2 RPC:');
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_gallery_data_v2', {
    p_gallery_id: GALLERY_ID
  });

  if (rpcError) {
    console.error('❌ RPC Error:', rpcError);
    return;
  }

  console.log(`   - Images returned: ${rpcData.images?.length || 0}`);
  console.log(`   - Total count: ${rpcData.totalCount || 0}`);
  console.log(`   - Has more: ${rpcData.hasMore}`);

  if (rpcData.images && rpcData.images.length > 0) {
    const firstImage = rpcData.images[0];
    console.log('\n   First image from RPC:');
    console.log(`   - id: ${firstImage.id ? '✅' : '❌'}`);
    console.log(`   - file_name: ${firstImage.file_name ? '✅' : '❌'}`);
    console.log(`   - image_url: ${firstImage.image_url ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`   - thumbnail_url: ${firstImage.thumbnail_url ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`   - drive_file_id: ${firstImage.drive_file_id ? '✅' : '❌'}`);

    console.log('\n   📋 Full RPC image keys:', Object.keys(firstImage).join(', '));
  }

  // 5. Check if there are filters or visibility issues
  console.log('\n5️⃣  Checking for potential issues:');

  const { data: hiddenImages, error: hiddenError } = await supabase
    .from('gallery_images')
    .select('id')
    .eq('gallery_id', GALLERY_ID)
    .is('image_url', null);

  if (!hiddenError) {
    console.log(`   - Images with NULL image_url: ${hiddenImages?.length || 0}`);
  }

  const { data: noThumbnail, error: noThumbError } = await supabase
    .from('gallery_images')
    .select('id')
    .eq('gallery_id', GALLERY_ID)
    .is('thumbnail_url', null);

  if (!noThumbError) {
    console.log(`   - Images with NULL thumbnail_url: ${noThumbnail?.length || 0}`);
  }

  console.log('\n' + '─'.repeat(80));
  console.log('✅ Debug complete\n');
}

debugGallery().catch(console.error);
