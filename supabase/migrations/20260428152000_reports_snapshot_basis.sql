-- Reports snapshot basis fix:
-- summary/profit revenue is contract-period revenue, while cashflowSummary
-- remains cash collection/outflow by transaction date.

CREATE OR REPLACE FUNCTION public.finance_reports_snapshot(
  p_start_date date,
  p_end_date date
) RETURNS jsonb
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
  contracts_scope AS (
    SELECT
      c.id,
      c.status,
      COALESCE(c.total_amount, 0) AS total_amount,
      COALESCE(c.discount_amount, 0) AS discount_amount,
      COALESCE(NULLIF(c.service_type::text, ''), 'Khac') AS service_type
    FROM public.contracts c
    CROSS JOIN params p
    WHERE c.deleted_at IS NULL
      AND c.contract_date >= p.start_date
      AND c.contract_date <= p.end_date
  ),
  contract_summary AS (
    SELECT
      COUNT(*)::numeric AS total_contracts,
      COUNT(*) FILTER (WHERE status IN ('hoan_thanh', 'completed'))::numeric AS completed_contracts,
      COALESCE(SUM(total_amount), 0) AS contract_revenue,
      COALESCE(SUM(discount_amount), 0) AS total_discount
    FROM contracts_scope
  ),
  addon_summary AS (
    SELECT
      COALESCE(SUM(COALESCE(ci.total_amount, 0)), 0) AS addon_revenue,
      COUNT(ci.id)::numeric AS addon_count
    FROM contracts_scope c
    JOIN public.contract_items ci ON ci.contract_id = c.id
    WHERE ci.is_addon IS TRUE
      AND ci.deleted_at IS NULL
  ),
  service_rows AS (
    SELECT
      service_type AS name,
      COUNT(*)::numeric AS value,
      COALESCE(SUM(total_amount), 0) AS revenue
    FROM contracts_scope
    GROUP BY service_type
  ),
  service_json AS (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object('name', name, 'value', value, 'revenue', revenue)
        ORDER BY revenue DESC, value DESC
      ),
      '[]'::jsonb
    ) AS items
    FROM service_rows
  ),
  cash_revenue_summary AS (
    SELECT
      COALESCE((
        SELECT SUM(p.amount)
        FROM public.payments p
        CROSS JOIN params pr
        WHERE p.deleted_at IS NULL
          AND p.payment_date >= pr.start_date
          AND p.payment_date <= pr.end_date
      ), 0) AS payment_revenue,
      COALESCE((
        SELECT SUM(r.receipt_amount)
        FROM public.receipts r
        CROSS JOIN params pr
        WHERE r.deleted_at IS NULL
          AND r.contract_id IS NULL
          AND r.receipt_date >= pr.start_date
          AND r.receipt_date <= pr.end_date
      ), 0) AS standalone_receipt_revenue
  ),
  direct_costs AS (
    SELECT
      COALESCE((
        SELECT SUM(wt.cost)
        FROM public.work_tasks wt
        JOIN contracts_scope c ON c.id = wt.contract_id
      ), 0) AS task_cost,
      COALESCE((
        SELECT SUM(po.total_amount)
        FROM public.printing_orders po
        JOIN contracts_scope c ON c.id = po.contract_id
        WHERE po.deleted_at IS NULL
      ), 0) AS print_cost,
      COALESCE((
        SELECT SUM(e.amount)
        FROM public.expenses e
        JOIN contracts_scope c ON c.id = e.contract_id
        WHERE e.deleted_at IS NULL
          AND COALESCE(e.description, '') NOT LIKE '[Auto-Print]%'
      ), 0) AS contract_expense_cost
  ),
  expense_summary AS (
    SELECT
      COALESCE(SUM(e.amount) FILTER (WHERE e.contract_id IS NULL), 0) AS operating_cost,
      COALESCE(SUM(e.amount), 0) AS operating_outflow
    FROM public.expenses e
    CROSS JOIN params p
    WHERE e.deleted_at IS NULL
      AND e.expense_date >= p.start_date
      AND e.expense_date <= p.end_date
  ),
  salary_summary AS (
    SELECT COALESCE(SUM(COALESCE(ms.total_salary, 0) * mr.ratio), 0) AS salary_cost
    FROM month_ratios mr
    LEFT JOIN public.monthly_salaries ms
      ON ms.year = mr.year
      AND ms.month = mr.month
  ),
  fixed_cost_summary AS (
    SELECT COALESCE(SUM(COALESCE(fc.monthly_amount, 0) * mr.ratio), 0) AS fixed_cost
    FROM month_ratios mr
    JOIN public.fixed_costs fc
      ON fc.deleted_at IS NULL
      AND (fc.start_date IS NULL OR fc.start_date <= mr.month_end)
      AND (fc.end_date IS NULL OR fc.end_date >= mr.month_start)
  ),
  totals AS (
    SELECT
      crs.payment_revenue,
      crs.standalone_receipt_revenue,
      crs.payment_revenue + crs.standalone_receipt_revenue AS cash_inflow,
      cs.contract_revenue + crs.standalone_receipt_revenue AS report_revenue,
      cs.total_contracts,
      cs.completed_contracts,
      cs.contract_revenue,
      cs.total_discount,
      ads.addon_revenue,
      ads.addon_count,
      GREATEST(0, cs.contract_revenue - ads.addon_revenue) AS package_revenue,
      dc.task_cost + dc.print_cost + dc.contract_expense_cost AS direct_cost,
      es.operating_cost,
      es.operating_outflow,
      ss.salary_cost,
      fcs.fixed_cost
    FROM cash_revenue_summary crs
    CROSS JOIN contract_summary cs
    CROSS JOIN addon_summary ads
    CROSS JOIN direct_costs dc
    CROSS JOIN expense_summary es
    CROSS JOIN salary_summary ss
    CROSS JOIN fixed_cost_summary fcs
  )
  SELECT jsonb_build_object(
    'summary', jsonb_build_object(
      'totalRevenue', t.report_revenue,
      'totalCost', t.direct_cost + t.operating_cost + t.salary_cost + t.fixed_cost,
      'directCost', t.direct_cost,
      'operatingCost', t.operating_cost,
      'salaryCost', t.salary_cost,
      'fixedCost', t.fixed_cost,
      'netProfit', t.report_revenue - (t.direct_cost + t.operating_cost + t.salary_cost + t.fixed_cost),
      'profitMargin', CASE
        WHEN t.report_revenue > 0 THEN ROUND(((t.report_revenue - (t.direct_cost + t.operating_cost + t.salary_cost + t.fixed_cost)) / t.report_revenue) * 1000) / 10
        ELSE 0
      END,
      'totalContracts', t.total_contracts,
      'completedContracts', t.completed_contracts,
      'avgContractValue', CASE WHEN t.total_contracts > 0 THEN t.contract_revenue / t.total_contracts ELSE 0 END,
      'totalDiscount', t.total_discount,
      'packageRevenue', t.package_revenue,
      'addonRevenue', t.addon_revenue,
      'addonCount', t.addon_count,
      'addonPercentage', CASE WHEN t.contract_revenue > 0 THEN ROUND((t.addon_revenue / t.contract_revenue) * 1000) / 10 ELSE 0 END
    ),
    'serviceDistribution', sj.items,
    'revenueBreakdown', jsonb_build_array(
      jsonb_build_object(
        'label', 'Doanh thu hop dong',
        'amount', t.contract_revenue,
        'percentage', CASE WHEN t.report_revenue > 0 THEN ROUND((t.contract_revenue / t.report_revenue) * 1000) / 10 ELSE 0 END
      ),
      jsonb_build_object(
        'label', 'Thu khac',
        'amount', t.standalone_receipt_revenue,
        'percentage', CASE WHEN t.report_revenue > 0 THEN ROUND((t.standalone_receipt_revenue / t.report_revenue) * 1000) / 10 ELSE 0 END
      )
    ),
    'cashflowSummary', jsonb_build_object(
      'totalInflow', t.cash_inflow,
      'totalOutflow', t.operating_outflow + t.salary_cost + t.fixed_cost,
      'salaryCost', t.salary_cost,
      'fixedCost', t.fixed_cost,
      'operatingNet', t.cash_inflow - t.operating_outflow,
      'netAfterOverhead', t.cash_inflow - (t.operating_outflow + t.salary_cost + t.fixed_cost)
    )
  )
  FROM totals t
  CROSS JOIN service_json sj;
$$;

REVOKE ALL ON FUNCTION public.finance_reports_snapshot(date, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finance_reports_snapshot(date, date) TO service_role;
