---
title: "Thân hàm DB — vay-cuoi"
tags: [sinh-tu-dong, db, ham, vay-cuoi]
cap-nhat: 2026-09-11
trang-thai: sinh-tu-dong
nguon: pg_proc · pg_policies · information_schema.role_table_grants
---

> ⚙️ **File này do `scripts/vault-gen-db-truth.mjs` sinh ra từ database production. ĐỪNG sửa tay** — chạy lại script để cập nhật.

# Thân hàm DB — vay-cuoi

14 hàm. `SECURITY DEFINER` = chạy bằng quyền chủ hàm, **bỏ qua RLS** → hàm loại này phải tự kiểm quyền bên trong.

| Hàm | Tham số | Trả về | Quyền | Ngôn ngữ |
|---|---|---|---|---|
| [`cancel_dress_rental_atomic`](#cancel_dress_rental_atomic) | `p_rental_id uuid, p_user_id uuid` | `jsonb` | invoker | plpgsql |
| [`create_dress_contract_reservation_atomic`](#create_dress_contract_reservation_atomic) | `p_dress_id uuid, p_contract_id uuid, p_contract_item_id uuid, p_customer_id uuid, p_start_date date, p_end_date date, p_export_type text, p_is_addon boolean, p_rental_price numeric, p_notes text, p_user_id uuid` | `jsonb` | invoker | plpgsql |
| [`create_standalone_dress_rental_atomic`](#create_standalone_dress_rental_atomic) | `p_item_id uuid, p_contract_id uuid, p_customer_name text, p_phone text, p_pickup_date date, p_return_date date, p_rental_price numeric, p_deposit numeric, p_accessories text, p_notes text, p_user_id uuid` | `jsonb` | invoker | plpgsql |
| [`delete_dress_atomic`](#delete_dress_atomic) | `p_dress_id uuid, p_user_id uuid` | `jsonb` | invoker | plpgsql |
| [`dress_list`](#dress_list) | `p_search text, p_category text, p_status text, p_sort text, p_page integer, p_limit integer` | `jsonb` | invoker | plpgsql |
| [`dress_rental_list`](#dress_rental_list) | `p_status text, p_search text, p_page integer, p_limit integer, p_item_id uuid` | `jsonb` | invoker | plpgsql |
| [`dress_stats`](#dress_stats) | `—` | `jsonb` | invoker | plpgsql |
| [`is_dress_available`](#is_dress_available) | `p_dress_id uuid, p_start_date date, p_end_date date, p_exclude_reservation_id uuid, p_exclude_rental_id uuid` | `boolean` | invoker | plpgsql |
| [`mark_dress_cleaned_atomic`](#mark_dress_cleaned_atomic) | `p_dress_id uuid, p_user_id uuid` | `jsonb` | invoker | plpgsql |
| [`refresh_dress_status_atomic`](#refresh_dress_status_atomic) | `p_dress_id uuid, p_user_id uuid` | `jsonb` | invoker | plpgsql |
| [`release_dress_reservation_atomic`](#release_dress_reservation_atomic) | `p_reservation_id uuid, p_user_id uuid` | `jsonb` | invoker | plpgsql |
| [`return_dress_rental_atomic`](#return_dress_rental_atomic) | `p_rental_id uuid, p_return_condition text, p_damage_fee numeric, p_deposit_returned boolean, p_notes text, p_user_id uuid` | `jsonb` | invoker | plpgsql |
| [`start_dress_rental_atomic`](#start_dress_rental_atomic) | `p_rental_id uuid, p_user_id uuid` | `jsonb` | invoker | plpgsql |
| [`update_dress_reservation_status_atomic`](#update_dress_reservation_status_atomic) | `p_reservation_id uuid, p_status text, p_user_id uuid` | `jsonb` | invoker | plpgsql |

---

## cancel_dress_rental_atomic

`cancel_dress_rental_atomic(p_rental_id uuid, p_user_id uuid)` → `jsonb` · SECURITY INVOKER · plpgsql · VOLATILE

```sql
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
```

---

## create_dress_contract_reservation_atomic

`create_dress_contract_reservation_atomic(p_dress_id uuid, p_contract_id uuid, p_contract_item_id uuid, p_customer_id uuid, p_start_date date, p_end_date date, p_export_type text, p_is_addon boolean, p_rental_price numeric, p_notes text, p_user_id uuid)` → `jsonb` · SECURITY INVOKER · plpgsql · VOLATILE

```sql
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
```

---

## create_standalone_dress_rental_atomic

`create_standalone_dress_rental_atomic(p_item_id uuid, p_contract_id uuid, p_customer_name text, p_phone text, p_pickup_date date, p_return_date date, p_rental_price numeric, p_deposit numeric, p_accessories text, p_notes text, p_user_id uuid)` → `jsonb` · SECURITY INVOKER · plpgsql · VOLATILE

```sql
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
```

---

## delete_dress_atomic

`delete_dress_atomic(p_dress_id uuid, p_user_id uuid)` → `jsonb` · SECURITY INVOKER · plpgsql · VOLATILE

```sql
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
```

---

## dress_list

`dress_list(p_search text, p_category text, p_status text, p_sort text, p_page integer, p_limit integer)` → `jsonb` · SECURITY INVOKER · plpgsql · STABLE

```sql
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
```

---

## dress_rental_list

`dress_rental_list(p_status text, p_search text, p_page integer, p_limit integer, p_item_id uuid)` → `jsonb` · SECURITY INVOKER · plpgsql · STABLE

```sql
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
```

---

## dress_stats

`dress_stats()` → `jsonb` · SECURITY INVOKER · plpgsql · STABLE

```sql
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
```

---

## is_dress_available

`is_dress_available(p_dress_id uuid, p_start_date date, p_end_date date, p_exclude_reservation_id uuid, p_exclude_rental_id uuid)` → `boolean` · SECURITY INVOKER · plpgsql · STABLE

```sql
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
```

---

## mark_dress_cleaned_atomic

`mark_dress_cleaned_atomic(p_dress_id uuid, p_user_id uuid)` → `jsonb` · SECURITY INVOKER · plpgsql · VOLATILE

```sql
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
```

---

## refresh_dress_status_atomic

`refresh_dress_status_atomic(p_dress_id uuid, p_user_id uuid)` → `jsonb` · SECURITY INVOKER · plpgsql · VOLATILE

```sql
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
```

---

## release_dress_reservation_atomic

`release_dress_reservation_atomic(p_reservation_id uuid, p_user_id uuid)` → `jsonb` · SECURITY INVOKER · plpgsql · VOLATILE

```sql
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
```

---

## return_dress_rental_atomic

`return_dress_rental_atomic(p_rental_id uuid, p_return_condition text, p_damage_fee numeric, p_deposit_returned boolean, p_notes text, p_user_id uuid)` → `jsonb` · SECURITY INVOKER · plpgsql · VOLATILE

```sql
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
```

---

## start_dress_rental_atomic

`start_dress_rental_atomic(p_rental_id uuid, p_user_id uuid)` → `jsonb` · SECURITY INVOKER · plpgsql · VOLATILE

```sql
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
```

---

## update_dress_reservation_status_atomic

`update_dress_reservation_status_atomic(p_reservation_id uuid, p_status text, p_user_id uuid)` → `jsonb` · SECURITY INVOKER · plpgsql · VOLATILE

```sql
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
```
