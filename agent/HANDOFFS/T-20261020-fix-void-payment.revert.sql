-- REVERT T-20261020-fix-void-payment: thân hàm SỐNG ngày 20/10/2026 (trước khi sửa).
-- Quay lui = quay về 'huỷ phiếu thu luôn lỗi' (record "new" has no field "updated_by"); chỉ dùng để đối chiếu.

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
      COALESCE(NEW.voided_by, NEW.updated_by, NEW.created_by)
    );
  END IF;

  RETURN NEW;
END;
$function$;
