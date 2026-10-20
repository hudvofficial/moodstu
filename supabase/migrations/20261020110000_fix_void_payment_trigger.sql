-- T-20261020-fix-void-payment — huỷ phiếu thu hợp đồng chạy được.
-- Trigger trg_restore_inventory_on_contract_payment_void (payments) gọi hàm này; hàm đọc NEW.updated_by nhưng bảng payments
-- KHÔNG có cột updated_by -> void_contract_payment_v2 văng 'record "new" has no field "updated_by"' ở mọi lần huỷ (0/72 phiếu từng huỷ được).
-- Sinh từ thân hàm SỐNG ngày 20/10/2026; thay đổi DUY NHẤT: bỏ NEW.updated_by khỏi COALESCE. Chữ ký, search_path, điều kiện IF giữ nguyên.
-- (migrate-direct.mjs tự bọc BEGIN/COMMIT) Revert: agent/HANDOFFS/T-20261020-fix-void-payment.revert.sql
-- Spec: agent/HANDOFFS/T-20261020-fix-void-payment.spec.md

CREATE OR REPLACE FUNCTION public.restore_inventory_on_contract_payment_void()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    PERFORM public.restore_inventory_from_transaction(
      'contract_addon_sale',
      NEW.id,
      'Hoan kho do huy phieu ban them hop dong',
      COALESCE(NEW.voided_by, NEW.created_by)
    );
  END IF;

  RETURN NEW;
END;
$function$;
