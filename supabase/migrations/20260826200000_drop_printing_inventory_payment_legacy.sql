-- T-20260825-printing-cancel-inventory-deadcode / ADR-017 — Phase B
-- Dọn 7 object DB của "phase 1 in ấn" (20260524000001) mà nghiệp vụ đã bỏ ở ADR-014 (không cọc,
-- không kho cho đơn in) và code đã gỡ hết ở Phase A. Đo 2026-08-25 + đo lại 2026-08-26 trước khi áp:
--   inventory_reservations 0 dòng · order_payments 0 dòng · inventory_transactions.reservation_id
--   không NULL = 0 · pg_proc: chỉ 2 hàm sắp drop tham chiếu · pg_depend: 2 view sắp drop phụ thuộc 2 bảng.
-- Thứ tự: view trước bảng, cột FK trước bảng đích. Không đụng cột nào trên printing_orders (spec §6).

DO $$
DECLARE
  v_res    bigint;
  v_pay    bigint;
  v_txn    bigint;
  v_fns    bigint;
BEGIN
  SELECT count(*) INTO v_res FROM public.inventory_reservations;
  SELECT count(*) INTO v_pay FROM public.order_payments;
  SELECT count(*) INTO v_txn FROM public.inventory_transactions WHERE reservation_id IS NOT NULL;
  SELECT count(*) INTO v_fns
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.prokind = 'f'
     AND p.proname NOT IN ('expire_old_reservations', 'check_inventory_conflict')
     AND (pg_get_functiondef(p.oid) ~* 'inventory_reservations|order_payments|order_payment_summary|inventory_available_stock'
          OR (pg_get_functiondef(p.oid) ~* '\mreservation_id\M' AND pg_get_functiondef(p.oid) ~* 'inventory_transactions'));
  IF v_res <> 0 OR v_pay <> 0 OR v_txn <> 0 OR v_fns <> 0 THEN
    RAISE EXCEPTION 'Pre-check M2b-in-an that bai: reservations=% order_payments=% txn_with_reservation=% ham_con_tham_chieu=% — DUNG, hoi Claude',
      v_res, v_pay, v_txn, v_fns;
  END IF;
  RAISE NOTICE 'Pre-check OK: 0 dong, 0 ham ngoai 2 ham sap drop';
END $$;

DROP VIEW IF EXISTS public.order_payment_summary;                 -- reader cuối xoá ở ADR-015
DROP VIEW IF EXISTS public.inventory_available_stock;             -- 0 reader; đọc inventory_reservations
DROP FUNCTION IF EXISTS public.expire_old_reservations();         -- chưa từng lên lịch (pg_cron chưa cài)
DROP FUNCTION IF EXISTS public.check_inventory_conflict(uuid, date, date, uuid); -- thân hàm đọc 3 cột không tồn tại, 0 caller
ALTER TABLE public.inventory_transactions DROP COLUMN IF EXISTS reservation_id; -- 0 dòng non-null; index đi theo
DROP TABLE IF EXISTS public.inventory_reservations;               -- 0 dòng từ khi tạo; RLS + index đi theo
DROP TABLE IF EXISTS public.order_payments;                       -- 0 dòng; RLS + index đi theo

DO $$
DECLARE v_left bigint;
BEGIN
  SELECT count(*) INTO v_left
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relname IN ('inventory_reservations', 'order_payments', 'order_payment_summary', 'inventory_available_stock');
  SELECT v_left + count(*) INTO v_left
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname IN ('expire_old_reservations', 'check_inventory_conflict');
  RAISE NOTICE 'object cu con lai = %', v_left;
END $$;
