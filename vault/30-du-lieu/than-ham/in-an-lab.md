---
title: "Thân hàm DB — in-an-lab"
tags: [sinh-tu-dong, db, ham, in-an-lab]
cap-nhat: 2026-09-10
trang-thai: sinh-tu-dong
nguon: pg_proc · pg_policies · information_schema.role_table_grants
---

> ⚙️ **File này do `scripts/vault-gen-db-truth.mjs` sinh ra từ database production. ĐỪNG sửa tay** — chạy lại script để cập nhật.

# Thân hàm DB — in-an-lab

6 hàm. `SECURITY DEFINER` = chạy bằng quyền chủ hàm, **bỏ qua RLS** → hàm loại này phải tự kiểm quyền bên trong.

| Hàm | Tham số | Trả về | Quyền | Ngôn ngữ |
|---|---|---|---|---|
| [`create_printing_order_atomic`](#create_printing_order_atomic) | `p_order jsonb, p_actor_id uuid` | `jsonb` | **DEFINER** | plpgsql |
| [`delete_printing_order_atomic`](#delete_printing_order_atomic) | `p_order_id uuid, p_actor_id uuid` | `jsonb` | **DEFINER** | plpgsql |
| [`get_printing_cost_stats`](#get_printing_cost_stats) | `—` | `TABLE(total_cost numeric, unpaid_cost numeric)` | **DEFINER** | sql |
| [`nextval_printing_order_code`](#nextval_printing_order_code) | `—` | `text` | **DEFINER** | plpgsql |
| [`printing_stats`](#printing_stats) | `—` | `TABLE(total bigint, cho_xu_ly bigint, dang_in bigint, da_in bigint, hoan_thanh bigint, huy_don bigint, total_cost numeric, unpaid_cost numeric)` | **DEFINER** | sql |
| [`update_printing_order_atomic`](#update_printing_order_atomic) | `p_order_id uuid, p_order jsonb, p_expected_updated_at timestamp with time zone, p_actor_id uuid` | `jsonb` | **DEFINER** | plpgsql |

---

## create_printing_order_atomic

`create_printing_order_atomic(p_order jsonb, p_actor_id uuid)` → `jsonb` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
DECLARE
  v_contract_id uuid := NULLIF(p_order->>'contractId', '')::uuid;
  v_lab_id uuid := NULLIF(p_order->>'labId', '')::uuid;
  v_items jsonb := COALESCE(p_order->'items', '[]'::jsonb);
  v_total numeric; v_order_id uuid; v_order_code text;
BEGIN
  IF v_contract_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.contracts WHERE id = v_contract_id AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Hop dong khong hop le';
  END IF;
  IF v_lab_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.labs WHERE id = v_lab_id AND deleted_at IS NULL AND status = 'active') THEN
    RAISE EXCEPTION 'Lab khong hop le';
  END IF;
  IF jsonb_typeof(v_items) <> 'array' OR jsonb_array_length(v_items) = 0 THEN
    RAISE EXCEPTION 'Can it nhat 1 san pham';
  END IF;
  v_total := public.printing_items_total(v_items);
  v_order_code := public.nextval_printing_order_code();
  INSERT INTO public.printing_orders(contract_id, lab_id, order_code, status, payment_status, total_amount, order_date, expected_date, items, notes, created_by, created_at, updated_at, updated_by)
  VALUES (v_contract_id, v_lab_id, v_order_code, 'cho_xu_ly', 'chua_thanh_toan', v_total, now(), NULLIF(p_order->>'expectedDate', '')::date, v_items, NULLIF(p_order->>'notes', ''), p_actor_id, now(), now(), p_actor_id)
  RETURNING id INTO v_order_id;
  -- ADR-016: KHÔNG tạo phiếu chi trích trước — chi phí lab là cam kết (printing_orders.total_amount)
  RETURN jsonb_build_object('order_id', v_order_id, 'order_code', v_order_code, 'contract_id', v_contract_id, 'total_amount', v_total);
END
```

---

## delete_printing_order_atomic

`delete_printing_order_atomic(p_order_id uuid, p_actor_id uuid)` → `jsonb` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
DECLARE v_current public.printing_orders%ROWTYPE;
BEGIN
  SELECT * INTO v_current FROM public.printing_orders WHERE id = p_order_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Khong tim thay don in'; END IF;
  IF EXISTS (SELECT 1 FROM public.expense_allocations a JOIN public.expenses e ON e.id = a.expense_id
             WHERE a.target_type = 'printing_order' AND a.target_id = p_order_id AND e.deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Don in da co phieu chi tra lab, khong the xoa';
  END IF;
  UPDATE public.printing_orders SET deleted_at = now(), updated_at = now(), updated_by = p_actor_id WHERE id = p_order_id;
  RETURN jsonb_build_object('order_id', p_order_id, 'order_code', v_current.order_code, 'contract_id', v_current.contract_id);
END
```

---

## get_printing_cost_stats

`get_printing_cost_stats()` → `TABLE(total_cost numeric, unpaid_cost numeric)` · **SECURITY DEFINER — bỏ qua RLS** · sql · VOLATILE

```sql
SELECT
    COALESCE(SUM(total_amount) FILTER (WHERE COALESCE(status, '') <> 'da_huy'), 0)::numeric AS total_cost,
    COALESCE(SUM(total_amount) FILTER (
      WHERE payment_status = 'chua_thanh_toan'
        AND COALESCE(status, '') <> 'da_huy'
    ), 0)::numeric AS unpaid_cost
  FROM public.printing_orders
  WHERE deleted_at IS NULL;
```

---

## nextval_printing_order_code

`nextval_printing_order_code()` → `text` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
DECLARE
  v_code text;
BEGIN
  LOOP
    v_code := 'IN-' || to_char(now(), 'YYMMDD') || '-' || lpad(nextval('public.printing_order_code_seq')::text, 5, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1
      FROM public.printing_orders
      WHERE order_code = v_code
        AND deleted_at IS NULL
    );
  END LOOP;

  RETURN v_code;
END;
```

---

## printing_stats

`printing_stats()` → `TABLE(total bigint, cho_xu_ly bigint, dang_in bigint, da_in bigint, hoan_thanh bigint, huy_don bigint, total_cost numeric, unpaid_cost numeric)` · **SECURITY DEFINER — bỏ qua RLS** · sql · VOLATILE

```sql
SELECT
    COUNT(*)::bigint AS total,
    COUNT(*) FILTER (WHERE status = 'cho_xu_ly')::bigint AS cho_xu_ly,
    COUNT(*) FILTER (WHERE status = 'dang_in')::bigint AS dang_in,
    COUNT(*) FILTER (WHERE status = 'da_in')::bigint AS da_in,
    COUNT(*) FILTER (WHERE status = 'hoan_thanh')::bigint AS hoan_thanh,
    COUNT(*) FILTER (WHERE status = 'huy_don')::bigint AS huy_don,
    COALESCE(SUM(total_amount) FILTER (WHERE status <> 'huy_don'), 0)::numeric AS total_cost,
    COALESCE(SUM(total_amount) FILTER (
      WHERE payment_status = 'chua_thanh_toan' AND status <> 'huy_don'
    ), 0)::numeric AS unpaid_cost
  FROM public.printing_orders
  WHERE deleted_at IS NULL;
```

---

## update_printing_order_atomic

`update_printing_order_atomic(p_order_id uuid, p_order jsonb, p_expected_updated_at timestamp with time zone, p_actor_id uuid)` → `jsonb` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
DECLARE
  v_current public.printing_orders%ROWTYPE;
  v_lab_id uuid := NULLIF(p_order->>'labId', '')::uuid;
  v_items jsonb := COALESCE(p_order->'items', '[]'::jsonb);
  v_total numeric; v_updated_at timestamptz;
BEGIN
  SELECT * INTO v_current FROM public.printing_orders WHERE id = p_order_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Khong tim thay don in'; END IF;
  IF p_expected_updated_at IS NOT NULL AND v_current.updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RAISE EXCEPTION 'Don in da duoc cap nhat boi nguoi khac. Vui long tai lai trang.';
  END IF;
  IF v_lab_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.labs WHERE id = v_lab_id AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Lab khong hop le';
  END IF;
  IF jsonb_typeof(v_items) <> 'array' OR jsonb_array_length(v_items) = 0 THEN
    RAISE EXCEPTION 'Can it nhat 1 san pham';
  END IF;
  v_total := public.printing_items_total(v_items);
  UPDATE public.printing_orders
  SET lab_id = v_lab_id, items = v_items, notes = NULLIF(p_order->>'notes', ''), expected_date = NULLIF(p_order->>'expectedDate', '')::date,
      total_amount = v_total, updated_at = now(), updated_by = p_actor_id
  WHERE id = p_order_id RETURNING updated_at INTO v_updated_at;
  -- ADR-016: tổng đơn đổi → trạng thái thanh toán dẫn xuất lại từ phân bổ
  PERFORM public.recompute_printing_payment_status(p_order_id);
  RETURN jsonb_build_object('order_id', p_order_id, 'order_code', v_current.order_code, 'contract_id', v_current.contract_id, 'total_amount', v_total, 'updated_at', v_updated_at);
END
```
