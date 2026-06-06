-- Run this in Supabase SQL Editor to add blur_data_url column
-- https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new

-- Add blur_data_url column (if not exists)
ALTER TABLE gallery_images
ADD COLUMN IF NOT EXISTS blur_data_url TEXT;

-- Add comment
COMMENT ON COLUMN gallery_images.blur_data_url IS 'Pre-computed PNG data URL from BlurHash for SSR-safe rendering';

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'gallery_images'
AND column_name IN ('blur_hash', 'blur_data_url');
