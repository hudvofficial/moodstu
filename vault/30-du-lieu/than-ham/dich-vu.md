---
title: "Thân hàm DB — dich-vu"
tags: [sinh-tu-dong, db, ham, dich-vu]
cap-nhat: 2026-09-07
trang-thai: sinh-tu-dong
nguon: pg_proc · pg_policies · information_schema.role_table_grants
---

> ⚙️ **File này do `scripts/vault-gen-db-truth.mjs` sinh ra từ database production. ĐỪNG sửa tay** — chạy lại script để cập nhật.

# Thân hàm DB — dich-vu

3 hàm. `SECURITY DEFINER` = chạy bằng quyền chủ hàm, **bỏ qua RLS** → hàm loại này phải tự kiểm quyền bên trong.

| Hàm | Tham số | Trả về | Quyền | Ngôn ngữ |
|---|---|---|---|---|
| [`delete_service_atomic`](#delete_service_atomic) | `p_actor_id uuid, p_service_id uuid` | `jsonb` | **DEFINER** | plpgsql |
| [`printing_lab_overview`](#printing_lab_overview) | `—` | `TABLE(id uuid, lab_name text, contact_person text, phone text, address text, status text, created_at timestamp with time zone, service_count bigint, service_preview text[], outstanding_debt numeric, unpaid_orders bigint, last_payment_at timestamp with time zone)` | **DEFINER** | sql |
| [`save_service_atomic`](#save_service_atomic) | `p_actor_id uuid, p_service jsonb, p_bundle_items jsonb, p_expected_updated_at timestamp with time zone` | `jsonb` | **DEFINER** | plpgsql |

---

## delete_service_atomic

`delete_service_atomic(p_actor_id uuid, p_service_id uuid)` → `jsonb` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
DECLARE
  v_service record;
  v_contract_count integer;
  v_bundle_count integer;
BEGIN
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'Missing actor id';
  END IF;

  SELECT s.id, s.name, s.service_code
    INTO v_service
  FROM public.services s
  WHERE s.id = p_service_id
    AND s.deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dich vu khong ton tai hoac da bi xoa';
  END IF;

  SELECT COUNT(*)::integer
    INTO v_contract_count
  FROM public.contract_items ci
  WHERE ci.service_id = p_service_id
    AND ci.deleted_at IS NULL;

  IF v_contract_count > 0 THEN
    RAISE EXCEPTION 'Dich vu dang duoc su dung trong % hop dong. Khong the xoa.', v_contract_count;
  END IF;

  SELECT COUNT(*)::integer
    INTO v_bundle_count
  FROM public.service_bundles sb
  WHERE sb.child_service_id = p_service_id;

  IF v_bundle_count > 0 THEN
    RAISE EXCEPTION 'Dich vu dang nam trong % goi combo. Khong the xoa.', v_bundle_count;
  END IF;

  DELETE FROM public.service_bundles
  WHERE parent_service_id = p_service_id;

  UPDATE public.services
  SET
    deleted_at = now(),
    updated_at = now(),
    updated_by = p_actor_id
  WHERE id = p_service_id;

  RETURN jsonb_build_object(
    'id', v_service.id,
    'service_code', v_service.service_code,
    'name', v_service.name
  );
END;
```

---

## printing_lab_overview

`printing_lab_overview()` → `TABLE(id uuid, lab_name text, contact_person text, phone text, address text, status text, created_at timestamp with time zone, service_count bigint, service_preview text[], outstanding_debt numeric, unpaid_orders bigint, last_payment_at timestamp with time zone)` · **SECURITY DEFINER — bỏ qua RLS** · sql · VOLATILE

```sql
WITH debt AS (
    SELECT * FROM public.finance_lab_debt_summary()
  ),
  services AS (
    SELECT lab_id, COUNT(*)::bigint AS service_count,
      ARRAY(SELECT ls_inner.item_name::text FROM public.lab_services ls_inner WHERE ls_inner.lab_id = ls.lab_id ORDER BY ls_inner.item_name LIMIT 3) AS service_preview
    FROM public.lab_services ls GROUP BY lab_id
  ),
  payments AS (
    SELECT e.payee_id AS lab_id, MAX(e.expense_date)::timestamptz AS last_payment_at
    FROM public.expenses e WHERE e.payee_type = 'lab' AND e.deleted_at IS NULL
    GROUP BY e.payee_id
  )
  SELECT l.id, l.lab_name::text, l.contact_person::text, l.phone::text, l.address::text, l.status::text, l.created_at::timestamptz,
    COALESCE(s.service_count, 0)::bigint, COALESCE(s.service_preview, ARRAY[]::text[]),
    COALESCE(d.remaining, 0)::numeric, COALESCE(d.order_count, 0)::bigint, p.last_payment_at
  FROM public.labs l
  LEFT JOIN debt d ON d.lab_id = l.id
  LEFT JOIN services s ON s.lab_id = l.id
  LEFT JOIN payments p ON p.lab_id = l.id
  WHERE l.deleted_at IS NULL
  ORDER BY l.lab_name;
```

---

## save_service_atomic

`save_service_atomic(p_actor_id uuid, p_service jsonb, p_bundle_items jsonb, p_expected_updated_at timestamp with time zone)` → `jsonb` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
DECLARE
  v_service_id uuid;
  v_existing_updated_at timestamptz;
  v_existing_name text;
  v_existing_service_code text;
  v_service_code text;
  v_name text;
  v_category_id uuid;
  v_selling_price numeric;
  v_cost_price numeric;
  v_service_type text;
  v_unit text;
  v_fulfillment_type text;
  v_status text;
  v_description text;
  v_image_url text;
  v_bundle_items jsonb;
  v_item jsonb;
  v_child_service_id uuid;
  v_duplicate_child uuid;
  v_quantity numeric;
  v_sort_order integer;
BEGIN
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'Missing actor id';
  END IF;

  IF p_service IS NULL OR jsonb_typeof(p_service) <> 'object' THEN
    RAISE EXCEPTION 'Payload dich vu khong hop le';
  END IF;

  v_service_id := NULLIF(p_service->>'id', '')::uuid;

  IF v_service_id IS NULL THEN
    v_name := btrim(COALESCE(p_service->>'name', ''));
    v_service_code := btrim(COALESCE(p_service->>'service_code', ''));
    v_service_type := btrim(COALESCE(p_service->>'service_type', 'khac'));
    v_unit := btrim(COALESCE(p_service->>'unit', 'dich_vu'));
    v_fulfillment_type := btrim(COALESCE(p_service->>'fulfillment_type', 'single'));
    v_status := btrim(COALESCE(p_service->>'status', 'active'));
    v_category_id := NULLIF(p_service->>'category_id', '')::uuid;
    v_selling_price := COALESCE(NULLIF(p_service->>'selling_price', '')::numeric, 0);
    v_cost_price := COALESCE(NULLIF(p_service->>'cost_price', '')::numeric, 0);
    v_description := NULLIF(p_service->>'description', '');
    v_image_url := NULLIF(p_service->>'image_url', '');

    IF v_name = '' THEN
      RAISE EXCEPTION 'Ten dich vu la bat buoc';
    END IF;

    IF v_service_code = '' THEN
      RAISE EXCEPTION 'Ma dich vu la bat buoc';
    END IF;
  ELSE
    SELECT s.updated_at, s.name, s.service_code
      INTO v_existing_updated_at, v_existing_name, v_existing_service_code
    FROM public.services s
    WHERE s.id = v_service_id
      AND s.deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Dich vu khong ton tai hoac da bi xoa';
    END IF;

    IF p_expected_updated_at IS NOT NULL AND v_existing_updated_at IS DISTINCT FROM p_expected_updated_at THEN
      RAISE EXCEPTION 'Dich vu da duoc cap nhat boi nguoi khac. Vui long tai lai trang.';
    END IF;

    v_name := CASE
      WHEN p_service ? 'name' THEN btrim(COALESCE(p_service->>'name', ''))
      ELSE v_existing_name
    END;
    v_service_code := CASE
      WHEN p_service ? 'service_code' THEN btrim(COALESCE(p_service->>'service_code', ''))
      ELSE v_existing_service_code
    END;
    v_category_id := CASE
      WHEN p_service ? 'category_id' THEN NULLIF(p_service->>'category_id', '')::uuid
      ELSE NULL
    END;
    v_selling_price := CASE
      WHEN p_service ? 'selling_price' THEN COALESCE(NULLIF(p_service->>'selling_price', '')::numeric, 0)
      ELSE NULL
    END;
    v_cost_price := CASE
      WHEN p_service ? 'cost_price' THEN COALESCE(NULLIF(p_service->>'cost_price', '')::numeric, 0)
      ELSE NULL
    END;
    v_service_type := NULLIF(p_service->>'service_type', '');
    v_unit := NULLIF(p_service->>'unit', '');
    v_fulfillment_type := NULLIF(p_service->>'fulfillment_type', '');
    v_status := NULLIF(p_service->>'status', '');
    v_description := CASE
      WHEN p_service ? 'description' THEN NULLIF(p_service->>'description', '')
      ELSE NULL
    END;
    v_image_url := CASE
      WHEN p_service ? 'image_url' THEN NULLIF(p_service->>'image_url', '')
      ELSE NULL
    END;

    IF v_name = '' OR v_service_code = '' THEN
      RAISE EXCEPTION 'Ten va ma dich vu la bat buoc';
    END IF;
  END IF;

  IF v_selling_price IS NOT NULL AND v_selling_price < 0 THEN
    RAISE EXCEPTION 'Gia ban khong hop le';
  END IF;

  IF v_cost_price IS NOT NULL AND v_cost_price < 0 THEN
    RAISE EXCEPTION 'Gia von khong hop le';
  END IF;

  IF v_category_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.service_categories WHERE id = v_category_id
  ) THEN
    RAISE EXCEPTION 'Danh muc dich vu khong hop le';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.services s
    WHERE s.service_code = v_service_code
      AND s.deleted_at IS NULL
      AND (v_service_id IS NULL OR s.id <> v_service_id)
  ) THEN
    RAISE EXCEPTION 'Ma dich vu da ton tai';
  END IF;

  IF v_service_id IS NULL THEN
    INSERT INTO public.services (
      name,
      service_code,
      service_type,
      category_id,
      selling_price,
      cost_price,
      unit,
      fulfillment_type,
      status,
      description,
      image_url,
      created_by,
      updated_by,
      created_at,
      updated_at
    ) VALUES (
      v_name,
      v_service_code,
      v_service_type,
      v_category_id,
      v_selling_price,
      v_cost_price,
      v_unit,
      v_fulfillment_type,
      v_status,
      v_description,
      v_image_url,
      p_actor_id,
      p_actor_id,
      now(),
      now()
    )
    RETURNING id, service_code, name, fulfillment_type
      INTO v_service_id, v_service_code, v_name, v_fulfillment_type;
  ELSE
    UPDATE public.services
    SET
      name = v_name,
      service_code = v_service_code,
      service_type = COALESCE(v_service_type, service_type),
      category_id = CASE
        WHEN p_service ? 'category_id' THEN v_category_id
        ELSE category_id
      END,
      selling_price = COALESCE(v_selling_price, selling_price),
      cost_price = COALESCE(v_cost_price, cost_price),
      unit = COALESCE(v_unit, unit),
      fulfillment_type = COALESCE(v_fulfillment_type, fulfillment_type),
      status = COALESCE(v_status, status),
      description = CASE
        WHEN p_service ? 'description' THEN v_description
        ELSE description
      END,
      image_url = CASE
        WHEN p_service ? 'image_url' THEN v_image_url
        ELSE image_url
      END,
      updated_by = p_actor_id,
      updated_at = now()
    WHERE id = v_service_id
    RETURNING id, service_code, name, fulfillment_type
      INTO v_service_id, v_service_code, v_name, v_fulfillment_type;
  END IF;

  IF p_bundle_items IS NOT NULL THEN
    IF jsonb_typeof(p_bundle_items) <> 'array' THEN
      RAISE EXCEPTION 'Danh sach bundle khong hop le';
    END IF;

    v_bundle_items := p_bundle_items;

    IF COALESCE(v_fulfillment_type, 'single') <> 'bundle' THEN
      DELETE FROM public.service_bundles
      WHERE parent_service_id = v_service_id;
    ELSE
      SELECT (item.value->>'child_service_id')::uuid
        INTO v_duplicate_child
      FROM jsonb_array_elements(v_bundle_items) AS item(value)
      WHERE item.value ? 'child_service_id'
      GROUP BY (item.value->>'child_service_id')::uuid
      HAVING COUNT(*) > 1
      LIMIT 1;

      IF v_duplicate_child IS NOT NULL THEN
        RAISE EXCEPTION 'Bundle bi trung dich vu con';
      END IF;

      FOR v_item IN SELECT value FROM jsonb_array_elements(v_bundle_items)
      LOOP
        IF NOT (v_item ? 'child_service_id') THEN
          RAISE EXCEPTION 'Bundle item thieu dich vu con';
        END IF;

        v_child_service_id := (v_item->>'child_service_id')::uuid;
        v_quantity := COALESCE(NULLIF(v_item->>'quantity', '')::numeric, 1);
        v_sort_order := COALESCE(NULLIF(v_item->>'sort_order', '')::integer, 0);

        IF v_child_service_id = v_service_id THEN
          RAISE EXCEPTION 'Bundle khong duoc chua chinh no';
        END IF;

        IF v_quantity < 1 THEN
          RAISE EXCEPTION 'So luong bundle phai >= 1';
        END IF;

        IF v_sort_order < 0 THEN
          RAISE EXCEPTION 'Sort order bundle khong hop le';
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM public.services s
          WHERE s.id = v_child_service_id
            AND s.deleted_at IS NULL
            AND COALESCE(s.status, 'active') = 'active'
            AND COALESCE(s.fulfillment_type, 'single') = 'single'
        ) THEN
          RAISE EXCEPTION 'Dich vu con trong bundle khong hop le';
        END IF;
      END LOOP;

      DELETE FROM public.service_bundles
      WHERE parent_service_id = v_service_id;

      INSERT INTO public.service_bundles (
        parent_service_id,
        child_service_id,
        quantity,
        adjustment_price,
        sort_order
      )
      SELECT
        v_service_id,
        (item.value->>'child_service_id')::uuid,
        COALESCE(NULLIF(item.value->>'quantity', '')::numeric, 1),
        COALESCE(NULLIF(item.value->>'adjustment_price', '')::numeric, 0),
        COALESCE(NULLIF(item.value->>'sort_order', '')::integer, item.ordinality::integer - 1)
      FROM jsonb_array_elements(v_bundle_items) WITH ORDINALITY AS item(value, ordinality);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'id', v_service_id,
    'service_code', v_service_code,
    'name', v_name
  );
END;
```
