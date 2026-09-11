---
title: "Thân hàm DB — tai-chinh"
tags: [sinh-tu-dong, db, ham, tai-chinh]
cap-nhat: 2026-09-11
trang-thai: sinh-tu-dong
nguon: pg_proc · pg_policies · information_schema.role_table_grants
---

> ⚙️ **File này do `scripts/vault-gen-db-truth.mjs` sinh ra từ database production. ĐỪNG sửa tay** — chạy lại script để cập nhật.

# Thân hàm DB — tai-chinh

41 hàm. `SECURITY DEFINER` = chạy bằng quyền chủ hàm, **bỏ qua RLS** → hàm loại này phải tự kiểm quyền bên trong.

| Hàm | Tham số | Trả về | Quyền | Ngôn ngữ |
|---|---|---|---|---|
| [`advance_close_task`](#advance_close_task) | `p_close_id uuid, p_step_number integer, p_new_status text, p_actor_id uuid` | `void` | **DEFINER** | plpgsql |
| [`backfill_payment_plan_ssot_v2`](#backfill_payment_plan_ssot_v2) | `—` | `json` | **DEFINER** | plpgsql |
| [`contract_financials`](#contract_financials) | `p_contract_ids uuid[]` | `TABLE(contract_id uuid, revenue numeric, task_cost numeric, print_cost numeric, cogs numeric, direct_cost numeric, total_cost numeric, profit numeric, profit_margin numeric)` | **DEFINER** | sql |
| [`contract_payment_health_checks`](#contract_payment_health_checks) | `—` | `TABLE(check_name text, issue_count bigint)` | **DEFINER** | sql |
| [`contribute_to_goal`](#contribute_to_goal) | `p_goal_id uuid, p_amount numeric, p_notes text` | `void` | invoker | plpgsql |
| [`create_default_payment_schedule_v2`](#create_default_payment_schedule_v2) | `p_contract_id uuid, p_total numeric, p_initial_amount numeric, p_initial_stage text, p_contract_date date, p_work_date date` | `uuid` | **DEFINER** | plpgsql |
| [`dashboard_revenue_chart`](#dashboard_revenue_chart) | `p_month integer, p_year integer, p_months integer` | `TABLE(month_index integer, month_label text, revenue numeric)` | invoker | plpgsql |
| [`decrement_goal_amount`](#decrement_goal_amount) | `p_goal_id uuid, p_amount numeric` | `void` | invoker | plpgsql |
| [`finance_cashflow_timeline`](#finance_cashflow_timeline) | `p_start_date date, p_end_date date` | `TABLE(date date, inflow numeric, outflow numeric)` | **DEFINER** | sql |
| [`finance_expense_stats`](#finance_expense_stats) | `p_month integer, p_year integer` | `TABLE(total_expenses bigint, total_amount numeric, approved_count bigint, pending_count bigint)` | invoker | sql |
| [`finance_lab_debt_summary`](#finance_lab_debt_summary) | `—` | `TABLE(lab_id uuid, lab_name text, order_count bigint, total_orders numeric, total_paid numeric, remaining numeric, last_order_date timestamp with time zone)` | **DEFINER** | sql |
| [`finance_ledger`](#finance_ledger) | `p_page integer, p_page_size integer, p_month integer, p_year integer, p_type text` | `TABLE(id uuid, source_table text, direction text, transaction_date date, amount numeric, code text, customer_name text, category_name text, payment_method text, description text, status text, total_count integer)` | invoker | plpgsql |
| [`finance_ledger_range`](#finance_ledger_range) | `p_page integer, p_page_size integer, p_from_date date, p_to_date date, p_type text` | `TABLE(id uuid, source_table text, direction text, transaction_date date, amount numeric, code text, customer_name text, category_name text, payment_method text, description text, status text, total_count integer)` | **DEFINER** | plpgsql |
| [`finance_pnl_by_month`](#finance_pnl_by_month) | `p_year integer` | `TABLE(raw_month integer, month_label text, revenue numeric, cost numeric, profit numeric, cash_in numeric, cash_out numeric, signed_revenue numeric)` | **DEFINER** | sql |
| [`finance_receipt_document_stats`](#finance_receipt_document_stats) | `p_month integer, p_year integer` | `TABLE(total_receipts bigint, total_amount numeric, completed_count bigint, pending_count bigint)` | **DEFINER** | sql |
| [`finance_receipt_documents`](#finance_receipt_documents) | `p_month integer, p_year integer, p_receipt_type text, p_search text, p_limit integer, p_offset integer` | `TABLE(id text, source_table text, source_id uuid, receipt_date date, receipt_type text, payment_type text, contract_id uuid, contract_code text, customer_name text, receipt_amount numeric, total_amount numeric, remaining_amount numeric, category_id uuid, category_name text, status text, notes text, receipt_code text, created_at timestamp with time zone, updated_at timestamp with time zone, total_count bigint)` | **DEFINER** | sql |
| [`finance_receipt_stats`](#finance_receipt_stats) | `p_month integer, p_year integer` | `TABLE(total_receipts bigint, total_amount numeric, completed_count bigint, pending_count bigint)` | **DEFINER** | sql |
| [`get_budget_vs_actual`](#get_budget_vs_actual) | `p_month integer, p_year integer` | `json` | **DEFINER** | plpgsql |
| [`get_cashflow_forecast`](#get_cashflow_forecast) | `p_days integer` | `json` | **DEFINER** | plpgsql |
| [`get_contract_detail_v2`](#get_contract_detail_v2) | `p_contract_id uuid` | `jsonb` | invoker | plpgsql |
| [`get_contract_detail_v3`](#get_contract_detail_v3) | `p_contract_id uuid` | `jsonb` | invoker | sql |
| [`get_expense_breakdown`](#get_expense_breakdown) | `p_month integer, p_year integer` | `json` | **DEFINER** | plpgsql |
| [`get_finance_intelligence`](#get_finance_intelligence) | `—` | `json` | **DEFINER** | plpgsql |
| [`is_period_locked`](#is_period_locked) | `p_date date` | `boolean` | invoker | plpgsql |
| [`payable_remaining`](#payable_remaining) | `p_target_type text, p_target_id uuid, p_payee_id uuid` | `numeric` | invoker | sql |
| [`payee_payment_history`](#payee_payment_history) | `p_payee_type text, p_payee_id uuid` | `TABLE(expense_id uuid, expense_date date, amount numeric, payment_method text, note text, created_at timestamp with time zone, created_by uuid, allocations jsonb)` | **DEFINER** | sql |
| [`payment_stage_display_label_v2`](#payment_stage_display_label_v2) | `p_stage text, p_default text` | `text` | invoker | plpgsql |
| [`payment_stage_key_v2`](#payment_stage_key_v2) | `p_stage text` | `text` | invoker | plpgsql |
| [`printing_integrity_report`](#printing_integrity_report) | `—` | `TABLE(check_name text, issue_count bigint)` | **DEFINER** | sql |
| [`process_contract_payment_v2`](#process_contract_payment_v2) | `p_contract_id uuid, p_amount numeric, p_payment_method payment_method_enum, p_payment_date date, p_payment_stage text, p_category_id uuid, p_notes text, p_payment_plan_id uuid, p_update_total boolean, p_created_by uuid` | `json` | **DEFINER** | plpgsql |
| [`recompute_printing_payment_status`](#recompute_printing_payment_status) | `p_order_id uuid` | `void` | invoker | plpgsql |
| [`record_lab_payment_atomic`](#record_lab_payment_atomic) | `p_lab_id uuid, p_amount numeric, p_payment_method text, p_note text, p_allocations jsonb, p_actor_id uuid, p_payment_date date` | `jsonb` | **DEFINER** | plpgsql |
| [`record_payee_payment_atomic`](#record_payee_payment_atomic) | `p_payee_type text, p_payee_id uuid, p_amount numeric, p_payment_method text, p_payment_date date, p_note text, p_allocations jsonb, p_actor_id uuid` | `jsonb` | **DEFINER** | plpgsql |
| [`resolve_printing_expense_category_id`](#resolve_printing_expense_category_id) | `—` | `uuid` | **DEFINER** | plpgsql |
| [`restore_inventory_on_receipt_void`](#restore_inventory_on_receipt_void) | `—` | `trigger` | invoker | plpgsql |
| [`run_integrity_scan`](#run_integrity_scan) | `—` | `void` | **DEFINER** | plpgsql |
| [`sync_employee_salary_paid`](#sync_employee_salary_paid) | `p_salary_id uuid` | `void` | invoker | sql |
| [`sync_payment_plan_statuses_v2`](#sync_payment_plan_statuses_v2) | `p_contract_id uuid` | `void` | **DEFINER** | plpgsql |
| [`undo_contribution_atomic`](#undo_contribution_atomic) | `p_contribution_id uuid` | `json` | **DEFINER** | plpgsql |
| [`void_contract_payment_v2`](#void_contract_payment_v2) | `p_payment_id uuid, p_reason text, p_actor_id uuid` | `json` | **DEFINER** | plpgsql |
| [`void_payee_payment_atomic`](#void_payee_payment_atomic) | `p_expense_id uuid, p_actor_id uuid` | `jsonb` | **DEFINER** | plpgsql |

---

## advance_close_task

`advance_close_task(p_close_id uuid, p_step_number integer, p_new_status text, p_actor_id uuid)` → `void` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
DECLARE
  v_prev_status TEXT;
  v_current_status TEXT;
  v_close_status TEXT;
BEGIN
  -- Auth check: p_actor_id is validated by withAdmin before calling
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: actor_id is required';
  END IF;

  -- 1. Check close is not locked
  SELECT status INTO v_close_status
  FROM public.finance_monthly_closes WHERE id = p_close_id;

  IF v_close_status IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy kỳ chốt sổ.';
  END IF;

  IF v_close_status = 'locked' THEN
    RAISE EXCEPTION 'Kỳ đã khóa sổ, không thể thay đổi.';
  END IF;

  -- 2. Check previous step is completed (except step 1)
  IF p_step_number > 1 THEN
    SELECT status INTO v_prev_status
    FROM public.finance_close_tasks
    WHERE close_id = p_close_id AND step_number = p_step_number - 1;

    IF v_prev_status IS NULL OR v_prev_status != 'hoan_thanh' THEN
      RAISE EXCEPTION 'Bước % chưa hoàn thành.', p_step_number - 1;
    END IF;
  END IF;

  -- 3. Get current status
  SELECT status INTO v_current_status
  FROM public.finance_close_tasks
  WHERE close_id = p_close_id AND step_number = p_step_number;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy bước % trong kỳ chốt sổ.', p_step_number;
  END IF;

  -- 4. Validate state transition
  IF NOT (
    (v_current_status = 'chua_bat_dau' AND p_new_status = 'dang_thuc_hien') OR
    (v_current_status = 'dang_thuc_hien' AND p_new_status = 'cho_duyet') OR
    (v_current_status = 'cho_duyet' AND p_new_status IN ('hoan_thanh', 'co_van_de')) OR
    (v_current_status = 'co_van_de' AND p_new_status = 'dang_thuc_hien')
  ) THEN
    RAISE EXCEPTION 'Không thể chuyển từ "%" sang "%".', v_current_status, p_new_status;
  END IF;

  -- 5. Apply update
  UPDATE public.finance_close_tasks
  SET status = p_new_status,
      started_at = CASE WHEN p_new_status = 'dang_thuc_hien' AND started_at IS NULL THEN now() ELSE started_at END,
      completed_at = CASE WHEN p_new_status = 'hoan_thanh' THEN now() ELSE completed_at END,
      updated_at = now()
  WHERE close_id = p_close_id AND step_number = p_step_number;

  -- 6. If step 8 completed → lock the close period
  IF p_step_number = 8 AND p_new_status = 'hoan_thanh' THEN
    UPDATE public.finance_monthly_closes
    SET status = 'locked', locked_by = p_actor_id, locked_at = now(), updated_at = now()
    WHERE id = p_close_id;
  ELSE
    UPDATE public.finance_monthly_closes
    SET status = 'in_progress', updated_at = now()
    WHERE id = p_close_id AND status = 'draft';
  END IF;
END;
```

---

## backfill_payment_plan_ssot_v2

`backfill_payment_plan_ssot_v2()` → `json` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
DECLARE
  v_contract record;
  v_payment record;
  v_plan_id uuid;
  v_plan_count integer;
  v_plan_total numeric;
  v_sort_order integer;
  v_rows integer;
  v_created_plans integer := 0;
  v_created_allocations integer := 0;
BEGIN
  FOR v_contract IN
    SELECT id, total_amount, paid_amount, remaining_amount, contract_date, work_date
    FROM public.contracts
    WHERE deleted_at IS NULL
      AND COALESCE(total_amount, 0) > 0
  LOOP
    SELECT COUNT(*), COALESCE(SUM(amount), 0)
    INTO v_plan_count, v_plan_total
    FROM public.payment_plans
    WHERE contract_id = v_contract.id
      AND COALESCE(status, 'pending') <> 'cancelled';

    IF v_plan_count = 0 THEN
      v_sort_order := 10;

      FOR v_payment IN
        SELECT id, amount, payment_date, payment_stage, created_by, created_at
        FROM public.payments
        WHERE contract_id = v_contract.id
          AND deleted_at IS NULL
          AND COALESCE(is_contract_adjustment, false) = false
        ORDER BY payment_date, created_at
      LOOP
        INSERT INTO public.payment_plans (
          contract_id,
          stage_name,
          stage_key,
          amount,
          due_date,
          status,
          receipt_id,
          sort_order
        )
        VALUES (
          v_contract.id,
          public.payment_stage_display_label_v2(
            v_payment.payment_stage,
            CASE
              WHEN COALESCE(v_contract.remaining_amount, 0) <= 0 THEN 'Thanh toán hết'
              WHEN v_sort_order = 10 THEN 'Cọc lần 1'
              ELSE 'Thanh toán'
            END
          ),
          CASE
            WHEN COALESCE(v_contract.remaining_amount, 0) <= 0 THEN 'final'
            WHEN v_sort_order = 10 THEN 'deposit'
            ELSE 'custom'
          END,
          v_payment.amount,
          v_payment.payment_date,
          'pending',
          v_payment.id,
          v_sort_order
        )
        RETURNING id INTO v_plan_id;

        INSERT INTO public.payment_plan_allocations (
          contract_id,
          payment_plan_id,
          payment_id,
          amount,
          created_by
        )
        VALUES (
          v_contract.id,
          v_plan_id,
          v_payment.id,
          v_payment.amount,
          v_payment.created_by
        )
        ON CONFLICT (payment_plan_id, payment_id) DO NOTHING;

        v_created_plans := v_created_plans + 1;
        v_created_allocations := v_created_allocations + 1;
        v_sort_order := v_sort_order + 10;
      END LOOP;

      IF COALESCE(v_contract.remaining_amount, 0) > 0 THEN
        INSERT INTO public.payment_plans (
          contract_id,
          stage_name,
          stage_key,
          amount,
          due_date,
          status,
          sort_order
        )
        VALUES (
          v_contract.id,
          'Thanh toán còn lại',
          'remaining',
          v_contract.remaining_amount,
          COALESCE(v_contract.work_date, v_contract.contract_date, CURRENT_DATE),
          'pending',
          v_sort_order
        );
        v_created_plans := v_created_plans + 1;
      ELSIF COALESCE(v_contract.paid_amount, 0) <= 0 THEN
        PERFORM public.create_default_payment_schedule_v2(
          v_contract.id,
          v_contract.total_amount,
          0,
          NULL,
          COALESCE(v_contract.contract_date, CURRENT_DATE),
          v_contract.work_date
        );
        v_created_plans := v_created_plans + 1;
      END IF;
    ELSE
      INSERT INTO public.payment_plan_allocations (
        contract_id,
        payment_plan_id,
        payment_id,
        amount,
        created_by
      )
      SELECT
        pp.contract_id,
        pp.id,
        pp.receipt_id,
        LEAST(pp.amount, COALESCE(p.amount, pp.amount)),
        p.created_by
      FROM public.payment_plans pp
      JOIN public.payments p ON p.id = pp.receipt_id AND p.deleted_at IS NULL
      WHERE pp.contract_id = v_contract.id
        AND pp.receipt_id IS NOT NULL
      ON CONFLICT (payment_plan_id, payment_id) DO NOTHING;

      GET DIAGNOSTICS v_rows = ROW_COUNT;
      v_created_allocations := v_created_allocations + v_rows;

      SELECT COALESCE(SUM(amount), 0)
      INTO v_plan_total
      FROM public.payment_plans
      WHERE contract_id = v_contract.id
        AND COALESCE(status, 'pending') <> 'cancelled';

      IF COALESCE(v_contract.total_amount, 0) - v_plan_total > 0.01 THEN
        SELECT COALESCE(MAX(sort_order), 0) + 10
        INTO v_sort_order
        FROM public.payment_plans
        WHERE contract_id = v_contract.id;

        INSERT INTO public.payment_plans (
          contract_id,
          stage_name,
          stage_key,
          amount,
          due_date,
          status,
          sort_order
        )
        VALUES (
          v_contract.id,
          'Thanh toán còn lại',
          'remaining',
          COALESCE(v_contract.total_amount, 0) - v_plan_total,
          COALESCE(v_contract.work_date, v_contract.contract_date, CURRENT_DATE),
          'pending',
          v_sort_order
        );
        v_created_plans := v_created_plans + 1;
      END IF;
    END IF;

    PERFORM public.sync_payment_plan_statuses_v2(v_contract.id);
  END LOOP;

  RETURN json_build_object(
    'created_plans', v_created_plans,
    'created_allocations', v_created_allocations
  );
END;
```

---

## contract_financials

`contract_financials(p_contract_ids uuid[])` → `TABLE(contract_id uuid, revenue numeric, task_cost numeric, print_cost numeric, cogs numeric, direct_cost numeric, total_cost numeric, profit numeric, profit_margin numeric)` · **SECURITY DEFINER — bỏ qua RLS** · sql · STABLE

```sql
WITH parts AS (
    SELECT c.id AS contract_id,
      COALESCE(c.total_amount, 0)::numeric AS revenue,
      COALESCE((SELECT SUM(wt.cost) FROM public.work_tasks wt WHERE wt.contract_id = c.id AND wt.status <> 'da_huy' AND COALESCE(wt.cost,0) > 0), 0)::numeric AS task_cost,
      COALESCE((SELECT SUM(po.total_amount) FROM public.printing_orders po WHERE po.contract_id = c.id AND po.deleted_at IS NULL AND COALESCE(po.status,'') NOT IN ('huy_don','da_huy')), 0)::numeric AS print_cost,
      COALESCE((SELECT SUM(t.total_cost) FROM public.inventory_transactions t WHERE t.contract_id = c.id AND t.transaction_type = 'stock_out' AND t.source_type IN ('contract_fulfillment','contract_addon_sale') AND COALESCE(t.is_rollback, false) = false), 0)::numeric AS cogs,
      COALESCE((SELECT SUM(e.amount) FROM public.expenses e
                LEFT JOIN public.transaction_categories tc ON tc.id = e.category_id
                WHERE e.contract_id = c.id AND e.deleted_at IS NULL AND e.payee_type = 'other'
                  AND COALESCE(tc.category_code, '') NOT IN ('contract_refund', 'refund', 'hoan_tien')), 0)::numeric AS direct_cost  -- R2 (#12): hoàn tiền không phải chi phí
    FROM public.contracts c WHERE c.id = ANY(p_contract_ids)
  )
  SELECT p.contract_id, p.revenue, p.task_cost, p.print_cost, p.cogs, p.direct_cost,
    (p.task_cost + p.print_cost + p.cogs + p.direct_cost)::numeric AS total_cost,
    (p.revenue - (p.task_cost + p.print_cost + p.cogs + p.direct_cost))::numeric AS profit,
    CASE WHEN p.revenue = 0 THEN 0::numeric
         ELSE ROUND(((p.revenue - (p.task_cost + p.print_cost + p.cogs + p.direct_cost)) / p.revenue) * 100, 1)::numeric END AS profit_margin
  FROM parts p;
```

---

## contract_payment_health_checks

`contract_payment_health_checks()` → `TABLE(check_name text, issue_count bigint)` · **SECURITY DEFINER — bỏ qua RLS** · sql · STABLE

```sql
WITH payment_sums AS (
    SELECT contract_id, SUM(amount) AS paid_sum
    FROM public.payments
    WHERE deleted_at IS NULL
      AND contract_id IS NOT NULL
    GROUP BY contract_id
  ),
  allocation_sums AS (
    SELECT payment_id, SUM(amount) AS allocated_amount
    FROM public.payment_plan_allocations
    GROUP BY payment_id
  )
  SELECT
    'overpaid_contracts'::text AS check_name,
    COUNT(*)::bigint AS issue_count
  FROM public.contracts
  WHERE deleted_at IS NULL
    AND (
      COALESCE(paid_amount, 0) > COALESCE(total_amount, 0) + 0.01
      OR COALESCE(remaining_amount, 0) < -0.01
    )

  UNION ALL

  SELECT
    'active_contracts_missing_payment_stage'::text AS check_name,
    COUNT(*)::bigint AS issue_count
  FROM public.contracts c
  WHERE c.deleted_at IS NULL
    AND COALESCE(c.status, '') <> 'da_huy'
    AND COALESCE(c.total_amount, 0) > 0
    AND NOT EXISTS (
      SELECT 1
      FROM public.payment_plans pp
      WHERE pp.contract_id = c.id
        AND COALESCE(pp.status, 'pending') <> 'cancelled'
    )

  UNION ALL

  SELECT
    'invalid_payment_stage_key'::text AS check_name,
    COUNT(*)::bigint AS issue_count
  FROM public.payment_plans pp
  WHERE COALESCE(pp.status, 'pending') <> 'cancelled'
    AND COALESCE(pp.stage_key, '') NOT IN ('deposit', 'installment_1', 'installment_2', 'final', 'outside', 'custom')

  UNION ALL

  SELECT
    'normal_contract_payment_without_allocation'::text AS check_name,
    COUNT(*)::bigint AS issue_count
  FROM public.payments p
  LEFT JOIN allocation_sums a ON a.payment_id = p.id
  WHERE p.deleted_at IS NULL
    AND p.contract_id IS NOT NULL
    AND COALESCE(p.is_contract_adjustment, false) IS FALSE
    AND COALESCE(a.allocated_amount, 0) <= 0

  UNION ALL

  SELECT
    'payment_allocation_sum_mismatch'::text AS check_name,
    COUNT(*)::bigint AS issue_count
  FROM public.payments p
  LEFT JOIN allocation_sums a ON a.payment_id = p.id
  WHERE p.deleted_at IS NULL
    AND p.contract_id IS NOT NULL
    AND COALESCE(p.is_contract_adjustment, false) IS FALSE
    AND ABS(COALESCE(p.amount, 0) - COALESCE(a.allocated_amount, 0)) > 0.01

  UNION ALL

  SELECT
    'payment_allocation_to_voided_payment'::text AS check_name,
    COUNT(*)::bigint AS issue_count
  FROM public.payment_plan_allocations ppa
  JOIN public.payments p ON p.id = ppa.payment_id
  WHERE p.deleted_at IS NOT NULL

  UNION ALL

  SELECT
    'contract_adjustments_missing_addon_item'::text AS check_name,
    COUNT(*)::bigint AS issue_count
  FROM public.payments p
  LEFT JOIN public.contract_items ci
    ON ci.id = p.contract_adjustment_item_id
   AND ci.contract_id = p.contract_id
   AND ci.deleted_at IS NULL
  WHERE p.deleted_at IS NULL
    AND p.contract_id IS NOT NULL
    AND COALESCE(p.is_contract_adjustment, false) IS TRUE
    AND ci.id IS NULL

  UNION ALL

  SELECT
    'contract_payment_sum_mismatch'::text AS check_name,
    COUNT(*)::bigint AS issue_count
  FROM public.contracts c
  LEFT JOIN payment_sums p ON p.contract_id = c.id
  WHERE c.deleted_at IS NULL
    AND ABS(COALESCE(c.paid_amount, 0) - COALESCE(p.paid_sum, 0)) > 0.01;
```

---

## contribute_to_goal

`contribute_to_goal(p_goal_id uuid, p_amount numeric, p_notes text)` → `void` · SECURITY INVOKER · plpgsql · VOLATILE

```sql
DECLARE
  v_new_amount NUMERIC;
  v_target NUMERIC;
BEGIN
  INSERT INTO goal_contributions (goal_id, amount, notes)
  VALUES (p_goal_id, p_amount, p_notes);

  UPDATE financial_goals
  SET current_amount = current_amount + p_amount,
      updated_at = NOW()
  WHERE id = p_goal_id
  RETURNING current_amount, target_amount INTO v_new_amount, v_target;

  IF v_new_amount >= v_target THEN
    UPDATE financial_goals
    SET status = 'completed', updated_at = NOW()
    WHERE id = p_goal_id;
  END IF;
END;
```

---

## create_default_payment_schedule_v2

`create_default_payment_schedule_v2(p_contract_id uuid, p_total numeric, p_initial_amount numeric, p_initial_stage text, p_contract_date date, p_work_date date)` → `uuid` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
DECLARE
  v_initial_plan_id uuid := NULL;
  v_total numeric := GREATEST(0, COALESCE(p_total, 0));
  v_initial_amount numeric := GREATEST(0, COALESCE(p_initial_amount, 0));
  v_initial_stage_key text := public.payment_stage_key_v2(p_initial_stage);
  v_target_stage_key text;
BEGIN
  IF p_contract_id IS NULL THEN
    RAISE EXCEPTION 'Contract id is required';
  END IF;
  IF v_total <= 0 THEN
    RETURN NULL;
  END IF;
  IF v_initial_amount > v_total + 0.01 THEN
    RAISE EXCEPTION 'So tien thanh toan ban dau vuot qua gia tri hop dong.';
  END IF;
  UPDATE public.payment_plans
  SET stage_key = public.payment_stage_key_v2(COALESCE(stage_key, stage_name)),
      stage_name = public.payment_stage_display_label_v2(COALESCE(stage_key, stage_name), stage_name)
  WHERE contract_id = p_contract_id
    AND COALESCE(status, 'pending') <> 'cancelled';
  UPDATE public.payment_plans
  SET sort_order = CASE stage_key
        WHEN 'deposit' THEN 10
        WHEN 'final' THEN 40
        ELSE sort_order
      END,
      stage_name = CASE stage_key
        WHEN 'deposit' THEN 'Cọc'
        WHEN 'final' THEN 'Tất toán'
        ELSE stage_name
      END
  WHERE contract_id = p_contract_id
    AND stage_key IN ('deposit', 'final')
    AND COALESCE(status, 'pending') <> 'cancelled';
  INSERT INTO public.payment_plans (
    contract_id, stage_name, stage_key, amount, due_date, status, sort_order
  )
  SELECT p_contract_id, 'Cọc', 'deposit',
         CASE WHEN COALESCE(v_initial_stage_key, 'deposit') = 'deposit' THEN v_initial_amount ELSE 0 END,
         COALESCE(p_contract_date, CURRENT_DATE),
         'pending',
         10
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.payment_plans
    WHERE contract_id = p_contract_id
      AND stage_key = 'deposit'
      AND COALESCE(status, 'pending') <> 'cancelled'
  );
  -- ADR-016 M4: không sinh 'installment_1' / 'installment_2' (0đ, không hạn) nữa — Mood thu Cọc + Tất toán;
  -- thu thêm ngoài lịch → process_contract_payment_v2 tự tạo đợt 'outside'.
  INSERT INTO public.payment_plans (
    contract_id, stage_name, stage_key, amount, due_date, status, sort_order
  )
  SELECT p_contract_id, 'Tất toán', 'final',
         CASE
           WHEN COALESCE(v_initial_stage_key, '') = 'final' AND v_initial_amount > 0 THEN v_initial_amount
           ELSE GREATEST(0, v_total - v_initial_amount)
         END,
         COALESCE(p_work_date, p_contract_date, CURRENT_DATE),
         'pending',
         40
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.payment_plans
    WHERE contract_id = p_contract_id
      AND stage_key = 'final'
      AND COALESCE(status, 'pending') <> 'cancelled'
  );
  v_target_stage_key := CASE
    WHEN v_initial_amount >= v_total THEN 'final'
    ELSE COALESCE(v_initial_stage_key, 'deposit')
  END;
  IF v_target_stage_key NOT IN ('deposit', 'final') THEN
    v_target_stage_key := 'deposit';
  END IF;
  SELECT id
  INTO v_initial_plan_id
  FROM public.payment_plans
  WHERE contract_id = p_contract_id
    AND stage_key = v_target_stage_key
    AND COALESCE(status, 'pending') <> 'cancelled'
  ORDER BY sort_order, created_at
  LIMIT 1;
  RETURN v_initial_plan_id;
END;
```

---

## dashboard_revenue_chart

`dashboard_revenue_chart(p_month integer, p_year integer, p_months integer)` → `TABLE(month_index integer, month_label text, revenue numeric)` · SECURITY INVOKER · plpgsql · STABLE

```sql
DECLARE
  v_months int := GREATEST(1, LEAST(COALESCE(p_months, 6), 24));
  v_anchor date := make_date(p_year, p_month, 1);
  v_start date := (v_anchor - ((v_months - 1)::text || ' months')::interval)::date;
  v_end date := (v_anchor + interval '1 month')::date;
BEGIN
  RETURN QUERY
  WITH months AS (
    SELECT generate_series(v_start, v_anchor, interval '1 month')::date AS month_start
  ),
  payments_by_month AS (
    SELECT date_trunc('month', payment_date)::date AS month_start, SUM(amount) AS amount
    FROM public.payments
    WHERE deleted_at IS NULL
      AND payment_date >= v_start
      AND payment_date < v_end
    GROUP BY 1
  ),
  receipts_by_month AS (
    SELECT date_trunc('month', receipt_date)::date AS month_start, SUM(receipt_amount) AS amount
    FROM public.receipts
    WHERE deleted_at IS NULL
      AND contract_id IS NULL
      AND receipt_date >= v_start
      AND receipt_date < v_end
    GROUP BY 1
  )
  SELECT
    EXTRACT(MONTH FROM m.month_start)::int AS month_index,
    ('T' || EXTRACT(MONTH FROM m.month_start)::int)::text AS month_label,
    COALESCE(p.amount, 0) + COALESCE(r.amount, 0) AS revenue
  FROM months m
  LEFT JOIN payments_by_month p ON p.month_start = m.month_start
  LEFT JOIN receipts_by_month r ON r.month_start = m.month_start
  ORDER BY m.month_start;
END;
```

---

## decrement_goal_amount

`decrement_goal_amount(p_goal_id uuid, p_amount numeric)` → `void` · SECURITY INVOKER · plpgsql · VOLATILE

```sql
BEGIN
  UPDATE financial_goals
  SET current_amount = GREATEST(0, current_amount - p_amount),
      updated_at = NOW()
  WHERE id = p_goal_id;
END;
```

---

## finance_cashflow_timeline

`finance_cashflow_timeline(p_start_date date, p_end_date date)` → `TABLE(date date, inflow numeric, outflow numeric)` · **SECURITY DEFINER — bỏ qua RLS** · sql · STABLE

```sql
WITH params AS (
    SELECT
      LEAST(COALESCE(p_start_date, p_end_date, current_date), COALESCE(p_end_date, p_start_date, current_date)) AS start_date,
      GREATEST(COALESCE(p_start_date, p_end_date, current_date), COALESCE(p_end_date, p_start_date, current_date)) AS end_date
  ),
  entries AS (
    SELECT p.payment_date::date AS entry_date, COALESCE(p.amount, 0)::numeric AS inflow, 0::numeric AS outflow
    FROM public.payments p CROSS JOIN params pr
    WHERE p.deleted_at IS NULL AND p.payment_date BETWEEN pr.start_date AND pr.end_date
    UNION ALL
    SELECT r.receipt_date::date, COALESCE(r.receipt_amount, 0)::numeric, 0::numeric
    FROM public.receipts r CROSS JOIN params pr
    WHERE r.deleted_at IS NULL AND r.contract_id IS NULL AND r.receipt_date BETWEEN pr.start_date AND pr.end_date
    UNION ALL
    SELECT e.expense_date::date, 0::numeric, COALESCE(e.amount, 0)::numeric
    FROM public.expenses e CROSS JOIN params pr
    WHERE e.deleted_at IS NULL AND e.expense_date BETWEEN pr.start_date AND pr.end_date
  )
  SELECT e.entry_date AS date, COALESCE(SUM(e.inflow), 0)::numeric, COALESCE(SUM(e.outflow), 0)::numeric
  FROM entries e
  WHERE COALESCE(e.inflow, 0) <> 0 OR COALESCE(e.outflow, 0) <> 0
  GROUP BY e.entry_date
  ORDER BY e.entry_date;
```

---

## finance_expense_stats

`finance_expense_stats(p_month integer, p_year integer)` → `TABLE(total_expenses bigint, total_amount numeric, approved_count bigint, pending_count bigint)` · SECURITY INVOKER · sql · STABLE

```sql
WITH bounds AS (
    SELECT
      CASE WHEN p_month BETWEEN 1 AND 12 AND p_year IS NOT NULL THEN make_date(p_year, p_month, 1) END AS start_date,
      CASE
        WHEN p_month BETWEEN 1 AND 11 AND p_year IS NOT NULL THEN make_date(p_year, p_month + 1, 1)
        WHEN p_month = 12 AND p_year IS NOT NULL THEN make_date(p_year + 1, 1, 1)
      END AS end_date
  ),
  filtered AS (
    SELECT e.amount, e.approved_by
    FROM public.expenses e
    CROSS JOIN bounds b
    WHERE e.deleted_at IS NULL
      AND (b.start_date IS NULL OR (e.expense_date >= b.start_date AND e.expense_date < b.end_date))
  )
  SELECT
    COUNT(*)::BIGINT AS total_expenses,
    COALESCE(SUM(amount), 0)::NUMERIC AS total_amount,
    COUNT(*) FILTER (WHERE approved_by IS NOT NULL)::BIGINT AS approved_count,
    COUNT(*) FILTER (WHERE approved_by IS NULL)::BIGINT AS pending_count
  FROM filtered;
```

---

## finance_lab_debt_summary

`finance_lab_debt_summary()` → `TABLE(lab_id uuid, lab_name text, order_count bigint, total_orders numeric, total_paid numeric, remaining numeric, last_order_date timestamp with time zone)` · **SECURITY DEFINER — bỏ qua RLS** · sql · STABLE

```sql
SELECT s.payee_id, s.payee_name, s.item_count, s.total_committed, s.total_paid, s.remaining, s.last_item_date::timestamptz
  FROM public.finance_payable_summary() s WHERE s.payee_type = 'lab' ORDER BY s.remaining DESC;
```

---

## finance_ledger

`finance_ledger(p_page integer, p_page_size integer, p_month integer, p_year integer, p_type text)` → `TABLE(id uuid, source_table text, direction text, transaction_date date, amount numeric, code text, customer_name text, category_name text, payment_method text, description text, status text, total_count integer)` · SECURITY INVOKER · plpgsql · STABLE

```sql
BEGIN
  RETURN QUERY
  WITH entries AS (
    SELECT
      p.id,
      'payments'::TEXT AS source_table,
      'in'::TEXT AS direction,
      p.payment_date AS transaction_date,
      p.amount,
      COALESCE(p.receipt_code, c.contract_code, CONCAT('PAY-', LEFT(p.id::TEXT, 8)))::TEXT AS code,
      cu.full_name::TEXT AS customer_name,
      tc.name::TEXT AS category_name,
      p.payment_method::TEXT AS payment_method,
      COALESCE(p.notes, p.payment_stage, c.contract_code)::TEXT AS description,
      (CASE WHEN p.approved_by IS NULL THEN 'pending' ELSE 'approved' END)::TEXT AS status,
      p.created_at
    FROM public.payments p
    LEFT JOIN public.contracts c ON c.id = p.contract_id
    LEFT JOIN public.customers cu ON cu.id = COALESCE(p.customer_id, c.customer_id)
    LEFT JOIN public.transaction_categories tc ON tc.id = p.category_id
    WHERE p.deleted_at IS NULL

    UNION ALL

    SELECT
      r.id,
      'receipts'::TEXT AS source_table,
      'in'::TEXT AS direction,
      r.receipt_date AS transaction_date,
      r.receipt_amount AS amount,
      COALESCE(r.contract_code, CONCAT('REC-', LEFT(r.id::TEXT, 8)))::TEXT AS code,
      r.customer_name::TEXT AS customer_name,
      COALESCE(r.category_name, tc.name)::TEXT AS category_name,
      r.payment_type::TEXT AS payment_method,
      r.notes::TEXT AS description,
      COALESCE(r.status, 'confirmed')::TEXT AS status,
      r.created_at
    FROM public.receipts r
    LEFT JOIN public.transaction_categories tc ON tc.id = r.category_id

    UNION ALL

    SELECT
      e.id,
      'expenses'::TEXT AS source_table,
      'out'::TEXT AS direction,
      e.expense_date AS transaction_date,
      e.amount,
      COALESCE(c.contract_code, CONCAT('EXP-', LEFT(e.id::TEXT, 8)))::TEXT AS code,
      COALESCE(e.recipient, cu.full_name)::TEXT AS customer_name,
      tc.name::TEXT AS category_name,
      e.payment_method::TEXT AS payment_method,
      e.description::TEXT AS description,
      (CASE WHEN e.approved_by IS NULL THEN 'pending' ELSE 'approved' END)::TEXT AS status,
      e.created_at
    FROM public.expenses e
    LEFT JOIN public.contracts c ON c.id = e.contract_id
    LEFT JOIN public.customers cu ON cu.id = c.customer_id
    LEFT JOIN public.transaction_categories tc ON tc.id = e.category_id
    WHERE e.deleted_at IS NULL
  ),
  filtered AS (
    SELECT e.*
    FROM entries e
    WHERE (p_month IS NULL OR EXTRACT(MONTH FROM e.transaction_date)::INT = p_month)
      AND (p_year IS NULL OR EXTRACT(YEAR FROM e.transaction_date)::INT = p_year)
      AND (p_type IS NULL OR p_type = 'all' OR e.direction = p_type)
  ),
  counted AS (
    SELECT f.*, COUNT(*) OVER()::INT AS total_count
    FROM filtered f
    ORDER BY f.transaction_date DESC, f.created_at DESC NULLS LAST, f.id DESC
    LIMIT p_page_size
    OFFSET GREATEST(p_page - 1, 0) * p_page_size
  )
  SELECT
    c.id,
    c.source_table::TEXT,
    c.direction::TEXT,
    c.transaction_date,
    c.amount,
    c.code::TEXT,
    COALESCE(c.customer_name, '-')::TEXT AS customer_name,
    COALESCE(c.category_name, '-')::TEXT AS category_name,
    c.payment_method::TEXT,
    COALESCE(c.description, '')::TEXT AS description,
    c.status::TEXT,
    c.total_count
  FROM counted c;
END;
```

---

## finance_ledger_range

`finance_ledger_range(p_page integer, p_page_size integer, p_from_date date, p_to_date date, p_type text)` → `TABLE(id uuid, source_table text, direction text, transaction_date date, amount numeric, code text, customer_name text, category_name text, payment_method text, description text, status text, total_count integer)` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · STABLE

```sql
DECLARE
  v_total_count INT := 0;
  v_page INT := GREATEST(COALESCE(p_page, 1), 1);
  v_page_size INT := LEAST(GREATEST(COALESCE(p_page_size, 20), 1), 50);
BEGIN
  WITH counts AS (
    SELECT COUNT(*) AS cnt
    FROM public.payments p
    WHERE p.deleted_at IS NULL
      AND (p_from_date IS NULL OR p.payment_date >= p_from_date)
      AND (p_to_date IS NULL OR p.payment_date <= p_to_date)
      AND (p_type IS NULL OR p_type = 'all' OR p_type = 'in')
    UNION ALL
    SELECT COUNT(*) AS cnt
    FROM public.receipts r
    WHERE r.deleted_at IS NULL
      AND r.contract_id IS NULL
      AND (p_from_date IS NULL OR r.receipt_date >= p_from_date)
      AND (p_to_date IS NULL OR r.receipt_date <= p_to_date)
      AND (p_type IS NULL OR p_type = 'all' OR p_type = 'in')
    UNION ALL
    SELECT COUNT(*) AS cnt
    FROM public.expenses e
    WHERE e.deleted_at IS NULL
      AND (p_from_date IS NULL OR e.expense_date >= p_from_date)
      AND (p_to_date IS NULL OR e.expense_date <= p_to_date)
      AND (p_type IS NULL OR p_type = 'all' OR p_type = 'out')
  )
  SELECT COALESCE(SUM(cnt), 0)::INT INTO v_total_count FROM counts;

  RETURN QUERY
  WITH entries AS (
    SELECT
      p.id,
      'payments'::TEXT AS source_table,
      'in'::TEXT AS direction,
      p.payment_date AS transaction_date,
      p.amount,
      COALESCE(p.receipt_code, c.contract_code, CONCAT('PAY-', LEFT(p.id::TEXT, 8)))::TEXT AS code,
      cu.full_name::TEXT AS customer_name,
      tc.name::TEXT AS category_name,
      p.payment_method::TEXT AS payment_method,
      COALESCE(p.notes, p.payment_stage, c.contract_code)::TEXT AS description,
      CASE WHEN p.approved_by IS NULL THEN 'pending' ELSE 'approved' END::TEXT AS status,
      p.created_at
    FROM public.payments p
    LEFT JOIN public.contracts c ON c.id = p.contract_id
    LEFT JOIN public.customers cu ON cu.id = COALESCE(p.customer_id, c.customer_id)
    LEFT JOIN public.transaction_categories tc ON tc.id = p.category_id
    WHERE p.deleted_at IS NULL
      AND (p_from_date IS NULL OR p.payment_date >= p_from_date)
      AND (p_to_date IS NULL OR p.payment_date <= p_to_date)
      AND (p_type IS NULL OR p_type = 'all' OR p_type = 'in')

    UNION ALL

    SELECT
      r.id,
      'receipts'::TEXT,
      'in'::TEXT,
      r.receipt_date,
      r.receipt_amount::NUMERIC,
      COALESCE(r.contract_code, CONCAT('REC-', LEFT(r.id::TEXT, 8)))::TEXT,
      r.customer_name::TEXT,
      COALESCE(r.category_name, tc.name)::TEXT,
      r.payment_type::TEXT,
      r.notes::TEXT,
      COALESCE(r.status, 'confirmed')::TEXT,
      r.created_at
    FROM public.receipts r
    LEFT JOIN public.transaction_categories tc ON tc.id = r.category_id
    WHERE r.deleted_at IS NULL
      AND r.contract_id IS NULL
      AND (p_from_date IS NULL OR r.receipt_date >= p_from_date)
      AND (p_to_date IS NULL OR r.receipt_date <= p_to_date)
      AND (p_type IS NULL OR p_type = 'all' OR p_type = 'in')

    UNION ALL

    SELECT
      e.id,
      'expenses'::TEXT,
      'out'::TEXT,
      e.expense_date,
      e.amount::NUMERIC,
      COALESCE(c.contract_code, CONCAT('EXP-', LEFT(e.id::TEXT, 8)))::TEXT,
      COALESCE(e.recipient, cu.full_name)::TEXT,
      tc.name::TEXT,
      e.payment_method::TEXT,
      e.description::TEXT,
      CASE WHEN e.approved_by IS NULL THEN 'pending' ELSE 'approved' END::TEXT,
      e.created_at
    FROM public.expenses e
    LEFT JOIN public.contracts c ON c.id = e.contract_id
    LEFT JOIN public.customers cu ON cu.id = c.customer_id
    LEFT JOIN public.transaction_categories tc ON tc.id = e.category_id
    WHERE e.deleted_at IS NULL
      AND (p_from_date IS NULL OR e.expense_date >= p_from_date)
      AND (p_to_date IS NULL OR e.expense_date <= p_to_date)
      AND (p_type IS NULL OR p_type = 'all' OR p_type = 'out')
  )
  SELECT
    entry.id::UUID,
    entry.source_table::TEXT,
    entry.direction::TEXT,
    entry.transaction_date::DATE,
    entry.amount::NUMERIC,
    entry.code::TEXT,
    COALESCE(entry.customer_name, '-')::TEXT,
    COALESCE(entry.category_name, '-')::TEXT,
    entry.payment_method::TEXT,
    COALESCE(entry.description, '')::TEXT,
    entry.status::TEXT,
    v_total_count::INT
  FROM entries entry
  ORDER BY entry.transaction_date DESC, entry.created_at DESC NULLS LAST, entry.id DESC
  LIMIT v_page_size
  OFFSET (v_page - 1) * v_page_size;
END;
```

---

## finance_pnl_by_month

`finance_pnl_by_month(p_year integer)` → `TABLE(raw_month integer, month_label text, revenue numeric, cost numeric, profit numeric, cash_in numeric, cash_out numeric, signed_revenue numeric)` · **SECURITY DEFINER — bỏ qua RLS** · sql · STABLE

```sql
SELECT
    EXTRACT(month FROM m)::int,
    'Tháng ' || EXTRACT(month FROM m)::int,
    (l.revenue_contract + l.revenue_retail)::numeric,
    (l.cost_task + l.cost_print + l.cost_cogs_contract + l.cost_cogs_retail + l.cost_direct + l.cost_overhead + l.cost_fixed + l.cost_salary_base)::numeric,
    ((l.revenue_contract + l.revenue_retail)
      - (l.cost_task + l.cost_print + l.cost_cogs_contract + l.cost_cogs_retail + l.cost_direct + l.cost_overhead + l.cost_fixed + l.cost_salary_base))::numeric,
    (l.cash_in_contract + l.cash_in_retail)::numeric,
    l.cash_out,
    l.signed_revenue
  FROM generate_series(make_date(p_year, 1, 1), make_date(p_year, 12, 1), interval '1 month') m,
       LATERAL public.finance_period_ledger(m::date, (m + interval '1 month - 1 day')::date) l
  ORDER BY 1;
```

---

## finance_receipt_document_stats

`finance_receipt_document_stats(p_month integer, p_year integer)` → `TABLE(total_receipts bigint, total_amount numeric, completed_count bigint, pending_count bigint)` · **SECURITY DEFINER — bỏ qua RLS** · sql · STABLE

```sql
WITH docs AS (
    SELECT
      CASE WHEN p.approved_by IS NULL THEN 'pending' ELSE 'confirmed' END AS status,
      COALESCE(p.amount, 0) AS receipt_amount,
      p.payment_date::date AS receipt_date
    FROM public.payments p
    JOIN public.contracts c ON c.id = p.contract_id
    WHERE p.deleted_at IS NULL
      AND p.contract_id IS NOT NULL
      AND c.deleted_at IS NULL

    UNION ALL

    SELECT
      COALESCE(r.status, 'confirmed') AS status,
      COALESCE(r.receipt_amount, 0) AS receipt_amount,
      r.receipt_date::date AS receipt_date
    FROM public.receipts r
    WHERE r.deleted_at IS NULL
      AND r.contract_id IS NULL
  ),
  filtered AS (
    SELECT *
    FROM docs d
    WHERE (p_month IS NULL OR EXTRACT(MONTH FROM d.receipt_date)::int = p_month)
      AND (p_year IS NULL OR EXTRACT(YEAR FROM d.receipt_date)::int = p_year)
  )
  SELECT
    COUNT(*)::bigint AS total_receipts,
    COALESCE(SUM(receipt_amount), 0)::numeric AS total_amount,
    COUNT(*) FILTER (WHERE lower(COALESCE(status, '')) IN ('completed', 'confirmed', 'approved', 'hoan_thanh'))::bigint AS completed_count,
    COUNT(*) FILTER (
      WHERE lower(COALESCE(status, 'pending')) NOT IN ('completed', 'confirmed', 'approved', 'hoan_thanh', 'cancelled', 'da_huy')
    )::bigint AS pending_count
  FROM filtered;
```

---

## finance_receipt_documents

`finance_receipt_documents(p_month integer, p_year integer, p_receipt_type text, p_search text, p_limit integer, p_offset integer)` → `TABLE(id text, source_table text, source_id uuid, receipt_date date, receipt_type text, payment_type text, contract_id uuid, contract_code text, customer_name text, receipt_amount numeric, total_amount numeric, remaining_amount numeric, category_id uuid, category_name text, status text, notes text, receipt_code text, created_at timestamp with time zone, updated_at timestamp with time zone, total_count bigint)` · **SECURITY DEFINER — bỏ qua RLS** · sql · STABLE

```sql
WITH unified AS (
    SELECT
      ('payment:' || p.id::text)::text AS id,
      'payments'::text AS source_table,
      p.id AS source_id,
      p.payment_date::date AS receipt_date,
      CASE
        WHEN COALESCE(p.is_contract_adjustment, false) THEN 'contract_adjustment'
        WHEN public.payment_stage_key_v2(p.payment_stage) = 'deposit'
          THEN 'contract_deposit'
        ELSE 'contract_payment'
      END AS receipt_type,
      p.payment_method::text AS payment_type,
      p.contract_id,
      c.contract_code,
      cu.full_name AS customer_name,
      COALESCE(p.amount, 0) AS receipt_amount,
      COALESCE(c.total_amount, 0) AS total_amount,
      COALESCE(c.remaining_amount, 0) AS remaining_amount,
      p.category_id,
      tc.name AS category_name,
      CASE WHEN p.approved_by IS NULL THEN 'pending' ELSE 'confirmed' END AS status,
      p.notes,
      COALESCE(p.receipt_code, public.contract_payment_receipt_code(p.id, p.payment_date)) AS receipt_code,
      p.created_at,
      p.updated_at
    FROM public.payments p
    JOIN public.contracts c ON c.id = p.contract_id
    LEFT JOIN public.customers cu ON cu.id = COALESCE(p.customer_id, c.customer_id)
    LEFT JOIN public.transaction_categories tc ON tc.id = p.category_id
    WHERE p.deleted_at IS NULL
      AND p.contract_id IS NOT NULL
      AND c.deleted_at IS NULL

    UNION ALL

    SELECT
      r.id::text AS id,
      'receipts'::text AS source_table,
      r.id AS source_id,
      r.receipt_date::date AS receipt_date,
      r.receipt_type::text AS receipt_type,
      r.payment_type::text AS payment_type,
      r.contract_id,
      r.contract_code,
      r.customer_name,
      COALESCE(r.receipt_amount, 0) AS receipt_amount,
      COALESCE(r.total_amount, 0) AS total_amount,
      COALESCE(r.remaining_amount, 0) AS remaining_amount,
      r.category_id,
      r.category_name,
      COALESCE(r.status, 'confirmed') AS status,
      r.notes,
      NULL::text AS receipt_code,
      r.created_at,
      r.updated_at
    FROM public.receipts r
    WHERE r.deleted_at IS NULL
      AND r.contract_id IS NULL
  ),
  filtered AS (
    SELECT *
    FROM unified u
    WHERE (p_month IS NULL OR EXTRACT(MONTH FROM u.receipt_date)::int = p_month)
      AND (p_year IS NULL OR EXTRACT(YEAR FROM u.receipt_date)::int = p_year)
      AND (p_receipt_type IS NULL OR p_receipt_type = '' OR p_receipt_type = 'all' OR u.receipt_type = p_receipt_type)
      AND (
        p_search IS NULL
        OR btrim(p_search) = ''
        OR lower(COALESCE(u.receipt_code, '') || ' ' || COALESCE(u.contract_code, '') || ' ' || COALESCE(u.customer_name, '') || ' ' || COALESCE(u.category_name, '') || ' ' || COALESCE(u.notes, ''))
          LIKE '%' || lower(btrim(p_search)) || '%'
      )
  )
  SELECT
    f.*,
    COUNT(*) OVER() AS total_count
  FROM filtered f
  ORDER BY f.receipt_date DESC, f.created_at DESC NULLS LAST
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 12), 5000))
  OFFSET GREATEST(0, COALESCE(p_offset, 0));
```

---

## finance_receipt_stats

`finance_receipt_stats(p_month integer, p_year integer)` → `TABLE(total_receipts bigint, total_amount numeric, completed_count bigint, pending_count bigint)` · **SECURITY DEFINER — bỏ qua RLS** · sql · STABLE

```sql
SELECT *
  FROM public.finance_receipt_document_stats(p_month, p_year);
```

---

## get_budget_vs_actual

`get_budget_vs_actual(p_month integer, p_year integer)` → `json` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
DECLARE
  v_result jsonb;
BEGIN
  WITH actuals AS (
    SELECT COALESCE(ec.name, 'Khac') AS cat_name, SUM(e.amount) AS actual_amount
    FROM expenses e
    LEFT JOIN transaction_categories ec ON e.category_id = ec.id
    WHERE extract(month from e.expense_date) = p_month
      AND extract(year from e.expense_date) = p_year
      AND e.deleted_at IS NULL
    GROUP BY COALESCE(ec.name, 'Khac')
  ),
  budgets_agg AS (
    SELECT category_name AS cat_name, SUM(budget_amount) AS budget_amount
    FROM budgets
    WHERE period_month = p_month
      AND period_year = p_year
      AND deleted_at IS NULL
    GROUP BY category_name
  ),
  all_cats AS (
    SELECT cat_name FROM actuals
    UNION
    SELECT cat_name FROM budgets_agg
  )
  SELECT json_agg(
    json_build_object(
      'category', ac.cat_name,
      'budget', COALESCE(b.budget_amount, 0),
      'actual', COALESCE(a.actual_amount, 0),
      'variance', COALESCE(b.budget_amount, 0) - COALESCE(a.actual_amount, 0),
      'variance_pct', CASE WHEN COALESCE(b.budget_amount, 0) > 0 THEN round(((COALESCE(b.budget_amount, 0) - COALESCE(a.actual_amount, 0)) / b.budget_amount) * 100) ELSE 0 END
    )
  )
  INTO v_result
  FROM all_cats ac
  LEFT JOIN budgets_agg b ON ac.cat_name = b.cat_name
  LEFT JOIN actuals a ON ac.cat_name = a.cat_name;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
```

---

## get_cashflow_forecast

`get_cashflow_forecast(p_days integer)` → `json` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
DECLARE
  v_today date := current_date;
  v_current_cash numeric := 0;
  v_lifetime_rev numeric := 0;
  v_lifetime_exp numeric := 0;
  v_fixed_cost numeric := 0;
  v_salary_component numeric := 0;
  v_salary_unpaid numeric := 0;
  v_forecast jsonb := '[]'::jsonb;
  v_running_bal numeric := 0;
  v_total_inflow numeric := 0;
  v_total_outflow numeric := 0;
  v_lowest_cash numeric := 0;
  v_critical_date date := NULL;
  v_curr_date date;
  v_contract_sum numeric;
  v_day_inflow numeric;
  v_day_outflow numeric;
  v_events jsonb;
BEGIN
  SELECT
    COALESCE((SELECT SUM(amount) FROM payments WHERE deleted_at IS NULL), 0)
    +
    COALESCE((SELECT SUM(receipt_amount) FROM receipts WHERE deleted_at IS NULL AND contract_id IS NULL), 0)
  INTO v_lifetime_rev;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_lifetime_exp
  FROM expenses
  WHERE deleted_at IS NULL;

  v_current_cash := v_lifetime_rev - v_lifetime_exp;
  v_running_bal := v_current_cash;
  v_lowest_cash := v_current_cash;

  SELECT COALESCE(SUM(monthly_amount), 0)
  INTO v_fixed_cost
  FROM fixed_costs
  WHERE deleted_at IS NULL
    AND (start_date IS NULL OR start_date <= (v_today + p_days))
    AND (end_date IS NULL OR end_date >= v_today);

  SELECT COALESCE(SUM(total_salary), 0)
  INTO v_salary_component
  FROM monthly_salaries
  WHERE month = extract(month from v_today)
    AND year = extract(year from v_today);

  -- ADR-016 M5: dong ra du kien = phan luong THANG NAY CHUA TRA (da tra nam trong expenses)
  SELECT COALESCE(SUM(remaining_amount), 0)
  INTO v_salary_unpaid
  FROM employee_salaries
  WHERE month = extract(month from v_today)
    AND year = extract(year from v_today);

  FOR i IN 0..(p_days - 1) LOOP
    v_curr_date := v_today + i;
    v_day_inflow := 0;
    v_day_outflow := 0;
    v_events := '[]'::jsonb;

    SELECT COALESCE(SUM(c.remaining_amount), 0)
    INTO v_contract_sum
    FROM contracts c
    WHERE c.work_date::date = v_curr_date
      AND c.remaining_amount > 0
      AND c.deleted_at IS NULL;

    IF v_contract_sum > 0 THEN
      v_day_inflow := v_day_inflow + v_contract_sum;
      v_events := v_events || jsonb_build_object('title', 'Du thu hop dong', 'amount', v_contract_sum, 'type', 'IN');
    END IF;

    IF extract(day from v_curr_date) = 1 AND v_fixed_cost > 0 THEN
      v_day_outflow := v_day_outflow + v_fixed_cost;
      v_events := v_events || jsonb_build_object('title', 'Chi phi co dinh', 'amount', v_fixed_cost, 'type', 'OUT');
    END IF;

    IF extract(day from v_curr_date) = 5 AND v_salary_unpaid > 0 THEN
      v_day_outflow := v_day_outflow + v_salary_unpaid;
      v_events := v_events || jsonb_build_object('title', 'Bang luong du kien', 'amount', v_salary_unpaid, 'type', 'OUT');
    END IF;

    v_running_bal := v_running_bal + v_day_inflow - v_day_outflow;
    v_total_inflow := v_total_inflow + v_day_inflow;
    v_total_outflow := v_total_outflow + v_day_outflow;

    IF v_running_bal < v_lowest_cash THEN
      v_lowest_cash := v_running_bal;
      v_critical_date := v_curr_date;
    END IF;

    v_forecast := v_forecast || jsonb_build_object(
      'date', to_char(v_curr_date, 'YYYY-MM-DD'),
      'projectedIncome', v_day_inflow,
      'projectedExpense', v_day_outflow,
      'balance', v_running_bal,
      'events', v_events
    );
  END LOOP;

  RETURN json_build_object(
    'currentBalance', v_current_cash,
    'monthlyBurnRate', v_fixed_cost + v_salary_component,
    'forecast30Days', v_forecast,
    'summary', json_build_object(
      'projectedInflow', v_total_inflow,
      'projectedOutflow', v_total_outflow,
      'netChange', v_total_inflow - v_total_outflow,
      'criticalDate', to_char(v_critical_date, 'YYYY-MM-DD')
    )
  );
END;
```

---

## get_contract_detail_v2

`get_contract_detail_v2(p_contract_id uuid)` → `jsonb` · SECURITY INVOKER · plpgsql · VOLATILE

```sql
DECLARE
  v_contract jsonb;
  v_events jsonb;
  v_work_tasks jsonb;
  v_checklists jsonb;
  v_payments jsonb;
  v_reservations jsonb;
  v_print_orders jsonb;
  v_payment_plans jsonb;
BEGIN
  -- 1) Contract + customers + contract_items
  SELECT jsonb_build_object(
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
      'notes', c.notes,
      'cancel_reason', c.cancel_reason,
      'updated_at', c.updated_at,
      'created_at', c.created_at,
      'customers', (
        SELECT jsonb_build_object(
          'id', cust.id,
          'customer_code', cust.customer_code,
          'full_name', cust.full_name,
          'phone', cust.phone,
          'alt_phone', cust.alt_phone,
          'email', cust.email,
          'address', cust.address,
          'wedding_date', cust.wedding_date,
          'notes', cust.notes,
          'bride_name', cust.bride_name,
          'groom_name', cust.groom_name,
          'bride_phone', cust.bride_phone,
          'groom_phone', cust.groom_phone,
          'bride_height', cust.bride_height,
          'bride_weight', cust.bride_weight,
          'bride_shoe_size', cust.bride_shoe_size,
          'groom_height', cust.groom_height,
          'groom_weight', cust.groom_weight,
          'groom_shoe_size', cust.groom_shoe_size
        )
        FROM customers cust
        WHERE cust.id = c.customer_id
      ),
      'contract_items', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', ci.id,
          'type', ci.type,
          'item_name', ci.item_name,
          'service_id', ci.service_id,
          'export_type', ci.export_type,
          'quantity', ci.quantity,
          'unit_price', ci.unit_price,
          'original_price', ci.original_price,
          'discount_amount', ci.discount_amount,
          'total_amount', ci.total_amount,
          'is_addon', ci.is_addon,
          'addon_category', ci.addon_category,
          'dress_id', ci.dress_id,
          'notes', ci.notes,
          'deleted_at', ci.deleted_at
        ))
        FROM contract_items ci
        WHERE ci.contract_id = c.id AND ci.deleted_at IS NULL
      ), '[]'::jsonb)
  ) INTO v_contract
  FROM contracts c
  WHERE c.id = p_contract_id AND c.deleted_at IS NULL;

  -- Nếu không tìm thấy hợp đồng, trả về null
  IF v_contract IS NULL THEN
    RETURN NULL;
  END IF;

  -- 2) Events
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', e.id,
      'contract_id', e.contract_id,
      'event_type', e.event_type,
      'title', e.title,
      'event_date', e.event_date,
      'end_date', e.end_date,
      'location', e.location,
      'status', e.status,
      'notes', e.notes,
      'sort_order', e.sort_order,
      'deadline', e.deadline,
      'start_time', e.start_time,
      'end_time', e.end_time,
      'is_manual_date', e.is_manual_date,
      'phase', e.phase,
      'sync_to_google', e.sync_to_google,
      'google_event_id', e.google_event_id,
      'google_sync_status', e.google_sync_status,
      'google_sync_error', e.google_sync_error,
      'google_synced_at', e.google_synced_at,
      'deleted_at', e.deleted_at
  ) ORDER BY e.sort_order ASC), '[]'::jsonb)
  INTO v_events
  FROM contract_events e
  WHERE e.contract_id = p_contract_id AND e.deleted_at IS NULL;

  -- 3) Work tasks + employees + vendors (⚡ FIX: Added vendors join)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', wt.id,
      'event_id', wt.event_id,
      'contract_id', wt.contract_id,
      'work_type', wt.work_type,
      'assigned_to', wt.assigned_to,
      'vendor_id', wt.vendor_id,
      'status', wt.status,
      'deadline', wt.deadline,
      'start_date', wt.start_date,
      'start_time', wt.start_time,
      'end_time', wt.end_time,
      'completion_date', wt.completion_date,
      'cost', wt.cost,
      'notes', wt.notes,
      'employees', (
        SELECT CASE WHEN emp.id IS NOT NULL THEN
          jsonb_build_object(
            'id', emp.id,
            'full_name', emp.full_name,
            'avatar_url', emp.avatar_url,
            'department', emp.department
          )
        ELSE NULL END
        FROM employees emp
        WHERE emp.id = wt.assigned_to
      ),
      'vendors', (
        SELECT CASE WHEN v.id IS NOT NULL THEN
          jsonb_build_object(
            'id', v.id,
            'full_name', v.full_name,
            'phone', v.phone
          )
        ELSE NULL END
        FROM vendors v
        WHERE v.id = wt.vendor_id
      )
  ) ORDER BY wt.deadline ASC), '[]'::jsonb)
  INTO v_work_tasks
  FROM work_tasks wt
  WHERE wt.contract_id = p_contract_id;

  -- 4) Checklists
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', cl.id,
      'event_stage', cl.event_stage,
      'category', cl.category,
      'item_name', cl.item_name,
      'is_completed', cl.is_completed,
      'created_at', cl.created_at,
      'updated_at', cl.updated_at
  ) ORDER BY cl.created_at ASC), '[]'::jsonb)
  INTO v_checklists
  FROM contract_checklists cl
  WHERE cl.contract_id = p_contract_id;

  -- 5) Payments
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', p.id,
      'receipt_code', p.receipt_code,
      'amount', p.amount,
      'payment_method', p.payment_method,
      'payment_date', p.payment_date,
      'payment_stage', p.payment_stage,
      'notes', p.notes,
      'created_by', p.created_by,
      'created_at', p.created_at
  )), '[]'::jsonb)
  INTO v_payments
  FROM (
      SELECT * FROM payments
      WHERE contract_id = p_contract_id AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 30
  ) p;

  -- 6) Dress reservations
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', dr.id,
      'status', dr.status,
      'start_date', dr.start_date,
      'end_date', dr.end_date,
      'notes', dr.notes,
      'dresses', (
        SELECT CASE WHEN d.id IS NOT NULL THEN
          jsonb_build_object(
            'id', d.id,
            'name', d.name,
            'item_code', d.item_code,
            'category', d.category,
            'size', d.size,
            'color', d.color,
            'image_url', d.image_url
          )
        ELSE NULL END
        FROM dresses d
        WHERE d.id = dr.dress_id
      )
  ) ORDER BY dr.created_at DESC), '[]'::jsonb)
  INTO v_reservations
  FROM dress_reservations dr
  WHERE dr.contract_id = p_contract_id;

  -- 7) Printing orders
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', po.id,
      'order_code', po.order_code,
      'status', po.status,
      'payment_status', po.payment_status,
      'total_amount', po.total_amount,
      'items', po.items,
      'print_file_url', po.print_file_url,
      'order_date', po.order_date,
      'expected_date', po.expected_date,
      'received_date', po.received_date,
      'notes', po.notes,
      'labs', (
        SELECT CASE WHEN l.id IS NOT NULL THEN
          jsonb_build_object(
            'id', l.id,
            'name', l.lab_name
          )
        ELSE NULL END
        FROM labs l
        WHERE l.id = po.lab_id
      )
  ) ORDER BY po.created_at DESC), '[]'::jsonb)
  INTO v_print_orders
  FROM printing_orders po
  WHERE po.contract_id = p_contract_id;

  -- 8) Payment plans
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', pp.id,
      'contract_id', pp.contract_id,
      'stage_name', pp.stage_name,
      'stage_key', pp.stage_key,
      'sort_order', pp.sort_order,
      'amount', pp.amount,
      'due_date', pp.due_date,
      'status', pp.status,
      'receipt_id', pp.receipt_id,
      'created_at', pp.created_at,
      'payment_plan_allocations', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', ppa.id,
          'contract_id', ppa.contract_id,
          'payment_plan_id', ppa.payment_plan_id,
          'payment_id', ppa.payment_id,
          'amount', ppa.amount,
          'created_at', ppa.created_at,
          'created_by', ppa.created_by
        ))
        FROM payment_plan_allocations ppa
        WHERE ppa.payment_plan_id = pp.id
      ), '[]'::jsonb)
  ) ORDER BY pp.sort_order ASC, pp.created_at ASC), '[]'::jsonb)
  INTO v_payment_plans
  FROM payment_plans pp
  WHERE pp.contract_id = p_contract_id;

  -- Assemble final object
  RETURN jsonb_build_object(
      'contract', v_contract,
      'events', v_events,
      'work_tasks', v_work_tasks,
      'checklists', v_checklists,
      'payments', v_payments,
      'reservations', v_reservations,
      'print_orders', v_print_orders,
      'payment_plans', v_payment_plans
  );
