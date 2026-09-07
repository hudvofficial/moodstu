-- REVERT #13 (R1) — thân hàm SỐNG dump từ prod 2026-09-07 TRƯỚC khi áp T-20260907-r1-cancel-cascade
-- (bản này ghi da_huy vào printing_orders → CHECK từ chối → huỷ HĐ luôn abort; quay lại chỉ khi cần đối chiếu)

CREATE OR REPLACE FUNCTION public.cancel_contract_cascade(p_contract_id uuid, p_reason text, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  UPDATE public.printing_orders
  SET status = 'da_huy',
      updated_by = p_user_id,
      updated_at = now()
  WHERE contract_id = p_contract_id
    AND deleted_at IS NULL
    AND COALESCE(status, '') NOT IN ('hoan_thanh', 'da_huy');

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
$function$;
