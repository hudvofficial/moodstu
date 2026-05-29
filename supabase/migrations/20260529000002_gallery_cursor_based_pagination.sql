-- ============================================================================
-- Gallery Cursor-Based Pagination - Future-proof for real-time sync
-- Why: Prevents data shift when new images are uploaded during browsing
-- Trade-off: More complex queries, but consistent pagination
-- ============================================================================

-- Add cursor column (generated from sort_order + created_at + id)
ALTER TABLE gallery_images
ADD COLUMN IF NOT EXISTS cursor_id text
GENERATED ALWAYS AS (
  lpad(COALESCE(sort_order, 0)::text, 10, '0') || '-' ||
  created_at::text || '-' ||
  id::text
) STORED;

-- Index for efficient cursor-based queries
CREATE INDEX IF NOT EXISTS idx_gallery_images_cursor
ON gallery_images(gallery_id, cursor_id);

-- Create cursor-based RPC function
CREATE OR REPLACE FUNCTION get_gallery_data_cursor(
  p_gallery_id uuid,
  p_after_cursor text DEFAULT NULL,
  p_limit integer DEFAULT 200
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
  v_last_cursor text;
BEGIN
  -- Total count (for progress indicators)
  SELECT count(*)::integer
  INTO v_total_count
  FROM gallery_images
  WHERE gallery_id = p_gallery_id;

  -- 1) Cursor-based image query
  IF p_after_cursor IS NULL THEN
    -- Initial load: first page
    SELECT
      jsonb_agg(
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
          'blur_data_url', gi.blur_data_url,
          'cursor_id', gi.cursor_id
        ) ORDER BY gi.cursor_id ASC
      ),
      max(gi.cursor_id)
    INTO v_images, v_last_cursor
    FROM (
      SELECT * FROM gallery_images
      WHERE gallery_id = p_gallery_id
      ORDER BY cursor_id ASC
      LIMIT p_limit
    ) gi;
  ELSE
    -- Subsequent loads: after cursor
    SELECT
      jsonb_agg(
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
          'blur_data_url', gi.blur_data_url,
          'cursor_id', gi.cursor_id
        ) ORDER BY gi.cursor_id ASC
      ),
      max(gi.cursor_id)
    INTO v_images, v_last_cursor
    FROM (
      SELECT * FROM gallery_images
      WHERE gallery_id = p_gallery_id
        AND cursor_id > p_after_cursor
      ORDER BY cursor_id ASC
      LIMIT p_limit
    ) gi;
  END IF;

  v_loaded_count := COALESCE(jsonb_array_length(v_images), 0);

  -- 2) Reactions (load ALL for consistency)
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

  -- 3) Comments (load ALL for consistency)
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

  -- 4) Albums (load ALL - typically <10 per gallery)
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

  -- Return with cursor metadata
  RETURN jsonb_build_object(
    'images', COALESCE(v_images, '[]'::jsonb),
    'totalCount', COALESCE(v_total_count, 0),
    'hasMore', v_loaded_count >= p_limit,
    'cursor', v_last_cursor,
    'loadedCount', v_loaded_count,
    'reactionCounts', COALESCE(v_reactions, '{}'::jsonb),
    'commentCountsPerImage', COALESCE(v_comment_counts, '{}'::jsonb),
    'totalCommentCount', COALESCE(v_total_comments, 0),
    'albums', COALESCE(v_albums, '[]'::jsonb)
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_gallery_data_cursor(uuid, text, integer) TO authenticated;

COMMENT ON FUNCTION get_gallery_data_cursor(uuid, text, integer) IS
'Cursor-based gallery data fetch for real-time consistency. Prevents data shift when new images are uploaded during browsing. Returns cursor for next page.';

COMMENT ON COLUMN gallery_images.cursor_id IS
'Generated cursor for pagination. Format: {sort_order}-{created_at}-{id}. Used by get_gallery_data_cursor RPC.';