END;
```

---

## get_contract_detail_v3

`get_contract_detail_v3(p_contract_id uuid)` → `jsonb` · SECURITY INVOKER · sql · STABLE

```sql
SELECT jsonb_build_object(
    'contract',
      -- Base contract fields
      to_jsonb(c.*) - 'deleted_at' || jsonb_build_object(
        -- Nested customer (1:1)
        'customers', CASE
          WHEN cust.id IS NOT NULL THEN to_jsonb(cust.*) - 'deleted_at'
          ELSE NULL
        END,
        -- Nested contract_items (1:N)
        'contract_items', COALESCE(contract_items_agg.items, '[]'::jsonb)
      ),
    'events', COALESCE(events_agg.events, '[]'::jsonb),
    'work_tasks', COALESCE(work_tasks_agg.tasks, '[]'::jsonb),
    'checklists', COALESCE(checklists_agg.checklists, '[]'::jsonb),
    'payments', COALESCE(payments_agg.payments, '[]'::jsonb),
    'reservations', COALESCE(reservations_agg.reservations, '[]'::jsonb),
    'print_orders', COALESCE(print_orders_agg.orders, '[]'::jsonb),
    'payment_plans', COALESCE(payment_plans_agg.plans, '[]'::jsonb)
  )
  FROM contracts c

  -- JOIN 1: Customer (1:1 relationship)
  LEFT JOIN customers cust ON cust.id = c.customer_id

  -- LATERAL JOIN 1: Contract items (1:N)
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(
      to_jsonb(ci.*) - 'deleted_at'
    ) as items
    FROM contract_items ci
    WHERE ci.contract_id = c.id
      AND ci.deleted_at IS NULL
  ) contract_items_agg ON true

  -- LATERAL JOIN 2: Events (1:N)
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(
      to_jsonb(e.*) - 'deleted_at'
      ORDER BY e.sort_order ASC
    ) as events
    FROM contract_events e
    WHERE e.contract_id = c.id
      AND e.deleted_at IS NULL
  ) events_agg ON true

  -- LATERAL JOIN 3: Work tasks + employees (1:N with nested 1:1)
  -- ⚡ KEY OPTIMIZATION: JOIN employees here, not N subqueries
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', wt.id,
        'event_id', wt.event_id,
        'contract_id', wt.contract_id,
        'work_type', wt.work_type,
        'assigned_to', wt.assigned_to,
        'vendor_id', wt.vendor_id,
        'status', wt.status,
        'deadline', wt.deadline,
        'start_date', wt.start_date,
        'start_time', wt.start_time,
        'end_time', wt.end_time,
        'completion_date', wt.completion_date,
        'cost', wt.cost,
        'notes', wt.notes,
        -- Nested employee (avoid N+1)
        'employees', CASE
          WHEN emp.id IS NOT NULL THEN jsonb_build_object(
            'id', emp.id,
            'full_name', emp.full_name,
            'avatar_url', emp.avatar_url,
            'department', emp.department
          )
          ELSE NULL
        END,
        -- Nested vendor (avoid extra query)
        'vendors', CASE
          WHEN v.id IS NOT NULL THEN jsonb_build_object(
            'id', v.id,
            'full_name', v.full_name,
            'phone', v.phone
          )
          ELSE NULL
        END
      )
      ORDER BY wt.deadline ASC NULLS LAST
    ) as tasks
    FROM work_tasks wt
    LEFT JOIN employees emp ON emp.id = wt.assigned_to
    LEFT JOIN vendors v ON v.id = wt.vendor_id
    WHERE wt.contract_id = c.id
  ) work_tasks_agg ON true

  -- LATERAL JOIN 4: Checklists (1:N)
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', cl.id,
        'event_stage', cl.event_stage,
        'category', cl.category,
        'item_name', cl.item_name,
        'is_completed', cl.is_completed,
        'created_at', cl.created_at,
        'updated_at', cl.updated_at
      )
      ORDER BY cl.created_at ASC
    ) as checklists
    FROM contract_checklists cl
    WHERE cl.contract_id = c.id
  ) checklists_agg ON true

  -- LATERAL JOIN 5: Payments (1:N, LIMIT 30 most recent)
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'receipt_code', p.receipt_code,
        'amount', p.amount,
        'payment_method', p.payment_method,
        'payment_date', p.payment_date,
        'payment_stage', p.payment_stage,
        'notes', p.notes,
        'created_by', p.created_by,
        'created_at', p.created_at
      )
    ) as payments
    FROM (
      SELECT *
      FROM payments
      WHERE contract_id = c.id
        AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 30
    ) p
  ) payments_agg ON true

  -- LATERAL JOIN 6: Dress reservations + dresses (1:N with nested 1:1)
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', dr.id,
        'status', dr.status,
        'start_date', dr.start_date,
        'end_date', dr.end_date,
        'notes', dr.notes,
        -- Nested dress (avoid N+1)
        'dresses', CASE
          WHEN d.id IS NOT NULL THEN jsonb_build_object(
            'id', d.id,
            'name', d.name,
            'item_code', d.item_code,
            'category', d.category,
            'size', d.size,
            'color', d.color,
            'image_url', d.image_url
          )
          ELSE NULL
        END
      )
      ORDER BY dr.created_at DESC
    ) as reservations
    FROM dress_reservations dr
    LEFT JOIN dresses d ON d.id = dr.dress_id
    WHERE dr.contract_id = c.id
  ) reservations_agg ON true

  -- LATERAL JOIN 7: Printing orders + labs (1:N with nested 1:1)
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', po.id,
        'order_code', po.order_code,
        'status', po.status,
        'payment_status', po.payment_status,
        'items', po.items,
        'print_file_url', po.print_file_url,
        'total_amount', po.total_amount,
        'order_date', po.order_date,
        'expected_date', po.expected_date,
        'received_date', po.received_date,
        'notes', po.notes,
        -- Nested lab (avoid N+1)
        'labs', CASE
          WHEN l.id IS NOT NULL THEN jsonb_build_object(
            'id', l.id,
            -- App expects labs.name (display name sống ở cột lab_name) — cùng
            -- bug đã fix ở v2 (20260514084500_fix_contract_detail_v2_rpc_labs).
            'name', l.lab_name
          )
          ELSE NULL
        END
      )
      ORDER BY po.created_at DESC
    ) as orders
    FROM printing_orders po
    LEFT JOIN labs l ON l.id = po.lab_id
    WHERE po.contract_id = c.id
  ) print_orders_agg ON true

  -- LATERAL JOIN 8: Payment plans + allocations (1:N with nested 1:N)
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', pp.id,
        'contract_id', pp.contract_id,
        'stage_name', pp.stage_name,
        'stage_key', pp.stage_key,
        'sort_order', pp.sort_order,
        'amount', pp.amount,
        'due_date', pp.due_date,
        'status', pp.status,
        'receipt_id', pp.receipt_id,
        'created_at', pp.created_at,
        -- Nested allocations (avoid N+1)
        'payment_plan_allocations', COALESCE(ppa_agg.allocations, '[]'::jsonb)
      )
      ORDER BY pp.sort_order ASC, pp.created_at ASC
    ) as plans
    FROM payment_plans pp
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', ppa.id,
          'contract_id', ppa.contract_id,
          'payment_plan_id', ppa.payment_plan_id,
          'payment_id', ppa.payment_id,
          'amount', ppa.amount,
          'created_at', ppa.created_at,
          'created_by', ppa.created_by
        )
      ) as allocations
      FROM payment_plan_allocations ppa
      WHERE ppa.payment_plan_id = pp.id
    ) ppa_agg ON true
    WHERE pp.contract_id = c.id
  ) payment_plans_agg ON true

  WHERE c.id = p_contract_id
    AND c.deleted_at IS NULL;
