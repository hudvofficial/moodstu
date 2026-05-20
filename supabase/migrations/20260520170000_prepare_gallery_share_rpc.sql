-- Atomic gallery share preparation.
-- The app calls this after server-side auth/permission checks. If this
-- migration is not applied yet, the server action falls back to TypeScript.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.prepare_gallery_share(
  p_gallery_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_gallery record;
  v_links jsonb;
BEGIN
  IF p_gallery_id IS NULL THEN
    RAISE EXCEPTION 'Gallery id is required';
  END IF;

  UPDATE public.galleries
  SET
    status = 'shared',
    shared_at = COALESCE(shared_at, now()),
    updated_at = CASE
      WHEN status IS DISTINCT FROM 'shared' THEN now()
      ELSE updated_at
    END
  WHERE id = p_gallery_id
  RETURNING
    id,
    status,
    title,
    access_url,
    password,
    password_hash
  INTO v_gallery;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Gallery not found';
  END IF;

  INSERT INTO public.gallery_share_links (
    gallery_id,
    slug,
    capability,
    status,
    created_by
  )
  SELECT
    p_gallery_id,
    caps.capability || '-' || encode(gen_random_bytes(9), 'hex'),
    caps.capability,
    'active',
    p_user_id
  FROM (VALUES ('select'), ('view'), ('download')) AS caps(capability)
  ON CONFLICT (gallery_id, capability) DO UPDATE
  SET
    slug = CASE
      WHEN public.gallery_share_links.status = 'disabled' THEN EXCLUDED.slug
      ELSE public.gallery_share_links.slug
    END,
    status = 'active',
    access_version = CASE
      WHEN public.gallery_share_links.status = 'disabled'
        THEN public.gallery_share_links.access_version + 1
      ELSE public.gallery_share_links.access_version
    END,
    updated_at = CASE
      WHEN public.gallery_share_links.status = 'disabled'
        THEN now()
      ELSE public.gallery_share_links.updated_at
    END
  WHERE public.gallery_share_links.status <> 'active';

  SELECT COALESCE(jsonb_agg(to_jsonb(link_row) ORDER BY link_row.sort_order), '[]'::jsonb)
  INTO v_links
  FROM (
    SELECT
      gsl.*,
      CASE gsl.capability
        WHEN 'select' THEN 1
        WHEN 'view' THEN 2
        WHEN 'download' THEN 3
        ELSE 99
      END AS sort_order
    FROM public.gallery_share_links gsl
    WHERE gsl.gallery_id = p_gallery_id
      AND gsl.status = 'active'
  ) link_row;

  RETURN jsonb_build_object(
    'galleryId', v_gallery.id,
    'status', v_gallery.status,
    'title', v_gallery.title,
    'accessUrl', v_gallery.access_url,
    'hasPassword', (v_gallery.password_hash IS NOT NULL OR v_gallery.password IS NOT NULL),
    'shareLinks', v_links
  );
END;
$$;

REVOKE ALL ON FUNCTION public.prepare_gallery_share(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_gallery_share(uuid, uuid) TO service_role;

COMMIT;
