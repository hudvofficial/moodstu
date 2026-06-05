-- ============================================================================
-- Gallery Data V3 — Same as V2 + select blur_hash + blur_data_url
-- Purpose: trả thêm blur fields để skeleton tile hiện blurhash thay vì gradient xám.
-- Pre-condition: gallery_images.blur_hash + blur_data_url columns đã tồn tại
--                (migration 20260527100000_add_blurhash_column.sql).
-- Non-destructive: CREATE OR REPLACE function MỚI, KHÔNG drop v2.
-- Rollback: revert server action code → function v3 idle, không ai gọi.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_gallery_data_v3(
  p_gallery_id uuid,
  p_limit integer DEFAULT 200,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
  v_images jsonb;
  v_total_count integer;
  v_reactions jsonb;
  v_comment_counts jsonb;
  v_total_comments integer;
  v_albums jsonb;
  v_loaded_count integer;
BEGIN
  -- 1) Images with dynamic pagination + blur fields
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', gi.id,
      'gallery_id', gi.gallery_id,
      'file_name', gi.file_name,
      'file_group', gi.file_group,
      'image_url', gi.image_url,
      'thumbnail_url', gi.thumbnail_url,
      'drive_file_id', gi.drive_file_id,
      'width', gi.width,
      'height', gi.height,
      'is_selected', gi.is_selected,
      'is_starred', gi.is_starred,
      'starred_at', gi.starred_at,
      'selected_at', gi.selected_at,
      'client_note', gi.client_note,
      'album_id', gi.album_id,
      'sort_order', gi.sort_order,
      'created_at', gi.created_at,
      'blur_hash', gi.blur_hash,
      'blur_data_url', gi.blur_data_url
    ) ORDER BY gi.sort_order ASC, gi.created_at ASC
  )
  INTO v_images
  FROM (
    SELECT * FROM gallery_images
    WHERE gallery_id = p_gallery_id
    ORDER BY sort_order ASC, created_at ASC
    LIMIT p_limit OFFSET p_offset
  ) gi;

  v_loaded_count := COALESCE(jsonb_array_length(v_images), 0);

  -- Total count
  SELECT count(*)::integer
  INTO v_total_count
  FROM gallery_images
  WHERE gallery_id = p_gallery_id;

  -- 2) Reactions aggregated by image_id
  SELECT jsonb_object_agg(
    image_id::text,
    jsonb_build_object(
      'hearts', hearts_count,
      'stars', stars_count
    )
  )
  INTO v_reactions
  FROM (
    SELECT
      image_id,
      count(*) FILTER (WHERE reaction_type = 'heart') AS hearts_count,
      count(*) FILTER (WHERE reaction_type = 'star') AS stars_count
    FROM gallery_reactions
    WHERE gallery_id = p_gallery_id
    GROUP BY image_id
  ) r;

  -- 3) Comment counts per image
  SELECT
    jsonb_object_agg(image_id::text, comment_count),
    COALESCE(sum(comment_count), 0)::integer
  INTO v_comment_counts, v_total_comments
  FROM (
    SELECT image_id, count(*)::integer AS comment_count
    FROM gallery_comments
    WHERE gallery_id = p_gallery_id
    GROUP BY image_id
  ) c;

  -- 4) Albums with image counts
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', ga.id,
      'gallery_id', ga.gallery_id,
      'title', ga.title,
      'description', ga.description,
      'cover_image_id', ga.cover_image_id,
      'sort_order', ga.sort_order,
      'created_at', ga.created_at,
      'imageCount', COALESCE(ic.img_count, 0)
    ) ORDER BY ga.sort_order ASC, ga.created_at ASC
  )
  INTO v_albums
  FROM gallery_albums ga
  LEFT JOIN (
    SELECT album_id, count(*)::integer AS img_count
    FROM gallery_images
    WHERE gallery_id = p_gallery_id AND album_id IS NOT NULL
    GROUP BY album_id
  ) ic ON ga.id = ic.album_id
  WHERE ga.gallery_id = p_gallery_id;

  RETURN jsonb_build_object(
    'images', COALESCE(v_images, '[]'::jsonb),
    'totalCount', COALESCE(v_total_count, 0),
    'hasMore', (p_offset + v_loaded_count) < COALESCE(v_total_count, 0),
    'page', p_offset / NULLIF(p_limit, 0),
    'pageSize', p_limit,
    'loadedCount', v_loaded_count,
    'reactionCounts', COALESCE(v_reactions, '{}'::jsonb),
    'commentCountsPerImage', COALESCE(v_comment_counts, '{}'::jsonb),
    'totalCommentCount', COALESCE(v_total_comments, 0),
    'albums', COALESCE(v_albums, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_gallery_data_v3(uuid, integer, integer) TO authenticated;

COMMENT ON FUNCTION get_gallery_data_v3(uuid, integer, integer) IS
'V3 of gallery data fetch — V2 + blur_hash + blur_data_url for instant skeleton placeholders.
Created 2026-06-06 — supersedes V2 when blur backfill applied.
Non-destructive: V2 kept active as fallback.';