```

---

## get_expense_breakdown

`get_expense_breakdown(p_month integer, p_year integer)` → `json` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
DECLARE
  v_total numeric;
  v_result jsonb;
BEGIN
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total
  FROM expenses
  WHERE extract(month from expense_date) = p_month
    AND extract(year from expense_date) = p_year
    AND deleted_at IS NULL;

  SELECT jsonb_agg(
    jsonb_build_object(
      'category_name', COALESCE(ec.name, 'Khac'),
      'total', COALESCE(s.amt, 0),
      'percentage', CASE WHEN v_total > 0 THEN round((COALESCE(s.amt, 0) / v_total) * 100) ELSE 0 END,
      'count', COALESCE(s.cnt, 0)
    )
    ORDER BY COALESCE(s.amt, 0) DESC
  )
  INTO v_result
  FROM (
    SELECT category_id, SUM(amount) AS amt, COUNT(*) AS cnt
    FROM expenses
    WHERE extract(month from expense_date) = p_month
      AND extract(year from expense_date) = p_year
      AND deleted_at IS NULL
    GROUP BY category_id
  ) s
  LEFT JOIN transaction_categories ec ON ec.id = s.category_id
  WHERE COALESCE(s.amt, 0) > 0;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
```

---

## get_finance_intelligence

