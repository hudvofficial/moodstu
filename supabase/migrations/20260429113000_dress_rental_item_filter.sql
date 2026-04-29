-- Add item-level filtering for standalone dress rentals.

BEGIN;

DROP FUNCTION IF EXISTS public.dress_rental_list(text, text, integer, integer);

CREATE OR REPLACE FUNCTION public.dress_rental_list(
  p_status text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_limit integer DEFAULT 20,
  p_item_id uuid DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_page integer := GREATEST(COALESCE(p_page, 1), 1);
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100);
  v_offset integer;
  v_total integer;
  v_rentals jsonb;
  v_search text := NULLIF(BTRIM(COALESCE(p_search, '')), '');
BEGIN
  v_offset := (v_page - 1) * v_limit;

  WITH filtered AS (
    SELECT dr.*, d.name AS item_name, d.item_code, d.image_url AS item_image
    FROM public.dress_rentals dr
    JOIN public.dresses d ON d.id = dr.item_id
    WHERE (p_item_id IS NULL OR dr.item_id = p_item_id)
      AND (p_status IS NULL OR dr.status = p_status)
      AND (
        v_search IS NULL
        OR dr.customer_name ILIKE ('%' || v_search || '%')
        OR dr.phone ILIKE ('%' || v_search || '%')
        OR d.name ILIKE ('%' || v_search || '%')
        OR d.item_code ILIKE ('%' || v_search || '%')
      )
  )
  SELECT COUNT(*)::integer INTO v_total FROM filtered;

  WITH filtered AS (
    SELECT dr.*, d.name AS item_name, d.item_code, d.image_url AS item_image
    FROM public.dress_rentals dr
    JOIN public.dresses d ON d.id = dr.item_id
    WHERE (p_item_id IS NULL OR dr.item_id = p_item_id)
      AND (p_status IS NULL OR dr.status = p_status)
      AND (
        v_search IS NULL
        OR dr.customer_name ILIKE ('%' || v_search || '%')
        OR dr.phone ILIKE ('%' || v_search || '%')
        OR d.name ILIKE ('%' || v_search || '%')
        OR d.item_code ILIKE ('%' || v_search || '%')
      )
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(page_rows)), '[]'::jsonb)
  INTO v_rentals
  FROM (
    SELECT *
    FROM filtered
    ORDER BY created_at DESC NULLS LAST
    OFFSET v_offset
    LIMIT v_limit
  ) page_rows;

  RETURN jsonb_build_object(
    'rentals', COALESCE(v_rentals, '[]'::jsonb),
    'total', COALESCE(v_total, 0),
    'page', v_page,
    'limit', v_limit
  );
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

REVOKE ALL ON FUNCTION public.dress_rental_list(text, text, integer, integer, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dress_rental_list(text, text, integer, integer, uuid) TO service_role;

COMMIT;
