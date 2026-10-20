-- T-20261020-fix-recalc-totals — recalc_contract_totals chạy được và tính ĐÚNG.
-- Thân sống khai biến kiểu payment_status_enum (KHÔNG tồn tại trên prod) -> văng lỗi mỗi lần gọi; dress-mutations.ts không kiểm lỗi
-- nên tổng HĐ không bao giờ được tính lại. Chỉ sửa kiểu sẽ làm tổng sai nặng hơn (cộng hạng mục xoá mềm + không trừ giảm giá:
-- HĐ-0046 ra 13,8tr thay vì 6,0tr), nên viết lại theo bất biến total = Σ hạng mục sống − discount_amount, bỏ qua HĐ đã xoá mềm,
-- trạng thái qua contract_payment_status_v2 (nguồn canonical). Giữ chữ ký, SECURITY DEFINER, search_path; ACL không đổi.
-- (migrate-direct.mjs tự bọc BEGIN/COMMIT) Revert: agent/HANDOFFS/T-20261020-fix-recalc-totals.revert.sql
-- Spec: agent/HANDOFFS/T-20261020-fix-recalc-totals.spec.md

CREATE OR REPLACE FUNCTION public.recalc_contract_totals(p_contract_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total numeric;
  v_paid numeric;
  v_remaining numeric;
  v_discount numeric;
BEGIN
  -- Hạng mục SỐNG (bỏ xoá mềm): total_amount = Σ hạng mục − discount_amount (bất biến đo 73/73 HĐ).
  SELECT COALESCE(SUM(total_amount), 0) INTO v_total
  FROM public.contract_items
  WHERE contract_id = p_contract_id AND deleted_at IS NULL;

  SELECT COALESCE(SUM(amount), 0) INTO v_paid
  FROM public.payments
  WHERE contract_id = p_contract_id AND deleted_at IS NULL;

  SELECT COALESCE(discount_amount, 0) INTO v_discount
  FROM public.contracts
  WHERE id = p_contract_id;

  v_total := GREATEST(0, v_total - v_discount);
  v_remaining := GREATEST(0, v_total - v_paid);

  -- HĐ đã xoá mềm: không đụng (xoá cascade đã xoá mềm hết hạng mục -> tổng sẽ về 0 oan).
  UPDATE public.contracts SET
    total_amount = v_total,
    paid_amount = v_paid,
    remaining_amount = v_remaining,
    payment_status = public.contract_payment_status_v2(v_paid, v_remaining),
    updated_at = now()
  WHERE id = p_contract_id AND deleted_at IS NULL;
END;
$function$;