`get_finance_intelligence()` → `json` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
DECLARE
  v_now date := current_date;
  v_first_day date := date_trunc('month', v_now)::date;
  v_last_day date := (date_trunc('month', v_now) + interval '1 month - 1 day')::date;
  v_prev_first date := date_trunc('month', v_now - interval '1 month')::date;
  v_prev_last date := (date_trunc('month', v_now - interval '1 month') + interval '1 month - 1 day')::date;
  v_current_rev numeric := 0;
  v_current_exp numeric := 0;
  v_prev_rev numeric := 0;
  v_prev_exp numeric := 0;
  v_lifetime_rev numeric := 0;
  v_lifetime_exp numeric := 0;
  v_receivables numeric := 0;
  v_payables numeric := 0;
  v_current_cash numeric := 0;
  v_fixed_cost numeric := 0;
  v_salary_component numeric := 0;
  v_burn_rate numeric := 0;
  v_profit_margin numeric := 0;
  v_profit_score int := 0;
  v_profit_label text := '';
  v_target numeric := 0;
  v_be_percent numeric := 0;
  v_be_score int := 0;
  v_be_label text := '';
  v_runway_months numeric := 99;
  v_runway_score int := 0;
  v_runway_label text := '';
  v_rec_ratio numeric := 0;
  v_rec_score int := 0;
  v_rec_label text := '';
  v_cash_score int := 0;
  v_cash_label text := '';
  v_total_score int := 0;
  v_health_status text := '';
  v_health_message text := '';
