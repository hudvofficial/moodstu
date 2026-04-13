-- ═══════════════════════════════════════════
-- Finance Close Management RPCs
-- v2: Fixed auth.uid() → p_actor_id for service_role compatibility
-- ═══════════════════════════════════════════

-- Drop old function signature (3 params) if exists
DROP FUNCTION IF EXISTS public.advance_close_task(UUID, INT, TEXT);

CREATE OR REPLACE FUNCTION public.advance_close_task(
  p_close_id UUID,
  p_step_number INT,
  p_new_status TEXT,
  p_actor_id UUID
) RETURNS VOID AS $$
DECLARE
  v_prev_status TEXT;
  v_current_status TEXT;
  v_close_status TEXT;
BEGIN
  -- Auth check: p_actor_id is pre-validated by withAdmin server action
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant: chỉ service_role (server actions call), KHÔNG cho anonymous
REVOKE ALL ON FUNCTION public.advance_close_task(UUID, INT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.advance_close_task(UUID, INT, TEXT, UUID) TO service_role;

-- -------------------------------------------------------------
-- RPC: is_period_locked
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_period_locked(p_date DATE)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.finance_monthly_closes
    WHERE period = to_char(p_date, 'YYYY-MM')
    AND status = 'locked'
  );
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

-- Cho phép authenticated users check (dùng trong form validation)
GRANT EXECUTE ON FUNCTION public.is_period_locked TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_period_locked TO service_role;
