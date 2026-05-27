-- Fix BlurHash Schema Cache Issue
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/mnoqeluywookswpcykha/sql/new

-- ═══════════════════════════════════════════════════════════════
-- STEP 1: Verify Column Exists
-- ═══════════════════════════════════════════════════════════════

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'gallery_images'
  AND column_name IN ('blur_hash', 'blur_data_url');

-- Expected: 2 rows (blur_hash, blur_data_url)
-- If not found → run STEP 2
-- If found → skip to STEP 3

-- ═══════════════════════════════════════════════════════════════
-- STEP 2: Create Columns (if not exists)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE gallery_images
ADD COLUMN IF NOT EXISTS blur_hash TEXT,
ADD COLUMN IF NOT EXISTS blur_data_url TEXT;

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_gallery_images_blur_hash_present
ON gallery_images(id)
WHERE blur_hash IS NOT NULL;

-- Add helpful comments
COMMENT ON COLUMN gallery_images.blur_hash IS 'BlurHash string for instant image placeholder (~20 chars)';
COMMENT ON COLUMN gallery_images.blur_data_url IS 'Pre-computed PNG data URL from BlurHash for SSR-safe rendering';

-- ═══════════════════════════════════════════════════════════════
-- STEP 3: Refresh Schema Cache (CRITICAL!)
-- ═══════════════════════════════════════════════════════════════

-- Option A: Notify PostgREST to refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Option B: If Option A doesn't work, restart PostgREST from Dashboard:
-- Go to: Project Settings → API → Restart API

-- ═══════════════════════════════════════════════════════════════
-- STEP 4: Verify Schema Cache Updated
-- ═══════════════════════════════════════════════════════════════

-- Check columns are visible to PostgREST
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'gallery_images'
  AND column_name LIKE 'blur%';

-- Expected: 2 rows
-- blur_hash | text
-- blur_data_url | text

-- ═══════════════════════════════════════════════════════════════
-- STEP 5: Test Insert (Validation)
-- ═══════════════════════════════════════════════════════════════

-- Test that columns are writable (use a fake gallery_id)
-- DELETE THIS TEST ROW AFTER!

DO $$
DECLARE
  test_gallery_id uuid;
BEGIN
  -- Find any existing gallery
  SELECT id INTO test_gallery_id FROM galleries LIMIT 1;

  IF test_gallery_id IS NOT NULL THEN
    -- Insert test image
    INSERT INTO gallery_images (
      gallery_id,
      drive_file_id,
      file_name,
      image_url,
      thumbnail_url,
      sort_order,
      blur_hash,
      blur_data_url
    ) VALUES (
      test_gallery_id,
      'TEST_FILE_ID_DELETE_ME',
      'test_blurhash.jpg',
      'https://example.com/test.jpg',
      'https://example.com/test_thumb.jpg',
      99999,
      'LKO2?U%2Tw=w]~RBVZRi};RPxuwH', -- Valid BlurHash
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' -- 1x1 transparent PNG
    );

    RAISE NOTICE 'Test insert successful! Columns are writable.';

    -- Clean up test data
    DELETE FROM gallery_images
    WHERE drive_file_id = 'TEST_FILE_ID_DELETE_ME';

    RAISE NOTICE 'Test cleanup complete.';
  ELSE
    RAISE NOTICE 'No galleries found to test with.';
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- STEP 6: Check Current State
-- ═══════════════════════════════════════════════════════════════

-- Count images with/without BlurHash
SELECT
  COUNT(*) as total_images,
  COUNT(blur_hash) as images_with_blurhash,
  COUNT(blur_data_url) as images_with_dataurl,
  COUNT(*) - COUNT(blur_hash) as images_without_blurhash
FROM gallery_images;

-- Sample some images to see current state
SELECT
  id,
  file_name,
  CASE
    WHEN blur_hash IS NOT NULL THEN '✅ Has BlurHash'
    ELSE '❌ Missing BlurHash'
  END as blurhash_status,
  CASE
    WHEN blur_data_url IS NOT NULL THEN '✅ Has Data URL'
    ELSE '❌ Missing Data URL'
  END as dataurl_status
FROM gallery_images
LIMIT 20;

-- ═══════════════════════════════════════════════════════════════
-- DONE! ✅
-- ═══════════════════════════════════════════════════════════════

-- If all steps succeeded:
-- 1. ✅ Columns exist
-- 2. ✅ Schema cache refreshed
-- 3. ✅ Columns are writable
-- 4. ✅ Ready for backfill

-- Next: Run backfill script from terminal:
-- cd "c:\Users\Admin\Desktop\Ai\mood saas\mood-studio"
-- node scripts/backfill-blurhash.mjs

-- Or for single gallery:
-- node scripts/backfill-blurhash.mjs <gallery-id>

-- Or with limit:
-- node scripts/backfill-blurhash.mjs --limit=100