BEGIN
  SELECT
    COALESCE((SELECT SUM(amount) FROM payments WHERE deleted_at IS NULL AND payment_date BETWEEN v_first_day AND v_last_day), 0)
    +
    COALESCE((SELECT SUM(receipt_amount) FROM receipts WHERE deleted_at IS NULL AND contract_id IS NULL AND receipt_date BETWEEN v_first_day AND v_last_day), 0)
  INTO v_current_rev;

  SELECT
    COALESCE((SELECT SUM(amount) FROM payments WHERE deleted_at IS NULL AND payment_date BETWEEN v_prev_first AND v_prev_last), 0)
    +
    COALESCE((SELECT SUM(receipt_amount) FROM receipts WHERE deleted_at IS NULL AND contract_id IS NULL AND receipt_date BETWEEN v_prev_first AND v_prev_last), 0)
  INTO v_prev_rev;

  SELECT
    COALESCE((SELECT SUM(amount) FROM payments WHERE deleted_at IS NULL), 0)
    +
    COALESCE((SELECT SUM(receipt_amount) FROM receipts WHERE deleted_at IS NULL AND contract_id IS NULL), 0)
  INTO v_lifetime_rev;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_current_exp
  FROM expenses
  WHERE deleted_at IS NULL
    AND expense_date BETWEEN v_first_day AND v_last_day;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_prev_exp
  FROM expenses
  WHERE deleted_at IS NULL
    AND expense_date BETWEEN v_prev_first AND v_prev_last;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_lifetime_exp
  FROM expenses
  WHERE deleted_at IS NULL;

  -- #18 (T1, 10/09): công nợ đọc sổ canonical finance_debt_stats() — HĐ còn nợ + phải trả lab/thợ (finance_payable_summary) + debts tay —
  -- thay vì bảng debts rỗng (0 dòng từ ngày đầu → điểm công nợ luôn "Lanh manh" giả).
  SELECT COALESCE(d.receivable, 0), COALESCE(d.payable, 0)
  INTO v_receivables, v_payables
  FROM public.finance_debt_stats() d;
  -- SELECT ... INTO gán NULL nếu nguồn trả 0 dòng (COALESCE trong SELECT-list không cứu vì không có dòng nào);
  -- hàm sổ canonical luôn trả 1 dòng, nhưng tiền thì không để NULL lọt xuống 5 thang điểm phía dưới.
  v_receivables := COALESCE(v_receivables, 0);
  v_payables := COALESCE(v_payables, 0);

  SELECT COALESCE(SUM(monthly_amount), 0)
  INTO v_fixed_cost
  FROM fixed_costs
  WHERE deleted_at IS NULL
    AND (start_date IS NULL OR start_date <= v_last_day)
    AND (end_date IS NULL OR end_date >= v_first_day);

  SELECT COALESCE(SUM(total_salary), 0)
  INTO v_salary_component
  FROM monthly_salaries
  WHERE month = extract(month from v_now)
    AND year = extract(year from v_now);

  v_burn_rate := v_fixed_cost + v_salary_component;
  IF v_burn_rate = 0 THEN
    SELECT COALESCE(SUM(amount) / 3, 0)
    INTO v_burn_rate
    FROM expenses
    WHERE deleted_at IS NULL
      AND expense_date BETWEEN (v_first_day - interval '3 months')::date AND v_last_day;
  END IF;

  -- ADR-016 M5: KHONG cong sheet luong len chi that (expenses da chua phieu chi luong payee_type='employee'); burn rate van = co dinh + sheet
  v_current_cash := v_lifetime_rev - v_lifetime_exp;

  IF v_current_rev > 0 THEN
    v_profit_margin := (v_current_rev - v_current_exp) / v_current_rev;
  END IF;

  IF v_profit_margin >= 0.3 THEN
    v_profit_score := 20; v_profit_label := 'Bien loi nhuan cao';
  ELSIF v_profit_margin >= 0.15 THEN
    v_profit_score := 16; v_profit_label := 'Co lai tot';
  ELSIF v_profit_margin > 0 THEN
    v_profit_score := 12; v_profit_label := 'Lai mong';
  ELSIF v_current_rev > 0 THEN
    v_profit_score := 5; v_profit_label := 'Hoa von / Lo';
  ELSE
    v_profit_score := 0; v_profit_label := 'Chua co doanh thu';
  END IF;

  v_target := GREATEST(v_burn_rate, v_current_exp);
  IF v_target > 0 THEN
    v_be_percent := ROUND((v_current_rev / v_target) * 100);
  END IF;

  IF v_be_percent >= 100 THEN
    v_be_score := 25; v_be_label := 'Vuot muc tieu';
  ELSIF v_be_percent >= 50 THEN
    v_be_score := 15; v_be_label := 'Tien trien tot';
  ELSE
    v_be_score := 5; v_be_label := 'Can day manh';
  END IF;

  IF v_burn_rate > 0 THEN
    v_runway_months := ROUND((v_current_cash / v_burn_rate) * 10.0) / 10.0;
  END IF;

  IF v_runway_months > 6 THEN
    v_runway_score := 25; v_runway_label := 'An toan';
  ELSIF v_runway_months > 3 THEN
    v_runway_score := 20; v_runway_label := 'Tot';
  ELSIF v_runway_months > 1 THEN
    v_runway_score := 10; v_runway_label := 'Can chu y';
  ELSE
    v_runway_score := 0; v_runway_label := 'Nguy hiem';
  END IF;

  IF v_current_rev > 0 THEN
    v_rec_ratio := v_receivables / v_current_rev;
  END IF;

  IF v_payables = 0 AND v_receivables = 0 THEN
    v_rec_score := 15; v_rec_label := 'Lanh manh';
  ELSIF v_receivables > v_payables AND v_rec_ratio < 2 THEN
    v_rec_score := 15; v_rec_label := 'Lanh manh';
  ELSIF v_receivables > v_payables THEN
    v_rec_score := 10; v_rec_label := 'Phai thu cao';
  ELSE
    v_rec_score := 5; v_rec_label := 'No phai tra cao';
  END IF;

  IF (v_current_rev - v_current_exp) > 0 THEN
    v_cash_score := 15; v_cash_label := 'Duong';
  ELSIF v_current_exp = 0 THEN
    v_cash_score := 10; v_cash_label := 'Chua phat sinh';
  ELSE
    v_cash_score := 0; v_cash_label := 'Am';
  END IF;

  v_total_score := LEAST(100, GREATEST(0, v_profit_score + v_be_score + v_runway_score + v_rec_score + v_cash_score));

  IF v_total_score < 30 THEN
    v_health_status := 'CRITICAL'; v_health_message := 'Cua hang dang gap rui ro dong tien lon.';
  ELSIF v_total_score < 60 THEN
    v_health_status := 'WARNING'; v_health_message := 'Can chu y toi uu chi phi va thu hoi cong no.';
  ELSIF v_total_score > 85 THEN
    v_health_status := 'EXCELLENT'; v_health_message := 'Tinh hinh tai chinh dang o muc rat an tam.';
  ELSE
    v_health_status := 'STABLE'; v_health_message := 'Suc khoe tai chinh on dinh.';
  END IF;

  RETURN json_build_object(
    'health_score', v_total_score,
    'health_status', v_health_status,
    'health_message', v_health_message,
    'breakdown', json_build_object(
      'profitability', json_build_object('score', v_profit_score, 'label', v_profit_label),
      'breakeven', json_build_object('score', v_be_score, 'label', v_be_label),
      'runway', json_build_object('score', v_runway_score, 'label', v_runway_label),
      'receivables', json_build_object('score', v_rec_score, 'label', v_rec_label),
      'cashflow', json_build_object('score', v_cash_score, 'label', v_cash_label)
    ),
    'cashflow', json_build_object(
      'currentCash', v_current_cash,
      'burnRate', v_burn_rate,
      'runwayMonths', v_runway_months,
      'projectedBalance', v_current_cash + v_receivables - v_payables,
      'lowCashWarning', v_current_cash < (v_burn_rate * 1.5)
    ),
    'breakeven', json_build_object(
      'target', v_target,
      'current', v_current_rev,
      'percent', v_be_percent,
      'remainingAmount', GREATEST(0, v_target - v_current_rev)
    ),
    'stats', json_build_object(
      'monthlyRevenue', v_current_rev,
      'monthlyExpense', v_current_exp,
      'monthlyProfit', v_current_rev - v_current_exp,
      'receivables', v_receivables,
      'payables', v_payables,
      'prevRevenue', v_prev_rev,
      'prevExpense', v_prev_exp
    )
  );
