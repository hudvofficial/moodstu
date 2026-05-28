-- Migration: Add blur_hash to dresses
-- Created at: 2026-05-28
-- Description: Supports BlurHash placeholder for dress images.

ALTER TABLE public.dresses
ADD COLUMN IF NOT EXISTS blur_hash TEXT,
ADD COLUMN IF NOT EXISTS blur_data_url TEXT;

-- Create an index to quickly find dresses without blurhash for backfill scripts (optional but good practice)
CREATE INDEX IF NOT EXISTS idx_dresses_blur_hash ON public.dresses (blur_hash) WHERE image_url IS NOT NULL AND blur_hash IS NULL;
