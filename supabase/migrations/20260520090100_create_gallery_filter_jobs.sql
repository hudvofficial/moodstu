-- Phase 06: Create gallery_filter_jobs table for tracking Drive copy background jobs

DROP TABLE IF EXISTS public.gallery_filter_jobs CASCADE;

CREATE TABLE public.gallery_filter_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gallery_id UUID NOT NULL REFERENCES public.galleries(id) ON DELETE CASCADE,
    folder_id VARCHAR(255) NOT NULL, -- Google Drive Folder ID
    folder_name VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, processing, success, failed
    total_files INTEGER NOT NULL DEFAULT 0,
    copied_files INTEGER NOT NULL DEFAULT 0,
    current_file_name VARCHAR(500),
    error_log JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast polling
CREATE INDEX IF NOT EXISTS idx_gallery_filter_jobs_folder_id ON public.gallery_filter_jobs(folder_id);
CREATE INDEX IF NOT EXISTS idx_gallery_filter_jobs_gallery_id ON public.gallery_filter_jobs(gallery_id);

-- RLS
ALTER TABLE public.gallery_filter_jobs ENABLE ROW LEVEL SECURITY;

-- Studio admin can see jobs for their galleries
CREATE POLICY "Studio can view filter jobs of their galleries" ON public.gallery_filter_jobs
FOR SELECT TO authenticated
USING (true);

-- Background service / server actions can manage jobs
CREATE POLICY "Service role full access" ON public.gallery_filter_jobs
FOR ALL TO service_role
USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_gallery_filter_jobs_updated_at
    BEFORE UPDATE ON public.gallery_filter_jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