END;
```

---

## is_period_locked

`is_period_locked(p_date date)` → `boolean` · SECURITY INVOKER · plpgsql · STABLE

```sql
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.finance_monthly_closes
    WHERE period = to_char(p_date, 'YYYY-MM')
    AND status = 'locked'
  );
END;
```

---

## payable_remaining

`payable_remaining(p_target_type text, p_target_id uuid, p_payee_id uuid)` → `numeric` · SECURITY INVOKER · sql · STABLE

```sql
SELECT committed - allocated FROM (
    SELECT
      CASE p_target_type
        WHEN 'printing_order' THEN (SELECT po.total_amount FROM public.printing_orders po WHERE po.id = p_target_id AND po.lab_id = p_payee_id AND po.deleted_at IS NULL AND COALESCE(po.status,'') NOT IN ('huy_don','da_huy'))
        WHEN 'work_task' THEN (SELECT wt.cost FROM public.work_tasks wt WHERE wt.id = p_target_id AND wt.status = 'hoan_thanh' AND wt.cost > 0
                                 AND (wt.vendor_id = p_payee_id OR (wt.vendor_id IS NULL AND wt.assigned_to = p_payee_id)))
        WHEN 'inventory_transaction' THEN (SELECT t.total_cost FROM public.inventory_transactions t JOIN public.inventory_items i ON i.id = t.item_id WHERE t.id = p_target_id AND i.supplier_id = p_payee_id AND t.transaction_type = 'stock_in')
        WHEN 'employee_salary' THEN (SELECT s.net_salary FROM public.employee_salaries s WHERE s.id = p_target_id AND s.employee_id = p_payee_id)
      END AS committed,
      (SELECT COALESCE(SUM(a.amount),0) FROM public.expense_allocations a JOIN public.expenses e ON e.id = a.expense_id
        WHERE a.target_type = p_target_type AND a.target_id = p_target_id AND e.deleted_at IS NULL) AS allocated
  ) x WHERE committed IS NOT NULL;
```

---

## payee_payment_history

`payee_payment_history(p_payee_type text, p_payee_id uuid)` → `TABLE(expense_id uuid, expense_date date, amount numeric, payment_method text, note text, created_at timestamp with time zone, created_by uuid, allocations jsonb)` · **SECURITY DEFINER — bỏ qua RLS** · sql · STABLE

```sql
SELECT e.id, e.expense_date, e.amount, e.payment_method::text, e.description, e.created_at, e.created_by,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'target_type', a.target_type, 'target_id', a.target_id, 'amount', a.amount,
        'label', CASE a.target_type
          WHEN 'printing_order' THEN (SELECT po.order_code::text FROM public.printing_orders po WHERE po.id = a.target_id)
          WHEN 'work_task' THEN (SELECT wt.work_type::text || COALESCE(' ' || c.contract_code, '') FROM public.work_tasks wt LEFT JOIN public.contracts c ON c.id = wt.contract_id WHERE wt.id = a.target_id)
          WHEN 'inventory_transaction' THEN (SELECT 'Nhập ' || i.name || ' ×' || t.quantity FROM public.inventory_transactions t JOIN public.inventory_items i ON i.id = t.item_id WHERE t.id = a.target_id)
          WHEN 'employee_salary' THEN (SELECT 'Lương ' || s.month || '/' || s.year FROM public.employee_salaries s WHERE s.id = a.target_id)
        END
      ) ORDER BY a.created_at)
      FROM public.expense_allocations a WHERE a.expense_id = e.id
    ), '[]'::jsonb)
  FROM public.expenses e
  WHERE e.deleted_at IS NULL AND e.payee_type = p_payee_type AND e.payee_id = p_payee_id
  ORDER BY e.expense_date DESC, e.created_at DESC;
```

---

## payment_stage_display_label_v2

`payment_stage_display_label_v2(p_stage text, p_default text)` → `text` · SECURITY INVOKER · plpgsql · IMMUTABLE

```sql
DECLARE
  v_key text := public.payment_stage_key_v2(p_stage);
BEGIN
  IF v_key = 'deposit' THEN
    RETURN 'Cọc';
  ELSIF v_key = 'installment_1' THEN
    RETURN 'Đợt 1';
  ELSIF v_key = 'installment_2' THEN
    RETURN 'Đợt 2';
  ELSIF v_key = 'final' THEN
    RETURN 'Tất toán';
  ELSIF v_key = 'outside' THEN
    RETURN 'Thu ngoài đợt';
  ELSIF v_key = 'adjustment' THEN
    RETURN 'Phát sinh hợp đồng';
  END IF;

  RETURN COALESCE(NULLIF(p_default, ''), NULLIF(p_stage, ''), 'Thanh toán hợp đồng');
END;
```

---

## payment_stage_key_v2

`payment_stage_key_v2(p_stage text)` → `text` · SECURITY INVOKER · plpgsql · IMMUTABLE

```sql
DECLARE
  v_raw text := btrim(COALESCE(p_stage, ''));
  v_key text;
BEGIN
  IF v_raw = '' THEN
    RETURN NULL;
  END IF;

  -- Preserve support for two common legacy encodings of đ/Đ without storing
  -- mojibake literals in the migration source.
  v_raw := replace(v_raw, chr(196) || chr(8216), 'đ');
  v_raw := replace(v_raw, chr(196) || chr(144), 'Đ');
  v_raw := lower(v_raw);

  v_key := translate(
    v_raw,
    'áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ',
    'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd'
  );
  v_key := regexp_replace(v_key, '[^a-z0-9]+', '_', 'g');
  v_key := regexp_replace(v_key, '^_+|_+$', '', 'g');

  IF v_key IN ('dat_coc', 'coc', 'tien_coc', 'deposit', 'contract_deposit')
     OR v_key LIKE '%coc%' THEN
    RETURN 'deposit';
  END IF;

  IF v_key IN ('thanh_toan_dot_1', 'dot_1', 'lan_1', 'first', 'installment_1', 'stage_1')
     OR v_key LIKE '%dot_1%'
     OR v_key LIKE '%lan_1%' THEN
    RETURN 'installment_1';
  END IF;

  IF v_key IN ('thanh_toan_dot_2', 'dot_2', 'lan_2', 'second', 'installment_2', 'stage_2')
     OR v_key LIKE '%dot_2%'
     OR v_key LIKE '%lan_2%' THEN
    RETURN 'installment_2';
  END IF;

  IF v_key IN ('tat_toan', 'final', 'remaining', 'thanh_toan_het', 'thanh_toan_con_lai', 'con_lai')
     OR v_key LIKE '%tat_toan%'
     OR v_key LIKE '%thanh_toan_het%'
     OR v_key LIKE '%con_lai%' THEN
    RETURN 'final';
  END IF;

  IF v_key IN ('outside', 'thu_ngoai_dot', 'ngoai_dot', 'thu_khong_theo_dot', 'thanh_toan_khac', 'custom')
     OR v_key LIKE '%ngoai_dot%'
     OR v_key LIKE '%khong_theo_dot%' THEN
    RETURN 'outside';
  END IF;

  IF v_key IN ('phat_sinh', 'adjustment', 'contract_adjustment')
     OR v_key LIKE '%phat_sinh%'
     OR v_key LIKE '%adjustment%' THEN
    RETURN 'adjustment';
  END IF;

  RETURN v_key;
END;
```

---

## printing_integrity_report

`printing_integrity_report()` → `TABLE(check_name text, issue_count bigint)` · **SECURITY DEFINER — bỏ qua RLS** · sql · STABLE

```sql
WITH alloc AS (
    SELECT a.target_type, a.target_id, SUM(a.amount) AS allocated
    FROM public.expense_allocations a JOIN public.expenses e ON e.id = a.expense_id WHERE e.deleted_at IS NULL
    GROUP BY a.target_type, a.target_id
  )
  SELECT 'legacy_accrual_expense_active'::text, COUNT(*)::bigint FROM public.expenses
   WHERE deleted_at IS NULL AND (printing_order_id IS NOT NULL OR work_task_id IS NOT NULL OR description LIKE '[Auto-Print]%' OR description LIKE '[Auto-Vendor]%')
  UNION ALL
  SELECT 'order_overallocated', COUNT(*)::bigint FROM public.printing_orders po JOIN alloc al ON al.target_type = 'printing_order' AND al.target_id = po.id
   WHERE po.deleted_at IS NULL AND al.allocated - 0.01 > COALESCE(po.total_amount, 0)
  UNION ALL
  SELECT 'payment_status_mismatch', COUNT(*)::bigint FROM public.printing_orders po LEFT JOIN alloc al ON al.target_type = 'printing_order' AND al.target_id = po.id
   WHERE po.deleted_at IS NULL AND COALESCE(po.status,'') NOT IN ('huy_don','da_huy') AND COALESCE(po.total_amount, 0) > 0
     AND ((po.payment_status = 'da_thanh_toan' AND COALESCE(po.total_amount,0) - COALESCE(al.allocated,0) > 0.01)
       OR (po.payment_status = 'chua_thanh_toan' AND COALESCE(po.total_amount,0) - COALESCE(al.allocated,0) <= 0.01))
  UNION ALL
  SELECT 'allocation_to_missing_target', COUNT(*)::bigint FROM public.expense_allocations a JOIN public.expenses e ON e.id = a.expense_id AND e.deleted_at IS NULL
   WHERE (a.target_type = 'printing_order' AND NOT EXISTS (SELECT 1 FROM public.printing_orders po WHERE po.id = a.target_id))
      OR (a.target_type = 'work_task' AND NOT EXISTS (SELECT 1 FROM public.work_tasks wt WHERE wt.id = a.target_id))
      OR (a.target_type = 'inventory_transaction' AND NOT EXISTS (SELECT 1 FROM public.inventory_transactions t WHERE t.id = a.target_id))
      OR (a.target_type = 'employee_salary' AND NOT EXISTS (SELECT 1 FROM public.employee_salaries s WHERE s.id = a.target_id));
