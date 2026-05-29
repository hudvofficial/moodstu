#!/usr/bin/env node
/**
 * Full diagnostic - check RPC status and gallery data
 */
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
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GALLERY_ID = 'debb307f-1bb3-4d59-8994-7de2bcea3b8d';

console.log('🔬 FULL DIAGNOSTIC - Gallery Pagination\n');
console.log('='.repeat(60));

async function runDiagnostic() {
  // Test 1: RPC with NEW params (what frontend is calling)
  console.log('\n📋 Test 1: RPC with NEW parameters (p_limit, p_offset)');
  console.log('-'.repeat(60));

  const newParamsTest = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_gallery_data_v2`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY || ANON_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY || ANON_KEY}`
    },
    body: JSON.stringify({
      p_gallery_id: GALLERY_ID,
      p_limit: 100,
      p_offset: 0
    })
  });

  const newData = await newParamsTest.json();

  if (newParamsTest.ok) {
    console.log('✅ RPC accepts NEW parameters');
    console.log('   Response fields:', Object.keys(newData));
    console.log('   Images loaded:', newData.images?.length || 0);
    console.log('   Total count:', newData.totalCount || 0);
    console.log('   Has more:', newData.hasMore);
    console.log('   Page:', newData.page);
    console.log('   Page size:', newData.pageSize);
    console.log('   Loaded count:', newData.loadedCount);

    if (newData.page !== undefined && newData.pageSize !== undefined) {
      console.log('\n   ✅ Migration SUCCESSFUL - RPC has new fields!');
    } else {
      console.log('\n   ⚠️  Migration INCOMPLETE - Missing new fields');
    }
  } else {
    console.log('❌ RPC with NEW parameters FAILED');
    console.log('   Error:', newData);
    console.log('\n   🔧 This means migration NOT applied or has errors');
  }

  // Test 2: RPC with OLD params (backward compatibility)
  console.log('\n📋 Test 2: RPC with OLD parameters (backward compat)');
  console.log('-'.repeat(60));

  const oldParamsTest = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_gallery_data_v2`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY || ANON_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY || ANON_KEY}`
    },
    body: JSON.stringify({
      p_gallery_id: GALLERY_ID
    })
  });

  const oldData = await oldParamsTest.json();

  if (oldParamsTest.ok) {
    console.log('✅ RPC still accepts OLD parameters (backward compatible)');
    console.log('   Images loaded:', oldData.images?.length || 0);
    console.log('   Total count:', oldData.totalCount || 0);
  } else {
    console.log('⚠️  RPC rejects OLD parameters');
  }

  // Test 3: Direct table query
  console.log('\n📋 Test 3: Direct table count');
  console.log('-'.repeat(60));

  const directCount = await fetch(`${SUPABASE_URL}/rest/v1/gallery_images?gallery_id=eq.${GALLERY_ID}&select=count`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY || ANON_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY || ANON_KEY}`,
      'Prefer': 'count=exact'
    }
  });

  const totalInDB = parseInt(directCount.headers.get('content-range')?.split('/')[1] || '0');
  console.log(`   Total images in DB: ${totalInDB}`);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));

  if (newParamsTest.ok && newData.page !== undefined) {
    console.log('✅ Migration: APPLIED');
    console.log('✅ RPC Status: Working with new params');
    console.log(`📊 Data: ${newData.images?.length}/${newData.totalCount} images loaded`);

    if (newData.images?.length === 0 && totalInDB > 0) {
      console.log('\n⚠️  WARNING: RPC returns 0 images but DB has images');
      console.log('   Possible cause: RLS (Row Level Security) blocking access');
      console.log('   Solution: Check RLS policies for gallery_images table');
    } else if (newData.images?.length < totalInDB) {
      console.log(`\n✅ Pagination working: First page loaded ${newData.images?.length}/${totalInDB}`);
      console.log(`   Has more: ${newData.hasMore}`);
    } else {
      console.log('\n✅ All images loaded in first page');
    }
  } else {
    console.log('❌ Migration: NOT APPLIED or FAILED');
    console.log('🔧 Action: Run migration SQL in Supabase Dashboard');
    console.log('   File: supabase/migrations/20260529000001_gallery_data_v2_dynamic_pagination.sql');
  }

  console.log('\n');
}

runDiagnostic().catch(err => {
  console.error('Diagnostic failed:', err);
  process.exit(1);
});
