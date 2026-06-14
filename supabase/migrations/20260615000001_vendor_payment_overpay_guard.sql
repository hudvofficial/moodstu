-- =====================================================
-- Migration: Vendor Payment Overpay Guard
-- Date: 2026-06-15
-- Description: Prevent vendor payments from exceeding remaining vendor debt
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
  v_total_remaining numeric := 0;
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

  -- Chặn trả dư: số tiền không được vượt tổng công nợ còn lại của vendor
  SELECT COALESCE(SUM(GREATEST(COALESCE(wt.cost, 0) - COALESCE(a.allocated, 0), 0)), 0)
  INTO v_total_remaining
  FROM public.work_tasks wt
  LEFT JOIN (
    SELECT work_task_id, SUM(amount) AS allocated
    FROM public.vendor_payment_allocations
    GROUP BY work_task_id
  ) a ON a.work_task_id = wt.id
  WHERE wt.vendor_id = p_vendor_id
    AND wt.status = 'hoan_thanh'
    AND wt.cost > 0;

  IF p_amount > v_total_remaining THEN
    RAISE EXCEPTION 'Số tiền thanh toán vượt quá công nợ còn lại (còn %)', v_total_remaining;
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

GRANT EXECUTE ON FUNCTION public.record_vendor_payment_atomic(uuid, numeric, text, date, text, jsonb, uuid) TO authenticated;