```

---

## process_contract_payment_v2

`process_contract_payment_v2(p_contract_id uuid, p_amount numeric, p_payment_method payment_method_enum, p_payment_date date, p_payment_stage text, p_category_id uuid, p_notes text, p_payment_plan_id uuid, p_update_total boolean, p_created_by uuid)` → `json` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
DECLARE
  v_contract public.contracts%ROWTYPE;
  v_target_plan public.payment_plans%ROWTYPE;
  v_payment_id uuid;
  v_receipt_code text;
  v_adjustment_item_id uuid;
  v_current_remaining numeric;
  v_total numeric;
  v_paid numeric;
  v_remaining numeric;
  v_payment_status text;
  v_stage_key text := public.payment_stage_key_v2(p_payment_stage);
  v_active_plan_count integer := 0;
  v_payment_stage_label text;
BEGIN
  IF p_created_by IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: actor_id is required';
  END IF;

  IF p_contract_id IS NULL THEN
    RAISE EXCEPTION 'Contract id is required';
  END IF;

  IF p_payment_date IS NULL THEN
    RAISE EXCEPTION 'Payment date is required';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than 0';
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
    RAISE EXCEPTION 'Hop dong da huy, khong the thu tien';
  END IF;

  v_current_remaining := GREATEST(
    0,
    COALESCE(v_contract.remaining_amount, COALESCE(v_contract.total_amount, 0) - COALESCE(v_contract.paid_amount, 0))
  );

  IF COALESCE(p_update_total, false) THEN
    IF v_current_remaining > 0 THEN
      RAISE EXCEPTION 'Chi tao phat sinh tang hop dong khi cong no hien tai da tat toan.';
    END IF;

    IF p_notes IS NULL OR length(btrim(p_notes)) < 5 THEN
      RAISE EXCEPTION 'Ly do phat sinh phai co it nhat 5 ky tu.';
    END IF;
  ELSE
    IF p_amount > v_current_remaining + 0.01 THEN
      RAISE EXCEPTION 'So tien thu vuot qua so tien con lai cua hop dong.';
    END IF;

    SELECT COUNT(*)
    INTO v_active_plan_count
    FROM public.payment_plans
    WHERE contract_id = p_contract_id
      AND COALESCE(status, 'pending') NOT IN ('cancelled', 'paid', 'closed');

    IF v_active_plan_count = 0 THEN
      PERFORM public.create_default_payment_schedule_v2(
        p_contract_id,
        COALESCE(v_contract.total_amount, 0),
        0,
        NULL,
        COALESCE(v_contract.contract_date, CURRENT_DATE),
        v_contract.work_date
      );
    END IF;

    IF p_payment_plan_id IS NOT NULL THEN
      SELECT *
      INTO v_target_plan
      FROM public.payment_plans
      WHERE id = p_payment_plan_id
        AND contract_id = p_contract_id
        AND COALESCE(status, 'pending') NOT IN ('cancelled', 'paid', 'closed')
      ORDER BY sort_order, created_at
      LIMIT 1;
    ELSIF v_stage_key = 'outside' THEN
      SELECT *
      INTO v_target_plan
      FROM public.payment_plans
      WHERE contract_id = p_contract_id
        AND stage_key = 'outside'
        AND COALESCE(status, 'pending') <> 'cancelled'
      ORDER BY sort_order, created_at
      LIMIT 1;

      IF NOT FOUND THEN
        INSERT INTO public.payment_plans (
          contract_id, stage_name, stage_key, amount, due_date, status, sort_order
        )
        VALUES (
          p_contract_id,
          'Thu ngoài đợt',
          'outside',
          0,
          p_payment_date,
          'pending',
          90
        )
        RETURNING * INTO v_target_plan;
      END IF;
    ELSIF v_stage_key IS NOT NULL THEN
      SELECT *
      INTO v_target_plan
      FROM public.payment_plans
      WHERE contract_id = p_contract_id
        AND stage_key = v_stage_key
        AND COALESCE(status, 'pending') NOT IN ('cancelled', 'paid', 'closed')
      ORDER BY sort_order, created_at
      LIMIT 1;
    END IF;

    IF v_target_plan.id IS NULL THEN
      SELECT pp.*
      INTO v_target_plan
      FROM public.payment_plans pp
      LEFT JOIN (
        SELECT ppa.payment_plan_id, SUM(ppa.amount) AS paid_amount
        FROM public.payment_plan_allocations ppa
        JOIN public.payments p ON p.id = ppa.payment_id AND p.deleted_at IS NULL
        WHERE ppa.contract_id = p_contract_id
        GROUP BY ppa.payment_plan_id
      ) s ON s.payment_plan_id = pp.id
      WHERE pp.contract_id = p_contract_id
        AND COALESCE(pp.status, 'pending') NOT IN ('cancelled', 'paid', 'closed')
      ORDER BY
        CASE WHEN COALESCE(s.paid_amount, 0) <= 0 THEN 0 ELSE 1 END,
        pp.sort_order,
        pp.created_at
      LIMIT 1;
    END IF;

    IF v_target_plan.id IS NULL THEN
      RAISE EXCEPTION 'Hop dong chua co stage thanh toan dang mo. Hay repair payment_plans truoc khi thu.';
    END IF;
  END IF;

  v_payment_id := gen_random_uuid();
  v_receipt_code := public.contract_payment_receipt_code(v_payment_id, p_payment_date);

  IF COALESCE(p_update_total, false) THEN
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
      left('Phat sinh: ' || btrim(p_notes), 120),
      1,
      p_amount,
      p_amount,
      0,
      p_amount,
      true,
      'khac'::public.addon_category_enum,
      p_notes,
      p_created_by
    )
    RETURNING id INTO v_adjustment_item_id;
  END IF;

  v_payment_stage_label := CASE
    WHEN COALESCE(p_update_total, false)
      THEN public.payment_stage_display_label_v2(COALESCE(NULLIF(p_payment_stage, ''), 'phat_sinh'), 'Phát sinh hợp đồng')
    ELSE public.payment_stage_display_label_v2(
      COALESCE(NULLIF(p_payment_stage, ''), v_target_plan.stage_key, v_target_plan.stage_name),
      v_target_plan.stage_name
    )
  END;

  INSERT INTO public.payments (
    id,
    contract_id,
    customer_id,
    amount,
    payment_method,
    payment_date,
    payment_stage,
    category_id,
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
    p_amount,
    p_payment_method,
    p_payment_date,
    v_payment_stage_label,
    p_category_id,
    p_notes,
    v_receipt_code,
    p_created_by,
    p_created_by,
    COALESCE(p_update_total, false),
    v_adjustment_item_id
  );

  IF NOT COALESCE(p_update_total, false) THEN
    INSERT INTO public.payment_plan_allocations (
      contract_id,
      payment_plan_id,
      payment_id,
      amount,
      created_by
    )
    VALUES (
      p_contract_id,
      v_target_plan.id,
      v_payment_id,
      p_amount,
      p_created_by
    );

    PERFORM public.sync_payment_plan_statuses_v2(p_contract_id);
  END IF;

  v_total := COALESCE(v_contract.total_amount, 0)
    + CASE WHEN COALESCE(p_update_total, false) THEN p_amount ELSE 0 END;
  v_paid := COALESCE(v_contract.paid_amount, 0) + p_amount;
  v_remaining := GREATEST(0, v_total - v_paid);
  v_payment_status := public.contract_payment_status_v2(v_paid, v_remaining);

  UPDATE public.contracts
  SET total_amount = v_total,
      paid_amount = v_paid,
      remaining_amount = v_remaining,
      payment_status = v_payment_status,
      updated_by = p_created_by,
      updated_at = now()
  WHERE id = p_contract_id;

  RETURN json_build_object(
    'payment_id', v_payment_id,
    'receipt_code', v_receipt_code,
    'adjustment_item_id', v_adjustment_item_id,
    'new_total', v_total,
    'new_paid', v_paid,
    'new_remaining', v_remaining,
    'payment_status', v_payment_status,
    'payment_plan_id', CASE WHEN COALESCE(p_update_total, false) THEN NULL ELSE v_target_plan.id END
  );
END;
```

---

## recompute_printing_payment_status

`recompute_printing_payment_status(p_order_id uuid)` → `void` · SECURITY INVOKER · plpgsql · VOLATILE

```sql
BEGIN
  UPDATE public.printing_orders po
  SET payment_status = CASE
        WHEN COALESCE(po.total_amount,0) - COALESCE((
          SELECT SUM(a.amount) FROM public.expense_allocations a JOIN public.expenses e ON e.id = a.expense_id
          WHERE a.target_type = 'printing_order' AND a.target_id = po.id AND e.deleted_at IS NULL), 0) <= 0.01
        THEN 'da_thanh_toan' ELSE 'chua_thanh_toan' END,
      updated_at = now()
  WHERE po.id = p_order_id AND po.deleted_at IS NULL;
END
```

---

## record_lab_payment_atomic

`record_lab_payment_atomic(p_lab_id uuid, p_amount numeric, p_payment_method text, p_note text, p_allocations jsonb, p_actor_id uuid, p_payment_date date)` → `jsonb` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
DECLARE v jsonb; v_alloc jsonb := COALESCE(p_allocations, '[]'::jsonb); v_mapped jsonb;
BEGIN
  IF jsonb_typeof(v_alloc) = 'string' THEN v_alloc := (v_alloc #>> '{}')::jsonb; END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('target_id', x->>'printing_order_id', 'amount', x->>'amount')), '[]'::jsonb)
  INTO v_mapped FROM jsonb_array_elements(CASE WHEN jsonb_typeof(v_alloc) = 'array' THEN v_alloc ELSE '[]'::jsonb END) x;
  v := public.record_payee_payment_atomic('lab', p_lab_id, p_amount, p_payment_method, p_payment_date, p_note, v_mapped, p_actor_id);
  RETURN v || jsonb_build_object('payment_id', v->>'expense_id');
END
```

---

## record_payee_payment_atomic

`record_payee_payment_atomic(p_payee_type text, p_payee_id uuid, p_amount numeric, p_payment_method text, p_payment_date date, p_note text, p_allocations jsonb, p_actor_id uuid)` → `jsonb` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
DECLARE
  v_expense_id uuid; v_category_id uuid; v_recipient text; v_target_type text; v_alloc_type text;
  v_allocations jsonb := COALESCE(p_allocations, '[]'::jsonb); v_alloc jsonb;
  v_target_id uuid; v_amount numeric; v_alloc_total numeric := 0; v_remaining_payment numeric; v_remaining numeric;
  v_date date := COALESCE(p_payment_date, CURRENT_DATE); v_method public.payment_method_enum; r record;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'So tien thanh toan phai lon hon 0'; END IF;
  IF public.is_period_locked(v_date) THEN RAISE EXCEPTION 'Ky ke toan da khoa'; END IF;
  -- supabase-js có nơi gửi JSON.stringify(array) → jsonb kiểu string: tự parse
  IF jsonb_typeof(v_allocations) = 'string' THEN v_allocations := (v_allocations #>> '{}')::jsonb; END IF;
  v_method := (CASE WHEN p_payment_method IN ('tien_mat','cash') THEN 'tien_mat' ELSE 'chuyen_khoan' END)::public.payment_method_enum;

  IF p_payee_type = 'lab' THEN
    SELECT lab_name INTO v_recipient FROM public.labs WHERE id = p_payee_id AND deleted_at IS NULL;
    v_category_id := public.resolve_printing_expense_category_id(); v_target_type := 'printing_order';
  ELSIF p_payee_type = 'vendor' THEN
    SELECT full_name INTO v_recipient FROM public.vendors WHERE id = p_payee_id AND deleted_at IS NULL AND status = 'active' AND vendor_type = 'tho_ngoai';
    v_category_id := public.resolve_vendor_expense_category_id(); v_target_type := 'work_task';
  ELSIF p_payee_type = 'supplier' THEN
    SELECT full_name INTO v_recipient FROM public.vendors WHERE id = p_payee_id AND deleted_at IS NULL AND vendor_type = 'nha_cung_cap';
    SELECT id INTO v_category_id FROM public.transaction_categories WHERE type = 'chi' AND category_code = 'vat_tu' LIMIT 1; v_target_type := 'inventory_transaction';
  ELSIF p_payee_type = 'employee' THEN
    -- Ekip nội bộ: công theo hợp đồng trả theo từng task; lương cứng trả theo dòng lương tháng (ADR-016 M5)
    SELECT full_name INTO v_recipient FROM public.employees WHERE id = p_payee_id AND deleted_at IS NULL AND status = 'active';
    SELECT id INTO v_category_id FROM public.transaction_categories WHERE type = 'chi' AND name = 'Chi lương nhân viên' LIMIT 1; v_target_type := 'work_task';
  ELSE
    RAISE EXCEPTION 'payee_type % chua ho tro', p_payee_type;
  END IF;
  IF v_recipient IS NULL THEN RAISE EXCEPTION 'Doi tac khong hop le'; END IF;

  INSERT INTO public.expenses (expense_date, payment_method, category_id, amount, description, recipient, payee_type, payee_id, approved_by, created_by, created_at, updated_at)
  VALUES (v_date, v_method, v_category_id, p_amount, COALESCE(NULLIF(BTRIM(COALESCE(p_note,'')),''), 'Thanh toán ' || v_recipient), v_recipient, p_payee_type, p_payee_id, p_actor_id, p_actor_id, now(), now())
  RETURNING id INTO v_expense_id;

  IF jsonb_typeof(v_allocations) = 'array' AND jsonb_array_length(v_allocations) > 0 THEN
    FOR v_alloc IN SELECT value FROM jsonb_array_elements(v_allocations) LOOP
      v_target_id := NULLIF(v_alloc->>'target_id','')::uuid;
      v_amount := COALESCE(NULLIF(v_alloc->>'amount','')::numeric, 0);
      -- employee: target là dòng lương (employee_salaries.id) → 'employee_salary', còn lại là task
      v_alloc_type := CASE
        WHEN p_payee_type = 'employee' AND EXISTS (SELECT 1 FROM public.employee_salaries s WHERE s.id = v_target_id AND s.employee_id = p_payee_id) THEN 'employee_salary'
        ELSE v_target_type END;
      v_remaining := public.payable_remaining(v_alloc_type, v_target_id, p_payee_id);
      IF v_remaining IS NULL THEN RAISE EXCEPTION 'Khoan phai tra khong hop le'; END IF;
      IF v_amount <= 0 OR v_amount > v_remaining + 0.01 THEN RAISE EXCEPTION 'So tien phan bo khong hop le (con %)', v_remaining; END IF;
      INSERT INTO public.expense_allocations (expense_id, target_type, target_id, amount, created_by) VALUES (v_expense_id, v_alloc_type, v_target_id, v_amount, p_actor_id);
      v_alloc_total := v_alloc_total + v_amount;
    END LOOP;
  ELSE
    v_remaining_payment := p_amount;
    FOR r IN SELECT * FROM public.payable_items(p_payee_type, p_payee_id) LOOP
      EXIT WHEN v_remaining_payment <= 0.01;
      IF r.remaining > 0 THEN
        v_amount := LEAST(r.remaining, v_remaining_payment);
        INSERT INTO public.expense_allocations (expense_id, target_type, target_id, amount, created_by) VALUES (v_expense_id, r.target_type, r.target_id, v_amount, p_actor_id);
        v_alloc_total := v_alloc_total + v_amount;
        v_remaining_payment := v_remaining_payment - v_amount;
      END IF;
    END LOOP;
    IF v_remaining_payment > 0.01 THEN RAISE EXCEPTION 'So tien thanh toan lon hon cong no con lai'; END IF;
  END IF;
  IF abs(v_alloc_total - p_amount) > 0.01 THEN RAISE EXCEPTION 'Tong phan bo khong khop so tien thanh toan'; END IF;

  IF v_target_type = 'printing_order' THEN
    PERFORM public.recompute_printing_payment_status(a.target_id) FROM public.expense_allocations a WHERE a.expense_id = v_expense_id;
  END IF;
  PERFORM public.sync_employee_salary_paid(a.target_id)
  FROM public.expense_allocations a WHERE a.expense_id = v_expense_id AND a.target_type = 'employee_salary';
  RETURN jsonb_build_object('expense_id', v_expense_id, 'allocated_amount', v_alloc_total);
END
```

---

## resolve_printing_expense_category_id

`resolve_printing_expense_category_id()` → `uuid` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
DECLARE
  v_category_id uuid;
BEGIN
  SELECT NULLIF(value, '')::uuid
  INTO v_category_id
  FROM public.system_settings
  WHERE key = 'printing_expense_category_id'
    AND value ~* '^[0-9a-f-]{36}$'
  LIMIT 1;

  IF v_category_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.transaction_categories WHERE id = v_category_id AND type = 'chi') THEN
    RETURN v_category_id;
  END IF;

  SELECT id
  INTO v_category_id
  FROM public.transaction_categories
  WHERE type = 'chi'
    AND category_code IN ('printing', 'in_an')
  ORDER BY CASE WHEN category_code = 'printing' THEN 0 ELSE 1 END, created_at
  LIMIT 1;

  RETURN v_category_id;
