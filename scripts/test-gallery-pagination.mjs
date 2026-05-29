#!/usr/bin/env node

/**
 * Gallery Pagination Test Script
 *
 * Tests the 3-phase optimization:
 * 1. Dynamic pagination (RPC accepts limit/offset)
 * 2. Network-aware pageSize
 * 3. Cursor-based consistency
 *
 * Usage:
 *   node scripts/test-gallery-pagination.mjs <galleryId>
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials');
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const galleryId = process.argv[2];
if (!galleryId) {
  console.error('Usage: node scripts/test-gallery-pagination.mjs <galleryId>');
  process.exit(1);
}

console.log('\n🧪 Gallery Pagination Test Suite\n');
console.log(`Gallery ID: ${galleryId}\n`);

// ═══════════════════════════════════════════
// Test 1: Dynamic Pagination (Phase 1)
// ═══════════════════════════════════════════

console.log('📋 Test 1: Dynamic Pagination (offset-based)');

async function testOffsetPagination() {
  console.log('  → Testing page 0 (limit 50)...');
  const { data: page0, error: err0 } = await supabase.rpc('get_gallery_data_v2', {
    p_gallery_id: galleryId,
    p_limit: 50,
    p_offset: 0,
  });

  if (err0) {
    console.error(`  ❌ Page 0 failed: ${err0.message}`);
    return false;
  }

  console.log(`  ✅ Page 0: ${page0.loadedCount} images loaded`);
  console.log(`     Total: ${page0.totalCount}, hasMore: ${page0.hasMore}`);

  if (page0.totalCount <= 50) {
    console.log('  ℹ️  Gallery has <50 images, skipping page 1 test');
    return true;
  }

  console.log('  → Testing page 1 (limit 50, offset 50)...');
  const { data: page1, error: err1 } = await supabase.rpc('get_gallery_data_v2', {
    p_gallery_id: galleryId,
    p_limit: 50,
    p_offset: 50,
  });

  if (err1) {
    console.error(`  ❌ Page 1 failed: ${err1.message}`);
    return false;
  }

  console.log(`  ✅ Page 1: ${page1.loadedCount} images loaded`);

  // Verify no duplicates
  const page0Ids = new Set(page0.images.map(img => img.id));
  const page1Ids = new Set(page1.images.map(img => img.id));
  const overlap = [...page1Ids].filter(id => page0Ids.has(id));

  if (overlap.length > 0) {
    console.error(`  ❌ Found ${overlap.length} duplicate images between pages`);
    return false;
  }

  console.log(`  ✅ No duplicates found\n`);
  return true;
}

// ═══════════════════════════════════════════
// Test 2: Metadata Consistency
// ═══════════════════════════════════════════

console.log('📋 Test 2: Metadata Consistency');

async function testMetadataConsistency() {
  console.log('  → Loading page 0...');
  const { data: page0 } = await supabase.rpc('get_gallery_data_v2', {
    p_gallery_id: galleryId,
    p_limit: 100,
    p_offset: 0,
  });

  console.log('  → Loading page 1...');
  const { data: page1 } = await supabase.rpc('get_gallery_data_v2', {
    p_gallery_id: galleryId,
    p_limit: 100,
    p_offset: 100,
  });

  // Verify metadata is identical across pages
  const sameReactionCounts = JSON.stringify(page0.reactionCounts) === JSON.stringify(page1.reactionCounts);
  const sameCommentCounts = JSON.stringify(page0.commentCountsPerImage) === JSON.stringify(page1.commentCountsPerImage);
  const sameAlbums = JSON.stringify(page0.albums) === JSON.stringify(page1.albums);

  if (!sameReactionCounts || !sameCommentCounts || !sameAlbums) {
    console.error('  ❌ Metadata mismatch between pages');
    console.error(`     Reactions match: ${sameReactionCounts}`);
    console.error(`     Comments match: ${sameCommentCounts}`);
    console.error(`     Albums match: ${sameAlbums}`);
    return false;
  }

  console.log('  ✅ Metadata consistent across all pages');
  console.log(`     Reaction keys: ${Object.keys(page0.reactionCounts).length}`);
  console.log(`     Comment keys: ${Object.keys(page0.commentCountsPerImage).length}`);
  console.log(`     Albums: ${page0.albums.length}\n`);
  return true;
}

// ═══════════════════════════════════════════
// Test 3: Cursor-Based Pagination (Phase 3)
// ═══════════════════════════════════════════

console.log('📋 Test 3: Cursor-Based Pagination (optional)');

async function testCursorPagination() {
  console.log('  → Testing initial cursor load...');
  const { data: page0, error: err0 } = await supabase.rpc('get_gallery_data_cursor', {
    p_gallery_id: galleryId,
    p_after_cursor: null,
    p_limit: 50,
  });

  if (err0) {
    console.warn(`  ⚠️  Cursor RPC not available (Phase 3 not deployed): ${err0.message}\n`);
    return true; // Not a failure, just not deployed
  }

  console.log(`  ✅ Cursor page 0: ${page0.loadedCount} images`);
  console.log(`     Cursor: ${page0.cursor?.substring(0, 30)}...`);

  if (!page0.hasMore) {
    console.log('  ℹ️  No more pages, skipping cursor page 1 test\n');
    return true;
  }

  console.log('  → Testing cursor page 1...');
  const { data: page1, error: err1 } = await supabase.rpc('get_gallery_data_cursor', {
    p_gallery_id: galleryId,
    p_after_cursor: page0.cursor,
    p_limit: 50,
  });

  if (err1) {
    console.error(`  ❌ Cursor page 1 failed: ${err1.message}`);
    return false;
  }

  console.log(`  ✅ Cursor page 1: ${page1.loadedCount} images`);

  // Verify cursor consistency (no overlaps)
  const page0Ids = new Set(page0.images.map(img => img.id));
  const page1Ids = new Set(page1.images.map(img => img.id));
  const overlap = [...page1Ids].filter(id => page0Ids.has(id));

  if (overlap.length > 0) {
    console.error(`  ❌ Cursor pagination has ${overlap.length} duplicate images`);
    return false;
  }

  console.log(`  ✅ Cursor pagination: no duplicates\n`);
  return true;
}

// ═══════════════════════════════════════════
// Test 4: Performance Benchmark
// ═══════════════════════════════════════════

console.log('📋 Test 4: Performance Benchmark');

async function testPerformance() {
  const pageSizes = [50, 100, 200];
  const results = [];

  for (const pageSize of pageSizes) {
    const start = Date.now();
    const { data, error } = await supabase.rpc('get_gallery_data_v2', {
      p_gallery_id: galleryId,
      p_limit: pageSize,
      p_offset: 0,
    });
    const duration = Date.now() - start;

    if (error) {
      console.error(`  ❌ PageSize ${pageSize} failed: ${error.message}`);
      continue;
    }

    results.push({ pageSize, duration, images: data.loadedCount });
    console.log(`  ✅ PageSize ${pageSize}: ${duration}ms (${data.loadedCount} images)`);
  }

  // Calculate efficiency (images per ms)
  const bestEfficiency = results.reduce((best, curr) => {
    const efficiency = curr.images / curr.duration;
    return efficiency > best.efficiency ? { pageSize: curr.pageSize, efficiency } : best;
  }, { pageSize: 0, efficiency: 0 });

  console.log(`  🏆 Most efficient: pageSize=${bestEfficiency.pageSize} (${bestEfficiency.efficiency.toFixed(2)} images/ms)\n`);
  return true;
}

// ═══════════════════════════════════════════
// Run All Tests
// ═══════════════════════════════════════════

async function runTests() {
  const tests = [
    { name: 'Offset Pagination', fn: testOffsetPagination },
    { name: 'Metadata Consistency', fn: testMetadataConsistency },
    { name: 'Cursor Pagination', fn: testCursorPagination },
    { name: 'Performance', fn: testPerformance },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (err) {
      console.error(`  ❌ Test crashed: ${err.message}\n`);
      failed++;
    }
  }

  console.log('═══════════════════════════════════════════');
  console.log(`✅ Passed: ${passed}/${tests.length}`);
  console.log(`❌ Failed: ${failed}/${tests.length}`);
  console.log('═══════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
