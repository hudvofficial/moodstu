-- Add blur_hash columns for image placeholders
-- BlurHash: compact representation of image for instant preview
-- blur_data_url: Pre-computed PNG data URL for SSR-safe rendering

ALTER TABLE gallery_images
ADD COLUMN IF NOT EXISTS blur_hash TEXT,
ADD COLUMN IF NOT EXISTS blur_data_url TEXT;

-- Add index for queries that filter by blur_hash presence
CREATE INDEX IF NOT EXISTS idx_gallery_images_blur_hash_present
ON gallery_images(id)
WHERE blur_hash IS NOT NULL;

-- Add comments
COMMENT ON COLUMN gallery_images.blur_hash IS 'BlurHash string for instant image placeholder (~20 chars)';
COMMENT ON COLUMN gallery_images.blur_data_url IS 'Pre-computed PNG data URL from BlurHash for SSR-safe rendering';