END;
```

---

## restore_inventory_on_receipt_void

`restore_inventory_on_receipt_void()` → `trigger` · SECURITY INVOKER · plpgsql · VOLATILE

```sql
BEGIN
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    PERFORM public.restore_inventory_from_transaction(
      'retail_sale',
      NEW.id,
      'Hoan kho do huy phieu ban vat tu',
      COALESCE(NEW.updated_by, NEW.created_by)
    );
  END IF;

  RETURN NEW;
END;
```

---

## run_integrity_scan

`run_integrity_scan()` → `void` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
DECLARE
    v_total_critical INT := 0;
    v_total_warnings INT := 0;
    v_total_info INT := 0;
    v_total_issues INT := 0;
    v_checks JSONB := '[]'::jsonb;
    v_ghost_count INT;
    v_ghost_items JSONB;
    v_health RECORD;
    v_severity TEXT;
BEGIN
    DELETE FROM public.integrity_reports
    WHERE created_at < NOW() - INTERVAL '90 days';

    WITH ghost_payments AS (
        SELECT id, contract_id
        FROM public.payment_plans
        WHERE COALESCE(status, '') IN ('paid', 'Da thu', 'Đã thu')
          AND receipt_id IS NULL
    ),
    counted AS (
        SELECT COUNT(*) as cnt FROM ghost_payments
    ),
    sampled AS (
        SELECT jsonb_agg(jsonb_build_object('id', id, 'contract_id', contract_id)) as items
        FROM (SELECT id, contract_id FROM ghost_payments LIMIT 10) sub
    )
    SELECT c.cnt, COALESCE(s.items, '[]'::jsonb)
    INTO v_ghost_count, v_ghost_items
    FROM counted c CROSS JOIN sampled s;

    IF v_ghost_count > 0 THEN
        v_total_critical := v_total_critical + v_ghost_count;
        v_checks := v_checks || jsonb_build_object(
            'check_name', 'ghost_payments',
            'severity', 'CRITICAL',
            'issue_count', v_ghost_count,
            'details', 'Payment plans are paid but missing receipt_id',
            'sample_items', v_ghost_items
        );
    END IF;

    FOR v_health IN
      SELECT check_name, issue_count
      FROM public.contract_payment_health_checks()
      WHERE issue_count > 0
    LOOP
      v_severity := CASE
        WHEN v_health.check_name IN (
          'overpaid_contracts',
          'contract_payments_pending_after_debt_update',
          'contract_payment_sum_mismatch'
        ) THEN 'CRITICAL'
        ELSE 'WARNING'
      END;

      IF v_severity = 'CRITICAL' THEN
        v_total_critical := v_total_critical + v_health.issue_count::int;
      ELSE
        v_total_warnings := v_total_warnings + v_health.issue_count::int;
      END IF;

      v_checks := v_checks || jsonb_build_object(
        'check_name', v_health.check_name,
        'severity', v_severity,
        'issue_count', v_health.issue_count,
        'details', 'Contract payment health check'
      );
    END LOOP;

    v_total_issues := v_total_critical + v_total_warnings + v_total_info;

    INSERT INTO public.integrity_reports (
        scan_date,
        status,
        checks,
        total_issues,
        warning_count,
        info_count,
        created_at
    ) VALUES (
        CURRENT_DATE,
        CASE WHEN v_total_critical > 0 THEN 'failed'
             WHEN v_total_warnings > 0 THEN 'warning'
             ELSE 'passed' END,
        v_checks,
        v_total_issues,
        v_total_warnings,
        v_total_info,
        NOW()
    );
END;
```

---

## sync_employee_salary_paid

`sync_employee_salary_paid(p_salary_id uuid)` → `void` · SECURITY INVOKER · sql · VOLATILE

```sql
UPDATE public.employee_salaries s
  SET paid_amount = x.alloc,
      remaining_amount = GREATEST(COALESCE(s.net_salary, 0) - x.alloc, 0),
      updated_at = now()
  FROM (
    SELECT COALESCE(SUM(a.amount), 0)::numeric AS alloc
    FROM public.expense_allocations a JOIN public.expenses e ON e.id = a.expense_id
    WHERE a.target_type = 'employee_salary' AND a.target_id = p_salary_id AND e.deleted_at IS NULL
  ) x
  WHERE s.id = p_salary_id;
```

---

## sync_payment_plan_statuses_v2

`sync_payment_plan_statuses_v2(p_contract_id uuid)` → `void` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
BEGIN
  WITH plan_sums AS (
    SELECT
      pp.id AS payment_plan_id,
      COALESCE(SUM(ppa.amount) FILTER (WHERE p.deleted_at IS NULL), 0) AS paid_amount,
      (
        SELECT ppa2.payment_id
        FROM public.payment_plan_allocations ppa2
        JOIN public.payments p2 ON p2.id = ppa2.payment_id AND p2.deleted_at IS NULL
        WHERE ppa2.payment_plan_id = pp.id
        ORDER BY p2.payment_date DESC, p2.created_at DESC
        LIMIT 1
      ) AS latest_payment_id
    FROM public.payment_plans pp
    LEFT JOIN public.payment_plan_allocations ppa ON ppa.payment_plan_id = pp.id
    LEFT JOIN public.payments p ON p.id = ppa.payment_id
    WHERE pp.contract_id = p_contract_id
    GROUP BY pp.id
  )
  UPDATE public.payment_plans pp
  SET status = CASE
        WHEN COALESCE(pp.status, 'pending') = 'cancelled' THEN 'cancelled'
        WHEN COALESCE(ps.paid_amount, 0) <= 0 THEN 'pending'
        WHEN COALESCE(pp.amount, 0) > 0
          AND COALESCE(ps.paid_amount, 0) + 0.01 >= COALESCE(pp.amount, 0)
          THEN 'paid'
        ELSE 'partial'
      END,
      receipt_id = CASE
        WHEN COALESCE(pp.status, 'pending') = 'cancelled' THEN pp.receipt_id
        WHEN COALESCE(pp.amount, 0) > 0
          AND COALESCE(ps.paid_amount, 0) + 0.01 >= COALESCE(pp.amount, 0)
          THEN ps.latest_payment_id
        ELSE NULL
      END
  FROM plan_sums ps
  WHERE pp.id = ps.payment_plan_id
    AND pp.contract_id = p_contract_id;
END;
```

---

## undo_contribution_atomic

`undo_contribution_atomic(p_contribution_id uuid)` → `json` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
DECLARE
  v_contrib RECORD;
  v_goal RECORD;
  v_new_amount NUMERIC;
BEGIN
  -- Step 1: Fetch the contribution
  SELECT id, goal_id, amount, created_at
  INTO v_contrib
  FROM goal_contributions
  WHERE id = p_contribution_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy khoản đóng góp.';
  END IF;

  -- Step 2: Check 24h window
  IF extract(epoch FROM (now() - v_contrib.created_at)) > 86400 THEN
    RAISE EXCEPTION 'Đã quá 24 giờ, không thể hoàn tác khoản đóng góp này.';
  END IF;

  -- Step 3: Lock and fetch goal
  SELECT id, current_amount, target_amount, status
  INTO v_goal
  FROM financial_goals
  WHERE id = v_contrib.goal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy mục tiêu tài chính.';
  END IF;

  -- Step 4: Delete the contribution
  DELETE FROM goal_contributions
  WHERE id = p_contribution_id;

  -- Step 5: Decrement goal amount (never below 0)
  v_new_amount := GREATEST(0, v_goal.current_amount - v_contrib.amount);

  UPDATE financial_goals
  SET current_amount = v_new_amount,
      updated_at = NOW()
  WHERE id = v_goal.id;

  -- Step 6: Auto-revert status if was completed but now below target
  IF v_goal.status = 'completed' AND v_new_amount < v_goal.target_amount THEN
    UPDATE financial_goals
    SET status = 'active',
        updated_at = NOW()
    WHERE id = v_goal.id;
  END IF;

  RETURN json_build_object(
    'goal_id', v_goal.id,
    'removed_amount', v_contrib.amount,
    'new_current_amount', v_new_amount,
    'status_reverted', (v_goal.status = 'completed' AND v_new_amount < v_goal.target_amount)
  );
END;
```

---

## void_contract_payment_v2

`void_contract_payment_v2(p_payment_id uuid, p_reason text, p_actor_id uuid)` → `json` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
DECLARE
  v_payment public.payments%ROWTYPE;
  v_contract public.contracts%ROWTYPE;
  v_total numeric;
  v_paid numeric;
  v_remaining numeric;
  v_payment_status text;
  v_restored_plans integer := 0;
  v_voided_adjustment_item_id uuid := NULL;
BEGIN
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: actor_id is required';
  END IF;

  IF p_payment_id IS NULL THEN
    RAISE EXCEPTION 'Payment id is required';
  END IF;

  IF p_reason IS NULL OR length(btrim(p_reason)) < 5 THEN
    RAISE EXCEPTION 'Ly do huy phieu thu phai co it nhat 5 ky tu';
  END IF;

  SELECT *
  INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
    AND deleted_at IS NULL
    AND contract_id IS NOT NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Khong tim thay phieu thu hop dong hoac phieu da bi huy';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.finance_monthly_closes
    WHERE period = to_char(v_payment.payment_date, 'YYYY-MM')
      AND status = 'locked'
  ) THEN
    RAISE EXCEPTION 'Ky nay da chot so, khong the huy phieu thu.';
  END IF;

  SELECT *
  INTO v_contract
  FROM public.contracts
  WHERE id = v_payment.contract_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Khong tim thay hop dong cua phieu thu';
  END IF;

  UPDATE public.payments
  SET deleted_at = now(),
      voided_at = now(),
      voided_by = p_actor_id,
      void_reason = btrim(p_reason),
      updated_at = now()
  WHERE id = p_payment_id;

  IF COALESCE(v_payment.is_contract_adjustment, false)
    AND v_payment.contract_adjustment_item_id IS NOT NULL THEN
    UPDATE public.contract_items
    SET deleted_at = now(),
        updated_at = now()
    WHERE id = v_payment.contract_adjustment_item_id
      AND contract_id = v_payment.contract_id
      AND deleted_at IS NULL
    RETURNING id INTO v_voided_adjustment_item_id;
  END IF;

  DELETE FROM public.payment_plan_allocations
  WHERE payment_id = p_payment_id
    AND contract_id = v_payment.contract_id;

  GET DIAGNOSTICS v_restored_plans = ROW_COUNT;

  PERFORM public.sync_payment_plan_statuses_v2(v_payment.contract_id);

  v_total := CASE
    WHEN COALESCE(v_payment.is_contract_adjustment, false)
      THEN GREATEST(0, COALESCE(v_contract.total_amount, 0) - COALESCE(v_payment.amount, 0))
    ELSE COALESCE(v_contract.total_amount, 0)
  END;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_paid
  FROM public.payments
  WHERE contract_id = v_payment.contract_id
    AND deleted_at IS NULL;

  v_remaining := GREATEST(0, v_total - v_paid);
  v_payment_status := public.contract_payment_status_v2(v_paid, v_remaining);

  UPDATE public.contracts
  SET total_amount = v_total,
      paid_amount = v_paid,
      remaining_amount = v_remaining,
      payment_status = v_payment_status,
      updated_by = p_actor_id,
      updated_at = now()
  WHERE id = v_payment.contract_id;

  RETURN json_build_object(
    'payment_id', p_payment_id,
    'contract_id', v_payment.contract_id,
    'voided_amount', v_payment.amount,
    'voided_adjustment_item_id', v_voided_adjustment_item_id,
    'restored_payment_plans', v_restored_plans,
    'new_total', v_total,
    'new_paid', v_paid,
    'new_remaining', v_remaining,
    'payment_status', v_payment_status
  );
END;
```

---

## void_payee_payment_atomic

`void_payee_payment_atomic(p_expense_id uuid, p_actor_id uuid)` → `jsonb` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
DECLARE
  v_exp record;
BEGIN
  SELECT id, payee_type, payee_id, amount, expense_date, deleted_at
  INTO v_exp
  FROM public.expenses WHERE id = p_expense_id FOR UPDATE;

  IF v_exp.id IS NULL THEN RAISE EXCEPTION 'Khong tim thay phieu chi'; END IF;
  IF v_exp.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'Phieu chi da bi huy truoc do'; END IF;
  IF v_exp.payee_type NOT IN ('lab', 'vendor', 'supplier', 'employee') THEN RAISE EXCEPTION 'Chi huy duoc phieu chi tra doi tac (lab / tho ngoai / NCC / ekip)'; END IF;
  IF public.is_period_locked(v_exp.expense_date) THEN RAISE EXCEPTION 'Ky ke toan da khoa'; END IF;

  UPDATE public.expenses SET deleted_at = now(), updated_at = now() WHERE id = p_expense_id;

  PERFORM public.recompute_printing_payment_status(a.target_id)
  FROM public.expense_allocations a WHERE a.expense_id = p_expense_id AND a.target_type = 'printing_order';
  PERFORM public.sync_employee_salary_paid(a.target_id)
  FROM public.expense_allocations a WHERE a.expense_id = p_expense_id AND a.target_type = 'employee_salary';

  RETURN jsonb_build_object('expense_id', v_exp.id, 'payee_type', v_exp.payee_type, 'payee_id', v_exp.payee_id, 'amount', v_exp.amount, 'voided_by', p_actor_id);
END
```
