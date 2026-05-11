-- Dashboard deferred section aggregates.
-- These functions preserve the dashboard TypeScript formulas while avoiding
-- raw row transfer for streamed sections.

CREATE OR REPLACE FUNCTION public.dashboard_revenue_chart(
  p_month int,
  p_year int,
  p_months int DEFAULT 6
) RETURNS TABLE (
  month_index int,
  month_label text,
  revenue numeric
) AS $$
DECLARE
  v_months int := GREATEST(1, LEAST(COALESCE(p_months, 6), 24));
  v_anchor date := make_date(p_year, p_month, 1);
  v_start date := (v_anchor - ((v_months - 1)::text || ' months')::interval)::date;
  v_end date := (v_anchor + interval '1 month')::date;
BEGIN
  RETURN QUERY
  WITH months AS (
    SELECT generate_series(v_start, v_anchor, interval '1 month')::date AS month_start
  ),
  payments_by_month AS (
    SELECT date_trunc('month', payment_date)::date AS month_start, SUM(amount) AS amount
    FROM public.payments
    WHERE deleted_at IS NULL
      AND payment_date >= v_start
      AND payment_date < v_end
    GROUP BY 1
  ),
  receipts_by_month AS (
    SELECT date_trunc('month', receipt_date)::date AS month_start, SUM(receipt_amount) AS amount
    FROM public.receipts
    WHERE deleted_at IS NULL
      AND contract_id IS NULL
      AND receipt_date >= v_start
      AND receipt_date < v_end
    GROUP BY 1
  )
  SELECT
    EXTRACT(MONTH FROM m.month_start)::int AS month_index,
    ('T' || EXTRACT(MONTH FROM m.month_start)::int)::text AS month_label,
    COALESCE(p.amount, 0) + COALESCE(r.amount, 0) AS revenue
  FROM months m
  LEFT JOIN payments_by_month p ON p.month_start = m.month_start
  LEFT JOIN receipts_by_month r ON r.month_start = m.month_start
  ORDER BY m.month_start;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.dashboard_service_breakdown(
  p_month int,
  p_year int
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
    COALESCE(SUM(c.total_amount), 0) AS revenue
  FROM public.contracts c
  WHERE c.deleted_at IS NULL
    AND c.status <> 'da_huy'
    AND c.contract_date >= v_start
    AND c.contract_date < v_end
  GROUP BY 1
  ORDER BY COUNT(*) DESC, COALESCE(SUM(c.total_amount), 0) DESC;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

REVOKE ALL ON FUNCTION public.dashboard_revenue_chart(int, int, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.dashboard_revenue_chart(int, int, int) FROM anon;
REVOKE ALL ON FUNCTION public.dashboard_revenue_chart(int, int, int) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.dashboard_revenue_chart(int, int, int) TO service_role;

REVOKE ALL ON FUNCTION public.dashboard_service_breakdown(int, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.dashboard_service_breakdown(int, int) FROM anon;
REVOKE ALL ON FUNCTION public.dashboard_service_breakdown(int, int) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.dashboard_service_breakdown(int, int) TO service_role;
