---
title: "Thân hàm DB — he-thong"
tags: [sinh-tu-dong, db, ham, he-thong]
cap-nhat: 2026-09-07
trang-thai: sinh-tu-dong
nguon: pg_proc · pg_policies · information_schema.role_table_grants
---

> ⚙️ **File này do `scripts/vault-gen-db-truth.mjs` sinh ra từ database production. ĐỪNG sửa tay** — chạy lại script để cập nhật.

# Thân hàm DB — he-thong

12 hàm. `SECURITY DEFINER` = chạy bằng quyền chủ hàm, **bỏ qua RLS** → hàm loại này phải tự kiểm quyền bên trong.

| Hàm | Tham số | Trả về | Quyền | Ngôn ngữ |
|---|---|---|---|---|
| [`emit_realtime_signal`](#emit_realtime_signal) | `—` | `trigger` | **DEFINER** | plpgsql |
| [`log_audit_action`](#log_audit_action) | `—` | `trigger` | **DEFINER** | plpgsql |
| [`moodie_jsonb_cosine_similarity`](#moodie_jsonb_cosine_similarity) | `a jsonb, b jsonb` | `double precision` | invoker | sql |
| [`nextval_inventory_code`](#nextval_inventory_code) | `—` | `text` | invoker | sql |
| [`printing_items_total`](#printing_items_total) | `p_items jsonb` | `numeric` | invoker | sql |
| [`refresh_dress_status`](#refresh_dress_status) | `p_dress_id uuid` | `void` | **DEFINER** | plpgsql |
| [`resolve_vendor_expense_category_id`](#resolve_vendor_expense_category_id) | `—` | `uuid` | **DEFINER** | plpgsql |
| [`rls_auto_enable`](#rls_auto_enable) | `—` | `event_trigger` | **DEFINER** | plpgsql |
| [`trg_refresh_dress_status_from_rental`](#trg_refresh_dress_status_from_rental) | `—` | `trigger` | **DEFINER** | plpgsql |
| [`trg_refresh_dress_status_from_reservation`](#trg_refresh_dress_status_from_reservation) | `—` | `trigger` | **DEFINER** | plpgsql |
| [`update_updated_at_column`](#update_updated_at_column) | `—` | `trigger` | invoker | plpgsql |
| [`vn_date`](#vn_date) | `p timestamp with time zone` | `date` | invoker | sql |

---

## emit_realtime_signal

`emit_realtime_signal()` → `trigger` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
BEGIN
  DELETE FROM public.realtime_signals WHERE changed_at < now() - interval '1 hour';
  INSERT INTO public.realtime_signals (table_name, op) VALUES (TG_TABLE_NAME, TG_OP);
  RETURN NULL;
END;
```

---

## log_audit_action

`log_audit_action()` → `trigger` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
DECLARE
  emp_id UUID;
BEGIN
  -- Try to get employee from auth, fallback to NULL (service_role case)
  BEGIN
    emp_id := get_current_employee_id();
  EXCEPTION WHEN OTHERS THEN
    emp_id := NULL;
  END;

  IF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_logs (employee_id, action, table_name, record_id, old_data)
    VALUES (emp_id, 'DELETE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO audit_logs (employee_id, action, table_name, record_id, old_data, new_data)
    VALUES (emp_id, 'UPDATE', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_logs (employee_id, action, table_name, record_id, new_data)
    VALUES (emp_id, 'CREATE', TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
```

---

## moodie_jsonb_cosine_similarity

`moodie_jsonb_cosine_similarity(a jsonb, b jsonb)` → `double precision` · SECURITY INVOKER · sql · IMMUTABLE

```sql
WITH av AS (
    SELECT ordinality AS idx, value::double precision AS value
    FROM jsonb_array_elements_text(a) WITH ORDINALITY
  ), bv AS (
    SELECT ordinality AS idx, value::double precision AS value
    FROM jsonb_array_elements_text(b) WITH ORDINALITY
  ), totals AS (
    SELECT sum(av.value * bv.value) AS dot,
           sqrt(sum(av.value * av.value)) AS amag,
           sqrt(sum(bv.value * bv.value)) AS bmag,
           count(*) AS matched,
           jsonb_array_length(a) AS alen,
           jsonb_array_length(b) AS blen
    FROM av JOIN bv USING (idx)
  )
  SELECT CASE WHEN matched = alen AND matched = blen AND amag > 0 AND bmag > 0
    THEN dot / (amag * bmag) ELSE 0 END FROM totals;
```

---

## nextval_inventory_code

`nextval_inventory_code()` → `text` · SECURITY INVOKER · sql · VOLATILE

```sql
SELECT 'VT-' || LPAD(nextval('public.inventory_item_code_seq')::text, 3, '0');
```

---

## printing_items_total

`printing_items_total(p_items jsonb)` → `numeric` · SECURITY INVOKER · sql · IMMUTABLE

```sql
SELECT COALESCE(SUM(
    COALESCE(NULLIF(item->>'quantity', '')::numeric, 0) *
    COALESCE(NULLIF(item->>'unitPrice', '')::numeric, 0)
  ), 0)
  FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb)) AS item;
```

---

## refresh_dress_status

`refresh_dress_status(p_dress_id uuid)` → `void` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
BEGIN
  PERFORM public.refresh_dress_status_atomic(p_dress_id, NULL);
END;
```

---

## resolve_vendor_expense_category_id

`resolve_vendor_expense_category_id()` → `uuid` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · STABLE

```sql
DECLARE
  v_category_id uuid;
BEGIN
  -- Try system_settings first
  SELECT value::uuid
  INTO v_category_id
  FROM public.system_settings
  WHERE key = 'vendor_expense_category_id'
  LIMIT 1;

  IF v_category_id IS NOT NULL THEN
    RETURN v_category_id;
  END IF;

  -- Fallback: lookup by category_code
  SELECT id
  INTO v_category_id
  FROM public.transaction_categories
  WHERE type = 'chi'
    AND category_code IN ('vendor', 'freelancer')
  ORDER BY
    CASE WHEN category_code = 'vendor' THEN 0 ELSE 1 END,
    created_at
  LIMIT 1;

  RETURN v_category_id;
END;
```

---

## rls_auto_enable

`rls_auto_enable()` → `event_trigger` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
```

---

## trg_refresh_dress_status_from_rental

`trg_refresh_dress_status_from_rental()` → `trigger` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM public.refresh_dress_status(OLD.item_id);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.refresh_dress_status(NEW.item_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
```

---

## trg_refresh_dress_status_from_reservation

`trg_refresh_dress_status_from_reservation()` → `trigger` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM public.refresh_dress_status(OLD.dress_id);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.refresh_dress_status(NEW.dress_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
```

---

## update_updated_at_column

`update_updated_at_column()` → `trigger` · SECURITY INVOKER · plpgsql · VOLATILE

```sql
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
```

---

## vn_date

`vn_date(p timestamp with time zone)` → `date` · SECURITY INVOKER · sql · IMMUTABLE

```sql
SELECT (p AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
```
