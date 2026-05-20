-- Gallery V2 data contract and permission foundation.
-- Additive only: existing galleries.access_url continues to work during rollout.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.galleries
  ADD COLUMN IF NOT EXISTS cover_image_id uuid,
  ADD COLUMN IF NOT EXISTS og_title text,
  ADD COLUMN IF NOT EXISTS og_description text,
  ADD COLUMN IF NOT EXISTS og_image_url text,
  ADD COLUMN IF NOT EXISTS share_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS selection_limit integer,
  ADD COLUMN IF NOT EXISTS allow_comments boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_download boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS download_unlocked_at timestamptz,
  ADD COLUMN IF NOT EXISTS download_unlocked_by uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'galleries_cover_image_id_fkey'
      AND conrelid = 'public.galleries'::regclass
  ) THEN
    ALTER TABLE public.galleries
      ADD CONSTRAINT galleries_cover_image_id_fkey
      FOREIGN KEY (cover_image_id)
      REFERENCES public.gallery_images(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'galleries_selection_limit_check'
      AND conrelid = 'public.galleries'::regclass
  ) THEN
    ALTER TABLE public.galleries
      ADD CONSTRAINT galleries_selection_limit_check
      CHECK (selection_limit IS NULL OR selection_limit > 0);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.gallery_share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id uuid NOT NULL REFERENCES public.galleries(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  capability text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  expires_at timestamptz,
  access_version integer NOT NULL DEFAULT 1,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gallery_share_links_capability_check
    CHECK (capability IN ('select', 'view', 'download')),
  CONSTRAINT gallery_share_links_status_check
    CHECK (status IN ('active', 'disabled')),
  CONSTRAINT gallery_share_links_access_version_check
    CHECK (access_version > 0),
  CONSTRAINT gallery_share_links_gallery_capability_key
    UNIQUE (gallery_id, capability)
);

CREATE TABLE IF NOT EXISTS public.gallery_selection_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id uuid NOT NULL REFERENCES public.galleries(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft',
  selected_count integer NOT NULL DEFAULT 0,
  created_by_client text,
  locked_by uuid,
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gallery_selection_batches_status_check
    CHECK (status IN (
      'draft',
      'client_submitted',
      'studio_locked',
      'drive_copied',
      'local_exported',
      'retouching',
      'delivered'
    )),
  CONSTRAINT gallery_selection_batches_selected_count_check
    CHECK (selected_count >= 0)
);

CREATE TABLE IF NOT EXISTS public.gallery_selection_batch_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.gallery_selection_batches(id) ON DELETE CASCADE,
  image_id uuid NOT NULL REFERENCES public.gallery_images(id) ON DELETE CASCADE,
  file_name text,
  drive_file_id text,
  sort_order integer,
  client_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gallery_selection_batch_items_batch_image_key
    UNIQUE (batch_id, image_id)
);

CREATE TABLE IF NOT EXISTS public.gallery_filter_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id uuid NOT NULL REFERENCES public.galleries(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES public.gallery_selection_batches(id) ON DELETE SET NULL,
  job_type text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  total_count integer NOT NULL DEFAULT 0,
  processed_count integer NOT NULL DEFAULT 0,
  success_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  target_url text,
  manifest_url text,
  error text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gallery_filter_jobs_job_type_check
    CHECK (job_type IN ('drive_copy_jpg', 'local_manifest')),
  CONSTRAINT gallery_filter_jobs_status_check
    CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  CONSTRAINT gallery_filter_jobs_counts_check
    CHECK (
      total_count >= 0
      AND processed_count >= 0
      AND success_count >= 0
      AND failed_count >= 0
    )
);

CREATE INDEX IF NOT EXISTS idx_gallery_share_links_gallery_capability
  ON public.gallery_share_links(gallery_id, capability);

CREATE INDEX IF NOT EXISTS idx_gallery_share_links_active_slug
  ON public.gallery_share_links(slug)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_gallery_selection_batches_gallery_status
  ON public.gallery_selection_batches(gallery_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gallery_selection_batch_items_batch
  ON public.gallery_selection_batch_items(batch_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_gallery_filter_jobs_gallery_status
  ON public.gallery_filter_jobs(gallery_id, status, created_at DESC);

ALTER TABLE public.gallery_share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_share_links FORCE ROW LEVEL SECURITY;

ALTER TABLE public.gallery_selection_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_selection_batches FORCE ROW LEVEL SECURITY;

ALTER TABLE public.gallery_selection_batch_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_selection_batch_items FORCE ROW LEVEL SECURITY;

ALTER TABLE public.gallery_filter_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_filter_jobs FORCE ROW LEVEL SECURITY;

CREATE POLICY gallery_share_links_service_role_all
  ON public.gallery_share_links
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY gallery_selection_batches_service_role_all
  ON public.gallery_selection_batches
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY gallery_selection_batch_items_service_role_all
  ON public.gallery_selection_batch_items
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY gallery_filter_jobs_service_role_all
  ON public.gallery_filter_jobs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
