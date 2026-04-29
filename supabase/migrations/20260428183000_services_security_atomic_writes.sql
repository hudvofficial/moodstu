-- Services audit fix: direct table access hardening and atomic service writes.

DO $$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'services',
    'service_categories',
    'service_bundles',
    'service_relations',
    'price_rules',
    'studio_info'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', v_table);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', v_table);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', v_table);
  END LOOP;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.services
    WHERE service_code IS NOT NULL
      AND deleted_at IS NULL
    GROUP BY service_code
    HAVING COUNT(*) > 1
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS idx_services_active_service_code_unique ON public.services(service_code) WHERE deleted_at IS NULL AND service_code IS NOT NULL';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.service_bundles
    GROUP BY parent_service_id, child_service_id
    HAVING COUNT(*) > 1
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS idx_service_bundles_parent_child_unique ON public.service_bundles(parent_service_id, child_service_id)';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_service_relations_parent_sort
  ON public.service_relations(parent_service_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_price_rules_active_priority
  ON public.price_rules(is_active, priority DESC);

CREATE OR REPLACE FUNCTION public.save_service_atomic(
  p_actor_id uuid,
  p_service jsonb,
  p_bundle_items jsonb DEFAULT NULL,
  p_expected_updated_at timestamptz DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.delete_service_atomic(
  p_actor_id uuid,
  p_service_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.save_service_atomic(uuid, jsonb, jsonb, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_service_atomic(uuid, uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.save_service_atomic(uuid, jsonb, jsonb, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_service_atomic(uuid, uuid) TO service_role;
