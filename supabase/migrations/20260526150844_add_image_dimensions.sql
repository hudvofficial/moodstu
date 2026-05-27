-- Add width and height columns for pre-calculated masonry layouts
ALTER TABLE gallery_images 
ADD COLUMN IF NOT EXISTS width INTEGER,
ADD COLUMN IF NOT EXISTS height INTEGER;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_gallery_images_dimensions 
ON gallery_images(width, height) 
WHERE width IS NOT NULL AND height IS NOT NULL;

-- Add comment
COMMENT ON COLUMN gallery_images.width IS 'Image width in pixels for masonry layout calculation';
COMMENT ON COLUMN gallery_images.height IS 'Image height in pixels for masonry layout calculation';
