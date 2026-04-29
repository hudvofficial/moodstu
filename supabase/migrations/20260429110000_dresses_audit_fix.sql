-- Dresses audit hardening, atomic booking contracts, and query RPCs.

BEGIN;

ALTER TABLE public.dresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dress_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dress_rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dress_rental_accessories ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.dresses FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.dress_reservations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.dress_rentals FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.dress_rental_accessories FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.dresses TO service_role;
GRANT ALL ON TABLE public.dress_reservations TO service_role;
GRANT ALL ON TABLE public.dress_rentals TO service_role;
GRANT ALL ON TABLE public.dress_rental_accessories TO service_role;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dresses',
  'dresses',
  TRUE,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read dresses images" ON storage.objects;
CREATE POLICY "Public read dresses images" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'dresses');

DROP POLICY IF EXISTS "Managers manage dresses images" ON storage.objects;
CREATE POLICY "Managers manage dresses images" ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'dresses'
    AND EXISTS (
      SELECT 1
      FROM public.employees
      WHERE employees.auth_user_id = auth.uid()
        AND LOWER(COALESCE(employees.role::text, '')) IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    bucket_id = 'dresses'
    AND EXISTS (
      SELECT 1
      FROM public.employees
      WHERE employees.auth_user_id = auth.uid()
        AND LOWER(COALESCE(employees.role::text, '')) IN ('admin', 'manager')
    )
  );

CREATE OR REPLACE FUNCTION public.is_dress_available(
  p_dress_id uuid,
  p_start_date date,
  p_end_date date,
  p_exclude_reservation_id uuid DEFAULT NULL,
  p_exclude_rental_id uuid DEFAULT NULL
) RETURNS boolean AS $$
DECLARE
  v_status text;
BEGIN
  IF p_dress_id IS NULL OR p_start_date IS NULL OR p_end_date IS NULL THEN
    RETURN false;
  END IF;

  IF p_end_date < p_start_date THEN
    RETURN false;
  END IF;

  SELECT status
  INTO v_status
  FROM public.dresses
  WHERE id = p_dress_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_status IN ('maintenance', 'retired', 'cleaning') THEN
    RETURN false;
  END IF;

  RETURN NOT EXISTS (
    SELECT 1
    FROM public.dress_reservations
    WHERE dress_id = p_dress_id
      AND status IN ('reserved', 'in_use', 'rented')
      AND (p_exclude_reservation_id IS NULL OR id <> p_exclude_reservation_id)
      AND start_date <= p_end_date
      AND end_date >= p_start_date
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.dress_rentals
    WHERE item_id = p_dress_id
      AND status IN ('reserved', 'renting', 'overdue')
      AND (p_exclude_rental_id IS NULL OR id <> p_exclude_rental_id)
      AND pickup_date <= p_end_date
      AND return_date >= p_start_date
  );
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.dress_stats()
RETURNS jsonb AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'total', COUNT(*)::integer,
      'available', COUNT(*) FILTER (WHERE status = 'available')::integer,
      'reserved', COUNT(*) FILTER (WHERE status = 'reserved')::integer,
      'rented', COUNT(*) FILTER (WHERE status IN ('rented', 'overdue'))::integer,
      'maintenance', COUNT(*) FILTER (WHERE status IN ('maintenance', 'cleaning'))::integer
    )
    FROM public.dresses
    WHERE deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.dress_list(
  p_search text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_sort text DEFAULT 'newest',
  p_page integer DEFAULT 1,
  p_limit integer DEFAULT 18
) RETURNS jsonb AS $$
DECLARE
  v_page integer := GREATEST(COALESCE(p_page, 1), 1);
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 18), 1), 100);
  v_offset integer;
  v_total integer;
  v_items jsonb;
  v_search text := NULLIF(BTRIM(COALESCE(p_search, '')), '');
