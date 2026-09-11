-- ============================================================================
-- #23 (b) — GO `finance_cashflow_timeline_legacy` sau khi da so cheo du 1 KY
--
-- ⚠️ KHONG ap cung 20260911160000. Dieu kien ap (chu gat):
--   1) prod chay ban moi on >= 1 ky chot so (het thang 09/2026, tuc >= 2026-10-01), VA
--   2) `npm run verify:cashflow-ledger` xanh o lan chay cuoi cung (timeline == legacy == so ky).
--
-- Sau khi ap: node scripts/vault-gen-schema.mjs && npm run vault:db-truth
-- Chay: ALLOW_PROD_WRITE=1 node scripts/migrate-direct.mjs 20260911170000_t1_drop_timeline_legacy.sql
-- (runner tu boc BEGIN/COMMIT — file nay KHONG chua BEGIN/COMMIT)
-- ============================================================================

-- Pre-check: ban moi va ban legacy phai con TRUNG NHAU tung thang — lech thi DUNG
DO $drop_check$
DECLARE
  v_m record;
  v_new_in numeric; v_new_out numeric;
  v_old_in numeric; v_old_out numeric;
  v_n int := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
     WHERE p.pronamespace = 'public'::regnamespace
       AND p.proname = 'finance_cashflow_timeline_legacy'
  ) THEN
    RAISE NOTICE '#23b: finance_cashflow_timeline_legacy da khong con — khong co gi de go';
    RETURN;
  END IF;

  FOR v_m IN
    SELECT gs::date AS s, (gs + interval '1 month - 1 day')::date AS e
    FROM generate_series(date '2026-01-01', date_trunc('month', current_date)::date, interval '1 month') gs
  LOOP
    SELECT COALESCE(SUM(t.inflow), 0), COALESCE(SUM(t.outflow), 0)
      INTO v_new_in, v_new_out
      FROM public.finance_cashflow_timeline(v_m.s, v_m.e) t;

    SELECT COALESCE(SUM(t.inflow), 0), COALESCE(SUM(t.outflow), 0)
      INTO v_old_in, v_old_out
      FROM public.finance_cashflow_timeline_legacy(v_m.s, v_m.e) t;

    IF v_new_in <> v_old_in OR v_new_out <> v_old_out THEN
      RAISE EXCEPTION '#23b DUNG: timeline moi != legacy tai % (vao %/% ra %/%) — dieu tra truoc khi go',
        to_char(v_m.s, 'YYYY-MM'), v_new_in, v_old_in, v_new_out, v_old_out;
    END IF;
    v_n := v_n + 1;
  END LOOP;

  RAISE NOTICE '#23b pre-check OK: % thang trung nhau, go duoc legacy', v_n;
END $drop_check$;

DROP FUNCTION IF EXISTS public.finance_cashflow_timeline_legacy(date, date);

DO $drop_verify$
DECLARE v int;
BEGIN
  SELECT COUNT(*) INTO v FROM pg_proc p
   WHERE p.pronamespace = 'public'::regnamespace AND p.proname = 'finance_cashflow_timeline_legacy';
  IF v > 0 THEN
    RAISE EXCEPTION '#23b: van con % ban legacy', v;
  END IF;
  RAISE NOTICE '#23b: legacy da go, chi con mot cong thuc tien';
END $drop_verify$;
