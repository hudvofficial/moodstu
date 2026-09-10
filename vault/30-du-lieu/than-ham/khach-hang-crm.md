---
title: "Thân hàm DB — khach-hang-crm"
tags: [sinh-tu-dong, db, ham, khach-hang-crm]
cap-nhat: 2026-09-10
trang-thai: sinh-tu-dong
nguon: pg_proc · pg_policies · information_schema.role_table_grants
---

> ⚙️ **File này do `scripts/vault-gen-db-truth.mjs` sinh ra từ database production. ĐỪNG sửa tay** — chạy lại script để cập nhật.

# Thân hàm DB — khach-hang-crm

5 hàm. `SECURITY DEFINER` = chạy bằng quyền chủ hàm, **bỏ qua RLS** → hàm loại này phải tự kiểm quyền bên trong.

| Hàm | Tham số | Trả về | Quyền | Ngôn ngữ |
|---|---|---|---|---|
| [`append_care_log`](#append_care_log) | `p_lead_id uuid, p_content text, p_type text` | `jsonb` | **DEFINER** | plpgsql |
| [`convert_lead_to_customer`](#convert_lead_to_customer) | `p_lead_id uuid` | `jsonb` | **DEFINER** | plpgsql |
| [`get_crm_customer_stats`](#get_crm_customer_stats) | `—` | `json` | **DEFINER** | plpgsql |
| [`get_crm_lead_stats`](#get_crm_lead_stats) | `—` | `json` | **DEFINER** | plpgsql |
| [`nextval_customer_code`](#nextval_customer_code) | `—` | `bigint` | **DEFINER** | sql |

---

## append_care_log

`append_care_log(p_lead_id uuid, p_content text, p_type text)` → `jsonb` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
DECLARE
  v_entry jsonb;
  v_rows integer;
BEGIN
  IF p_lead_id IS NULL THEN
    RAISE EXCEPTION 'Lead id is required';
  END IF;

  IF NULLIF(BTRIM(p_content), '') IS NULL THEN
    RAISE EXCEPTION 'Care log content is required';
  END IF;

  v_entry := jsonb_build_object(
    'type', COALESCE(NULLIF(BTRIM(p_type), ''), 'Ghi chu'),
    'content', BTRIM(p_content),
    'timestamp', NOW()
  );

  UPDATE public.crm_leads
  SET care_history = COALESCE(care_history, '') || E'\n---\n' ||
      '[' || (v_entry->>'type') || '] ' || to_char(NOW(), 'DD/MM/YYYY HH24:MI') || E'\n' || (v_entry->>'content'),
      care_type = v_entry->>'type',
      updated_at = NOW()
  WHERE id = p_lead_id
    AND deleted_at IS NULL;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RAISE EXCEPTION 'Lead not found';
  END IF;

  RETURN jsonb_build_object('log', v_entry);
END;
```

---

## convert_lead_to_customer

`convert_lead_to_customer(p_lead_id uuid)` → `jsonb` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
DECLARE
  v_lead public.crm_leads%ROWTYPE;
  v_customer_id uuid;
  v_existing_customer_id uuid;
BEGIN
  IF p_lead_id IS NULL THEN
    RAISE EXCEPTION 'Lead id is required';
  END IF;

  SELECT *
  INTO v_lead
  FROM public.crm_leads
  WHERE id = p_lead_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead not found';
  END IF;

  IF v_lead.phone IS NULL OR BTRIM(v_lead.phone) = '' THEN
    RAISE EXCEPTION 'phone is required';
  END IF;

  IF v_lead.status = 'da_chot' THEN
    RAISE EXCEPTION 'Lead already converted';
  END IF;

  SELECT id
  INTO v_existing_customer_id
  FROM public.customers
  WHERE phone = BTRIM(v_lead.phone)
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_existing_customer_id IS NOT NULL THEN
    v_customer_id := v_existing_customer_id;

    UPDATE public.customers
    SET lead_id = p_lead_id,
        updated_at = NOW()
    WHERE id = v_customer_id
      AND lead_id IS NULL;
  ELSE
    INSERT INTO public.customers (
      customer_code,
      full_name,
      phone,
      email,
      address,
      source,
      notes,
      lead_id,
      created_by
    )
    VALUES (
      'KH-' || LPAD(public.nextval_customer_code()::text, 3, '0'),
      COALESCE(NULLIF(BTRIM(v_lead.contact_name), ''), 'Khach hang moi'),
      BTRIM(v_lead.phone),
      NULLIF(BTRIM(v_lead.email), ''),
      NULLIF(BTRIM(v_lead.address), ''),
      v_lead.source,
      v_lead.needs,
      p_lead_id,
      v_lead.created_by
    )
    RETURNING id INTO v_customer_id;
  END IF;

  UPDATE public.crm_leads
  SET status = 'da_chot',
      status_changed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_lead_id;

  RETURN jsonb_build_object(
    'customer_id', v_customer_id,
    'lead', row_to_json(v_lead)
  );
END;
```

---

## get_crm_customer_stats

`get_crm_customer_stats()` → `json` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
DECLARE
  v_total integer;
  v_new_this_month integer;
  v_avg_lifetime_value numeric;
BEGIN
  SELECT COUNT(*)
  INTO v_total
  FROM public.customers
  WHERE deleted_at IS NULL;

  SELECT COUNT(*)
  INTO v_new_this_month
  FROM public.customers
  WHERE deleted_at IS NULL
    AND created_at >= date_trunc('month', NOW());

  SELECT COALESCE(ROUND(AVG(customer_total)), 0)
  INTO v_avg_lifetime_value
  FROM (
    SELECT customer_id, SUM(COALESCE(total_amount, 0)) AS customer_total
    FROM public.contracts
    WHERE customer_id IS NOT NULL
      AND deleted_at IS NULL
    GROUP BY customer_id
  ) totals;

  RETURN json_build_object(
    'total', v_total,
    'newThisMonth', v_new_this_month,
    'avgLifetimeValue', COALESCE(v_avg_lifetime_value, 0)
  );
END;
```

---

## get_crm_lead_stats

`get_crm_lead_stats()` → `json` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
DECLARE
  v_total integer;
  v_closed integer;
  v_cancelled integer;
  v_active integer;
  v_conversion_rate integer;
  v_by_status json;
  v_by_source json;
BEGIN
  WITH base AS MATERIALIZED (
    SELECT
      COALESCE(status::text, 'unknown')          AS status,
      COALESCE(NULLIF(source, ''), 'Khac')       AS source_key
    FROM public.crm_leads
    WHERE deleted_at IS NULL
  )
  SELECT
    (SELECT count(*) FROM base),
    (SELECT count(*) FROM base WHERE status = 'da_chot'),
    (SELECT count(*) FROM base WHERE status = 'huy'),
    COALESCE((SELECT json_object_agg(status, c)
              FROM (SELECT status, count(*) AS c FROM base GROUP BY status) s), '{}'::json),
    COALESCE((SELECT json_object_agg(source_key, c)
              FROM (SELECT source_key, count(*) AS c FROM base GROUP BY source_key) s), '{}'::json)
  INTO v_total, v_closed, v_cancelled, v_by_status, v_by_source;

  v_active := v_total - v_closed - v_cancelled;
  IF v_total > 0 THEN
    v_conversion_rate := ROUND((v_closed::numeric / v_total::numeric) * 100);
  ELSE
    v_conversion_rate := 0;
  END IF;

  RETURN json_build_object(
    'total', v_total,
    'active', v_active,
    'closed', v_closed,
    'conversionRate', v_conversion_rate,
    'byStatus', v_by_status,
    'bySource', v_by_source
  );
END;
```

---

## nextval_customer_code

`nextval_customer_code()` → `bigint` · **SECURITY DEFINER — bỏ qua RLS** · sql · VOLATILE

```sql
SELECT nextval('public.customer_code_seq');
```
