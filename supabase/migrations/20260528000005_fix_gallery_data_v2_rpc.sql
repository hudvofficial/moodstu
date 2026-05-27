-- ============================================================================
-- Fix Gallery Data V2 RPC - Add missing image_url and remove non-existent columns
-- Issue: RPC was missing image_url field and referencing non-existent file_path column
-- ============================================================================

CREATE OR REPLACE FUNCTION get_gallery_data_v2(p_gallery_id uuid)
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
BEGIN
  -- 1) Images (first 200, ordered by sort_order)
  -- FIXED: Added image_url, removed file_path, drive_thumbnail_url, mime_type, file_size
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
      'created_at', gi.created_at
    ) ORDER BY gi.sort_order ASC, gi.created_at ASC
  )
  INTO v_images
  FROM (
    SELECT * FROM gallery_images
    WHERE gallery_id = p_gallery_id
    ORDER BY sort_order ASC, created_at ASC
    LIMIT 200
  ) gi;

  -- Total count for pagination
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

  -- Return combined result
  RETURN jsonb_build_object(
    'images', COALESCE(v_images, '[]'::jsonb),
    'totalCount', COALESCE(v_total_count, 0),
    'hasMore', COALESCE(v_total_count, 0) > 200,
    'reactionCounts', COALESCE(v_reactions, '{}'::jsonb),
    'commentCountsPerImage', COALESCE(v_comment_counts, '{}'::jsonb),
    'totalCommentCount', COALESCE(v_total_comments, 0),
    'albums', COALESCE(v_albums, '[]'::jsonb)
  );
END;
$$;

-- Re-grant execute permission
GRANT EXECUTE ON FUNCTION get_gallery_data_v2(uuid) TO authenticated;

COMMENT ON FUNCTION get_gallery_data_v2(uuid) IS
'Optimized gallery data fetch - combines images, reactions, comments, albums in single call. Fixed to include image_url and remove non-existent columns.';
