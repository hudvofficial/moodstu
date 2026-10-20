-- REVERT T-20261020-fix-recalc-totals: thân hàm SỐNG ngày 20/10/2026 (trước khi sửa).
-- Quay lui = quay về 'recalc luôn lỗi type "payment_status_enum" does not exist'; chỉ dùng để đối chiếu.

-- Thân sống tham chiếu kiểu không tồn tại: PostgreSQL chỉ cho tạo khi tắt kiểm thân hàm (giống pg_dump). SET LOCAL chỉ có hiệu lực trong giao dịch
-- (migrate-direct.mjs tự bọc BEGIN/COMMIT; nếu chạy tay bằng psql phải bọc BEGIN ... COMMIT).
SET LOCAL check_function_bodies = false;

CREATE OR REPLACE FUNCTION public.recalc_contract_totals(p_contract_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;
