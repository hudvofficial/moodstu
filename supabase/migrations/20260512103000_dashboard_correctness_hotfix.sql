-- Correctness hotfix for the dashboard performance RPCs.
-- 1. Count completed contracts by Mood Studio business timezone.
-- 2. Prevent service-breakdown ordering from leaking revenue to non-finance roles.

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
      (make_date(p_year, p_month, 1) - interval '1 month')::date AS previous_start,
      (make_date(p_year, p_month, 1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh') AS current_start_utc,
      ((make_date(p_year, p_month, 1) + interval '1 month')::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh') AS current_end_utc,
      ((make_date(p_year, p_month, 1) - interval '1 month')::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh') AS previous_start_utc
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
        AND c.updated_at >= b.current_start_utc
        AND c.updated_at < b.current_end_utc
    ) AS current_completed,
    (
      SELECT COUNT(*)
      FROM public.contracts c, bounds b
      WHERE c.deleted_at IS NULL
        AND c.status = 'hoan_thanh'
        AND c.updated_at >= b.previous_start_utc
        AND c.updated_at < b.current_start_utc
    ) AS previous_completed;
$$ LANGUAGE sql STABLE SET search_path = public;

REVOKE ALL ON FUNCTION public.dashboard_critical_kpis(int, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.dashboard_critical_kpis(int, int) FROM anon;
REVOKE ALL ON FUNCTION public.dashboard_critical_kpis(int, int) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.dashboard_critical_kpis(int, int) TO service_role;

DROP FUNCTION IF EXISTS public.dashboard_service_breakdown(int, int);

CREATE OR REPLACE FUNCTION public.dashboard_service_breakdown(
  p_month int,
  p_year int,
  p_can_view_financials boolean DEFAULT false
) RETURNS TABLE (
  service_type text,
  contract_count bigint,
  revenue numeric
) AS $$
DECLARE
  v_start date := make_date(p_year, p_month, 1);
  v_end date := (make_date(p_year, p_month, 1) + interval '1 month')::date;
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(NULLIF(c.service_type::text, ''), 'khac') AS service_type,
    COUNT(*)::bigint AS contract_count,
    CASE
      WHEN p_can_view_financials THEN COALESCE(SUM(c.total_amount), 0)
      ELSE 0
    END AS revenue
  FROM public.contracts c
  WHERE c.deleted_at IS NULL
    AND c.status <> 'da_huy'
    AND c.contract_date >= v_start
    AND c.contract_date < v_end
  GROUP BY 1
  ORDER BY 2 DESC, 3 DESC, 1 ASC;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

REVOKE ALL ON FUNCTION public.dashboard_service_breakdown(int, int, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.dashboard_service_breakdown(int, int, boolean) FROM anon;
REVOKE ALL ON FUNCTION public.dashboard_service_breakdown(int, int, boolean) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.dashboard_service_breakdown(int, int, boolean) TO service_role;
