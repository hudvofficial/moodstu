-- Aggregate the main /dashboard first-paint KPI values in one round trip.
-- This mirrors lib/api/dashboard.ts queryKpis() formula:
-- - revenue = payments + standalone receipts
-- - debt = active non-cancelled contract remaining_amount
-- - contract counts exclude soft-deleted and da_huy contracts
-- - completed counts use updated_at in the selected month

CREATE OR REPLACE FUNCTION public.dashboard_critical_kpis(
  p_month int,
  p_year int
) RETURNS TABLE (
  current_revenue numeric,
  previous_revenue numeric,
  total_debt numeric,
  current_contracts bigint,
  previous_contracts bigint,
  current_completed bigint,
  previous_completed bigint
) AS $$
  WITH bounds AS (
    SELECT
      make_date(p_year, p_month, 1)::date AS current_start,
      (make_date(p_year, p_month, 1) + interval '1 month')::date AS current_end,
      (make_date(p_year, p_month, 1) - interval '1 month')::date AS previous_start
  )
  SELECT
    (
      COALESCE((
        SELECT SUM(p.amount)
        FROM public.payments p, bounds b
        WHERE p.deleted_at IS NULL
          AND p.payment_date >= b.current_start
          AND p.payment_date < b.current_end
      ), 0)
      +
      COALESCE((
        SELECT SUM(r.receipt_amount)
        FROM public.receipts r, bounds b
        WHERE r.deleted_at IS NULL
          AND r.contract_id IS NULL
          AND r.receipt_date >= b.current_start
          AND r.receipt_date < b.current_end
      ), 0)
    ) AS current_revenue,
    (
      COALESCE((
        SELECT SUM(p.amount)
        FROM public.payments p, bounds b
        WHERE p.deleted_at IS NULL
          AND p.payment_date >= b.previous_start
          AND p.payment_date < b.current_start
      ), 0)
      +
      COALESCE((
        SELECT SUM(r.receipt_amount)
        FROM public.receipts r, bounds b
        WHERE r.deleted_at IS NULL
          AND r.contract_id IS NULL
          AND r.receipt_date >= b.previous_start
          AND r.receipt_date < b.current_start
      ), 0)
    ) AS previous_revenue,
    COALESCE((
      SELECT SUM(c.remaining_amount)
      FROM public.contracts c
      WHERE c.deleted_at IS NULL
        AND c.status <> 'da_huy'
        AND c.remaining_amount > 0
    ), 0) AS total_debt,
    (
      SELECT COUNT(*)
      FROM public.contracts c, bounds b
      WHERE c.deleted_at IS NULL
        AND c.status <> 'da_huy'
        AND c.contract_date >= b.current_start
        AND c.contract_date < b.current_end
    ) AS current_contracts,
    (
      SELECT COUNT(*)
      FROM public.contracts c, bounds b
      WHERE c.deleted_at IS NULL
        AND c.status <> 'da_huy'
        AND c.contract_date >= b.previous_start
        AND c.contract_date < b.current_start
    ) AS previous_contracts,
    (
      SELECT COUNT(*)
      FROM public.contracts c, bounds b
      WHERE c.deleted_at IS NULL
        AND c.status = 'hoan_thanh'
        AND c.updated_at >= b.current_start
        AND c.updated_at < b.current_end
    ) AS current_completed,
    (
      SELECT COUNT(*)
      FROM public.contracts c, bounds b
      WHERE c.deleted_at IS NULL
        AND c.status = 'hoan_thanh'
        AND c.updated_at >= b.previous_start
        AND c.updated_at < b.current_start
    ) AS previous_completed;
$$ LANGUAGE sql STABLE SET search_path = public;

REVOKE ALL ON FUNCTION public.dashboard_critical_kpis(int, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.dashboard_critical_kpis(int, int) FROM anon;
REVOKE ALL ON FUNCTION public.dashboard_critical_kpis(int, int) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.dashboard_critical_kpis(int, int) TO service_role;
