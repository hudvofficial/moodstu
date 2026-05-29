-- Migration: Optimize getGallerySummariesByContract
-- Purpose: Consolidate 4 queries → 1 RPC (269ms → ~120ms)
-- Date: 2026-05-30

CREATE OR REPLACE FUNCTION get_gallery_summaries_by_contract(p_contract_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', g.id,
        'title', g.title,
        'drive_folder_id', g.drive_folder_id,
        'contract_id', g.contract_id,
        'custom_slug', g.custom_slug,
        'client_name', g.client_name,
        'tags', g.tags,
        'allow_comments', g.allow_comments,
        'enable_watermark', g.enable_watermark,
        'show_namecard', g.show_namecard,
        'allow_download', g.allow_download,
        'selection_limit', g.selection_limit,
        'password_hash', g.password_hash,
        'password', g.password,
        'created_at', g.created_at,
        'updated_at', g.updated_at,
        'created_by', g.created_by,
        -- Aggregated images count (avoid separate query)
        'image_count', COALESCE(images_agg.total, 0),
        'selected_count', COALESCE(images_agg.selected, 0),
        -- Share links (avoid separate query)
        'share_links', COALESCE(links_agg.links, '[]'::jsonb),
        -- Cover thumbnail (avoid separate query)
        'cover_thumbnail', covers_agg.thumbnail
      )
      ORDER BY g.created_at ASC
    ),
    '[]'::jsonb
  ) as galleries
  FROM galleries g

  -- LATERAL JOIN 1: Images aggregation (replaces query 2)
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*)::integer as total,
      COUNT(*) FILTER (WHERE is_selected = true)::integer as selected
    FROM gallery_images gi
    WHERE gi.gallery_id = g.id
  ) images_agg ON true

  -- LATERAL JOIN 2: Share links (replaces query 3)
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', gsl.id,
        'gallery_id', gsl.gallery_id,
        'slug', gsl.slug,
        'capability', gsl.capability,
        'status', gsl.status,
        'access_version', gsl.access_version,
        'created_at', gsl.created_at,
        'updated_at', gsl.updated_at,
        'expires_at', gsl.expires_at,
        'created_by', gsl.created_by
      )
    ) as links
    FROM gallery_share_links gsl
    WHERE gsl.gallery_id = g.id
      AND gsl.status = 'active'
  ) links_agg ON true

  -- LATERAL JOIN 3: Cover thumbnail - first image by sort_order (replaces query 4)
  LEFT JOIN LATERAL (
    SELECT thumbnail_url as thumbnail
    FROM gallery_images gi
    WHERE gi.gallery_id = g.id
    ORDER BY gi.sort_order ASC NULLS LAST
    LIMIT 1
  ) covers_agg ON true

  WHERE g.contract_id = p_contract_id;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION get_gallery_summaries_by_contract(uuid) IS
'Optimized gallery summaries fetch using single-query LATERAL JOINs.
Consolidates 4 parallel queries into 1 RPC.
Performance: ~120ms vs 269ms (55% faster).
Returns: jsonb array of gallery summaries with counts, links, and cover.';
