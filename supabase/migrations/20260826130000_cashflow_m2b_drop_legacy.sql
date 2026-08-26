-- ============================================================================
-- ADR-016 M2b — DROP 4 view tương thích + 4 bảng _legacy của mô hình thanh toán cũ
-- T-20260826-cashflow-m2-ba-so §1.9 (Migration B)
--
-- ⚠️ KHÔNG áp cùng M2. Điều kiện áp (user gật): prod chạy M2 ổn ≥ 7 ngày (≥ 2026-09-02),
--   grep app = 0 tham chiếu view, `printing_lab_overview` đã không đọc view (M2 §9).
-- Sau khi áp: npm run db:types + node scripts/vault-gen-schema.mjs
-- Chạy: node scripts/migrate-direct.mjs 20260826130000_cashflow_m2b_drop_legacy.sql
-- ============================================================================

-- Pre-check: dữ liệu cũ đã di trú đủ vào expenses (M1) — lệch thì DỪNG
DO $$
DECLARE v_lab int; v_vendor int; v_migrated int; v_fn int;
BEGIN
  SELECT COUNT(*) INTO v_lab FROM public.lab_payments_legacy;
  SELECT COUNT(*) INTO v_vendor FROM public.vendor_payments_legacy WHERE deleted_at IS NULL;
  SELECT COUNT(*) INTO v_migrated FROM public.expenses WHERE legacy_source IN ('lab_payments', 'vendor_payments');
  IF v_migrated < v_lab + v_vendor THEN
    RAISE EXCEPTION 'M2b DUNG: expenses di tru (%) < lab_payments_legacy (%) + vendor_payments_legacy (%)', v_migrated, v_lab, v_vendor;
  END IF;
  SELECT COUNT(*) INTO v_fn FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.prokind = 'f' AND p.proname NOT LIKE 'update_vendor_payments%'
     AND (pg_get_functiondef(p.oid) ILIKE '%public.lab_payments%' OR pg_get_functiondef(p.oid) ILIKE '%public.vendor_payments%'
          OR pg_get_functiondef(p.oid) ILIKE '%lab_payment_allocations%' OR pg_get_functiondef(p.oid) ILIKE '%vendor_payment_allocations%');
  IF v_fn > 0 THEN
    RAISE EXCEPTION 'M2b DUNG: con % ham DB doc view cu', v_fn;
  END IF;
  RAISE NOTICE 'M2b pre-check OK: lab_legacy=% vendor_legacy=% migrated=%', v_lab, v_vendor, v_migrated;
END $$;

DROP VIEW IF EXISTS public.lab_payment_allocations;
DROP VIEW IF EXISTS public.vendor_payment_allocations;
DROP VIEW IF EXISTS public.lab_payments;
DROP VIEW IF EXISTS public.vendor_payments;

-- CASCADE kéo theo FK, policy, trigger (trigger_vendor_payments_updated_at, emit_realtime_signal) của 4 bảng
DROP TABLE IF EXISTS public.lab_payment_allocations_legacy CASCADE;
DROP TABLE IF EXISTS public.vendor_payment_allocations_legacy CASCADE;
DROP TABLE IF EXISTS public.lab_payments_legacy CASCADE;
DROP TABLE IF EXISTS public.vendor_payments_legacy CASCADE;

DROP FUNCTION IF EXISTS public.update_vendor_payments_updated_at();

-- Wrapper thợ ngoài: app không còn gọi sau M2 (màn Phải trả gọi thẳng record_payee_payment_atomic).
-- record_lab_payment_atomic GIỮ (LabPaymentModal ở /printing).
DROP FUNCTION IF EXISTS public.record_vendor_payment_atomic(uuid, numeric, text, date, text, jsonb, uuid);

DO $$
DECLARE v int;
BEGIN
  SELECT COUNT(*) INTO v FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname IN ('lab_payments','vendor_payments','lab_payment_allocations','vendor_payment_allocations',
     'lab_payments_legacy','vendor_payments_legacy','lab_payment_allocations_legacy','vendor_payment_allocations_legacy');
  RAISE NOTICE 'M2b: object cu con lai = % (mong doi 0)', v;
END $$;
