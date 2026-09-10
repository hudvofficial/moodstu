---
title: "Thân hàm DB — gallery"
tags: [sinh-tu-dong, db, ham, gallery]
cap-nhat: 2026-09-07
trang-thai: sinh-tu-dong
nguon: pg_proc · pg_policies · information_schema.role_table_grants
---

> ⚙️ **File này do `scripts/vault-gen-db-truth.mjs` sinh ra từ database production. ĐỪNG sửa tay** — chạy lại script để cập nhật.

# Thân hàm DB — gallery

6 hàm. `SECURITY DEFINER` = chạy bằng quyền chủ hàm, **bỏ qua RLS** → hàm loại này phải tự kiểm quyền bên trong.

| Hàm | Tham số | Trả về | Quyền | Ngôn ngữ |
|---|---|---|---|---|
| [`get_gallery_data_v2`](#get_gallery_data_v2) | `p_gallery_id uuid, p_limit integer, p_offset integer` | `jsonb` | invoker | plpgsql |
| [`get_gallery_data_v3`](#get_gallery_data_v3) | `p_gallery_id uuid, p_limit integer, p_offset integer` | `jsonb` | invoker | plpgsql |
| [`get_gallery_summaries_by_contract`](#get_gallery_summaries_by_contract) | `p_contract_id uuid` | `jsonb` | invoker | sql |
| [`prepare_gallery_share`](#prepare_gallery_share) | `p_gallery_id uuid, p_user_id uuid` | `jsonb` | **DEFINER** | plpgsql |
| [`set_gallery_password`](#set_gallery_password) | `p_gallery_id uuid, p_password text` | `jsonb` | **DEFINER** | plpgsql |
| [`verify_gallery_password`](#verify_gallery_password) | `p_gallery_id uuid, p_password text` | `boolean` | **DEFINER** | plpgsql |

---

## get_gallery_data_v2

`get_gallery_data_v2(p_gallery_id uuid, p_limit integer, p_offset integer)` → `jsonb` · SECURITY INVOKER · plpgsql · STABLE

```sql
DECLARE
  v_images jsonb;
  v_total_count integer;
  v_reactions jsonb;
  v_comment_counts jsonb;
  v_total_comments integer;
  v_albums jsonb;
  v_loaded_count integer;
BEGIN
  -- 1) Images with dynamic pagination
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
    LIMIT p_limit OFFSET p_offset
  ) gi;

  -- Count loaded images
  v_loaded_count := COALESCE(jsonb_array_length(v_images), 0);

  -- Total count for pagination metadata
  SELECT count(*)::integer
  INTO v_total_count
  FROM gallery_images
  WHERE gallery_id = p_gallery_id;

  -- 2) Reactions aggregated by image_id (load ALL reactions for consistency)
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

  -- 3) Comment counts per image (load ALL comments for consistency)
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

  -- 4) Albums with image counts (load ALL albums - typically <10 per gallery)
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

  -- Return combined result with accurate pagination metadata
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
```

---

## get_gallery_data_v3

`get_gallery_data_v3(p_gallery_id uuid, p_limit integer, p_offset integer)` → `jsonb` · SECURITY INVOKER · plpgsql · STABLE

```sql
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
```

---

## get_gallery_summaries_by_contract

`get_gallery_summaries_by_contract(p_contract_id uuid)` → `jsonb` · SECURITY INVOKER · sql · STABLE

```sql
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
```

---

## prepare_gallery_share

`prepare_gallery_share(p_gallery_id uuid, p_user_id uuid)` → `jsonb` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
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
```

---

## set_gallery_password

`set_gallery_password(p_gallery_id uuid, p_password text)` → `jsonb` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
DECLARE
  v_password text := NULLIF(btrim(COALESCE(p_password, '')), '');
  v_has_password boolean;
  v_access_version integer;
BEGIN
  IF p_gallery_id IS NULL THEN
    RAISE EXCEPTION 'Gallery id is required';
  END IF;

  UPDATE public.galleries
  SET password = NULL,
      password_hash = CASE
        WHEN v_password IS NULL THEN NULL
        ELSE extensions.crypt(v_password, extensions.gen_salt('bf'))
      END,
      password_updated_at = CASE
        WHEN v_password IS NULL THEN NULL
        ELSE now()
      END,
      access_version = COALESCE(access_version, 1) + 1,
      updated_at = now()
  WHERE id = p_gallery_id
  RETURNING password_hash IS NOT NULL, access_version
  INTO v_has_password, v_access_version;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Gallery not found';
  END IF;

  RETURN jsonb_build_object(
    'has_password', v_has_password,
    'access_version', v_access_version
  );
END;
```

---

## verify_gallery_password

`verify_gallery_password(p_gallery_id uuid, p_password text)` → `boolean` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
DECLARE
  v_hash text;
BEGIN
  IF p_gallery_id IS NULL OR NULLIF(btrim(COALESCE(p_password, '')), '') IS NULL THEN
    RETURN false;
  END IF;

  SELECT password_hash
  INTO v_hash
  FROM public.galleries
  WHERE id = p_gallery_id
    AND status = 'shared';

  IF v_hash IS NULL THEN
    RETURN false;
  END IF;

  RETURN v_hash = extensions.crypt(p_password, v_hash);
END;
```
