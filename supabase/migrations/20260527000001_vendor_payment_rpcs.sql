-- =====================================================
-- Migration: Vendor Payment Atomic RPCs
-- Date: 2026-05-27
-- Description: Create stored procedures for vendor payment operations
-- Pattern: Based on lab_payments RPCs
-- =====================================================

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.finance_vendor_debt_summary();
DROP FUNCTION IF EXISTS public.record_vendor_payment_atomic(uuid, numeric, text, text, jsonb, uuid);

-- =====================================================
-- RPC: finance_vendor_debt_summary
-- Description: Returns vendors with outstanding debt (unpaid work_tasks)
-- =====================================================
CREATE OR REPLACE FUNCTION public.finance_vendor_debt_summary()
RETURNS TABLE (
  vendor_id uuid,
  vendor_name text,
  vendor_phone text,
  service_type text,
  task_count bigint,
  total_cost numeric,
  total_paid numeric,
  remaining numeric,
  last_task_date date,
  last_payment_date date
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Calculate allocated amounts per work_task
  WITH allocation_totals AS (
    SELECT
      work_task_id,
      COALESCE(SUM(amount), 0)::numeric AS allocated
    FROM public.vendor_payment_allocations
    GROUP BY work_task_id
  ),
  -- Calculate remaining balance per work_task
  task_balances AS (
    SELECT
      wt.id,
      wt.vendor_id,
      wt.deadline,
      wt.cost AS total_cost,
      COALESCE(at.allocated, 0)::numeric AS allocated,
      GREATEST(COALESCE(wt.cost, 0) - COALESCE(at.allocated, 0), 0)::numeric AS remaining
    FROM public.work_tasks wt
    LEFT JOIN allocation_totals at ON at.work_task_id = wt.id
    WHERE wt.vendor_id IS NOT NULL
      AND wt.status = 'hoan_thanh'
      AND wt.cost > 0
  ),
  -- Aggregate by vendor
  vendor_balances AS (
    SELECT
      tb.vendor_id,
      COUNT(tb.id)::bigint AS task_count,
      COALESCE(SUM(tb.total_cost), 0)::numeric AS total_cost,
      COALESCE(SUM(tb.allocated), 0)::numeric AS total_paid,
      COALESCE(SUM(tb.remaining), 0)::numeric AS remaining,
      MAX(tb.deadline)::date AS last_task_date
    FROM task_balances tb
    GROUP BY tb.vendor_id
    HAVING COALESCE(SUM(tb.remaining), 0) > 0
  ),
  -- Get last payment date per vendor
  last_payments AS (
    SELECT
      vendor_id,
      MAX(payment_date)::date AS last_payment_date
    FROM public.vendor_payments
    WHERE deleted_at IS NULL
    GROUP BY vendor_id
  )
  -- Join with vendors table and return final result
  SELECT
    v.id AS vendor_id,
    v.full_name::text AS vendor_name,
    v.phone::text AS vendor_phone,
    v.service_type::text AS service_type,
    vb.task_count,
    vb.total_cost,
    vb.total_paid,
    vb.remaining,
    vb.last_task_date,
    lp.last_payment_date
  FROM vendor_balances vb
  INNER JOIN public.vendors v ON v.id = vb.vendor_id
  LEFT JOIN last_payments lp ON lp.vendor_id = v.id
  WHERE v.deleted_at IS NULL
    AND v.status = 'active'
  ORDER BY vb.remaining DESC, vb.last_task_date ASC;
$$;

-- =====================================================
-- RPC: record_vendor_payment_atomic
-- Description: Record a vendor payment with automatic or manual allocation to work_tasks
-- Parameters:
--   p_vendor_id: Vendor receiving the payment
--   p_amount: Total payment amount
--   p_payment_method: Payment method (tien_mat, chuyen_khoan, etc.)
--   p_payment_date: Date of payment
--   p_note: Optional payment note
--   p_allocations: JSONB array of manual allocations [{ work_task_id, amount }]
--                  If NULL or empty, uses FIFO (oldest tasks first)
--   p_actor_id: User making the payment
-- Returns: JSONB with payment_id and allocated_amount
-- =====================================================
CREATE OR REPLACE FUNCTION public.record_vendor_payment_atomic(
  p_vendor_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_payment_date date,
  p_note text,
  p_allocations jsonb,
  p_actor_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_id uuid;
  v_allocations jsonb := COALESCE(p_allocations, '[]'::jsonb);
  v_allocation jsonb;
  v_task public.work_tasks%ROWTYPE;
  v_existing_alloc numeric;
  v_remaining numeric;
  v_alloc_total numeric := 0;
  v_remaining_payment numeric;
  v_task_id uuid;
  v_alloc_amount numeric;
BEGIN
  -- Validate amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Số tiền thanh toán phải lớn hơn 0';
  END IF;

  -- Validate vendor exists
  IF NOT EXISTS (
    SELECT 1 FROM public.vendors
    WHERE id = p_vendor_id
      AND deleted_at IS NULL
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Vendor không hợp lệ hoặc không còn hoạt động';
  END IF;

  -- Create payment record
  INSERT INTO public.vendor_payments(
    vendor_id,
    amount,
    payment_method,
    payment_date,
    note,
    created_by,
    created_at
  )
  VALUES (
    p_vendor_id,
    p_amount,
    COALESCE(NULLIF(p_payment_method, ''), 'chuyen_khoan'),
    COALESCE(p_payment_date, CURRENT_DATE),
    NULLIF(p_note, ''),
    p_actor_id,
    NOW()
  )
  RETURNING id INTO v_payment_id;

  -- Manual allocation mode (if allocations array provided)
  IF jsonb_typeof(v_allocations) = 'array' AND jsonb_array_length(v_allocations) > 0 THEN
    FOR v_allocation IN SELECT value FROM jsonb_array_elements(v_allocations)
    LOOP
      v_task_id := NULLIF(v_allocation->>'work_task_id', '')::uuid;
      v_alloc_amount := COALESCE(NULLIF(v_allocation->>'amount', '')::numeric, 0);

      -- Fetch and lock the work_task
      SELECT *
      INTO v_task
      FROM public.work_tasks
      WHERE id = v_task_id
        AND vendor_id = p_vendor_id
        AND status = 'hoan_thanh'
        AND cost > 0
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Task không hợp lệ hoặc chưa hoàn thành';
      END IF;

      -- Calculate existing allocation for this task
      SELECT COALESCE(SUM(amount), 0)
      INTO v_existing_alloc
      FROM public.vendor_payment_allocations
      WHERE work_task_id = v_task_id;

      -- Calculate remaining amount to pay
      v_remaining := GREATEST(COALESCE(v_task.cost, 0) - COALESCE(v_existing_alloc, 0), 0);

      -- Validate allocation amount
      IF v_alloc_amount <= 0 OR v_alloc_amount > v_remaining THEN
        RAISE EXCEPTION 'Số tiền phân bổ không hợp lệ cho task %', v_task_id;
      END IF;

      -- Insert allocation
      INSERT INTO public.vendor_payment_allocations(
        payment_id,
        work_task_id,
        amount,
        created_by
      )
      VALUES (v_payment_id, v_task_id, v_alloc_amount, p_actor_id);

      v_alloc_total := v_alloc_total + v_alloc_amount;
    END LOOP;

    -- Validate total allocation doesn't exceed payment
    IF v_alloc_total > p_amount THEN
      RAISE EXCEPTION 'Tổng phân bổ vượt quá số tiền thanh toán';
    END IF;

  -- FIFO allocation mode (auto-allocate to oldest unpaid tasks)
  ELSE
    v_remaining_payment := p_amount;

    -- Loop through unpaid tasks (oldest first by deadline)
    FOR v_task IN
      SELECT *
      FROM public.work_tasks
      WHERE vendor_id = p_vendor_id
        AND status = 'hoan_thanh'
        AND cost > 0
      ORDER BY deadline NULLS LAST, created_at NULLS LAST, id
      FOR UPDATE
    LOOP
      -- Calculate existing allocation for this task
      SELECT COALESCE(SUM(amount), 0)
      INTO v_existing_alloc
      FROM public.vendor_payment_allocations
      WHERE work_task_id = v_task.id;

      -- Calculate remaining amount to pay for this task
      v_remaining := GREATEST(COALESCE(v_task.cost, 0) - COALESCE(v_existing_alloc, 0), 0);

      -- If task has remaining balance and we have payment left
      IF v_remaining > 0 AND v_remaining_payment > 0 THEN
        -- Allocate minimum of (task remaining, payment remaining)
        v_alloc_amount := LEAST(v_remaining, v_remaining_payment);

        -- Insert allocation
        INSERT INTO public.vendor_payment_allocations(
          payment_id,
          work_task_id,
          amount,
          created_by
        )
        VALUES (v_payment_id, v_task.id, v_alloc_amount, p_actor_id);

        v_alloc_total := v_alloc_total + v_alloc_amount;
        v_remaining_payment := v_remaining_payment - v_alloc_amount;

        -- Stop if payment fully allocated
        IF v_remaining_payment <= 0 THEN
          EXIT;
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- Return result
  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'allocated_amount', v_alloc_total,
    'unallocated_amount', p_amount - v_alloc_total
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.finance_vendor_debt_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_vendor_payment_atomic(uuid, numeric, text, date, text, jsonb, uuid) TO authenticated;

-- Comments
COMMENT ON FUNCTION public.finance_vendor_debt_summary() IS 'Returns vendors with outstanding debt (completed unpaid work_tasks)';
COMMENT ON FUNCTION public.record_vendor_payment_atomic(uuid, numeric, text, date, text, jsonb, uuid) IS 'Record vendor payment with FIFO or manual allocation to work_tasks';
