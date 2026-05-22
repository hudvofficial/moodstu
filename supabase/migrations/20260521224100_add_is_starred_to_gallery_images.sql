-- Add is_starred to gallery_images
ALTER TABLE public.gallery_images ADD COLUMN IF NOT EXISTS is_starred boolean DEFAULT false;
ALTER TABLE public.gallery_images ADD COLUMN IF NOT EXISTS starred_at timestamptz;

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_gallery_images_gallery_starred
  ON public.gallery_images(gallery_id, is_starred, sort_order);
