-- SQL-backed reports cashflow timeline to avoid app-side raw row aggregation.

CREATE OR REPLACE FUNCTION public.finance_cashflow_timeline(
  p_start_date date,
  p_end_date date
) RETURNS TABLE (
  date date,
  inflow numeric,
  outflow numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH params AS (
    SELECT
      LEAST(COALESCE(p_start_date, p_end_date, current_date), COALESCE(p_end_date, p_start_date, current_date)) AS start_date,
      GREATEST(COALESCE(p_start_date, p_end_date, current_date), COALESCE(p_end_date, p_start_date, current_date)) AS end_date
  ),
  month_slices AS (
    SELECT
      gs::date AS month_start,
      (gs + interval '1 month - 1 day')::date AS month_end
    FROM params p,
      generate_series(
        date_trunc('month', p.start_date)::date,
        date_trunc('month', p.end_date)::date,
        interval '1 month'
      ) AS gs
  ),
  month_ratios AS (
    SELECT
      EXTRACT(year FROM ms.month_start)::int AS year,
      EXTRACT(month FROM ms.month_start)::int AS month,
      ms.month_start,
      ms.month_end,
      ((LEAST(p.end_date, ms.month_end) - GREATEST(p.start_date, ms.month_start) + 1)::numeric
        / (ms.month_end - ms.month_start + 1)::numeric) AS ratio
    FROM month_slices ms
    CROSS JOIN params p
  ),
  entries AS (
    SELECT p.payment_date::date AS entry_date, COALESCE(p.amount, 0)::numeric AS inflow, 0::numeric AS outflow
    FROM public.payments p
    CROSS JOIN params pr
    WHERE p.deleted_at IS NULL
      AND p.payment_date >= pr.start_date
      AND p.payment_date <= pr.end_date

    UNION ALL

    SELECT r.receipt_date::date AS entry_date, COALESCE(r.receipt_amount, 0)::numeric AS inflow, 0::numeric AS outflow
    FROM public.receipts r
    CROSS JOIN params pr
    WHERE r.deleted_at IS NULL
      AND r.contract_id IS NULL
      AND r.receipt_date >= pr.start_date
      AND r.receipt_date <= pr.end_date

    UNION ALL

    SELECT e.expense_date::date AS entry_date, 0::numeric AS inflow, COALESCE(e.amount, 0)::numeric AS outflow
    FROM public.expenses e
    CROSS JOIN params pr
    WHERE e.deleted_at IS NULL
      AND e.expense_date >= pr.start_date
      AND e.expense_date <= pr.end_date

    UNION ALL

    SELECT
      LEAST(GREATEST(make_date(mr.year, mr.month, 5), pr.start_date), pr.end_date) AS entry_date,
      0::numeric AS inflow,
      COALESCE(SUM(COALESCE(ms.total_salary, 0) * mr.ratio), 0)::numeric AS outflow
    FROM month_ratios mr
    CROSS JOIN params pr
    LEFT JOIN public.monthly_salaries ms
      ON ms.year = mr.year
     AND ms.month = mr.month
    GROUP BY mr.year, mr.month, pr.start_date, pr.end_date

    UNION ALL

    SELECT
      LEAST(GREATEST(mr.month_start, pr.start_date), pr.end_date) AS entry_date,
      0::numeric AS inflow,
      COALESCE(SUM(COALESCE(fc.monthly_amount, 0) * mr.ratio), 0)::numeric AS outflow
    FROM month_ratios mr
    CROSS JOIN params pr
    JOIN public.fixed_costs fc
      ON fc.deleted_at IS NULL
     AND (fc.start_date IS NULL OR fc.start_date <= mr.month_end)
     AND (fc.end_date IS NULL OR fc.end_date >= mr.month_start)
    GROUP BY mr.month_start, pr.start_date, pr.end_date
  )
  SELECT
    e.entry_date AS date,
    COALESCE(SUM(e.inflow), 0)::numeric AS inflow,
    COALESCE(SUM(e.outflow), 0)::numeric AS outflow
  FROM entries e
  WHERE COALESCE(e.inflow, 0) <> 0 OR COALESCE(e.outflow, 0) <> 0
  GROUP BY e.entry_date
  ORDER BY e.entry_date;
$$;

REVOKE ALL ON FUNCTION public.finance_cashflow_timeline(date, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finance_cashflow_timeline(date, date) TO service_role;