BEGIN
  v_offset := (v_page - 1) * v_limit;

  WITH filtered AS (
    SELECT
      id, item_code, name, category, size, color, condition,
      rental_price, sale_price, purchase_price,
      current_stock, min_stock, image_url, status, notes,
      created_at, updated_at, created_by, updated_by, deleted_at
    FROM public.dresses
    WHERE deleted_at IS NULL
      AND (p_category IS NULL OR category = p_category)
      AND (p_status IS NULL OR status = p_status)
      AND (
        v_search IS NULL
        OR name ILIKE ('%' || v_search || '%')
        OR item_code ILIKE ('%' || v_search || '%')
      )
  )
  SELECT COUNT(*)::integer INTO v_total FROM filtered;

  WITH filtered AS (
    SELECT
      id, item_code, name, category, size, color, condition,
      rental_price, sale_price, purchase_price,
      current_stock, min_stock, image_url, status, notes,
      created_at, updated_at, created_by, updated_by, deleted_at
    FROM public.dresses
    WHERE deleted_at IS NULL
      AND (p_category IS NULL OR category = p_category)
      AND (p_status IS NULL OR status = p_status)
      AND (
        v_search IS NULL
        OR name ILIKE ('%' || v_search || '%')
        OR item_code ILIKE ('%' || v_search || '%')
      )
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(page_rows)), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT *
    FROM filtered
    ORDER BY
      CASE WHEN p_sort = 'price_asc' THEN rental_price END ASC NULLS LAST,
      CASE WHEN p_sort = 'price_desc' THEN rental_price END DESC NULLS LAST,
      CASE WHEN p_sort = 'name_asc' THEN name END ASC NULLS LAST,
      created_at DESC
    OFFSET v_offset
    LIMIT v_limit
  ) page_rows;

  RETURN jsonb_build_object(
    'items', COALESCE(v_items, '[]'::jsonb),
    'total', COALESCE(v_total, 0),
    'page', v_page,
    'limit', v_limit
  );
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.dress_rental_list(
  p_status text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_limit integer DEFAULT 20
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
    WHERE (p_status IS NULL OR dr.status = p_status)
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
    WHERE (p_status IS NULL OR dr.status = p_status)
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

CREATE OR REPLACE FUNCTION public.refresh_dress_status_atomic(
  p_dress_id uuid,
  p_user_id uuid DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_current_status text;
  v_deleted_at timestamp with time zone;
  v_next_status text;
BEGIN
  SELECT status, deleted_at
  INTO v_current_status, v_deleted_at
  FROM public.dresses
  WHERE id = p_dress_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dress does not exist';
  END IF;

  IF v_deleted_at IS NOT NULL OR v_current_status IN ('maintenance', 'retired', 'cleaning') THEN
    RETURN jsonb_build_object('dress_id', p_dress_id, 'status', v_current_status);
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.dress_rentals
    WHERE item_id = p_dress_id AND status = 'overdue'
  ) THEN
    v_next_status := 'overdue';
  ELSIF EXISTS (
    SELECT 1 FROM public.dress_rentals
    WHERE item_id = p_dress_id AND status = 'renting'
  ) OR EXISTS (
    SELECT 1 FROM public.dress_reservations
    WHERE dress_id = p_dress_id AND status IN ('in_use', 'rented')
  ) THEN
    v_next_status := 'rented';
  ELSIF EXISTS (
    SELECT 1 FROM public.dress_rentals
    WHERE item_id = p_dress_id AND status = 'reserved'
  ) OR EXISTS (
    SELECT 1 FROM public.dress_reservations
    WHERE dress_id = p_dress_id AND status = 'reserved'
  ) THEN
    v_next_status := 'reserved';
  ELSE
    v_next_status := 'available';
  END IF;

  UPDATE public.dresses
  SET status = v_next_status,
      updated_by = p_user_id,
      updated_at = now()
  WHERE id = p_dress_id;

  RETURN jsonb_build_object('dress_id', p_dress_id, 'status', v_next_status);
END;
$$ LANGUAGE plpgsql VOLATILE SET search_path = public;

CREATE OR REPLACE FUNCTION public.refresh_dress_status(p_dress_id uuid)
RETURNS void AS $$
BEGIN
  PERFORM public.refresh_dress_status_atomic(p_dress_id, NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.trg_refresh_dress_status_from_rental()
RETURNS trigger AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM public.refresh_dress_status(OLD.item_id);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.refresh_dress_status(NEW.item_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_refresh_dress_status_from_rental ON public.dress_rentals;
CREATE TRIGGER trg_refresh_dress_status_from_rental
AFTER INSERT OR UPDATE OR DELETE ON public.dress_rentals
FOR EACH ROW EXECUTE FUNCTION public.trg_refresh_dress_status_from_rental();

CREATE OR REPLACE FUNCTION public.create_standalone_dress_rental_atomic(
  p_item_id uuid,
  p_contract_id uuid DEFAULT NULL,
  p_customer_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_pickup_date date DEFAULT NULL,
  p_return_date date DEFAULT NULL,
  p_rental_price numeric DEFAULT 0,
  p_deposit numeric DEFAULT 0,
  p_accessories text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_status text;
  v_rental_id uuid;
BEGIN
  IF p_pickup_date IS NULL OR p_return_date IS NULL OR p_return_date < p_pickup_date THEN
    RAISE EXCEPTION 'Invalid rental dates';
  END IF;

  SELECT status
  INTO v_status
  FROM public.dresses
  WHERE id = p_item_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dress does not exist';
  END IF;

  IF v_status IN ('maintenance', 'retired', 'cleaning') THEN
    RAISE EXCEPTION 'Dress is not bookable';
  END IF;

  IF NOT public.is_dress_available(p_item_id, p_pickup_date, p_return_date, NULL, NULL) THEN
    RAISE EXCEPTION 'Dress is already booked in this date range';
  END IF;

  INSERT INTO public.dress_rentals (
    item_id, contract_id, customer_name, phone, pickup_date, return_date,
    rental_price, deposit, accessories, notes, status, created_by, created_at, updated_at
  ) VALUES (
    p_item_id, p_contract_id, NULLIF(BTRIM(COALESCE(p_customer_name, '')), ''),
    NULLIF(BTRIM(COALESCE(p_phone, '')), ''), p_pickup_date, p_return_date,
    COALESCE(p_rental_price, 0), COALESCE(p_deposit, 0),
    NULLIF(BTRIM(COALESCE(p_accessories, '')), ''),
    NULLIF(BTRIM(COALESCE(p_notes, '')), ''),
    'reserved', p_user_id, now(), now()
  )
  RETURNING id INTO v_rental_id;

  PERFORM public.refresh_dress_status_atomic(p_item_id, p_user_id);

  RETURN jsonb_build_object('rental_id', v_rental_id, 'dress_id', p_item_id);
END;
$$ LANGUAGE plpgsql VOLATILE SET search_path = public;

CREATE OR REPLACE FUNCTION public.start_dress_rental_atomic(
  p_rental_id uuid,
  p_user_id uuid DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_rental public.dress_rentals%ROWTYPE;
BEGIN
  SELECT *
  INTO v_rental
  FROM public.dress_rentals
  WHERE id = p_rental_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rental does not exist';
  END IF;

  IF v_rental.status <> 'reserved' THEN
    RAISE EXCEPTION 'Rental cannot be started from status %', v_rental.status;
  END IF;

  PERFORM 1 FROM public.dresses WHERE id = v_rental.item_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dress does not exist';
  END IF;

  UPDATE public.dress_rentals
  SET status = 'renting',
      updated_at = now()
  WHERE id = p_rental_id;

  PERFORM public.refresh_dress_status_atomic(v_rental.item_id, p_user_id);

  RETURN jsonb_build_object('rental_id', p_rental_id, 'dress_id', v_rental.item_id);
END;
$$ LANGUAGE plpgsql VOLATILE SET search_path = public;

CREATE OR REPLACE FUNCTION public.return_dress_rental_atomic(
  p_rental_id uuid,
  p_return_condition text,
  p_damage_fee numeric DEFAULT 0,
  p_deposit_returned boolean DEFAULT true,
  p_notes text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_rental public.dress_rentals%ROWTYPE;
  v_current_status text;
BEGIN
  SELECT *
  INTO v_rental
  FROM public.dress_rentals
  WHERE id = p_rental_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rental does not exist';
  END IF;

  IF v_rental.status NOT IN ('renting', 'overdue') THEN
    RAISE EXCEPTION 'Rental cannot be returned from status %', v_rental.status;
  END IF;

  SELECT status
  INTO v_current_status
  FROM public.dresses
  WHERE id = v_rental.item_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dress does not exist';
  END IF;

  IF v_current_status IN ('maintenance', 'retired') THEN
    RAISE EXCEPTION 'Dress lifecycle is protected';
  END IF;

  UPDATE public.dress_rentals
  SET status = 'returned',
      actual_return_date = CURRENT_DATE,
      return_condition = p_return_condition,
      damage_fee = COALESCE(p_damage_fee, 0),
      deposit_returned = COALESCE(p_deposit_returned, true),
      notes = NULLIF(BTRIM(COALESCE(p_notes, '')), ''),
      updated_at = now()
  WHERE id = p_rental_id;

  UPDATE public.dresses
  SET status = 'cleaning',
      updated_by = p_user_id,
      updated_at = now()
  WHERE id = v_rental.item_id
    AND deleted_at IS NULL;

  RETURN jsonb_build_object('rental_id', p_rental_id, 'dress_id', v_rental.item_id);
END;
$$ LANGUAGE plpgsql VOLATILE SET search_path = public;

CREATE OR REPLACE FUNCTION public.cancel_dress_rental_atomic(
  p_rental_id uuid,
  p_user_id uuid DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_rental public.dress_rentals%ROWTYPE;
BEGIN
  SELECT *
  INTO v_rental
  FROM public.dress_rentals
  WHERE id = p_rental_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rental does not exist';
  END IF;

  IF v_rental.status <> 'reserved' THEN
    RAISE EXCEPTION 'Only reserved rentals can be cancelled';
  END IF;

  PERFORM 1 FROM public.dresses WHERE id = v_rental.item_id AND deleted_at IS NULL FOR UPDATE;

  UPDATE public.dress_rentals
  SET status = 'cancelled',
      updated_at = now()
  WHERE id = p_rental_id;

  PERFORM public.refresh_dress_status_atomic(v_rental.item_id, p_user_id);

  RETURN jsonb_build_object('rental_id', p_rental_id, 'dress_id', v_rental.item_id);
END;
$$ LANGUAGE plpgsql VOLATILE SET search_path = public;

CREATE OR REPLACE FUNCTION public.mark_dress_cleaned_atomic(
  p_dress_id uuid,
  p_user_id uuid DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_status text;
BEGIN
  SELECT status
  INTO v_status
  FROM public.dresses
  WHERE id = p_dress_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dress does not exist';
  END IF;

  IF v_status <> 'cleaning' THEN
    RAISE EXCEPTION 'Dress is not currently cleaning';
  END IF;

  UPDATE public.dresses
  SET status = 'available',
      updated_by = p_user_id,
      updated_at = now()
  WHERE id = p_dress_id;

  RETURN public.refresh_dress_status_atomic(p_dress_id, p_user_id);
END;
$$ LANGUAGE plpgsql VOLATILE SET search_path = public;

CREATE OR REPLACE FUNCTION public.delete_dress_atomic(
  p_dress_id uuid,
  p_user_id uuid DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_status text;
  v_has_history boolean;
BEGIN
  SELECT status
  INTO v_status
  FROM public.dresses
  WHERE id = p_dress_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dress does not exist';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.dress_reservations
    WHERE dress_id = p_dress_id AND status IN ('reserved', 'in_use', 'rented')
  ) OR EXISTS (
    SELECT 1 FROM public.dress_rentals
    WHERE item_id = p_dress_id AND status IN ('reserved', 'renting', 'overdue')
  ) THEN
    RAISE EXCEPTION 'Cannot delete a dress with active bookings';
  END IF;

  v_has_history := EXISTS (SELECT 1 FROM public.dress_reservations WHERE dress_id = p_dress_id)
    OR EXISTS (SELECT 1 FROM public.dress_rentals WHERE item_id = p_dress_id)
    OR EXISTS (SELECT 1 FROM public.contract_items WHERE dress_id = p_dress_id);

  IF v_has_history THEN
    UPDATE public.dresses
    SET status = 'retired',
        updated_by = p_user_id,
        updated_at = now()
    WHERE id = p_dress_id;
    RETURN jsonb_build_object('dress_id', p_dress_id, 'mode', 'retired');
  END IF;

  UPDATE public.dresses
  SET deleted_at = now(),
      updated_by = p_user_id,
      updated_at = now()
  WHERE id = p_dress_id;

  RETURN jsonb_build_object('dress_id', p_dress_id, 'mode', 'deleted');
END;
$$ LANGUAGE plpgsql VOLATILE SET search_path = public;

CREATE OR REPLACE FUNCTION public.create_dress_contract_reservation_atomic(
  p_dress_id uuid,
  p_contract_id uuid,
  p_contract_item_id uuid DEFAULT NULL,
  p_customer_id uuid DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_export_type text DEFAULT NULL,
  p_is_addon boolean DEFAULT false,
  p_rental_price numeric DEFAULT 0,
  p_notes text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_dress public.dresses%ROWTYPE;
  v_contract_item_id uuid := p_contract_item_id;
  v_reservation_id uuid;
BEGIN
  IF p_contract_id IS NULL THEN
    RAISE EXCEPTION 'Contract is required';
  END IF;

  IF p_start_date IS NULL OR p_end_date IS NULL OR p_end_date < p_start_date THEN
    RAISE EXCEPTION 'Invalid reservation dates';
  END IF;

  SELECT *
  INTO v_dress
  FROM public.dresses
  WHERE id = p_dress_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dress does not exist';
  END IF;

  IF v_dress.status IN ('maintenance', 'retired', 'cleaning') THEN
    RAISE EXCEPTION 'Dress is not bookable';
  END IF;

  IF NOT public.is_dress_available(p_dress_id, p_start_date, p_end_date, NULL, NULL) THEN
    RAISE EXCEPTION 'Dress is already booked in this date range';
  END IF;

  IF COALESCE(p_is_addon, false) AND COALESCE(p_rental_price, 0) > 0 AND v_contract_item_id IS NULL THEN
    INSERT INTO public.contract_items (
      contract_id, item_name, type, quantity, unit_price, total_amount,
      is_addon, addon_category, dress_id, export_type, added_by, created_at, updated_at
    ) VALUES (
      p_contract_id,
      COALESCE(v_dress.name, 'Trang phuc phat sinh'),
      'trang_phuc'::public.item_type_enum,
      1,
      COALESCE(p_rental_price, 0),
      COALESCE(p_rental_price, 0),
      true,
      'trang_phuc'::public.addon_category_enum,
      p_dress_id,
      NULLIF(p_export_type, '')::public.export_type_enum,
      p_user_id,
      now(),
      now()
    )
    RETURNING id INTO v_contract_item_id;
  END IF;

  INSERT INTO public.dress_reservations (
    dress_id, contract_id, contract_item_id, customer_id,
    start_date, end_date, export_type, status, notes, created_at, updated_at
  ) VALUES (
    p_dress_id,
    p_contract_id,
    v_contract_item_id,
    p_customer_id,
    p_start_date,
    p_end_date,
    NULLIF(p_export_type, '')::public.export_type_enum,
    'reserved',
    NULLIF(BTRIM(COALESCE(p_notes, '')), ''),
    now(),
    now()
  )
  RETURNING id INTO v_reservation_id;

  IF v_contract_item_id IS NOT NULL THEN
    PERFORM public.recalc_contract_totals(p_contract_id);
  END IF;

  PERFORM public.refresh_dress_status_atomic(p_dress_id, p_user_id);

  RETURN jsonb_build_object(
    'reservation_id', v_reservation_id,
    'contract_item_id', v_contract_item_id,
    'dress_id', p_dress_id,
    'contract_id', p_contract_id
  );
END;
$$ LANGUAGE plpgsql VOLATILE SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_dress_reservation_status_atomic(
  p_reservation_id uuid,
  p_status text,
  p_user_id uuid DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_reservation public.dress_reservations%ROWTYPE;
BEGIN
  IF p_status NOT IN ('reserved', 'in_use', 'rented', 'returned', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid reservation status';
  END IF;

  SELECT *
  INTO v_reservation
  FROM public.dress_reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservation does not exist';
  END IF;

  PERFORM 1 FROM public.dresses WHERE id = v_reservation.dress_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dress does not exist';
  END IF;

  IF p_status IN ('reserved', 'in_use', 'rented') AND NOT public.is_dress_available(
    v_reservation.dress_id,
    v_reservation.start_date,
    v_reservation.end_date,
    p_reservation_id,
    NULL
  ) THEN
    RAISE EXCEPTION 'Dress is already booked in this date range';
  END IF;

  UPDATE public.dress_reservations
  SET status = p_status,
      updated_at = now()
  WHERE id = p_reservation_id;

  IF p_status = 'cancelled' AND v_reservation.contract_item_id IS NOT NULL THEN
    UPDATE public.contract_items
    SET deleted_at = COALESCE(deleted_at, now()),
        updated_at = now()
    WHERE id = v_reservation.contract_item_id
      AND COALESCE(is_addon, false) = true;

    IF v_reservation.contract_id IS NOT NULL THEN
      PERFORM public.recalc_contract_totals(v_reservation.contract_id);
    END IF;
  END IF;

  PERFORM public.refresh_dress_status_atomic(v_reservation.dress_id, p_user_id);

  RETURN jsonb_build_object(
    'reservation_id', p_reservation_id,
    'dress_id', v_reservation.dress_id,
    'contract_id', v_reservation.contract_id,
    'status', p_status
  );
END;
$$ LANGUAGE plpgsql VOLATILE SET search_path = public;

CREATE OR REPLACE FUNCTION public.release_dress_reservation_atomic(
  p_reservation_id uuid,
  p_user_id uuid DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_reservation public.dress_reservations%ROWTYPE;
BEGIN
  SELECT *
  INTO v_reservation
  FROM public.dress_reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservation does not exist';
  END IF;

  IF v_reservation.status IN ('returned', 'cancelled') THEN
    RAISE EXCEPTION 'Reservation is already closed';
  END IF;

  PERFORM 1 FROM public.dresses WHERE id = v_reservation.dress_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dress does not exist';
  END IF;

  UPDATE public.dress_reservations
  SET status = 'returned',
      updated_at = now()
  WHERE id = p_reservation_id;

  IF v_reservation.contract_item_id IS NOT NULL THEN
    UPDATE public.contract_items
    SET deleted_at = COALESCE(deleted_at, now()),
        updated_at = now()
    WHERE id = v_reservation.contract_item_id
      AND COALESCE(is_addon, false) = true;

    IF v_reservation.contract_id IS NOT NULL THEN
      PERFORM public.recalc_contract_totals(v_reservation.contract_id);
    END IF;
  END IF;

  PERFORM public.refresh_dress_status_atomic(v_reservation.dress_id, p_user_id);

  RETURN jsonb_build_object(
    'reservation_id', p_reservation_id,
    'dress_id', v_reservation.dress_id,
    'contract_id', v_reservation.contract_id
  );
END;
$$ LANGUAGE plpgsql VOLATILE SET search_path = public;

REVOKE ALL ON FUNCTION public.is_dress_available(uuid, date, date, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dress_stats() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dress_list(text, text, text, text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dress_rental_list(text, text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_dress_status_atomic(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_dress_status(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_standalone_dress_rental_atomic(uuid, uuid, text, text, date, date, numeric, numeric, text, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.start_dress_rental_atomic(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.return_dress_rental_atomic(uuid, text, numeric, boolean, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cancel_dress_rental_atomic(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_dress_cleaned_atomic(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_dress_atomic(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_dress_contract_reservation_atomic(uuid, uuid, uuid, uuid, date, date, text, boolean, numeric, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_dress_reservation_status_atomic(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_dress_reservation_atomic(uuid, uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.is_dress_available(uuid, date, date, uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.dress_stats() TO service_role;
GRANT EXECUTE ON FUNCTION public.dress_list(text, text, text, text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.dress_rental_list(text, text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_dress_status_atomic(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_dress_status(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_standalone_dress_rental_atomic(uuid, uuid, text, text, date, date, numeric, numeric, text, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.start_dress_rental_atomic(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.return_dress_rental_atomic(uuid, text, numeric, boolean, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_dress_rental_atomic(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_dress_cleaned_atomic(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_dress_atomic(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_dress_contract_reservation_atomic(uuid, uuid, uuid, uuid, date, date, text, boolean, numeric, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_dress_reservation_status_atomic(uuid, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_dress_reservation_atomic(uuid, uuid) TO service_role;

COMMIT;
