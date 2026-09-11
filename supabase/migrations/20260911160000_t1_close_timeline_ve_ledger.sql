-- ============================================================================
-- #23 (T-20260911-close-timeline-ve-ledger) — MOT SO KY DUY NHAT, phan TIEN
--
-- Van de: ADR-016 M2 dat `finance_period_ledger` lam ham DUY NHAT cong tien,
--   nhung `finance_cashflow_timeline` TU query lai payments + receipts + expenses
--   (`20260826120000:324-336`) — cong thuc thu hai. So hien khop vi trung bo loc;
--   doi ledger ma quen no la lech ngay (so doi chieu `00-lech-thiet-ke.md:86`).
--
-- Cach lam: tach dinh nghia "tien vao / tien ra theo NGAY" ra mot ham dung chung
--   `finance_cash_entries(start, end)`. Ca `finance_period_ledger` (cong lai theo ky)
--   lan `finance_cashflow_timeline` (ve theo ngay) deu doc no => mot dinh nghia.
--
-- KHONG doi so: `finance_cash_entries` giu NGUYEN VAN bo loc cua ledger hien tai
--   (payments.deleted_at IS NULL; receipts contract_id IS NULL; expenses.deleted_at IS NULL;
--    settlement = co expense_allocations; salary = payee_type='employee';
--    fixed = other + contract_id NULL + description LIKE '[Auto-Fixed]%';
--    direct = other + contract_id NOT NULL + category NOT IN (contract_refund/refund/hoan_tien) [R2 #12];
--    overhead = other + contract_id NULL + NOT LIKE '[Auto-Fixed]%').
--
-- `finance_cashflow_timeline_legacy` = ban sao than DANG SONG hom nay, giu 1 KY de so cheo
--   (PHUONG-AN T1 #23 "giu _legacy 1 ky"). Migration go no viet san, chua ap:
--   `20260911170000_t1_drop_timeline_legacy.sql`.
--
-- Runner `scripts/migrate-direct.mjs` tu boc BEGIN/COMMIT — file nay KHONG chua BEGIN/COMMIT.
-- Chay: ALLOW_PROD_WRITE=1 node scripts/migrate-direct.mjs 20260911160000_t1_close_timeline_ve_ledger.sql
-- Revert: agent/HANDOFFS/T-20260911-close-timeline-ve-ledger.revert.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) BAN SAO than dang song cua timeline -> _legacy (giu 1 ky de so cheo)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finance_cashflow_timeline_legacy(p_start_date date, p_end_date date)
 RETURNS TABLE(date date, inflow numeric, outflow numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH params AS (
    SELECT
      LEAST(COALESCE(p_start_date, p_end_date, current_date), COALESCE(p_end_date, p_start_date, current_date)) AS start_date,
      GREATEST(COALESCE(p_start_date, p_end_date, current_date), COALESCE(p_end_date, p_start_date, current_date)) AS end_date
  ),
  entries AS (
    SELECT p.payment_date::date AS entry_date, COALESCE(p.amount, 0)::numeric AS inflow, 0::numeric AS outflow
    FROM public.payments p CROSS JOIN params pr
    WHERE p.deleted_at IS NULL AND p.payment_date BETWEEN pr.start_date AND pr.end_date
    UNION ALL
    SELECT r.receipt_date::date, COALESCE(r.receipt_amount, 0)::numeric, 0::numeric
    FROM public.receipts r CROSS JOIN params pr
    WHERE r.deleted_at IS NULL AND r.contract_id IS NULL AND r.receipt_date BETWEEN pr.start_date AND pr.end_date
    UNION ALL
    SELECT e.expense_date::date, 0::numeric, COALESCE(e.amount, 0)::numeric
    FROM public.expenses e CROSS JOIN params pr
    WHERE e.deleted_at IS NULL AND e.expense_date BETWEEN pr.start_date AND pr.end_date
  )
  SELECT e.entry_date AS date, COALESCE(SUM(e.inflow), 0)::numeric, COALESCE(SUM(e.outflow), 0)::numeric
  FROM entries e
  WHERE COALESCE(e.inflow, 0) <> 0 OR COALESCE(e.outflow, 0) <> 0
  GROUP BY e.entry_date
  ORDER BY e.entry_date;
$function$;

COMMENT ON FUNCTION public.finance_cashflow_timeline_legacy(date, date) IS
  '#23 — ban sao cong thuc tien CU cua finance_cashflow_timeline (tu cong 3 bang). Chi de so cheo 1 ky; DROP o 20260911170000.';

-- ---------------------------------------------------------------------------
-- 2) NGUON CHUNG: tien vao / tien ra theo NGAY
--    (nguyen van bo loc cua finance_period_ledger hom nay — khong doi so)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finance_cash_entries(p_start date, p_end date)
 RETURNS TABLE(
   entry_date date,
   cash_in_contract numeric,
   cash_in_retail numeric,
   cash_out numeric,
   cash_out_settlement numeric,
   cash_out_salary numeric,
   cash_out_fixed numeric,
   cost_direct numeric,
   cost_overhead numeric
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH raw AS (
    -- tien vao: khach tra theo hop dong
    SELECT p.payment_date::date AS d,
           COALESCE(p.amount, 0)::numeric AS in_contract,
           0::numeric AS in_retail,
           0::numeric AS out_all, 0::numeric AS out_settlement, 0::numeric AS out_salary,
           0::numeric AS out_fixed, 0::numeric AS c_direct, 0::numeric AS c_overhead
    FROM public.payments p
    WHERE p.deleted_at IS NULL AND p.payment_date BETWEEN p_start AND p_end

    UNION ALL

    -- tien vao: phieu thu le (khong gan hop dong)
    SELECT r.receipt_date::date,
           0::numeric, COALESCE(r.receipt_amount, 0)::numeric,
           0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric
    FROM public.receipts r
    WHERE r.deleted_at IS NULL AND r.contract_id IS NULL AND r.receipt_date BETWEEN p_start AND p_end

    UNION ALL

    -- tien ra: moi phieu chi, kem cac lat cat cua so ky
    SELECT e.expense_date::date,
           0::numeric, 0::numeric,
           COALESCE(e.amount, 0)::numeric,
           CASE WHEN al.expense_id IS NOT NULL
                THEN COALESCE(e.amount, 0) ELSE 0 END::numeric,
           CASE WHEN e.payee_type = 'employee'
                THEN COALESCE(e.amount, 0) ELSE 0 END::numeric,
           CASE WHEN e.payee_type = 'other' AND e.contract_id IS NULL
                     AND COALESCE(e.description, '') LIKE '[Auto-Fixed]%'
                THEN COALESCE(e.amount, 0) ELSE 0 END::numeric,
           -- R2 (#12, 2026-09-07): phieu HOAN TIEN la tien ra nhung KHONG phai chi phi
           CASE WHEN e.payee_type = 'other' AND e.contract_id IS NOT NULL
                     AND COALESCE(tc.category_code, '') NOT IN ('contract_refund', 'refund', 'hoan_tien')
                THEN COALESCE(e.amount, 0) ELSE 0 END::numeric,
           CASE WHEN e.payee_type = 'other' AND e.contract_id IS NULL
                     AND COALESCE(e.description, '') NOT LIKE '[Auto-Fixed]%'
                THEN COALESCE(e.amount, 0) ELSE 0 END::numeric
    FROM public.expenses e
    LEFT JOIN LATERAL (SELECT a.expense_id FROM public.expense_allocations a WHERE a.expense_id = e.id LIMIT 1) al ON TRUE
    LEFT JOIN public.transaction_categories tc ON tc.id = e.category_id
    WHERE e.deleted_at IS NULL AND e.expense_date BETWEEN p_start AND p_end
  )
  SELECT raw.d,
         COALESCE(SUM(raw.in_contract), 0)::numeric,
         COALESCE(SUM(raw.in_retail), 0)::numeric,
         COALESCE(SUM(raw.out_all), 0)::numeric,
         COALESCE(SUM(raw.out_settlement), 0)::numeric,
         COALESCE(SUM(raw.out_salary), 0)::numeric,
         COALESCE(SUM(raw.out_fixed), 0)::numeric,
         COALESCE(SUM(raw.c_direct), 0)::numeric,
         COALESCE(SUM(raw.c_overhead), 0)::numeric
  FROM raw
  GROUP BY raw.d
  ORDER BY raw.d;
$function$;

COMMENT ON FUNCTION public.finance_cash_entries(date, date) IS
  '#23 — dinh nghia DUY NHAT cua tien vao/ra theo ngay. finance_period_ledger va finance_cashflow_timeline cung doc.';

-- ---------------------------------------------------------------------------
-- 3) finance_period_ledger — doi DUNG 2 khoi CTE (cash_in, exp) sang doc nguon chung.
--    Moi phan khac (contracts_shot, signed, tasks, prints, cogs, month_ratios, salary,
--    SELECT cuoi) giu NGUYEN VAN ban dang song.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finance_period_ledger(p_start date, p_end date)
 RETURNS TABLE(cash_in_contract numeric, cash_in_retail numeric, cash_out numeric, cash_out_settlement numeric, cash_out_salary numeric, cash_out_fixed numeric, revenue_contract numeric, revenue_retail numeric, signed_revenue numeric, signed_contracts bigint, contracts_shot bigint, contracts_completed bigint, cost_task numeric, cost_print numeric, cost_cogs_contract numeric, cost_cogs_retail numeric, cost_direct numeric, cost_overhead numeric, cost_fixed numeric, cost_salary_base numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH cash_entries AS (
    -- #23: mot dinh nghia tien vao/ra (public.finance_cash_entries) — timeline doc cung ham nay
    SELECT * FROM public.finance_cash_entries(p_start, p_end)
  ),
  cash_in AS (
    SELECT COALESCE(SUM(ce.cash_in_contract), 0)::numeric AS contract_amt,
           COALESCE(SUM(ce.cash_in_retail), 0)::numeric AS retail_amt
    FROM cash_entries ce
  ),
  exp AS (
    SELECT COALESCE(SUM(ce.cash_out), 0)::numeric AS all_out,
           COALESCE(SUM(ce.cash_out_settlement), 0)::numeric AS settlement,
           COALESCE(SUM(ce.cash_out_salary), 0)::numeric AS salary_paid,
           COALESCE(SUM(ce.cost_direct), 0)::numeric AS direct,
           COALESCE(SUM(ce.cost_overhead), 0)::numeric AS overhead,
           COALESCE(SUM(ce.cash_out_fixed), 0)::numeric AS fixed
    FROM cash_entries ce
  ),
  contracts_shot AS (
    SELECT COALESCE(SUM(c.total_amount), 0)::numeric AS amt, COUNT(*)::bigint AS n,
           COUNT(*) FILTER (WHERE c.status = 'hoan_thanh')::bigint AS done
    FROM public.contracts c
    WHERE c.deleted_at IS NULL AND c.status <> 'da_huy'
      AND COALESCE(public.vn_date(c.work_date), c.contract_date) BETWEEN p_start AND p_end
  ),
  signed AS (
    SELECT COALESCE(SUM(c.total_amount), 0)::numeric AS amt, COUNT(*)::bigint AS n
    FROM public.contracts c
    WHERE c.deleted_at IS NULL AND c.status <> 'da_huy' AND c.contract_date BETWEEN p_start AND p_end
  ),
  tasks AS (
    -- cung luat contract_financials(): moi task khong huy co cost (ke ca dang_lam) -> tong thang = tong hop dong
    SELECT COALESCE(SUM(wt.cost), 0)::numeric AS amt
    FROM public.work_tasks wt
    LEFT JOIN public.contract_events ev ON ev.id = wt.event_id
    WHERE wt.status <> 'da_huy' AND COALESCE(wt.cost, 0) > 0
      AND COALESCE(public.vn_date(ev.event_date), public.vn_date(wt.deadline), public.vn_date(wt.created_at)) BETWEEN p_start AND p_end
  ),
  prints AS (
    SELECT COALESCE(SUM(po.total_amount), 0)::numeric AS amt
    FROM public.printing_orders po
    WHERE po.deleted_at IS NULL AND COALESCE(po.status, '') NOT IN ('huy_don', 'da_huy')
      AND COALESCE(po.order_date, public.vn_date(po.created_at)) BETWEEN p_start AND p_end
  ),
  cogs AS (
    SELECT
      COALESCE(SUM(t.total_cost) FILTER (WHERE t.source_type IN ('contract_fulfillment', 'contract_addon_sale')), 0)::numeric AS contract_amt,
      COALESCE(SUM(t.total_cost) FILTER (WHERE t.source_type = 'retail_sale'), 0)::numeric AS retail_amt
    FROM public.inventory_transactions t
    LEFT JOIN public.receipts r ON r.id = t.receipt_id
    WHERE t.transaction_type = 'stock_out' AND COALESCE(t.is_rollback, false) = false
      AND t.source_type IN ('retail_sale', 'contract_fulfillment', 'contract_addon_sale')
      AND COALESCE(r.receipt_date, public.vn_date(t.created_at)) BETWEEN p_start AND p_end
  ),
  month_ratios AS (
    -- luong cung prorate theo so ngay cua thang nam trong ky (ky = thang tron -> ratio 1)
    SELECT EXTRACT(year FROM gs)::int AS year, EXTRACT(month FROM gs)::int AS month,
           ((LEAST(p_end, (gs + interval '1 month - 1 day')::date) - GREATEST(p_start, gs::date) + 1)::numeric
             / ((gs + interval '1 month - 1 day')::date - gs::date + 1)::numeric) AS ratio
    FROM generate_series(date_trunc('month', p_start)::date, date_trunc('month', p_end)::date, interval '1 month') gs
  ),
  salary AS (
    -- ADR-016 M5: luong cung = employee_salaries.total_salary (luong co ban + thuong - phat; product_salary = 0 tu M3).
    -- Cot monthly_salary khong code nao ghi (M2 dung nham -> luon 0). Sheet la accrual, khong phai tien.
    SELECT COALESCE(SUM(COALESCE(s.total_salary, 0) * mr.ratio), 0)::numeric AS amt
    FROM month_ratios mr
    LEFT JOIN public.employee_salaries s ON s.year = mr.year AND s.month = mr.month
  )
  SELECT
    cash_in.contract_amt, cash_in.retail_amt,
    exp.all_out, exp.settlement, exp.salary_paid, exp.fixed,
    contracts_shot.amt, cash_in.retail_amt, signed.amt, signed.n,
    contracts_shot.n, contracts_shot.done,
    tasks.amt, prints.amt, cogs.contract_amt, cogs.retail_amt,
    exp.direct, exp.overhead, exp.fixed, salary.amt
  FROM cash_in, exp, contracts_shot, signed, tasks, prints, cogs, salary;
$function$;

-- ---------------------------------------------------------------------------
-- 4) finance_cashflow_timeline — doc nguon chung thay vi tu cong 3 bang
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finance_cashflow_timeline(p_start_date date, p_end_date date)
 RETURNS TABLE(date date, inflow numeric, outflow numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH params AS (
    SELECT
      LEAST(COALESCE(p_start_date, p_end_date, current_date), COALESCE(p_end_date, p_start_date, current_date)) AS start_date,
      GREATEST(COALESCE(p_start_date, p_end_date, current_date), COALESCE(p_end_date, p_start_date, current_date)) AS end_date
  )
  SELECT ce.entry_date AS date,
         (COALESCE(ce.cash_in_contract, 0) + COALESCE(ce.cash_in_retail, 0))::numeric,
         COALESCE(ce.cash_out, 0)::numeric
  FROM params pr
  CROSS JOIN LATERAL public.finance_cash_entries(pr.start_date, pr.end_date) ce
  WHERE (COALESCE(ce.cash_in_contract, 0) + COALESCE(ce.cash_in_retail, 0)) <> 0
     OR COALESCE(ce.cash_out, 0) <> 0
  ORDER BY ce.entry_date;
$function$;

-- ---------------------------------------------------------------------------
-- 5) ACL — 2 ham moi phai khop 2 ham cu: chi postgres + service_role.
--    (schema public cap EXECUTE cho PUBLIC theo mac dinh voi ham MOI — phai REVOKE lai)
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.finance_cash_entries(date, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finance_cash_entries(date, date) TO service_role;

REVOKE ALL ON FUNCTION public.finance_cashflow_timeline_legacy(date, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finance_cashflow_timeline_legacy(date, date) TO service_role;

-- 2 ham CREATE OR REPLACE giu nguyen ACL cu; khang dinh lai cho chac
REVOKE ALL ON FUNCTION public.finance_period_ledger(date, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finance_period_ledger(date, date) TO service_role;
REVOKE ALL ON FUNCTION public.finance_cashflow_timeline(date, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finance_cashflow_timeline(date, date) TO service_role;

NOTIFY pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- 6) HANG RAO: so moi phai TRUNG so cu tung dong, tung thang.
--    Lech 1 dong -> RAISE EXCEPTION -> runner rollback ca migration.
-- ---------------------------------------------------------------------------
DO $mig_check$
DECLARE
  v_m record;
  v_new_in numeric; v_new_out numeric;
  v_old_in numeric; v_old_out numeric;
  v_led_in numeric; v_led_out numeric;
  v_rows_new int; v_rows_old int;
  v_anon bool;
BEGIN
  FOR v_m IN
    SELECT gs::date AS s, (gs + interval '1 month - 1 day')::date AS e
    FROM generate_series(date '2026-01-01', date_trunc('month', current_date)::date, interval '1 month') gs
  LOOP
    SELECT COALESCE(SUM(t.inflow), 0), COALESCE(SUM(t.outflow), 0), COUNT(*)
      INTO v_new_in, v_new_out, v_rows_new
      FROM public.finance_cashflow_timeline(v_m.s, v_m.e) t;

    SELECT COALESCE(SUM(t.inflow), 0), COALESCE(SUM(t.outflow), 0), COUNT(*)
      INTO v_old_in, v_old_out, v_rows_old
      FROM public.finance_cashflow_timeline_legacy(v_m.s, v_m.e) t;

    SELECT COALESCE(l.cash_in_contract, 0) + COALESCE(l.cash_in_retail, 0), COALESCE(l.cash_out, 0)
      INTO v_led_in, v_led_out
      FROM public.finance_period_ledger(v_m.s, v_m.e) l;

    IF v_new_in <> v_old_in OR v_new_out <> v_old_out OR v_rows_new <> v_rows_old THEN
      RAISE EXCEPTION '#23 DUNG: timeline moi != cu tai % (vao %/% ra %/% dong %/%)',
        to_char(v_m.s, 'YYYY-MM'), v_new_in, v_old_in, v_new_out, v_old_out, v_rows_new, v_rows_old;
    END IF;

    IF v_new_in <> v_led_in OR v_new_out <> v_led_out THEN
      RAISE EXCEPTION '#23 DUNG: timeline != so ky tai % (vao %/% ra %/%)',
        to_char(v_m.s, 'YYYY-MM'), v_new_in, v_led_in, v_new_out, v_led_out;
    END IF;
  END LOOP;

  SELECT bool_or(has_function_privilege(r.rolname, p.oid, 'EXECUTE'))
    INTO v_anon
    FROM pg_proc p, (VALUES ('anon'), ('authenticated')) r(rolname)
   WHERE p.pronamespace = 'public'::regnamespace
     AND p.proname IN ('finance_cash_entries', 'finance_cashflow_timeline_legacy',
                       'finance_cashflow_timeline', 'finance_period_ledger');
  IF COALESCE(v_anon, false) THEN
    RAISE EXCEPTION '#23 DUNG: con vai anon/authenticated goi duoc 1 trong 4 ham tien';
  END IF;

  RAISE NOTICE '#23 OK: timeline == legacy == so ky moi thang tu 2026-01; 0 vai cong khai';
END $mig_check$;
