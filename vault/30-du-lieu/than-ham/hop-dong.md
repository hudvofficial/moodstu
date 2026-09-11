---
title: "Thân hàm DB — hop-dong"
tags: [sinh-tu-dong, db, ham, hop-dong]
cap-nhat: 2026-09-11
trang-thai: sinh-tu-dong
nguon: pg_proc · pg_policies · information_schema.role_table_grants
---

> ⚙️ **File này do `scripts/vault-gen-db-truth.mjs` sinh ra từ database production. ĐỪNG sửa tay** — chạy lại script để cập nhật.

# Thân hàm DB — hop-dong

32 hàm. `SECURITY DEFINER` = chạy bằng quyền chủ hàm, **bỏ qua RLS** → hàm loại này phải tự kiểm quyền bên trong.

| Hàm | Tham số | Trả về | Quyền | Ngôn ngữ |
|---|---|---|---|---|
| [`calendar_month_events`](#calendar_month_events) | `p_month integer, p_year integer, p_employee_id uuid` | `TABLE(event_source text, id uuid, event_type text, event_date text, end_date text, employee_id uuid, contract_id uuid, status text, google_event_id text, color_id text, location text, notes text, work_type text, assigned_to uuid, start_date text, start_time text, end_time text, deadline text, event_id uuid, contract_code text, customer_name text)` | invoker | plpgsql |
| [`cancel_contract_cascade`](#cancel_contract_cascade) | `p_contract_id uuid, p_reason text, p_user_id uuid` | `void` | **DEFINER** | plpgsql |
| [`contract_payment_receipt_code`](#contract_payment_receipt_code) | `p_payment_id uuid, p_payment_date date` | `text` | invoker | sql |
| [`contract_payment_status_v2`](#contract_payment_status_v2) | `p_paid numeric, p_remaining numeric` | `text` | invoker | sql |
| [`contract_stats`](#contract_stats) | `—` | `TABLE(total bigint, active bigint, pending bigint, completed bigint, revenue numeric, outstanding numeric, growth_total integer)` | invoker | sql |
| [`contract_stats_simple`](#contract_stats_simple) | `—` | `TABLE(total bigint, active bigint, pending bigint, completed bigint, this_month bigint, last_month bigint)` | invoker | sql |
| [`create_contract_inventory_addon_sale_atomic`](#create_contract_inventory_addon_sale_atomic) | `p_contract_id uuid, p_item_id uuid, p_quantity integer, p_sale_unit_price numeric, p_payment_method payment_method_enum, p_payment_date date, p_notes text, p_user_id uuid` | `jsonb` | **DEFINER** | plpgsql |
| [`dashboard_critical_kpis`](#dashboard_critical_kpis) | `p_month integer, p_year integer` | `TABLE(current_revenue numeric, previous_revenue numeric, total_debt numeric, current_contracts bigint, previous_contracts bigint, current_completed bigint, previous_completed bigint)` | invoker | sql |
| [`dashboard_service_breakdown`](#dashboard_service_breakdown) | `p_month integer, p_year integer, p_can_view_financials boolean` | `TABLE(service_type text, contract_count bigint, revenue numeric)` | invoker | plpgsql |
| [`delete_contract_cascade`](#delete_contract_cascade) | `p_contract_id uuid, p_user_id uuid` | `void` | **DEFINER** | plpgsql |
| [`finance_contract_profit_report`](#finance_contract_profit_report) | `p_status text, p_from date, p_to date, p_page integer, p_page_size integer` | `TABLE(id uuid, contract_code text, customer_name text, contract_date date, status text, total_amount numeric, paid_amount numeric, remaining_amount numeric, package_revenue numeric, addon_revenue numeric, discount numeric, task_cost numeric, print_cost numeric, expense_cost numeric, total_cost numeric, profit numeric, profit_margin numeric, total_count integer)` | **DEFINER** | plpgsql |
| [`finance_debt_stats`](#finance_debt_stats) | `—` | `TABLE(receivable numeric, payable numeric, overdue numeric, net_debt numeric, aging jsonb)` | **DEFINER** | sql |
| [`finance_month_summary`](#finance_month_summary) | `p_month integer, p_year integer` | `TABLE(cash_in numeric, cash_in_contract numeric, cash_in_retail numeric, cash_out numeric, cash_out_settlement numeric, cash_out_other numeric, cash_net numeric, cash_net_prev numeric, revenue numeric, revenue_contract numeric, revenue_retail numeric, cost_total numeric, cost_task numeric, cost_print numeric, cost_cogs numeric, cost_direct numeric, cost_overhead numeric, cost_salary_base numeric, profit numeric, profit_prev numeric, profit_margin numeric, contracts_shot bigint, contracts_missing_work_date bigint, receivable numeric, receivable_due numeric, receivable_waiting numeric, payable numeric, payable_lab numeric, payable_vendor numeric, payable_supplier numeric, payable_employee numeric)` | **DEFINER** | sql |
| [`finance_pending_collections`](#finance_pending_collections) | `p_limit integer` | `TABLE(id uuid, contract_code text, customer_id uuid, customer_name text, customer_phone text, status text, total_amount numeric, paid_amount numeric, remaining_amount numeric, contract_date date, work_date timestamp with time zone, delivered_at date)` | **DEFINER** | sql |
| [`finance_period_ledger`](#finance_period_ledger) | `p_start date, p_end date` | `TABLE(cash_in_contract numeric, cash_in_retail numeric, cash_out numeric, cash_out_settlement numeric, cash_out_salary numeric, cash_out_fixed numeric, revenue_contract numeric, revenue_retail numeric, signed_revenue numeric, signed_contracts bigint, contracts_shot bigint, contracts_completed bigint, cost_task numeric, cost_print numeric, cost_cogs_contract numeric, cost_cogs_retail numeric, cost_direct numeric, cost_overhead numeric, cost_fixed numeric, cost_salary_base numeric)` | **DEFINER** | sql |
| [`finance_reports_snapshot`](#finance_reports_snapshot) | `p_start_date date, p_end_date date` | `jsonb` | **DEFINER** | sql |
| [`finance_service_distribution`](#finance_service_distribution) | `p_month integer, p_year integer` | `TABLE(name text, value integer, revenue numeric)` | invoker | plpgsql |
| [`get_contract_balance`](#get_contract_balance) | `p_contract_id uuid` | `json` | **DEFINER** | plpgsql |
| [`get_contract_list_v2`](#get_contract_list_v2) | `p_status text, p_search text, p_service_type text, p_sort text, p_time_filter text, p_start_date date, p_end_date date, p_page integer, p_page_size integer` | `jsonb` | **DEFINER** | plpgsql |
| [`get_customer_ltv`](#get_customer_ltv) | `p_ids uuid[]` | `TABLE(customer_id uuid, ltv numeric)` | **DEFINER** | sql |
| [`get_employee_job_details`](#get_employee_job_details) | `p_employee_id uuid, p_start_date date, p_end_date date` | `TABLE(contract_id uuid, contract_code text, client_name text, service_type text, event_date date, work_type text, status text, deadline date, cost numeric)` | **DEFINER** | sql |
| [`get_employee_productivity`](#get_employee_productivity) | `p_start_date date, p_end_date date` | `TABLE(employee_id uuid, full_name text, role employee_role_enum, onsite_hours numeric, active_tasks integer, completed_tasks integer, post_production_active integer, overdue_tasks integer, total_cost numeric)` | **DEFINER** | sql |
| [`get_finance_advanced_intelligence`](#get_finance_advanced_intelligence) | `p_month integer, p_year integer` | `jsonb` | **DEFINER** | plpgsql |
| [`get_receivable_aging`](#get_receivable_aging) | `—` | `json` | **DEFINER** | plpgsql |
| [`payable_items`](#payable_items) | `p_payee_type text, p_payee_id uuid` | `TABLE(target_type text, target_id uuid, item_date date, label text, committed numeric, allocated numeric, remaining numeric)` | invoker | sql |
| [`process_contract_payment`](#process_contract_payment) | `p_contract_id uuid, p_amount numeric, p_payment_method payment_method_enum, p_payment_date date, p_payment_stage text, p_category_id uuid, p_notes text, p_payment_plan_id uuid, p_created_by uuid` | `json` | **DEFINER** | plpgsql |
| [`recalc_contract_totals`](#recalc_contract_totals) | `p_contract_id uuid` | `void` | **DEFINER** | plpgsql |
| [`restore_inventory_on_contract_payment_void`](#restore_inventory_on_contract_payment_void) | `—` | `trigger` | invoker | plpgsql |
| [`save_contract_atomic`](#save_contract_atomic) | `p_contract jsonb, p_customer jsonb, p_items jsonb, p_actor_id uuid, p_existing_contract_id uuid, p_expected_updated_at timestamp with time zone, p_initial_payment jsonb` | `json` | **DEFINER** | plpgsql |
| [`trg_contract_payment_status_v2`](#trg_contract_payment_status_v2) | `—` | `trigger` | invoker | plpgsql |
| [`update_contract_checklists_updated_at`](#update_contract_checklists_updated_at) | `—` | `trigger` | invoker | plpgsql |
| [`vendor_cost_report`](#vendor_cost_report) | `p_month integer, p_year integer` | `TABLE(vendor_id uuid, vendor_name text, vendor_phone text, service_type text, job_count bigint, total_cost numeric, contracts text[])` | **DEFINER** | sql |

---

## calendar_month_events

`calendar_month_events(p_month integer, p_year integer, p_employee_id uuid)` → `TABLE(event_source text, id uuid, event_type text, event_date text, end_date text, employee_id uuid, contract_id uuid, status text, google_event_id text, color_id text, location text, notes text, work_type text, assigned_to uuid, start_date text, start_time text, end_time text, deadline text, event_id uuid, contract_code text, customer_name text)` · SECURITY INVOKER · plpgsql · STABLE

```sql
DECLARE
  v_month int := LEAST(12, GREATEST(1, COALESCE(p_month, EXTRACT(MONTH FROM CURRENT_DATE)::int)));
  v_year int := COALESCE(NULLIF(p_year, 0), EXTRACT(YEAR FROM CURRENT_DATE)::int);
  v_start date;
  v_end_exclusive date;
BEGIN
  v_start := make_date(v_year, v_month, 1) - interval '2 months';
  v_end_exclusive := make_date(v_year, v_month, 1) + interval '3 months';

  RETURN QUERY
  SELECT feed.*
  FROM (
    SELECT
      'schedule'::text,
      s.id,
      s.event_type::text,
      s.event_date::text,
      s.end_date::text,
      s.employee_id,
      s.contract_id,
      s.status::text,
      s.google_event_id::text,
      s.color_id::text,
      s.location::text,
      s.notes::text,
      NULL::text,
      NULL::uuid,
      NULL::text,
      NULL::text,
      NULL::text,
      NULL::text,
      NULL::uuid,
      NULL::text,
      NULL::text
    FROM public.schedules s
    WHERE s.event_date >= v_start
      AND s.event_date < v_end_exclusive
      AND (p_employee_id IS NULL OR s.employee_id = p_employee_id)   -- R8 (#24): vai không phải admin/manager chỉ thấy lịch tay của mình

    UNION ALL

    SELECT
      'contract_event'::text,
      ce.id,
      COALESCE(ce.title, ce.event_type::text),
      ce.event_date::text,
      ce.end_date::text,
      NULL::uuid,
      ce.contract_id,
      ce.status::text,
      ce.google_event_id::text,
      NULL::text,
      ce.location::text,
      ce.notes::text,
      NULL::text,
      NULL::uuid,
      NULL::text,
      ce.start_time::text,
      ce.end_time::text,
      NULL::text,
      ce.id,
      c.contract_code::text,
      cu.full_name::text
    FROM public.contract_events ce
    JOIN public.contracts c ON c.id = ce.contract_id
    LEFT JOIN public.customers cu ON cu.id = c.customer_id
    WHERE ce.deleted_at IS NULL
      AND c.deleted_at IS NULL
      AND ce.event_type IN ('ngay_chup', 'ngay_to_chuc')
      AND ce.event_date >= v_start
      AND ce.event_date < v_end_exclusive

    UNION ALL

    SELECT
      'task'::text,
      wt.id,
      NULL::text,
      NULL::text,
      NULL::text,
      NULL::uuid,
      wt.contract_id,
      wt.status::text,
      NULL::text,
      NULL::text,
      NULL::text,
      NULL::text,
      wt.work_type::text,
      wt.assigned_to,
      wt.start_date::text,
      wt.start_time::text,
      wt.end_time::text,
      wt.deadline::text,
      wt.event_id,
      c.contract_code::text,
      cu.full_name::text
    FROM public.work_tasks wt
    LEFT JOIN public.contracts c ON c.id = wt.contract_id
    LEFT JOIN public.customers cu ON cu.id = c.customer_id
    WHERE wt.work_type IN ('chup_anh', 'quay_phim', 'makeup', 'tro_ly', 'cameraman')
      AND (
        (wt.deadline >= v_start AND wt.deadline < v_end_exclusive)
        OR (wt.deadline IS NULL AND wt.start_date >= v_start AND wt.start_date < v_end_exclusive)
      )
  ) AS feed(
    event_source, id, event_type, event_date, end_date, employee_id,
    contract_id, status, google_event_id, color_id, location, notes,
    work_type, assigned_to, start_date, start_time, end_time, deadline,
    event_id, contract_code, customer_name
  )
  ORDER BY
    COALESCE(feed.event_date::date, feed.deadline::date, feed.start_date::date) NULLS LAST,
    feed.event_source,
    feed.id;
END;
```

---

## cancel_contract_cascade

`cancel_contract_cascade(p_contract_id uuid, p_reason text, p_user_id uuid)` → `void` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
DECLARE
  v_contract public.contracts%ROWTYPE;
  v_dress_id uuid;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: actor_id is required';
  END IF;

  SELECT *
  INTO v_contract
  FROM public.contracts
  WHERE id = p_contract_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Khong tim thay hop dong';
  END IF;

  IF v_contract.status = 'da_huy' THEN
    RETURN;
  END IF;

  UPDATE public.contracts
  SET status = 'da_huy',
      cancel_reason = NULLIF(p_reason, ''),
      cancelled_at = now(),
      cancelled_by = p_user_id,
      updated_by = p_user_id,
      updated_at = now()
  WHERE id = p_contract_id;

  UPDATE public.work_tasks
  SET status = 'da_huy',
      updated_at = now()
  WHERE contract_id = p_contract_id
    AND COALESCE(status, '') <> 'hoan_thanh';

  -- R1 (#13, 2026-09-07): CHECK printing_orders_status_check chỉ cho 'huy_don' (24/08); 'da_huy' làm abort cả giao dịch huỷ HĐ
  UPDATE public.printing_orders
  SET status = 'huy_don',
      updated_by = p_user_id,
      updated_at = now()
  WHERE contract_id = p_contract_id
    AND deleted_at IS NULL
    AND COALESCE(status, '') NOT IN ('hoan_thanh', 'huy_don', 'da_huy');

  UPDATE public.dress_reservations
  SET status = 'cancelled',
      updated_at = now()
  WHERE contract_id = p_contract_id
    AND COALESCE(status, '') IN ('reserved', 'in_use', 'rented');

  FOR v_dress_id IN
    SELECT DISTINCT dress_id
    FROM public.dress_reservations
    WHERE contract_id = p_contract_id
  LOOP
    PERFORM public.refresh_dress_status(v_dress_id);
  END LOOP;

  UPDATE public.payment_plans
  SET status = 'cancelled'
  WHERE contract_id = p_contract_id
    AND COALESCE(status, 'pending') NOT IN ('paid', 'cancelled');
END;
```

---

## contract_payment_receipt_code

`contract_payment_receipt_code(p_payment_id uuid, p_payment_date date)` → `text` · SECURITY INVOKER · sql · IMMUTABLE

```sql
SELECT 'PT-' || to_char(COALESCE(p_payment_date, CURRENT_DATE), 'YYYYMM') || '-'
    || upper(left(replace(p_payment_id::text, '-', ''), 8));
```

---

## contract_payment_status_v2

`contract_payment_status_v2(p_paid numeric, p_remaining numeric)` → `text` · SECURITY INVOKER · sql · IMMUTABLE

```sql
SELECT CASE
    WHEN COALESCE(p_paid, 0) <= 0 THEN 'chua_thanh_toan'
    WHEN COALESCE(p_remaining, 0) <= 0 THEN 'da_thanh_toan'
    ELSE 'thanh_toan_mot_phan'
  END;
```

---

## contract_stats

`contract_stats()` → `TABLE(total bigint, active bigint, pending bigint, completed bigint, revenue numeric, outstanding numeric, growth_total integer)` · SECURITY INVOKER · sql · STABLE

```sql
WITH periods AS (
    SELECT
      date_trunc('month', now()) AS this_month_start,
      date_trunc('month', now()) - INTERVAL '1 month' AS last_month_start
  ),
  base AS (
    SELECT status, total_amount, remaining_amount, created_at
    FROM public.contracts
    WHERE deleted_at IS NULL
      AND status <> 'da_huy'
  ),
  month_counts AS (
    SELECT
      COUNT(*) FILTER (
        WHERE created_at >= (SELECT this_month_start FROM periods)
      )::NUMERIC AS this_month_count,
      COUNT(*) FILTER (
        WHERE created_at >= (SELECT last_month_start FROM periods)
          AND created_at < (SELECT this_month_start FROM periods)
      )::NUMERIC AS last_month_count
    FROM base
  )
  SELECT
    COUNT(*)::BIGINT AS total,
    COUNT(*) FILTER (WHERE status = 'dang_thuc_hien')::BIGINT AS active,
    COUNT(*) FILTER (WHERE status = 'cho_xu_ly')::BIGINT AS pending,
    COUNT(*) FILTER (WHERE status = 'hoan_thanh')::BIGINT AS completed,
    COALESCE(SUM(total_amount), 0)::NUMERIC AS revenue,
    COALESCE(SUM(remaining_amount), 0)::NUMERIC AS outstanding,
    CASE
      WHEN (SELECT last_month_count FROM month_counts) > 0 THEN
        ROUND((((SELECT this_month_count FROM month_counts) - (SELECT last_month_count FROM month_counts)) / (SELECT last_month_count FROM month_counts)) * 100)::INT
      ELSE 0
    END AS growth_total
  FROM base;
```

---

## contract_stats_simple

`contract_stats_simple()` → `TABLE(total bigint, active bigint, pending bigint, completed bigint, this_month bigint, last_month bigint)` · SECURITY INVOKER · sql · STABLE

```sql
WITH base AS (
    SELECT
      status,
      created_at
    FROM contracts
    WHERE deleted_at IS NULL
  ),
  month_bounds AS (
    SELECT
      date_trunc('month', CURRENT_DATE)::date AS this_month_start,
      (date_trunc('month', CURRENT_DATE) - INTERVAL '1 month')::date AS last_month_start,
      date_trunc('month', CURRENT_DATE)::date - 1 AS last_month_end
  )
  SELECT
    COUNT(*) FILTER (WHERE b.status != 'da_huy') AS total,
    COUNT(*) FILTER (WHERE b.status = 'dang_thuc_hien') AS active,
    COUNT(*) FILTER (WHERE b.status = 'cho_xu_ly') AS pending,
    COUNT(*) FILTER (WHERE b.status = 'hoan_thanh') AS completed,
    COUNT(*) FILTER (WHERE b.status != 'da_huy' AND b.created_at >= m.this_month_start) AS this_month,
    COUNT(*) FILTER (WHERE b.status != 'da_huy' AND b.created_at >= m.last_month_start AND b.created_at <= m.last_month_end) AS last_month
  FROM base b
  CROSS JOIN month_bounds m;
```

---

## create_contract_inventory_addon_sale_atomic

`create_contract_inventory_addon_sale_atomic(p_contract_id uuid, p_item_id uuid, p_quantity integer, p_sale_unit_price numeric, p_payment_method payment_method_enum, p_payment_date date, p_notes text, p_user_id uuid)` → `jsonb` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
DECLARE
  v_contract public.contracts%ROWTYPE;
  v_item public.inventory_items%ROWTYPE;
  v_payment_id uuid := gen_random_uuid();
  v_contract_item_id uuid;
  v_receipt_code text;
  v_total_amount numeric;
  v_new_stock integer;
  v_new_total numeric;
  v_new_paid numeric;
  v_new_remaining numeric;
  v_payment_status text;
  v_stage_label text;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: actor_id is required';
  END IF;

  IF p_contract_id IS NULL OR p_item_id IS NULL THEN
    RAISE EXCEPTION 'Contract and item are required';
  END IF;

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than 0';
  END IF;

  IF p_sale_unit_price IS NULL OR p_sale_unit_price <= 0 THEN
    RAISE EXCEPTION 'Sale price must be greater than 0';
  END IF;

  IF p_payment_date IS NULL THEN
    RAISE EXCEPTION 'Payment date is required';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.finance_monthly_closes
    WHERE period = to_char(p_payment_date, 'YYYY-MM')
      AND status = 'locked'
  ) THEN
    RAISE EXCEPTION 'Ky nay da chot so, khong the thay doi du lieu.';
  END IF;

  SELECT *
  INTO v_contract
  FROM public.contracts
  WHERE id = p_contract_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Khong tim thay hop dong';
  END IF;

  IF v_contract.status = 'da_huy' THEN
    RAISE EXCEPTION 'Hop dong da huy, khong the ban them vat tu';
  END IF;

  SELECT *
  INTO v_item
  FROM public.inventory_items
  WHERE id = p_item_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item does not exist';
  END IF;

  IF v_item.status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'Cannot sell discontinued inventory item';
  END IF;

  IF COALESCE(v_item.current_stock, 0) < p_quantity THEN
    RAISE EXCEPTION '% does not have enough stock. Remaining %', v_item.name, COALESCE(v_item.current_stock, 0);
  END IF;

  v_total_amount := p_quantity * p_sale_unit_price;
  v_new_stock := COALESCE(v_item.current_stock, 0) - p_quantity;
  v_receipt_code := public.contract_payment_receipt_code(v_payment_id, p_payment_date);
  v_stage_label := public.payment_stage_display_label_v2('phat_sinh', 'Phat sinh hop dong');

  INSERT INTO public.contract_items (
    contract_id,
    type,
    item_name,
    quantity,
    unit_price,
    original_price,
    discount_amount,
    total_amount,
    is_addon,
    addon_category,
    notes,
    added_by
  )
  VALUES (
    p_contract_id,
    'phat_sinh'::public.item_type_enum,
    LEFT(CONCAT('Vat tu: ', v_item.name, ' (', v_item.item_code, ')'), 120),
    p_quantity,
    p_sale_unit_price,
    p_sale_unit_price,
    0,
    v_total_amount,
    true,
    'khac'::public.addon_category_enum,
    NULLIF(BTRIM(COALESCE(p_notes, '')), ''),
    p_user_id
  )
  RETURNING id INTO v_contract_item_id;

  INSERT INTO public.payments (
    id,
    contract_id,
    customer_id,
    amount,
    payment_method,
    payment_date,
    payment_stage,
    notes,
    receipt_code,
    created_by,
    approved_by,
    is_contract_adjustment,
    contract_adjustment_item_id
  )
  VALUES (
    v_payment_id,
    p_contract_id,
    v_contract.customer_id,
    v_total_amount,
    p_payment_method,
    p_payment_date,
    v_stage_label,
    NULLIF(BTRIM(COALESCE(p_notes, '')), ''),
    v_receipt_code,
    p_user_id,
    p_user_id,
    true,
    v_contract_item_id
  );

  INSERT INTO public.inventory_transactions (
    item_id, transaction_type, quantity, unit_cost,
    contract_id, reason, notes, customer_name, customer_phone,
    source_type, source_id, sale_unit_price, sale_total, payment_method,
    performed_by, created_by
  )
  VALUES (
    p_item_id,
    'stock_out',
    p_quantity,
    COALESCE(v_item.average_unit_price, 0),
    p_contract_id,
    CONCAT('Ban them HD ', COALESCE(v_contract.contract_code, p_contract_id::text)),
    NULLIF(BTRIM(COALESCE(p_notes, '')), ''),
    NULL,
    NULL,
    'contract_addon_sale',
    v_payment_id,
    p_sale_unit_price,
    v_total_amount,
    p_payment_method::text,
    p_user_id,
    p_user_id
  );

  UPDATE public.inventory_items
  SET current_stock = v_new_stock,
      updated_at = now(),
      updated_by = p_user_id
  WHERE id = p_item_id;

  v_new_total := COALESCE(v_contract.total_amount, 0) + v_total_amount;
  v_new_paid := COALESCE(v_contract.paid_amount, 0) + v_total_amount;
  v_new_remaining := GREATEST(0, v_new_total - v_new_paid);
  v_payment_status := public.contract_payment_status_v2(v_new_paid, v_new_remaining);

  UPDATE public.contracts
  SET total_amount = v_new_total,
      paid_amount = v_new_paid,
      remaining_amount = v_new_remaining,
      payment_status = v_payment_status,
      updated_at = now(),
      updated_by = p_user_id
  WHERE id = p_contract_id;

  RETURN jsonb_build_object(
    'payment_id', v_payment_id,
    'receipt_code', v_receipt_code,
    'contract_item_id', v_contract_item_id,
    'item_id', p_item_id,
    'current_stock', v_new_stock,
    'new_total', v_new_total,
    'new_paid', v_new_paid,
    'new_remaining', v_new_remaining,
    'payment_status', v_payment_status
  );
END;
```

---

## dashboard_critical_kpis

`dashboard_critical_kpis(p_month integer, p_year integer)` → `TABLE(current_revenue numeric, previous_revenue numeric, total_debt numeric, current_contracts bigint, previous_contracts bigint, current_completed bigint, previous_completed bigint)` · SECURITY INVOKER · sql · STABLE

```sql
WITH bounds AS (
    SELECT
      make_date(p_year, p_month, 1)::date AS current_start,
      (make_date(p_year, p_month, 1) + interval '1 month')::date AS current_end,
      (make_date(p_year, p_month, 1) - interval '1 month')::date AS previous_start,
      (make_date(p_year, p_month, 1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh') AS current_start_utc,
      ((make_date(p_year, p_month, 1) + interval '1 month')::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh') AS current_end_utc,
      ((make_date(p_year, p_month, 1) - interval '1 month')::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh') AS previous_start_utc
  )
  SELECT
    (
      COALESCE((
        SELECT SUM(p.amount)
        FROM public.payments p, bounds b
        WHERE p.deleted_at IS NULL
          AND p.payment_date >= b.current_start
          AND p.payment_date < b.current_end
      ), 0)
      +
      COALESCE((
        SELECT SUM(r.receipt_amount)
        FROM public.receipts r, bounds b
        WHERE r.deleted_at IS NULL
          AND r.contract_id IS NULL
          AND r.receipt_date >= b.current_start
          AND r.receipt_date < b.current_end
      ), 0)
    ) AS current_revenue,
    (
      COALESCE((
        SELECT SUM(p.amount)
        FROM public.payments p, bounds b
        WHERE p.deleted_at IS NULL
          AND p.payment_date >= b.previous_start
          AND p.payment_date < b.current_start
      ), 0)
      +
      COALESCE((
        SELECT SUM(r.receipt_amount)
        FROM public.receipts r, bounds b
        WHERE r.deleted_at IS NULL
          AND r.contract_id IS NULL
          AND r.receipt_date >= b.previous_start
          AND r.receipt_date < b.current_start
      ), 0)
    ) AS previous_revenue,
    COALESCE((
      SELECT SUM(c.remaining_amount)
      FROM public.contracts c
      WHERE c.deleted_at IS NULL
        AND c.status <> 'da_huy'
        AND c.remaining_amount > 0
    ), 0) AS total_debt,
    (
      SELECT COUNT(*)
      FROM public.contracts c, bounds b
      WHERE c.deleted_at IS NULL
        AND c.status <> 'da_huy'
        AND c.contract_date >= b.current_start
        AND c.contract_date < b.current_end
    ) AS current_contracts,
    (
      SELECT COUNT(*)
      FROM public.contracts c, bounds b
      WHERE c.deleted_at IS NULL
        AND c.status <> 'da_huy'
        AND c.contract_date >= b.previous_start
        AND c.contract_date < b.current_start
    ) AS previous_contracts,
    (
      SELECT COUNT(*)
      FROM public.contracts c, bounds b
      WHERE c.deleted_at IS NULL
        AND c.status = 'hoan_thanh'
        AND c.updated_at >= b.current_start_utc
        AND c.updated_at < b.current_end_utc
    ) AS current_completed,
    (
      SELECT COUNT(*)
      FROM public.contracts c, bounds b
      WHERE c.deleted_at IS NULL
        AND c.status = 'hoan_thanh'
        AND c.updated_at >= b.previous_start_utc
        AND c.updated_at < b.current_start_utc
    ) AS previous_completed;
```

---

## dashboard_service_breakdown

`dashboard_service_breakdown(p_month integer, p_year integer, p_can_view_financials boolean)` → `TABLE(service_type text, contract_count bigint, revenue numeric)` · SECURITY INVOKER · plpgsql · STABLE

```sql
DECLARE
  v_start date := make_date(p_year, p_month, 1);
  v_end date := (make_date(p_year, p_month, 1) + interval '1 month')::date;
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(NULLIF(c.service_type::text, ''), 'khac') AS service_type,
    COUNT(*)::bigint AS contract_count,
    CASE
      WHEN p_can_view_financials THEN COALESCE(SUM(c.total_amount), 0)
      ELSE 0
    END AS revenue
  FROM public.contracts c
  WHERE c.deleted_at IS NULL
    AND c.status <> 'da_huy'
    AND c.contract_date >= v_start
    AND c.contract_date < v_end
  GROUP BY 1
  ORDER BY 2 DESC, 3 DESC, 1 ASC;
END;
```

---

## delete_contract_cascade

`delete_contract_cascade(p_contract_id uuid, p_user_id uuid)` → `void` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: actor_id is required';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.payments
    WHERE contract_id = p_contract_id
      AND deleted_at IS NULL
      AND amount > 0
  ) THEN
    RAISE EXCEPTION 'Hop dong da co phieu thu, chi duoc huy thay vi xoa';
  END IF;

  UPDATE public.contract_items
  SET deleted_at = now(),
      updated_at = now()
  WHERE contract_id = p_contract_id
    AND deleted_at IS NULL;

  UPDATE public.contract_events
  SET deleted_at = now(),
      updated_at = now()
  WHERE contract_id = p_contract_id
    AND deleted_at IS NULL;

  UPDATE public.work_tasks
  SET status = 'da_huy',
      updated_at = now()
  WHERE contract_id = p_contract_id
    AND COALESCE(status, '') <> 'hoan_thanh';

  UPDATE public.dress_reservations
  SET status = 'cancelled',
      updated_at = now()
  WHERE contract_id = p_contract_id
    AND COALESCE(status, '') <> 'cancelled';

  UPDATE public.printing_orders
  SET deleted_at = now(),
      updated_by = p_user_id,
      updated_at = now()
  WHERE contract_id = p_contract_id
    AND deleted_at IS NULL;

  UPDATE public.payment_plans
  SET status = 'cancelled'
  WHERE contract_id = p_contract_id
    AND COALESCE(status, 'pending') NOT IN ('paid', 'cancelled');

  UPDATE public.contracts
  SET deleted_at = now(),
      updated_by = p_user_id,
      updated_at = now()
  WHERE id = p_contract_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Khong tim thay hop dong';
  END IF;
END;
```

---

## finance_contract_profit_report

`finance_contract_profit_report(p_status text, p_from date, p_to date, p_page integer, p_page_size integer)` → `TABLE(id uuid, contract_code text, customer_name text, contract_date date, status text, total_amount numeric, paid_amount numeric, remaining_amount numeric, package_revenue numeric, addon_revenue numeric, discount numeric, task_cost numeric, print_cost numeric, expense_cost numeric, total_cost numeric, profit numeric, profit_margin numeric, total_count integer)` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
DECLARE v_total_count INT;
BEGIN
  SELECT COUNT(*) INTO v_total_count FROM public.contracts c
  WHERE c.deleted_at IS NULL
    AND (p_status IS NULL OR p_status = 'all' OR c.status::text = p_status)
    AND (p_from IS NULL OR c.contract_date >= p_from)
    AND (p_to IS NULL OR c.contract_date <= p_to);

  RETURN QUERY
  WITH paginated AS (
    SELECT c.id, c.contract_code, cu.full_name AS customer_name, c.contract_date, c.status, c.total_amount,
           COALESCE(c.paid_amount, 0) AS paid_amount, COALESCE(c.remaining_amount, 0) AS remaining_amount, COALESCE(c.discount_amount, 0) AS discount
    FROM public.contracts c LEFT JOIN public.customers cu ON cu.id = c.customer_id
    WHERE c.deleted_at IS NULL
      AND (p_status IS NULL OR p_status = 'all' OR c.status::text = p_status)
      AND (p_from IS NULL OR c.contract_date >= p_from)
      AND (p_to IS NULL OR c.contract_date <= p_to)
    ORDER BY c.contract_date DESC, c.contract_code DESC
    LIMIT p_page_size OFFSET GREATEST(p_page - 1, 0) * p_page_size
  ),
  fin AS (SELECT * FROM public.contract_financials(ARRAY(SELECT pg.id FROM paginated pg)))
  SELECT p.id, p.contract_code::TEXT, COALESCE(p.customer_name, 'Khach vang lai')::TEXT, p.contract_date, p.status::TEXT,
         p.total_amount, p.paid_amount, p.remaining_amount,
         COALESCE(items.package_revenue, 0)::NUMERIC, COALESCE(items.addon_revenue, 0)::NUMERIC, p.discount,
         COALESCE(f.task_cost, 0)::NUMERIC, COALESCE(f.print_cost, 0)::NUMERIC, (COALESCE(f.direct_cost, 0) + COALESCE(f.cogs, 0))::NUMERIC,
         COALESCE(f.total_cost, 0)::NUMERIC, COALESCE(f.profit, p.total_amount)::NUMERIC, COALESCE(f.profit_margin, 0)::NUMERIC,
         v_total_count
  FROM paginated p
  LEFT JOIN LATERAL (
    SELECT SUM(CASE WHEN COALESCE(ci.is_addon, FALSE) THEN COALESCE(ci.total_amount, 0) ELSE 0 END) AS addon_revenue,
           SUM(CASE WHEN COALESCE(ci.is_addon, FALSE) THEN 0 ELSE COALESCE(ci.total_amount, 0) END) AS package_revenue
    FROM public.contract_items ci WHERE ci.contract_id = p.id AND ci.deleted_at IS NULL
  ) items ON TRUE
  LEFT JOIN fin f ON f.contract_id = p.id;
END
```

---

## finance_debt_stats

`finance_debt_stats()` → `TABLE(receivable numeric, payable numeric, overdue numeric, net_debt numeric, aging jsonb)` · **SECURITY DEFINER — bỏ qua RLS** · sql · STABLE

```sql
WITH manual AS (
    SELECT
      CASE WHEN d.type = 'receivable' OR LOWER(COALESCE(d.type, '')) LIKE '%thu%' THEN 'receivable' ELSE 'payable' END AS dir,
      GREATEST(0, COALESCE(d.remaining, d.amount - COALESCE(d.paid_amount, 0), 0)) AS remaining,
      CASE WHEN d.due_date IS NOT NULL AND d.due_date < current_date THEN current_date - d.due_date ELSE 0 END AS overdue_days
    FROM public.debts d
    WHERE d.deleted_at IS NULL AND COALESCE(d.status, 'open') NOT IN ('closed', 'da_thanh_toan')
  ),
  contract_recv AS (
    SELECT c.remaining_amount AS remaining,
           (SELECT MAX(public.vn_date(ce.event_date)) FROM public.contract_events ce
             WHERE ce.contract_id = c.id AND ce.event_type = 'giao_san_pham' AND ce.status = 'hoan_thanh') AS delivered_at
    FROM public.contracts c
    WHERE c.deleted_at IS NULL AND c.status <> 'da_huy' AND c.remaining_amount > 0
  ),
  recv AS (
    SELECT remaining, CASE WHEN delivered_at IS NULL THEN 0 ELSE GREATEST(1, current_date - delivered_at) END AS overdue_days FROM contract_recv
    UNION ALL
    SELECT remaining, overdue_days FROM manual WHERE dir = 'receivable' AND remaining > 0
  ),
  pay AS (
    SELECT COALESCE(SUM(x.remaining), 0)::numeric AS payable FROM (
      SELECT s.remaining FROM public.finance_payable_summary() s
      UNION ALL SELECT m.remaining FROM manual m WHERE m.dir = 'payable' AND m.remaining > 0
    ) x
  ),
  totals AS (
    SELECT
      COALESCE(SUM(remaining), 0)::numeric AS receivable,
      COALESCE(SUM(remaining) FILTER (WHERE overdue_days > 0), 0)::numeric AS overdue,
      COALESCE(SUM(remaining) FILTER (WHERE overdue_days = 0), 0)::numeric AS not_due,
      COALESCE(SUM(remaining) FILTER (WHERE overdue_days BETWEEN 1 AND 30), 0)::numeric AS days_1_30,
      COALESCE(SUM(remaining) FILTER (WHERE overdue_days BETWEEN 31 AND 60), 0)::numeric AS days_31_60,
      COALESCE(SUM(remaining) FILTER (WHERE overdue_days BETWEEN 61 AND 90), 0)::numeric AS days_61_90,
      COALESCE(SUM(remaining) FILTER (WHERE overdue_days > 90), 0)::numeric AS over_90
    FROM recv
  )
  SELECT t.receivable, p.payable, t.overdue, (t.receivable - p.payable)::numeric,
    jsonb_build_object('not_due', t.not_due, 'days_1_30', t.days_1_30, 'days_31_60', t.days_31_60, 'days_61_90', t.days_61_90, 'over_90', t.over_90)
  FROM totals t CROSS JOIN pay p;
```

---

## finance_month_summary

`finance_month_summary(p_month integer, p_year integer)` → `TABLE(cash_in numeric, cash_in_contract numeric, cash_in_retail numeric, cash_out numeric, cash_out_settlement numeric, cash_out_other numeric, cash_net numeric, cash_net_prev numeric, revenue numeric, revenue_contract numeric, revenue_retail numeric, cost_total numeric, cost_task numeric, cost_print numeric, cost_cogs numeric, cost_direct numeric, cost_overhead numeric, cost_salary_base numeric, profit numeric, profit_prev numeric, profit_margin numeric, contracts_shot bigint, contracts_missing_work_date bigint, receivable numeric, receivable_due numeric, receivable_waiting numeric, payable numeric, payable_lab numeric, payable_vendor numeric, payable_supplier numeric, payable_employee numeric)` · **SECURITY DEFINER — bỏ qua RLS** · sql · STABLE

```sql
WITH b AS (
    SELECT make_date(p_year, p_month, 1) AS s, (make_date(p_year, p_month, 1) + interval '1 month - 1 day')::date AS e
  ),
  cur AS (SELECT l.* FROM b, LATERAL public.finance_period_ledger(b.s, b.e) l),
  prev AS (SELECT l.* FROM b, LATERAL public.finance_period_ledger((b.s - interval '1 month')::date, (b.s - interval '1 day')::date) l),
  pay AS (
    SELECT COALESCE(SUM(s.remaining), 0)::numeric AS total,
           COALESCE(SUM(s.remaining) FILTER (WHERE s.payee_type = 'lab'), 0)::numeric AS lab,
           COALESCE(SUM(s.remaining) FILTER (WHERE s.payee_type = 'vendor'), 0)::numeric AS vendor,
           COALESCE(SUM(s.remaining) FILTER (WHERE s.payee_type = 'supplier'), 0)::numeric AS supplier,
           COALESCE(SUM(s.remaining) FILTER (WHERE s.payee_type = 'employee'), 0)::numeric AS employee
    FROM public.finance_payable_summary() s
  ),
  recv AS (
    SELECT COALESCE(SUM(c.remaining_amount), 0)::numeric AS amt,
           COALESCE(SUM(c.remaining_amount) FILTER (WHERE dl.delivered IS NOT NULL), 0)::numeric AS due
    FROM public.contracts c
    LEFT JOIN LATERAL (SELECT 1 AS delivered FROM public.contract_events ce WHERE ce.contract_id = c.id AND ce.event_type = 'giao_san_pham' AND ce.status = 'hoan_thanh' LIMIT 1) dl ON TRUE
    WHERE c.deleted_at IS NULL AND c.status <> 'da_huy' AND c.remaining_amount > 0
  ),
  miss AS (
    SELECT COUNT(*)::bigint AS n FROM public.contracts c
    WHERE c.deleted_at IS NULL AND c.status NOT IN ('da_huy', 'hoan_thanh') AND c.work_date IS NULL
  ),
  calc AS (
    SELECT
      cur.cash_in_contract + cur.cash_in_retail AS cash_in,
      prev.cash_in_contract + prev.cash_in_retail - prev.cash_out AS cash_net_prev,
      cur.revenue_contract + cur.revenue_retail AS revenue,
      cur.cost_task + cur.cost_print + cur.cost_cogs_contract + cur.cost_cogs_retail + cur.cost_direct + cur.cost_overhead + cur.cost_fixed + cur.cost_salary_base AS cost_total,
      (prev.revenue_contract + prev.revenue_retail)
        - (prev.cost_task + prev.cost_print + prev.cost_cogs_contract + prev.cost_cogs_retail + prev.cost_direct + prev.cost_overhead + prev.cost_fixed + prev.cost_salary_base) AS profit_prev
    FROM cur, prev
  )
  SELECT
    calc.cash_in, cur.cash_in_contract, cur.cash_in_retail,
    cur.cash_out, cur.cash_out_settlement, (cur.cash_out - cur.cash_out_settlement)::numeric, (calc.cash_in - cur.cash_out)::numeric, calc.cash_net_prev::numeric,
    calc.revenue::numeric, cur.revenue_contract, cur.revenue_retail,
    calc.cost_total::numeric, cur.cost_task, cur.cost_print, (cur.cost_cogs_contract + cur.cost_cogs_retail)::numeric, cur.cost_direct,
    (cur.cost_overhead + cur.cost_fixed)::numeric, cur.cost_salary_base,
    (calc.revenue - calc.cost_total)::numeric, calc.profit_prev::numeric,
    CASE WHEN calc.revenue = 0 THEN 0::numeric ELSE ROUND((calc.revenue - calc.cost_total) / calc.revenue * 100, 1)::numeric END,
    cur.contracts_shot, miss.n,
    recv.amt, recv.due, (recv.amt - recv.due)::numeric,
    pay.total, pay.lab, pay.vendor, pay.supplier, pay.employee
  FROM cur, prev, calc, pay, recv, miss;
```

---

## finance_pending_collections

`finance_pending_collections(p_limit integer)` → `TABLE(id uuid, contract_code text, customer_id uuid, customer_name text, customer_phone text, status text, total_amount numeric, paid_amount numeric, remaining_amount numeric, contract_date date, work_date timestamp with time zone, delivered_at date)` · **SECURITY DEFINER — bỏ qua RLS** · sql · STABLE

```sql
WITH rows AS (
    SELECT c.id, c.contract_code::text AS contract_code, cu.id AS customer_id, cu.full_name::text AS customer_name, cu.phone::text AS customer_phone, c.status::text AS status,
           COALESCE(c.total_amount,0)::numeric AS total_amount, COALESCE(c.paid_amount,0)::numeric AS paid_amount, COALESCE(c.remaining_amount,0)::numeric AS remaining_amount,
           c.contract_date, c.work_date,
           (SELECT MAX(public.vn_date(ce.event_date)) FROM public.contract_events ce
             WHERE ce.contract_id = c.id AND ce.event_type = 'giao_san_pham' AND ce.status = 'hoan_thanh') AS delivered_at
    FROM public.contracts c
    LEFT JOIN public.customers cu ON cu.id = c.customer_id
    WHERE c.deleted_at IS NULL AND c.status <> 'da_huy' AND c.remaining_amount > 0
  )
  SELECT r.id, r.contract_code, r.customer_id, r.customer_name, r.customer_phone, r.status,
         r.total_amount, r.paid_amount, r.remaining_amount, r.contract_date, r.work_date, r.delivered_at
  FROM rows r
  ORDER BY (r.delivered_at IS NULL), r.delivered_at ASC, public.vn_date(r.work_date) ASC NULLS LAST, r.contract_date ASC
  LIMIT GREATEST(1, COALESCE(p_limit, 5));
```

---

## finance_period_ledger

`finance_period_ledger(p_start date, p_end date)` → `TABLE(cash_in_contract numeric, cash_in_retail numeric, cash_out numeric, cash_out_settlement numeric, cash_out_salary numeric, cash_out_fixed numeric, revenue_contract numeric, revenue_retail numeric, signed_revenue numeric, signed_contracts bigint, contracts_shot bigint, contracts_completed bigint, cost_task numeric, cost_print numeric, cost_cogs_contract numeric, cost_cogs_retail numeric, cost_direct numeric, cost_overhead numeric, cost_fixed numeric, cost_salary_base numeric)` · **SECURITY DEFINER — bỏ qua RLS** · sql · STABLE

```sql
WITH cash_entries AS (
    -- #23: mot dinh nghia tien vao/ra (public.finance_cash_entries) — timeline doc cung ham nay
    SELECT * FROM public.finance_cash_entries(p_start, p_end)
  ),
  cash_in AS (
    SELECT COALESCE(SUM(ce.cash_in_contract), 0)::numeric AS contract_amt,
           COALESCE(SUM(ce.cash_in_retail), 0)::numeric AS retail_amt
    FROM cash_entries ce
  ),
  exp AS (
    SELECT COALESCE(SUM(ce.cash_out), 0)::numeric AS all_out,
           COALESCE(SUM(ce.cash_out_settlement), 0)::numeric AS settlement,
           COALESCE(SUM(ce.cash_out_salary), 0)::numeric AS salary_paid,
           COALESCE(SUM(ce.cost_direct), 0)::numeric AS direct,
           COALESCE(SUM(ce.cost_overhead), 0)::numeric AS overhead,
           COALESCE(SUM(ce.cash_out_fixed), 0)::numeric AS fixed
    FROM cash_entries ce
  ),
  contracts_shot AS (
    SELECT COALESCE(SUM(c.total_amount), 0)::numeric AS amt, COUNT(*)::bigint AS n,
           COUNT(*) FILTER (WHERE c.status = 'hoan_thanh')::bigint AS done
    FROM public.contracts c
    WHERE c.deleted_at IS NULL AND c.status <> 'da_huy'
      AND COALESCE(public.vn_date(c.work_date), c.contract_date) BETWEEN p_start AND p_end
  ),
  signed AS (
    SELECT COALESCE(SUM(c.total_amount), 0)::numeric AS amt, COUNT(*)::bigint AS n
    FROM public.contracts c
    WHERE c.deleted_at IS NULL AND c.status <> 'da_huy' AND c.contract_date BETWEEN p_start AND p_end
  ),
  tasks AS (
    -- cung luat contract_financials(): moi task khong huy co cost (ke ca dang_lam) -> tong thang = tong hop dong
    SELECT COALESCE(SUM(wt.cost), 0)::numeric AS amt
    FROM public.work_tasks wt
    LEFT JOIN public.contract_events ev ON ev.id = wt.event_id
    WHERE wt.status <> 'da_huy' AND COALESCE(wt.cost, 0) > 0
      AND COALESCE(public.vn_date(ev.event_date), public.vn_date(wt.deadline), public.vn_date(wt.created_at)) BETWEEN p_start AND p_end
  ),
  prints AS (
    SELECT COALESCE(SUM(po.total_amount), 0)::numeric AS amt
    FROM public.printing_orders po
    WHERE po.deleted_at IS NULL AND COALESCE(po.status, '') NOT IN ('huy_don', 'da_huy')
      AND COALESCE(po.order_date, public.vn_date(po.created_at)) BETWEEN p_start AND p_end
  ),
  cogs AS (
    SELECT
      COALESCE(SUM(t.total_cost) FILTER (WHERE t.source_type IN ('contract_fulfillment', 'contract_addon_sale')), 0)::numeric AS contract_amt,
      COALESCE(SUM(t.total_cost) FILTER (WHERE t.source_type = 'retail_sale'), 0)::numeric AS retail_amt
    FROM public.inventory_transactions t
    LEFT JOIN public.receipts r ON r.id = t.receipt_id
    WHERE t.transaction_type = 'stock_out' AND COALESCE(t.is_rollback, false) = false
      AND t.source_type IN ('retail_sale', 'contract_fulfillment', 'contract_addon_sale')
      AND COALESCE(r.receipt_date, public.vn_date(t.created_at)) BETWEEN p_start AND p_end
  ),
  month_ratios AS (
    -- luong cung prorate theo so ngay cua thang nam trong ky (ky = thang tron -> ratio 1)
    SELECT EXTRACT(year FROM gs)::int AS year, EXTRACT(month FROM gs)::int AS month,
           ((LEAST(p_end, (gs + interval '1 month - 1 day')::date) - GREATEST(p_start, gs::date) + 1)::numeric
             / ((gs + interval '1 month - 1 day')::date - gs::date + 1)::numeric) AS ratio
    FROM generate_series(date_trunc('month', p_start)::date, date_trunc('month', p_end)::date, interval '1 month') gs
  ),
  salary AS (
    -- ADR-016 M5: luong cung = employee_salaries.total_salary (luong co ban + thuong - phat; product_salary = 0 tu M3).
    -- Cot monthly_salary khong code nao ghi (M2 dung nham -> luon 0). Sheet la accrual, khong phai tien.
    SELECT COALESCE(SUM(COALESCE(s.total_salary, 0) * mr.ratio), 0)::numeric AS amt
    FROM month_ratios mr
    LEFT JOIN public.employee_salaries s ON s.year = mr.year AND s.month = mr.month
  )
  SELECT
    cash_in.contract_amt, cash_in.retail_amt,
    exp.all_out, exp.settlement, exp.salary_paid, exp.fixed,
    contracts_shot.amt, cash_in.retail_amt, signed.amt, signed.n,
    contracts_shot.n, contracts_shot.done,
    tasks.amt, prints.amt, cogs.contract_amt, cogs.retail_amt,
    exp.direct, exp.overhead, exp.fixed, salary.amt
  FROM cash_in, exp, contracts_shot, signed, tasks, prints, cogs, salary;
```

---

## finance_reports_snapshot

`finance_reports_snapshot(p_start_date date, p_end_date date)` → `jsonb` · **SECURITY DEFINER — bỏ qua RLS** · sql · STABLE

```sql
WITH params AS (
    SELECT
      LEAST(COALESCE(p_start_date, p_end_date, current_date), COALESCE(p_end_date, p_start_date, current_date)) AS start_date,
      GREATEST(COALESCE(p_start_date, p_end_date, current_date), COALESCE(p_end_date, p_start_date, current_date)) AS end_date
  ),
  l AS (SELECT lg.* FROM params p, LATERAL public.finance_period_ledger(p.start_date, p.end_date) lg),
  contracts_scope AS (
    SELECT c.id, c.status, COALESCE(c.total_amount, 0) AS total_amount, COALESCE(c.discount_amount, 0) AS discount_amount,
           COALESCE(NULLIF(c.service_type::text, ''), 'Khac') AS service_type
    FROM public.contracts c CROSS JOIN params p
    WHERE c.deleted_at IS NULL AND c.status <> 'da_huy'
      AND COALESCE(public.vn_date(c.work_date), c.contract_date) BETWEEN p.start_date AND p.end_date
  ),
  contract_summary AS (
    SELECT COUNT(*)::numeric AS total_contracts,
           COUNT(*) FILTER (WHERE status IN ('hoan_thanh', 'completed'))::numeric AS completed_contracts,
           COALESCE(SUM(total_amount), 0) AS contract_revenue,
           COALESCE(SUM(discount_amount), 0) AS total_discount
    FROM contracts_scope
  ),
  addon_summary AS (
    SELECT COALESCE(SUM(COALESCE(ci.total_amount, 0)), 0) AS addon_revenue, COUNT(ci.id)::numeric AS addon_count
    FROM contracts_scope c JOIN public.contract_items ci ON ci.contract_id = c.id
    WHERE ci.is_addon IS TRUE AND ci.deleted_at IS NULL
  ),
  service_rows AS (
    SELECT service_type AS name, COUNT(*)::numeric AS value, COALESCE(SUM(total_amount), 0) AS revenue
    FROM contracts_scope GROUP BY service_type
  ),
  service_json AS (
    SELECT COALESCE(jsonb_agg(jsonb_build_object('name', name, 'value', value, 'revenue', revenue) ORDER BY revenue DESC, value DESC), '[]'::jsonb) AS items
    FROM service_rows
  ),
  miss AS (
    SELECT COUNT(*)::numeric AS n FROM public.contracts c
    WHERE c.deleted_at IS NULL AND c.status NOT IN ('da_huy', 'hoan_thanh') AND c.work_date IS NULL
  ),
  totals AS (
    SELECT
      l.cash_in_contract AS payment_revenue,
      l.cash_in_retail AS standalone_receipt_revenue,
      l.cash_in_contract + l.cash_in_retail AS cash_inflow,
      cs.contract_revenue + l.revenue_retail AS report_revenue,
      cs.total_contracts, cs.completed_contracts, cs.contract_revenue, cs.total_discount,
      ads.addon_revenue, ads.addon_count,
      GREATEST(0, cs.contract_revenue - ads.addon_revenue) AS package_revenue,
      l.cost_cogs_contract + l.cost_cogs_retail AS inventory_cost,
      l.cost_task + l.cost_print + l.cost_direct + l.cost_cogs_contract + l.cost_cogs_retail AS direct_cost,
      l.cost_overhead AS operating_cost,
      l.cash_out AS operating_outflow,
      l.cost_salary_base AS salary_cost,
      l.cost_fixed AS fixed_cost,
      l.cash_out_salary AS salary_paid,
      l.cash_out_fixed AS fixed_paid,
      l.signed_revenue, l.signed_contracts
    FROM l CROSS JOIN contract_summary cs CROSS JOIN addon_summary ads
  )
  SELECT jsonb_build_object(
    'summary', jsonb_build_object(
      'totalRevenue', t.report_revenue,
      'totalCost', t.direct_cost + t.operating_cost + t.salary_cost + t.fixed_cost,
      'directCost', t.direct_cost,
      'inventoryCost', t.inventory_cost,
      'operatingCost', t.operating_cost,
      'salaryCost', t.salary_cost,
      'fixedCost', t.fixed_cost,
      'netProfit', t.report_revenue - (t.direct_cost + t.operating_cost + t.salary_cost + t.fixed_cost),
      'profitMargin', CASE WHEN t.report_revenue > 0 THEN ROUND(((t.report_revenue - (t.direct_cost + t.operating_cost + t.salary_cost + t.fixed_cost)) / t.report_revenue) * 1000) / 10 ELSE 0 END,
      'totalContracts', t.total_contracts,
      'completedContracts', t.completed_contracts,
      'avgContractValue', CASE WHEN t.total_contracts > 0 THEN t.contract_revenue / t.total_contracts ELSE 0 END,
      'totalDiscount', t.total_discount,
      'packageRevenue', t.package_revenue,
      'addonRevenue', t.addon_revenue,
      'addonCount', t.addon_count,
      'addonPercentage', CASE WHEN t.contract_revenue > 0 THEN ROUND((t.addon_revenue / t.contract_revenue) * 1000) / 10 ELSE 0 END,
      'signedRevenue', t.signed_revenue,
      'signedContracts', t.signed_contracts,
      'contractsMissingWorkDate', m.n
    ),
    'serviceDistribution', sj.items,
    'revenueBreakdown', jsonb_build_array(
      jsonb_build_object('label', 'Doanh thu hop dong', 'amount', t.contract_revenue, 'percentage', CASE WHEN t.report_revenue > 0 THEN ROUND((t.contract_revenue / t.report_revenue) * 1000) / 10 ELSE 0 END),
      jsonb_build_object('label', 'Thu khac', 'amount', t.standalone_receipt_revenue, 'percentage', CASE WHEN t.report_revenue > 0 THEN ROUND((t.standalone_receipt_revenue / t.report_revenue) * 1000) / 10 ELSE 0 END)
    ),
    'cashflowSummary', jsonb_build_object(
      'totalInflow', t.cash_inflow,
      'totalOutflow', t.operating_outflow,
      'salaryCost', t.salary_paid,
      'fixedCost', t.fixed_paid,
      'operatingNet', t.cash_inflow - t.operating_outflow,
      'netAfterOverhead', t.cash_inflow - t.operating_outflow
    )
  )
  FROM totals t CROSS JOIN service_json sj CROSS JOIN miss m;
```

---

## finance_service_distribution

`finance_service_distribution(p_month integer, p_year integer)` → `TABLE(name text, value integer, revenue numeric)` · SECURITY INVOKER · plpgsql · STABLE

```sql
DECLARE
  v_start DATE := make_date(p_year, p_month, 1);
  v_end DATE := (make_date(p_year, p_month, 1) + INTERVAL '1 month')::DATE;
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(s.service_type, c.service_type::TEXT, 'Khác') AS name,
    COUNT(DISTINCT c.id)::INT AS value,
    SUM(COALESCE(ci.total_amount, c.total_amount, 0)) AS revenue
  FROM public.contracts c
  LEFT JOIN public.contract_items ci
    ON ci.contract_id = c.id AND ci.deleted_at IS NULL
  LEFT JOIN public.services s
    ON s.id = ci.service_id AND s.deleted_at IS NULL
  WHERE c.deleted_at IS NULL
    AND c.contract_date >= v_start
    AND c.contract_date < v_end
  GROUP BY 1
  ORDER BY 2 DESC, 3 DESC;
END;
```

---

## get_contract_balance

`get_contract_balance(p_contract_id uuid)` → `json` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_amount', c.total_amount,
    'discount_amount', c.discount_amount,
    'paid_amount', COALESCE(SUM(p.amount), 0),
    'remaining_amount', c.total_amount - c.discount_amount - COALESCE(SUM(p.amount), 0),
    'payment_count', COUNT(p.id)
  ) INTO result
  FROM contracts c
  LEFT JOIN payments p ON p.contract_id = c.id AND p.deleted_at IS NULL
  WHERE c.id = p_contract_id
  GROUP BY c.id, c.total_amount, c.discount_amount;
  
  RETURN result;
END;
```

---

## get_contract_list_v2

`get_contract_list_v2(p_status text, p_search text, p_service_type text, p_sort text, p_time_filter text, p_start_date date, p_end_date date, p_page integer, p_page_size integer)` → `jsonb` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
DECLARE
  v_page integer := GREATEST(COALESCE(p_page, 1), 1);
  v_page_size integer := LEAST(GREATEST(COALESCE(p_page_size, 20), 1), 100);
  v_offset integer := (GREATEST(COALESCE(p_page, 1), 1) - 1) * LEAST(GREATEST(COALESCE(p_page_size, 20), 1), 100);
  v_search text := NULLIF(BTRIM(COALESCE(p_search, '')), '');
BEGIN
  RETURN (
    WITH filtered AS (
      SELECT c.*
      FROM public.contracts c
      LEFT JOIN public.customers cust ON cust.id = c.customer_id
      WHERE c.deleted_at IS NULL
        AND (
          (COALESCE(p_status, 'all') = 'all' AND c.status <> 'da_huy')
          OR (COALESCE(p_status, 'all') <> 'all' AND c.status::text = p_status)
        )
        AND (
          COALESCE(p_service_type, 'all') = 'all'
          OR c.service_type::text = p_service_type
        )
        AND (
          v_search IS NULL
          OR c.contract_code ILIKE '%' || v_search || '%'
          OR cust.full_name ILIKE '%' || v_search || '%'
          OR cust.customer_code ILIKE '%' || v_search || '%'
          OR cust.phone ILIKE '%' || v_search || '%'
          OR cust.bride_name ILIKE '%' || v_search || '%'
          OR cust.groom_name ILIKE '%' || v_search || '%'
        )
        AND (
          COALESCE(p_time_filter, 'all') = 'all'
          OR (
            p_time_filter = 'this_month'
            AND c.contract_date >= date_trunc('month', CURRENT_DATE)::date
            AND c.contract_date < (date_trunc('month', CURRENT_DATE) + interval '1 month')::date
          )
          OR (
            p_time_filter = 'last_month'
            AND c.contract_date >= (date_trunc('month', CURRENT_DATE) - interval '1 month')::date
            AND c.contract_date < date_trunc('month', CURRENT_DATE)::date
          )
          OR (
            p_time_filter = 'this_year'
            AND c.contract_date >= date_trunc('year', CURRENT_DATE)::date
            AND c.contract_date < (date_trunc('year', CURRENT_DATE) + interval '1 year')::date
          )
        )
        AND (p_start_date IS NULL OR c.contract_date >= p_start_date)
        AND (p_end_date IS NULL OR c.contract_date <= p_end_date)
    ),
    counted AS (
      SELECT COUNT(*)::integer AS total
      FROM filtered
    ),
    paged AS (
      SELECT f.*
      FROM filtered f
      ORDER BY
        CASE WHEN p_sort = 'oldest' THEN f.created_at END ASC NULLS LAST,
        CASE WHEN p_sort = 'amount_desc' THEN f.total_amount END DESC NULLS LAST,
        CASE WHEN p_sort = 'amount_asc' THEN f.total_amount END ASC NULLS LAST,
        f.created_at DESC NULLS LAST
      LIMIT v_page_size
      OFFSET v_offset
    ),
    rows AS (
      SELECT
        c.created_at,
        c.total_amount,
        jsonb_build_object(
          'id', c.id,
          'contract_code', c.contract_code,
          'customer_id', c.customer_id,
          'service_type', c.service_type,
          'transaction_type', c.transaction_type,
          'contract_date', c.contract_date,
          'work_date', c.work_date,
          'delivery_date', c.delivery_date,
          'total_amount', c.total_amount,
          'discount_amount', c.discount_amount,
          'paid_amount', c.paid_amount,
          'remaining_amount', c.remaining_amount,
          'status', c.status,
          'payment_status', c.payment_status,
          'description', c.description,
          'updated_at', c.updated_at,
          'created_at', c.created_at,
          'total_cost', COALESCE(cf.total_cost, 0),
          'profit', COALESCE(cf.profit, c.total_amount),
          'profit_margin', COALESCE(cf.profit_margin, 0),
          'customers', CASE
            WHEN cust.id IS NULL THEN NULL
            ELSE jsonb_build_object(
              'id', cust.id,
              'customer_code', cust.customer_code,
              'full_name', cust.full_name,
              'phone', cust.phone,
              'address', cust.address,
              'bride_name', cust.bride_name,
              'groom_name', cust.groom_name
            )
          END,
          'work_tasks', COALESCE(tasks.items, '[]'::jsonb),
          'contract_checklists', COALESCE(checklists.items, '[]'::jsonb),
          'contract_notes', COALESCE(notes.items, '[]'::jsonb),
          'contract_events', COALESCE(events.items, '[]'::jsonb),
          'next_event_date', events.next_event_date
        ) AS item
      FROM paged c
      LEFT JOIN public.customers cust ON cust.id = c.customer_id
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', wt.id,
            'contract_id', wt.contract_id,
            'work_type', wt.work_type,
            'status', wt.status,
            'deadline', wt.deadline
          )
          ORDER BY wt.deadline ASC NULLS LAST, wt.created_at ASC NULLS LAST
        ) AS items
        FROM public.work_tasks wt
        WHERE wt.contract_id = c.id
      ) tasks ON TRUE
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', cc.id,
            'contract_id', cc.contract_id,
            'event_stage', cc.event_stage,
            'category', cc.category,
            'item_name', cc.item_name,
            'is_completed', cc.is_completed,
            'created_at', cc.created_at,
            'updated_at', cc.updated_at
          )
          ORDER BY cc.created_at ASC NULLS LAST
        ) AS items
        FROM public.contract_checklists cc
        WHERE cc.contract_id = c.id
      ) checklists ON TRUE
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', n.id,
            'content', n.content,
            'created_by', n.created_by,
            'created_at', n.created_at
          )
          ORDER BY n.created_at DESC
        ) AS items
        FROM (
          SELECT id, content, created_by, created_at
          FROM public.contract_notes
          WHERE contract_id = c.id
          ORDER BY created_at DESC
          LIMIT 10
        ) n
      ) notes ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          jsonb_agg(
            jsonb_build_object(
              'id', ce.id,
              'event_type', ce.event_type,
              'title', ce.title,
              'event_date', ce.event_date,
              'end_date', ce.end_date,
              'location', ce.location,
              'status', ce.status,
              'sort_order', ce.sort_order
            )
            ORDER BY ce.event_date ASC NULLS LAST
          ) AS items,
          MIN(ce.event_date) FILTER (WHERE ce.event_date >= CURRENT_DATE) AS next_event_date
        FROM public.contract_events ce
        WHERE ce.contract_id = c.id
          AND ce.deleted_at IS NULL
          AND ce.event_type IN ('ngay_chup', 'ngay_to_chuc')
      ) events ON TRUE
      LEFT JOIN LATERAL (
        SELECT f.total_cost, f.profit, f.profit_margin
        FROM public.contract_financials(ARRAY[c.id]) f
      ) cf ON TRUE
    )
    SELECT jsonb_build_object(
      'contracts',
      COALESCE(
        jsonb_agg(
          rows.item
          ORDER BY
            CASE WHEN p_sort = 'oldest' THEN rows.created_at END ASC NULLS LAST,
            CASE WHEN p_sort = 'amount_desc' THEN rows.total_amount END DESC NULLS LAST,
            CASE WHEN p_sort = 'amount_asc' THEN rows.total_amount END ASC NULLS LAST,
            rows.created_at DESC NULLS LAST
        ) FILTER (WHERE rows.item IS NOT NULL),
        '[]'::jsonb
      ),
      'total', counted.total,
      'page', v_page,
      'pageSize', v_page_size
    )
    FROM counted
    LEFT JOIN rows ON TRUE
    GROUP BY counted.total
  );
END;
```

---

## get_customer_ltv

`get_customer_ltv(p_ids uuid[])` → `TABLE(customer_id uuid, ltv numeric)` · **SECURITY DEFINER — bỏ qua RLS** · sql · STABLE

```sql
SELECT customer_id, SUM(COALESCE(total_amount, 0))::numeric AS ltv
  FROM public.contracts
  WHERE customer_id = ANY(p_ids)
    AND deleted_at IS NULL
  GROUP BY customer_id;
```

---

## get_employee_job_details

`get_employee_job_details(p_employee_id uuid, p_start_date date, p_end_date date)` → `TABLE(contract_id uuid, contract_code text, client_name text, service_type text, event_date date, work_type text, status text, deadline date, cost numeric)` · **SECURITY DEFINER — bỏ qua RLS** · sql · STABLE

```sql
WITH params AS (
    SELECT
      LEAST(COALESCE(p_start_date, p_end_date, current_date), COALESCE(p_end_date, p_start_date, current_date)) AS start_date,
      GREATEST(COALESCE(p_start_date, p_end_date, current_date), COALESCE(p_end_date, p_start_date, current_date)) AS end_date
  )
  SELECT
    c.id AS contract_id,
    c.contract_code,
    COALESCE(cu.full_name, 'Khong ten') AS client_name,
    c.service_type::text AS service_type,
    ce.event_date,
    wt.work_type::text AS work_type,
    COALESCE(wt.status, 'chua_lam') AS status,
    wt.deadline,
    COALESCE(wt.cost, 0)::numeric AS cost
  FROM public.work_tasks wt
  JOIN public.contracts c ON c.id = wt.contract_id
  LEFT JOIN public.customers cu ON cu.id = c.customer_id
  LEFT JOIN public.contract_events ce ON ce.id = wt.event_id
  CROSS JOIN params p
  WHERE wt.assigned_to = p_employee_id
    AND COALESCE(wt.status, '') <> 'da_huy'
    AND c.deleted_at IS NULL
    AND (ce.id IS NULL OR ce.deleted_at IS NULL)
    AND COALESCE(wt.start_date, wt.deadline, ce.event_date) >= p.start_date
    AND COALESCE(wt.start_date, wt.deadline, ce.event_date) <= p.end_date
  ORDER BY
    CASE
      WHEN COALESCE(wt.status, 'chua_lam') IN ('chua_lam', 'dang_lam')
       AND wt.deadline IS NOT NULL
       AND wt.deadline < current_date THEN 0
      WHEN COALESCE(wt.status, 'chua_lam') IN ('chua_lam', 'dang_lam') THEN 1
      WHEN COALESCE(wt.status, 'chua_lam') = 'hoan_thanh' THEN 2
      ELSE 3
    END,
    COALESCE(ce.event_date, wt.deadline, wt.start_date),
    c.contract_code,
    wt.work_type::text;
```

---

## get_employee_productivity

`get_employee_productivity(p_start_date date, p_end_date date)` → `TABLE(employee_id uuid, full_name text, role employee_role_enum, onsite_hours numeric, active_tasks integer, completed_tasks integer, post_production_active integer, overdue_tasks integer, total_cost numeric)` · **SECURITY DEFINER — bỏ qua RLS** · sql · STABLE

```sql
WITH params AS (
    SELECT
      LEAST(COALESCE(p_start_date, p_end_date, current_date), COALESCE(p_end_date, p_start_date, current_date)) AS start_date,
      GREATEST(COALESCE(p_start_date, p_end_date, current_date), COALESCE(p_end_date, p_start_date, current_date)) AS end_date
  ),
  task_scope AS (
    SELECT
      wt.id,
      wt.assigned_to,
      COALESCE(wt.status, 'chua_lam') AS status,
      wt.deadline,
      wt.work_type,
      COALESCE(wt.cost, 0)::numeric AS cost,
      CASE
        WHEN wt.start_time IS NOT NULL
         AND wt.end_time IS NOT NULL
         AND wt.end_time::time >= wt.start_time::time
          THEN EXTRACT(EPOCH FROM (wt.end_time::time - wt.start_time::time)) / 3600
        ELSE 0
      END::numeric AS onsite_hours
    FROM public.work_tasks wt
    JOIN public.contracts c
      ON c.id = wt.contract_id
     AND c.deleted_at IS NULL
    LEFT JOIN public.contract_events ce ON ce.id = wt.event_id
    CROSS JOIN params p
    WHERE wt.assigned_to IS NOT NULL
      AND COALESCE(wt.status, '') <> 'da_huy'
      AND (ce.id IS NULL OR ce.deleted_at IS NULL)
      AND COALESCE(wt.start_date, wt.deadline, ce.event_date) >= p.start_date
      AND COALESCE(wt.start_date, wt.deadline, ce.event_date) <= p.end_date
  )
  SELECT
    e.id AS employee_id,
    e.full_name,
    e.role,
    COALESCE(SUM(ts.onsite_hours), 0)::numeric AS onsite_hours,
    COUNT(ts.id) FILTER (WHERE ts.status IN ('chua_lam', 'dang_lam'))::integer AS active_tasks,
    COUNT(ts.id) FILTER (WHERE ts.status = 'hoan_thanh')::integer AS completed_tasks,
    COUNT(ts.id) FILTER (
      WHERE ts.status IN ('chua_lam', 'dang_lam')
        AND ts.work_type IN ('hau_ky_anh', 'dung_phim', 'retouch', 'premiere', 'bien_tap')
    )::integer AS post_production_active,
    COUNT(ts.id) FILTER (
      WHERE ts.status IN ('chua_lam', 'dang_lam')
        AND ts.deadline IS NOT NULL
        AND ts.deadline < current_date
    )::integer AS overdue_tasks,
    COALESCE(SUM(ts.cost), 0)::numeric AS total_cost
  FROM public.employees e
  LEFT JOIN task_scope ts ON ts.assigned_to = e.id
  WHERE e.deleted_at IS NULL
    AND COALESCE(e.status, 'active') NOT IN ('inactive', 'nghi_viec')
  GROUP BY e.id, e.full_name, e.role
  ORDER BY overdue_tasks DESC, active_tasks DESC, onsite_hours DESC, e.full_name ASC;
```

---

## get_finance_advanced_intelligence

`get_finance_advanced_intelligence(p_month integer, p_year integer)` → `jsonb` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · STABLE

```sql
DECLARE
  v_start date;
  v_end date;
  v_prev_start date;
  v_monthly_revenue numeric := 0;
  v_monthly_expense numeric := 0;
  v_monthly_profit numeric := 0;
  v_contracts_month integer := 0;
  v_contract_value_month numeric := 0;
  v_contracts_all integer := 0;
  v_contract_value_all numeric := 0;
  v_total_customers integer := 0;
  v_contract_customer_count integer := 0;
  v_repeat_customer_count integer := 0;
  v_avg_contract_value numeric := 0;
  v_repeat_rate numeric := 0;
  v_avg_purchases numeric := 0;
  v_estimated_clv numeric := 0;
  v_total_leads integer := 0;
  v_won_leads integer := 0;
  v_conversion_rate numeric := 0;
  v_marketing_spend numeric := 0;
  v_inventory_turnover numeric := 0;
  v_total_dresses integer := 0;
  v_total_rentals integer := 0;
  v_scenarios jsonb := '[]'::jsonb;
  v_revenue_breakdown jsonb := '[]'::jsonb;
  v_dress_roi jsonb := '[]'::jsonb;
  v_inventory_costs jsonb := '[]'::jsonb;
BEGIN
  IF p_month IS NULL OR p_month < 1 OR p_month > 12 THEN
    RAISE EXCEPTION 'Invalid month: %', p_month;
  END IF;

  IF p_year IS NULL OR p_year < 2000 THEN
    RAISE EXCEPTION 'Invalid year: %', p_year;
  END IF;

  v_start := make_date(p_year, p_month, 1);
  v_end := (v_start + interval '1 month')::date;
  v_prev_start := (v_start - interval '1 month')::date;

  SELECT
    COALESCE((SELECT SUM(amount) FROM public.payments
      WHERE deleted_at IS NULL AND payment_date >= v_start AND payment_date < v_end), 0)
    +
    COALESCE((SELECT SUM(receipt_amount) FROM public.receipts
      WHERE deleted_at IS NULL AND contract_id IS NULL AND receipt_date >= v_start AND receipt_date < v_end), 0)
  INTO v_monthly_revenue;

  SELECT
    COALESCE((SELECT SUM(amount) FROM public.expenses
      WHERE deleted_at IS NULL AND expense_date >= v_start AND expense_date < v_end), 0)
    -- ADR-016 M5: khong cong sheet luong (expenses da chua phieu chi luong)
  INTO v_monthly_expense;

  v_monthly_profit := v_monthly_revenue - v_monthly_expense;

  SELECT COUNT(*)::integer, COALESCE(SUM(total_amount), 0)
  INTO v_contracts_month, v_contract_value_month
  FROM public.contracts
  WHERE deleted_at IS NULL
    AND status IS DISTINCT FROM 'da_huy'
    AND contract_date >= v_start
    AND contract_date < v_end;

  SELECT COUNT(*)::integer, COALESCE(SUM(total_amount), 0)
  INTO v_contracts_all, v_contract_value_all
  FROM public.contracts
  WHERE deleted_at IS NULL
    AND status IS DISTINCT FROM 'da_huy';

  SELECT COUNT(*)::integer
  INTO v_total_customers
  FROM public.customers
  WHERE deleted_at IS NULL;

  WITH customer_contracts AS (
    SELECT customer_id, COUNT(*)::integer AS contract_count
    FROM public.contracts
    WHERE deleted_at IS NULL
      AND status IS DISTINCT FROM 'da_huy'
    GROUP BY customer_id
  )
  SELECT
    COALESCE(COUNT(*)::integer, 0),
    COALESCE((COUNT(*) FILTER (WHERE contract_count > 1))::integer, 0),
    COALESCE(AVG(contract_count), 0)
  INTO v_contract_customer_count, v_repeat_customer_count, v_avg_purchases
  FROM customer_contracts;

  v_avg_contract_value := CASE
    WHEN v_contracts_all > 0 THEN ROUND(v_contract_value_all / v_contracts_all, 0)
    ELSE 0
  END;

  v_repeat_rate := CASE
    WHEN v_contract_customer_count > 0 THEN ROUND((v_repeat_customer_count::numeric / v_contract_customer_count) * 100, 1)
    ELSE 0
  END;

  v_estimated_clv := ROUND(v_avg_contract_value * GREATEST(v_avg_purchases, 1) * (1 + (v_repeat_rate / 100)), 0);

  SELECT
    COUNT(*)::integer,
    (COUNT(*) FILTER (WHERE status = 'da_chot'))::integer
  INTO v_total_leads, v_won_leads
  FROM public.crm_leads
  WHERE deleted_at IS NULL;

  v_conversion_rate := CASE
    WHEN v_total_leads > 0 THEN ROUND((v_won_leads::numeric / v_total_leads) * 100, 1)
    ELSE 0
  END;

  SELECT COALESCE(SUM(e.amount), 0)
  INTO v_marketing_spend
  FROM public.expenses e
  LEFT JOIN public.transaction_categories tc ON tc.id = e.category_id
  WHERE e.deleted_at IS NULL
    AND e.expense_date >= v_start
    AND e.expense_date < v_end
    AND (
      lower(COALESCE(tc.name, '')) LIKE '%marketing%'
      OR lower(COALESCE(tc.category_code, '')) LIKE '%marketing%'
      OR lower(COALESCE(e.description, '')) LIKE '%marketing%'
      OR lower(COALESCE(e.description, '')) LIKE '%ads%'
      OR lower(COALESCE(e.description, '')) LIKE '%quang cao%'
      OR lower(COALESCE(e.description, '')) LIKE '%quảng cáo%'
    );

  SELECT ROUND(
    COALESCE((
      SELECT SUM(quantity)
      FROM public.inventory_transactions
      WHERE transaction_type = 'stock_out'
        AND created_at >= v_start
        AND created_at < v_end
    ), 0)::numeric
    / GREATEST((SELECT COUNT(*) FROM public.inventory_items WHERE deleted_at IS NULL), 1),
    1
  )
  INTO v_inventory_turnover;

  SELECT COUNT(*)::integer
  INTO v_total_dresses
  FROM public.dresses
  WHERE deleted_at IS NULL;

  SELECT COUNT(*)::integer
  INTO v_total_rentals
  FROM public.dress_rentals
  WHERE COALESCE(status, '') <> 'cancelled';

  v_scenarios := jsonb_build_array(
    jsonb_build_object(
      'label', 'Thận trọng',
      'type', 'conservative',
      'nextMonthRevenue', ROUND(v_monthly_revenue * 0.85, 0),
      'nextMonthProfit', ROUND((v_monthly_revenue * 0.85) - (v_monthly_expense * 0.95), 0),
      'threeMonthRevenue', ROUND(v_monthly_revenue * 0.85 * 3, 0),
      'threeMonthProfit', ROUND(((v_monthly_revenue * 0.85) - (v_monthly_expense * 0.95)) * 3, 0),
      'description', 'Giả định doanh thu giảm 15% và biên lợi nhuận bị nén.'
    ),
    jsonb_build_object(
      'label', 'Cơ sở',
      'type', 'base',
      'nextMonthRevenue', ROUND(v_monthly_revenue, 0),
      'nextMonthProfit', ROUND(v_monthly_profit, 0),
      'threeMonthRevenue', ROUND(v_monthly_revenue * 3, 0),
      'threeMonthProfit', ROUND(v_monthly_profit * 3, 0),
      'description', 'Giữ nhịp hiện tại theo dữ liệu thu chi production.'
    ),
    jsonb_build_object(
      'label', 'Tăng trưởng',
      'type', 'aggressive',
      'nextMonthRevenue', ROUND(v_monthly_revenue * 1.20, 0),
      'nextMonthProfit', ROUND((v_monthly_revenue * 1.20) - (v_monthly_expense * 1.05), 0),
      'threeMonthRevenue', ROUND(v_monthly_revenue * 1.20 * 3, 0),
      'threeMonthProfit', ROUND(((v_monthly_revenue * 1.20) - (v_monthly_expense * 1.05)) * 3, 0),
      'description', 'Giả định doanh thu tăng 20% và kiểm soát chi phí tốt hơn.'
    )
  );

  WITH service_totals AS (
    SELECT
      COALESCE(NULLIF(c.service_type::text, ''), 'Khác') AS service_type,
      COUNT(*)::integer AS contract_count,
      COALESCE(SUM(c.total_amount), 0) AS service_total
    FROM public.contracts c
    WHERE c.deleted_at IS NULL
      AND c.status IS DISTINCT FROM 'da_huy'
      AND c.contract_date >= v_start
      AND c.contract_date < v_end
    GROUP BY COALESCE(NULLIF(c.service_type::text, ''), 'Khác')
  ),
  ranked_services AS (
    SELECT
      service_type,
      contract_count,
      service_total,
      SUM(service_total) OVER () AS all_service_total
    FROM service_totals
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'service_type', service_type,
        'total', service_total,
        'count', contract_count,
        'percentage', CASE WHEN all_service_total > 0 THEN ROUND((service_total / all_service_total) * 100, 1) ELSE 0 END
      )
      ORDER BY service_total DESC
    ),
    '[]'::jsonb
  )
  INTO v_revenue_breakdown
  FROM ranked_services;

  WITH dress_totals AS (
    SELECT
      d.id,
      d.name,
      d.item_code,
      COALESCE(d.purchase_price, 0) AS purchase_price,
      (COUNT(dr.id) FILTER (WHERE COALESCE(dr.status, '') <> 'cancelled'))::integer AS rental_count,
      COALESCE(SUM(COALESCE(dr.rental_price, 0)) FILTER (WHERE COALESCE(dr.status, '') <> 'cancelled'), 0) AS rental_revenue
    FROM public.dresses d
    LEFT JOIN public.dress_rentals dr ON dr.item_id = d.id
    WHERE d.deleted_at IS NULL
    GROUP BY d.id, d.name, d.item_code, d.purchase_price
  ),
  ranked_dresses AS (
    SELECT *
    FROM dress_totals
    WHERE rental_count > 0 OR purchase_price > 0
    ORDER BY rental_revenue DESC, rental_count DESC, name ASC
    LIMIT 5
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'name', name,
        'code', item_code,
        'purchasePrice', purchase_price,
        'totalRentals', rental_count,
        'totalRevenue', rental_revenue,
        'roi', CASE
          WHEN purchase_price > 0 THEN ROUND(((rental_revenue - purchase_price) / purchase_price) * 100, 1)
          WHEN rental_revenue > 0 THEN 100
          ELSE 0
        END
      )
      ORDER BY rental_revenue DESC, rental_count DESC, name ASC
    ),
    '[]'::jsonb
  )
  INTO v_dress_roi
  FROM ranked_dresses;

  WITH this_month AS (
    SELECT
      COALESCE(NULLIF(ii.category, ''), 'Khác') AS category,
      COALESCE(SUM(COALESCE(it.total_cost, it.quantity * COALESCE(it.unit_cost, ii.average_unit_price, ii.purchase_price, 0))), 0) AS amount
    FROM public.inventory_transactions it
    JOIN public.inventory_items ii ON ii.id = it.item_id AND ii.deleted_at IS NULL
    WHERE it.transaction_type = 'stock_out'
      AND it.created_at >= v_start
      AND it.created_at < v_end
    GROUP BY COALESCE(NULLIF(ii.category, ''), 'Khác')
  ),
  prev_month AS (
    SELECT
      COALESCE(NULLIF(ii.category, ''), 'Khác') AS category,
      COALESCE(SUM(COALESCE(it.total_cost, it.quantity * COALESCE(it.unit_cost, ii.average_unit_price, ii.purchase_price, 0))), 0) AS amount
    FROM public.inventory_transactions it
    JOIN public.inventory_items ii ON ii.id = it.item_id AND ii.deleted_at IS NULL
    WHERE it.transaction_type = 'stock_out'
      AND it.created_at >= v_prev_start
      AND it.created_at < v_start
    GROUP BY COALESCE(NULLIF(ii.category, ''), 'Khác')
  ),
  categories AS (
    SELECT category FROM this_month
    UNION
    SELECT category FROM prev_month
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'category', c.category,
        'thisMonth', COALESCE(tm.amount, 0),
        'lastMonth', COALESCE(pm.amount, 0),
        'change', CASE
          WHEN COALESCE(pm.amount, 0) > 0 THEN ROUND(((COALESCE(tm.amount, 0) - pm.amount) / pm.amount) * 100, 1)
          WHEN COALESCE(tm.amount, 0) > 0 THEN 100
          ELSE 0
        END
      )
      ORDER BY COALESCE(tm.amount, 0) DESC, c.category ASC
    ),
    '[]'::jsonb
  )
  INTO v_inventory_costs
  FROM categories c
  LEFT JOIN this_month tm ON tm.category = c.category
  LEFT JOIN prev_month pm ON pm.category = c.category;

  RETURN jsonb_build_object(
    'scenarios', v_scenarios,
    'customerMetrics', jsonb_build_object(
      'totalCustomers', v_total_customers,
      'avgContractValue', v_avg_contract_value,
      'repeatCustomerRate', v_repeat_rate,
      'estimatedCLV', v_estimated_clv,
      'conversionRate', v_conversion_rate,
      'totalLeads', v_total_leads,
      'wonLeads', v_won_leads
    ),
    'revenueBreakdown', v_revenue_breakdown,
    'dressROI', v_dress_roi,
    'inventoryCosts', v_inventory_costs,
    'advancedKPIs', jsonb_build_object(
      'conversionRate', v_conversion_rate,
      'avgOrderValue', CASE WHEN v_contracts_month > 0 THEN ROUND(v_contract_value_month / v_contracts_month, 0) ELSE 0 END,
      'inventoryTurnover', COALESCE(v_inventory_turnover, 0),
      'cac', CASE WHEN v_contracts_month > 0 THEN ROUND(v_marketing_spend / v_contracts_month, 0) ELSE 0 END,
      'totalLeads', v_total_leads,
      'totalContracts', v_contracts_month,
      'totalDresses', v_total_dresses,
      'totalRentals', v_total_rentals
    )
  );
END;
```

---

## get_receivable_aging

`get_receivable_aging()` → `json` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
DECLARE
  v_result jsonb;
BEGIN
  WITH raw AS (
    SELECT c.remaining_amount,
           (SELECT MAX(public.vn_date(ce.event_date)) FROM public.contract_events ce
             WHERE ce.contract_id = c.id AND ce.event_type = 'giao_san_pham' AND ce.status = 'hoan_thanh') AS delivered_at
    FROM public.contracts c
    WHERE c.remaining_amount > 0 AND c.deleted_at IS NULL AND c.status <> 'da_huy'
  ),
  bucketed AS (
    SELECT remaining_amount,
      CASE
        WHEN delivered_at IS NULL THEN 'not_delivered'
        WHEN current_date - delivered_at <= 30 THEN '0_30'
        WHEN current_date - delivered_at <= 60 THEN '31_60'
        WHEN current_date - delivered_at <= 90 THEN '61_90'
        ELSE '90_plus'
      END AS bucket
    FROM raw
  )
  SELECT json_build_object(
    'not_delivered', json_build_object('total', COALESCE(SUM(remaining_amount) FILTER (WHERE bucket = 'not_delivered'), 0), 'count', COUNT(*) FILTER (WHERE bucket = 'not_delivered')),
    '0_30', json_build_object('total', COALESCE(SUM(remaining_amount) FILTER (WHERE bucket = '0_30'), 0), 'count', COUNT(*) FILTER (WHERE bucket = '0_30')),
    '31_60', json_build_object('total', COALESCE(SUM(remaining_amount) FILTER (WHERE bucket = '31_60'), 0), 'count', COUNT(*) FILTER (WHERE bucket = '31_60')),
    '61_90', json_build_object('total', COALESCE(SUM(remaining_amount) FILTER (WHERE bucket = '61_90'), 0), 'count', COUNT(*) FILTER (WHERE bucket = '61_90')),
    '90_plus', json_build_object('total', COALESCE(SUM(remaining_amount) FILTER (WHERE bucket = '90_plus'), 0), 'count', COUNT(*) FILTER (WHERE bucket = '90_plus'))
  )::jsonb
  INTO v_result
  FROM bucketed;

  RETURN COALESCE(v_result, '{"not_delivered":{"total":0,"count":0},"0_30":{"total":0,"count":0},"31_60":{"total":0,"count":0},"61_90":{"total":0,"count":0},"90_plus":{"total":0,"count":0}}'::jsonb)::json;
END;
```

---

## payable_items

`payable_items(p_payee_type text, p_payee_id uuid)` → `TABLE(target_type text, target_id uuid, item_date date, label text, committed numeric, allocated numeric, remaining numeric)` · SECURITY INVOKER · sql · STABLE

```sql
WITH items AS (
    SELECT 'printing_order'::text AS target_type, po.id AS target_id, po.order_date AS item_date, po.order_code::text AS label, COALESCE(po.total_amount,0)::numeric AS committed
    FROM public.printing_orders po
    WHERE p_payee_type = 'lab' AND po.lab_id = p_payee_id AND po.deleted_at IS NULL AND COALESCE(po.status,'') NOT IN ('huy_don','da_huy')
    UNION ALL
    SELECT 'work_task', wt.id, COALESCE(public.vn_date(ev.event_date), public.vn_date(wt.deadline), public.vn_date(wt.created_at)),
           wt.work_type::text || COALESCE(' ' || c.contract_code, ''), COALESCE(wt.cost,0)::numeric
    FROM public.work_tasks wt LEFT JOIN public.contract_events ev ON ev.id = wt.event_id LEFT JOIN public.contracts c ON c.id = wt.contract_id
    WHERE p_payee_type = 'vendor' AND wt.vendor_id = p_payee_id AND wt.status = 'hoan_thanh' AND wt.cost > 0
    UNION ALL
    SELECT 'work_task', wt.id, COALESCE(public.vn_date(ev.event_date), public.vn_date(wt.deadline), public.vn_date(wt.created_at)),
           wt.work_type::text || COALESCE(' ' || c.contract_code, ''), COALESCE(wt.cost,0)::numeric
    FROM public.work_tasks wt LEFT JOIN public.contract_events ev ON ev.id = wt.event_id LEFT JOIN public.contracts c ON c.id = wt.contract_id
    WHERE p_payee_type = 'employee' AND wt.assigned_to = p_payee_id AND wt.vendor_id IS NULL AND wt.status = 'hoan_thanh' AND wt.cost > 0
    UNION ALL
    -- ADR-016 M5: lương cứng tháng (sheet) — phải trả = net_salary − đã phân bổ
    SELECT 'employee_salary', s.id, make_date(s.year, s.month, 1), 'Lương ' || s.month || '/' || s.year, COALESCE(s.net_salary,0)::numeric
    FROM public.employee_salaries s
    WHERE p_payee_type = 'employee' AND s.employee_id = p_payee_id AND COALESCE(s.net_salary,0) > 0
    UNION ALL
    SELECT 'inventory_transaction', t.id, public.vn_date(t.created_at), 'Nhập ' || i.name || ' ×' || t.quantity, COALESCE(t.total_cost,0)::numeric
    FROM public.inventory_transactions t JOIN public.inventory_items i ON i.id = t.item_id
    WHERE p_payee_type = 'supplier' AND i.supplier_id = p_payee_id AND t.transaction_type = 'stock_in'
  ), alloc AS (
    SELECT a.target_type, a.target_id, SUM(a.amount) AS allocated
    FROM public.expense_allocations a JOIN public.expenses e ON e.id = a.expense_id WHERE e.deleted_at IS NULL
    GROUP BY a.target_type, a.target_id
  )
  SELECT i.target_type, i.target_id, i.item_date, i.label, i.committed, COALESCE(al.allocated,0)::numeric, GREATEST(i.committed - COALESCE(al.allocated,0), 0)::numeric
  FROM items i LEFT JOIN alloc al ON al.target_type = i.target_type AND al.target_id = i.target_id
  ORDER BY i.item_date, i.target_id;
```

---

## process_contract_payment

`process_contract_payment(p_contract_id uuid, p_amount numeric, p_payment_method payment_method_enum, p_payment_date date, p_payment_stage text, p_category_id uuid, p_notes text, p_payment_plan_id uuid, p_created_by uuid)` → `json` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
BEGIN
  RETURN public.process_contract_payment_v2(
    p_contract_id,
    p_amount,
    p_payment_method,
    p_payment_date,
    p_payment_stage,
    p_category_id,
    p_notes,
    p_payment_plan_id,
    false,
    p_created_by
  );
END;
```

---

## recalc_contract_totals

`recalc_contract_totals(p_contract_id uuid)` → `void` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
DECLARE
  v_total DECIMAL(15,2);
  v_paid DECIMAL(15,2);
  v_remaining DECIMAL(15,2);
  v_payment_status payment_status_enum;
  v_discount DECIMAL(15,2);
BEGIN
  -- Sum items
  SELECT COALESCE(SUM(total_amount), 0) INTO v_total
  FROM contract_items WHERE contract_id = p_contract_id;

  -- Sum payments
  SELECT COALESCE(SUM(amount), 0) INTO v_paid
  FROM payments WHERE contract_id = p_contract_id AND deleted_at IS NULL;

  -- Get discount
  SELECT COALESCE(discount_amount, 0) INTO v_discount
  FROM contracts WHERE id = p_contract_id;

  -- Calculate remaining
  v_remaining := v_total - v_discount - v_paid;
  IF v_remaining < 0 THEN v_remaining := 0; END IF;

  -- Determine payment status
  IF v_paid = 0 THEN
    v_payment_status := 'chua_thanh_toan';
  ELSIF v_paid >= (v_total - v_discount) THEN
    v_payment_status := 'da_thanh_toan';
  ELSIF v_paid > 0 AND v_paid < (v_total - v_discount) * 0.3 THEN
    v_payment_status := 'da_coc';
  ELSE
    v_payment_status := 'thanh_toan_mot_phan';
  END IF;

  -- Atomic update
  UPDATE contracts SET
    total_amount = v_total,
    paid_amount = v_paid,
    remaining_amount = v_remaining,
    payment_status = v_payment_status,
    updated_at = NOW()
  WHERE id = p_contract_id;
END;
```

---

## restore_inventory_on_contract_payment_void

`restore_inventory_on_contract_payment_void()` → `trigger` · SECURITY INVOKER · plpgsql · VOLATILE

```sql
BEGIN
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    PERFORM public.restore_inventory_from_transaction(
      'contract_addon_sale',
      NEW.id,
      'Hoan kho do huy phieu ban them hop dong',
      COALESCE(NEW.voided_by, NEW.updated_by, NEW.created_by)
    );
  END IF;

  RETURN NEW;
END;
```

---

## save_contract_atomic

`save_contract_atomic(p_contract jsonb, p_customer jsonb, p_items jsonb, p_actor_id uuid, p_existing_contract_id uuid, p_expected_updated_at timestamp with time zone, p_initial_payment jsonb)` → `json` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
DECLARE
  v_contract public.contracts%ROWTYPE;
  v_contract_id uuid := p_existing_contract_id;
  v_contract_code text := NULLIF(p_contract->>'contract_code', '');
  v_contract_date date := COALESCE(NULLIF(p_contract->>'contract_date', '')::date, CURRENT_DATE);
  v_work_date date := NULLIF(p_contract->>'work_date', '')::date;
  v_total numeric := COALESCE(NULLIF(p_contract->>'total_amount', '')::numeric, 0);
  v_discount numeric := COALESCE(NULLIF(p_contract->>'discount_amount', '')::numeric, 0);
  v_initial_amount numeric := 0;
  v_initial_plan_id uuid := NULL;
  v_paid numeric := 0;
  v_remaining numeric := 0;
  v_payment_status text := 'chua_thanh_toan';
  v_prefix text;
  v_next_code integer;
  v_attempt integer;
BEGIN
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: actor_id is required';
  END IF;

  IF p_contract IS NULL OR p_customer IS NULL THEN
    RAISE EXCEPTION 'Contract payload is required';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'Contract items must be an array';
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Contract must have at least one item';
  END IF;

  UPDATE public.customers
  SET full_name = COALESCE(NULLIF(p_customer->>'full_name', ''), full_name),
      phone     = COALESCE(NULLIF(p_customer->>'phone', ''), phone),
      email     = COALESCE(NULLIF(p_customer->>'email', ''), email),
      address   = COALESCE(NULLIF(p_customer->>'address', ''), address),
      bride_name = NULLIF(p_customer->>'bride_name', ''),
      groom_name = NULLIF(p_customer->>'groom_name', ''),
      bride_phone = NULLIF(p_customer->>'bride_phone', ''),
      bride_height = NULLIF(p_customer->>'bride_height', '')::integer,
      bride_weight = NULLIF(p_customer->>'bride_weight', '')::integer,
      bride_shoe_size = NULLIF(p_customer->>'bride_shoe_size', '')::integer,
      groom_phone = NULLIF(p_customer->>'groom_phone', ''),
      groom_height = NULLIF(p_customer->>'groom_height', '')::integer,
      groom_weight = NULLIF(p_customer->>'groom_weight', '')::integer,
      groom_shoe_size = NULLIF(p_customer->>'groom_shoe_size', '')::integer,
      wedding_date = NULLIF(p_customer->>'wedding_date', '')::date,
      updated_at = now()
  WHERE id = (p_customer->>'customer_id')::uuid;

  IF v_contract_id IS NOT NULL THEN
    SELECT *
    INTO v_contract
    FROM public.contracts
    WHERE id = v_contract_id
      AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Khong tim thay hop dong';
    END IF;

    IF p_expected_updated_at IS NOT NULL
       AND v_contract.updated_at IS DISTINCT FROM p_expected_updated_at THEN
      RAISE EXCEPTION 'Hop dong da duoc nguoi khac cap nhat. Vui long tai lai trang.';
    END IF;

    UPDATE public.contracts
    SET contract_code = v_contract_code,
        customer_id = (p_contract->>'customer_id')::uuid,
        service_type = (p_contract->>'service_type')::public.service_type_enum,
        transaction_type = COALESCE(NULLIF(p_contract->>'transaction_type', '')::public.transaction_type_enum, 'hop_dong'::public.transaction_type_enum),
        contract_date = v_contract_date,
        work_date = v_work_date,
        delivery_date = NULLIF(p_contract->>'delivery_date', '')::date,
        status = COALESCE(NULLIF(p_contract->>'status', ''), status),
        description = NULLIF(p_contract->>'description', ''),
        notes = NULLIF(p_contract->>'notes', ''),
        assigned_to = NULLIF(p_contract->>'assigned_to', '')::uuid,
        total_amount = v_total,
        discount_amount = v_discount,
        updated_by = p_actor_id,
        updated_at = now()
    WHERE id = v_contract_id;

    UPDATE public.contract_items
    SET deleted_at = now(),
        updated_at = now()
    WHERE contract_id = v_contract_id
      AND deleted_at IS NULL;
  ELSE
    FOR v_attempt IN 0..3 LOOP
      BEGIN
        INSERT INTO public.contracts (
          contract_code,
          customer_id,
          service_type,
          transaction_type,
          contract_date,
          work_date,
          delivery_date,
          status,
          description,
          notes,
          assigned_to,
          total_amount,
          discount_amount,
          paid_amount,
          remaining_amount,
          payment_status,
          created_by,
          updated_by
        )
        VALUES (
          v_contract_code,
          (p_contract->>'customer_id')::uuid,
          (p_contract->>'service_type')::public.service_type_enum,
          COALESCE(NULLIF(p_contract->>'transaction_type', '')::public.transaction_type_enum, 'hop_dong'::public.transaction_type_enum),
          v_contract_date,
          v_work_date,
          NULLIF(p_contract->>'delivery_date', '')::date,
          COALESCE(NULLIF(p_contract->>'status', ''), 'cho_xu_ly'),
          NULLIF(p_contract->>'description', ''),
          NULLIF(p_contract->>'notes', ''),
          NULLIF(p_contract->>'assigned_to', '')::uuid,
          v_total,
          v_discount,
          0,
          v_total,
          'chua_thanh_toan',
          p_actor_id,
          p_actor_id
        )
        RETURNING * INTO v_contract;

        v_contract_id := v_contract.id;
        v_contract_code := v_contract.contract_code;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        IF v_attempt = 3 THEN
          RAISE EXCEPTION 'Ma hop dong da ton tai. Vui long tai lai trang.';
        END IF;

        v_prefix := substring(v_contract_code from '^(.*-)[0-9]+$');
        IF v_prefix IS NULL THEN
          v_prefix := v_contract_code || '-';
        END IF;

        SELECT COALESCE(MAX(((regexp_match(contract_code, '([0-9]+)$'))[1])::integer), 0) + 1
        INTO v_next_code
        FROM public.contracts
        WHERE contract_code LIKE v_prefix || '%';

        v_contract_code := v_prefix || lpad((v_next_code + v_attempt)::text, 4, '0');
      END;
    END LOOP;
  END IF;

  INSERT INTO public.contract_items (
    contract_id,
    type,
    item_name,
    service_id,
    dress_id,
    export_type,
    quantity,
    unit_price,
    original_price,
    discount_amount,
    total_amount,
    is_addon,
    addon_category,
    notes,
    added_by
  )
  SELECT
    v_contract_id,
    COALESCE(NULLIF(item_row."type", '')::public.item_type_enum, 'dich_vu'::public.item_type_enum),
    item_row.item_name,
    NULLIF(item_row.service_id, '')::uuid,
    NULLIF(item_row.dress_id, '')::uuid,
    NULLIF(item_row.export_type, '')::public.export_type_enum,
    COALESCE(item_row.quantity, 1),
    COALESCE(item_row.unit_price, 0),
    item_row.original_price,
    COALESCE(item_row.discount_amount, 0),
    COALESCE(item_row.total_amount, 0),
    COALESCE(item_row.is_addon, false),
    NULLIF(item_row.addon_category, '')::public.addon_category_enum,
    NULLIF(item_row.notes, ''),
    p_actor_id
  FROM jsonb_to_recordset(p_items) AS item_row(
    "type" text,
    item_name text,
    service_id text,
    dress_id text,
    export_type text,
    quantity numeric,
    unit_price numeric,
    original_price numeric,
    discount_amount numeric,
    total_amount numeric,
    is_addon boolean,
    addon_category text,
    notes text
  );

  IF p_existing_contract_id IS NULL THEN
    v_initial_amount := CASE
      WHEN p_initial_payment IS NOT NULL AND jsonb_typeof(p_initial_payment) = 'object'
        THEN GREATEST(0, COALESCE(NULLIF(p_initial_payment->>'amount', '')::numeric, 0))
      ELSE 0
    END;

    v_initial_plan_id := public.create_default_payment_schedule_v2(
      v_contract_id,
      v_total,
      v_initial_amount,
      NULLIF(p_initial_payment->>'payment_stage', ''),
      v_contract_date,
      v_work_date
    );
  END IF;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_paid
  FROM public.payments
  WHERE contract_id = v_contract_id
    AND deleted_at IS NULL;

  v_remaining := GREATEST(0, v_total - v_paid);
  v_payment_status := CASE
    WHEN v_paid <= 0 THEN 'chua_thanh_toan'
    WHEN v_remaining <= 0 THEN 'da_thanh_toan'
    WHEN v_paid < (v_total * 0.5) THEN 'da_coc'
    ELSE 'thanh_toan_mot_phan'
  END;

  UPDATE public.contracts
  SET paid_amount = v_paid,
      remaining_amount = v_remaining,
      payment_status = v_payment_status,
      updated_by = p_actor_id,
      updated_at = now()
  WHERE id = v_contract_id;

  IF p_existing_contract_id IS NULL
     AND p_initial_payment IS NOT NULL
     AND jsonb_typeof(p_initial_payment) = 'object'
     AND v_initial_amount > 0 THEN
    PERFORM public.process_contract_payment_v2(
      v_contract_id,
      v_initial_amount,
      (p_initial_payment->>'payment_method')::public.payment_method_enum,
      COALESCE(NULLIF(p_initial_payment->>'payment_date', '')::date, v_contract_date),
      NULLIF(p_initial_payment->>'payment_stage', ''),
      NULLIF(p_initial_payment->>'category_id', '')::uuid,
      NULL,
      v_initial_plan_id,
      false,
      p_actor_id
    );
  END IF;

  SELECT paid_amount, remaining_amount, payment_status, contract_code
  INTO v_paid, v_remaining, v_payment_status, v_contract_code
  FROM public.contracts
  WHERE id = v_contract_id;

  RETURN json_build_object(
    'id', v_contract_id,
    'contract_code', v_contract_code,
    'paid_amount', v_paid,
    'remaining_amount', v_remaining,
    'payment_status', v_payment_status
  );
END;
```

---

## trg_contract_payment_status_v2

`trg_contract_payment_status_v2()` → `trigger` · SECURITY INVOKER · plpgsql · VOLATILE

```sql
BEGIN
  NEW.paid_amount := GREATEST(0, COALESCE(NEW.paid_amount, 0));
  NEW.remaining_amount := GREATEST(0, COALESCE(NEW.total_amount, 0) - NEW.paid_amount);
  NEW.payment_status := public.contract_payment_status_v2(NEW.paid_amount, NEW.remaining_amount);
  RETURN NEW;
END;
```

---

## update_contract_checklists_updated_at

`update_contract_checklists_updated_at()` → `trigger` · SECURITY INVOKER · plpgsql · VOLATILE

```sql
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
```

---

## vendor_cost_report

`vendor_cost_report(p_month integer, p_year integer)` → `TABLE(vendor_id uuid, vendor_name text, vendor_phone text, service_type text, job_count bigint, total_cost numeric, contracts text[])` · **SECURITY DEFINER — bỏ qua RLS** · sql · STABLE

```sql
WITH b AS (
    SELECT make_date(p_year, p_month, 1) AS s, (make_date(p_year, p_month, 1) + interval '1 month - 1 day')::date AS e
  ),
  t AS (
    SELECT wt.vendor_id, COALESCE(wt.cost, 0)::numeric AS cost, c.contract_code::text AS contract_code
    FROM public.work_tasks wt
    LEFT JOIN public.contract_events ev ON ev.id = wt.event_id
    LEFT JOIN public.contracts c ON c.id = wt.contract_id
    CROSS JOIN b
    WHERE wt.vendor_id IS NOT NULL AND wt.status = 'hoan_thanh'
      AND COALESCE(public.vn_date(ev.event_date), public.vn_date(wt.deadline), public.vn_date(wt.created_at)) BETWEEN b.s AND b.e
  )
  SELECT v.id, v.full_name::text, v.phone::text, v.service_type::text,
         COUNT(*)::bigint, COALESCE(SUM(t.cost), 0)::numeric,
         ARRAY(SELECT DISTINCT x.contract_code FROM t x WHERE x.vendor_id = v.id AND x.contract_code IS NOT NULL ORDER BY 1)
  FROM t JOIN public.vendors v ON v.id = t.vendor_id
  GROUP BY v.id, v.full_name, v.phone, v.service_type
  ORDER BY 6 DESC, 2;
```
