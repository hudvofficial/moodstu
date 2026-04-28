-- Finance audit completion: soft-delete consistency and server-side finance aggregates.

ALTER TABLE IF EXISTS public.investments
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE IF EXISTS public.credit_cards
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE IF EXISTS public.financial_goals
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE IF EXISTS public.budgets
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE IF EXISTS public.fixed_costs
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_investments_active_purchase_date
  ON public.investments(purchase_date DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_credit_cards_active_bank_name
  ON public.credit_cards(bank_name)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_financial_goals_active_created_at
  ON public.financial_goals(created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_budgets_active_period_category
  ON public.budgets(period_year, period_month, category_name)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_fixed_costs_active_dates
  ON public.fixed_costs(start_date, end_date)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_debts_active_type_due_status
  ON public.debts(type, due_date, status)
  WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.finance_ledger_range(
  p_page int DEFAULT 1,
  p_page_size int DEFAULT 20,
  p_from_date date DEFAULT NULL,
  p_to_date date DEFAULT NULL,
  p_type text DEFAULT 'all'
) RETURNS TABLE (
  id uuid,
  source_table text,
  direction text,
  transaction_date date,
  amount numeric,
  code text,
  customer_name text,
  category_name text,
  payment_method text,
  description text,
  status text,
  total_count int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH safe_params AS (
    SELECT
      GREATEST(COALESCE(p_page, 1), 1)::int AS page,
      LEAST(GREATEST(COALESCE(p_page_size, 20), 1), 50)::int AS page_size,
      LEAST(COALESCE(p_from_date, p_to_date, current_date), COALESCE(p_to_date, p_from_date, current_date)) AS from_date,
      GREATEST(COALESCE(p_from_date, p_to_date, current_date), COALESCE(p_to_date, p_from_date, current_date)) AS to_date,
      COALESCE(NULLIF(p_type, ''), 'all') AS entry_type
  ),
  entries AS (
    SELECT
      p.id,
      'payments'::text AS source_table,
      'in'::text AS direction,
      p.payment_date AS transaction_date,
      p.amount,
      COALESCE(p.receipt_code, c.contract_code, CONCAT('PAY-', LEFT(p.id::text, 8))) AS code,
      cu.full_name AS customer_name,
      tc.name AS category_name,
      p.payment_method::text AS payment_method,
      COALESCE(p.notes, p.payment_stage, c.contract_code) AS description,
      CASE WHEN p.approved_by IS NULL THEN 'pending' ELSE 'approved' END AS status,
      p.created_at
    FROM public.payments p
    LEFT JOIN public.contracts c ON c.id = p.contract_id
    LEFT JOIN public.customers cu ON cu.id = COALESCE(p.customer_id, c.customer_id)
    LEFT JOIN public.transaction_categories tc ON tc.id = p.category_id
    WHERE p.deleted_at IS NULL

    UNION ALL

    SELECT
      r.id,
      'receipts'::text AS source_table,
      'in'::text AS direction,
      r.receipt_date AS transaction_date,
      r.receipt_amount AS amount,
      COALESCE(r.contract_code, CONCAT('REC-', LEFT(r.id::text, 8))) AS code,
      r.customer_name,
      COALESCE(r.category_name, tc.name) AS category_name,
      r.payment_type AS payment_method,
      r.notes AS description,
      COALESCE(r.status, 'confirmed') AS status,
      r.created_at
    FROM public.receipts r
    LEFT JOIN public.transaction_categories tc ON tc.id = r.category_id
    WHERE r.deleted_at IS NULL
      AND r.contract_id IS NULL

    UNION ALL

    SELECT
      e.id,
      'expenses'::text AS source_table,
      'out'::text AS direction,
      e.expense_date AS transaction_date,
      e.amount,
      COALESCE(c.contract_code, CONCAT('EXP-', LEFT(e.id::text, 8))) AS code,
      COALESCE(e.recipient, cu.full_name) AS customer_name,
      tc.name AS category_name,
      e.payment_method::text AS payment_method,
      e.description,
      CASE WHEN e.approved_by IS NULL THEN 'pending' ELSE 'approved' END AS status,
      e.created_at
    FROM public.expenses e
    LEFT JOIN public.contracts c ON c.id = e.contract_id
    LEFT JOIN public.customers cu ON cu.id = c.customer_id
    LEFT JOIN public.transaction_categories tc ON tc.id = e.category_id
    WHERE e.deleted_at IS NULL
  ),
  filtered AS (
    SELECT e.*
    FROM entries e
    CROSS JOIN safe_params sp
    WHERE e.transaction_date >= sp.from_date
      AND e.transaction_date <= sp.to_date
      AND (sp.entry_type = 'all' OR e.direction = sp.entry_type)
  ),
  counted AS (
    SELECT f.*, COUNT(*) OVER()::int AS total_count
    FROM filtered f
    CROSS JOIN safe_params sp
    ORDER BY f.transaction_date DESC, f.created_at DESC NULLS LAST, f.id DESC
    LIMIT (SELECT page_size FROM safe_params)
    OFFSET ((SELECT page FROM safe_params) - 1) * (SELECT page_size FROM safe_params)
  )
  SELECT
    c.id,
    c.source_table,
    c.direction,
    c.transaction_date,
    c.amount,
    c.code,
    COALESCE(c.customer_name, '-') AS customer_name,
    COALESCE(c.category_name, '-') AS category_name,
    c.payment_method,
    COALESCE(c.description, '') AS description,
    c.status,
    c.total_count
  FROM counted c;
$$;

CREATE OR REPLACE FUNCTION public.finance_debt_stats()
RETURNS TABLE (
  receivable numeric,
  payable numeric,
  overdue numeric,
  net_debt numeric,
  aging jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH raw_debts AS (
    SELECT
      CASE
        WHEN d.type = 'receivable' OR LOWER(COALESCE(d.type, '')) LIKE '%thu%' THEN 'receivable'
        ELSE 'payable'
      END AS debt_direction,
      GREATEST(0, COALESCE(d.remaining, d.amount - COALESCE(d.paid_amount, 0), 0)) AS remaining_amount,
      d.due_date,
      COALESCE(d.status, 'open') AS status
    FROM public.debts d
    WHERE d.deleted_at IS NULL
  ),
  active_debts AS (
    SELECT
      debt_direction,
      remaining_amount,
      CASE
        WHEN due_date IS NOT NULL
          AND due_date < current_date
          AND status NOT IN ('closed', 'da_thanh_toan')
          THEN current_date - due_date
        ELSE 0
      END AS overdue_days
    FROM raw_debts
    WHERE remaining_amount > 0
      AND status NOT IN ('closed', 'da_thanh_toan')
  ),
  totals AS (
    SELECT
      COALESCE(SUM(remaining_amount) FILTER (WHERE debt_direction = 'receivable'), 0) AS receivable,
      COALESCE(SUM(remaining_amount) FILTER (WHERE debt_direction = 'payable'), 0) AS payable,
      COALESCE(SUM(remaining_amount) FILTER (WHERE overdue_days > 0), 0) AS overdue,
      COALESCE(SUM(remaining_amount) FILTER (WHERE overdue_days = 0), 0) AS not_due,
      COALESCE(SUM(remaining_amount) FILTER (WHERE overdue_days BETWEEN 1 AND 30), 0) AS days_1_30,
      COALESCE(SUM(remaining_amount) FILTER (WHERE overdue_days BETWEEN 31 AND 60), 0) AS days_31_60,
      COALESCE(SUM(remaining_amount) FILTER (WHERE overdue_days BETWEEN 61 AND 90), 0) AS days_61_90,
      COALESCE(SUM(remaining_amount) FILTER (WHERE overdue_days > 90), 0) AS over_90
    FROM active_debts
  )
  SELECT
    t.receivable,
    t.payable,
    t.overdue,
    t.receivable - t.payable AS net_debt,
    jsonb_build_object(
      'not_due', t.not_due,
      'days_1_30', t.days_1_30,
      'days_31_60', t.days_31_60,
      'days_61_90', t.days_61_90,
      'over_90', t.over_90
    ) AS aging
  FROM totals t;
$$;

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
  revenue_summary AS (
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
      rs.payment_revenue,
      rs.standalone_receipt_revenue,
      rs.payment_revenue + rs.standalone_receipt_revenue AS total_revenue,
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
    FROM revenue_summary rs
    CROSS JOIN contract_summary cs
    CROSS JOIN addon_summary ads
    CROSS JOIN direct_costs dc
    CROSS JOIN expense_summary es
    CROSS JOIN salary_summary ss
    CROSS JOIN fixed_cost_summary fcs
  )
  SELECT jsonb_build_object(
    'summary', jsonb_build_object(
      'totalRevenue', t.total_revenue,
      'totalCost', t.direct_cost + t.operating_cost + t.salary_cost + t.fixed_cost,
      'directCost', t.direct_cost,
      'operatingCost', t.operating_cost,
      'salaryCost', t.salary_cost,
      'fixedCost', t.fixed_cost,
      'netProfit', t.total_revenue - (t.direct_cost + t.operating_cost + t.salary_cost + t.fixed_cost),
      'profitMargin', CASE
        WHEN t.total_revenue > 0 THEN ROUND(((t.total_revenue - (t.direct_cost + t.operating_cost + t.salary_cost + t.fixed_cost)) / t.total_revenue) * 1000) / 10
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
        'label', 'Thu hop dong',
        'amount', t.payment_revenue,
        'percentage', CASE WHEN t.total_revenue > 0 THEN ROUND((t.payment_revenue / t.total_revenue) * 1000) / 10 ELSE 0 END
      ),
      jsonb_build_object(
        'label', 'Thu khac',
        'amount', t.standalone_receipt_revenue,
        'percentage', CASE WHEN t.total_revenue > 0 THEN ROUND((t.standalone_receipt_revenue / t.total_revenue) * 1000) / 10 ELSE 0 END
      )
    ),
    'cashflowSummary', jsonb_build_object(
      'totalInflow', t.total_revenue,
      'totalOutflow', t.operating_outflow + t.salary_cost + t.fixed_cost,
      'salaryCost', t.salary_cost,
      'fixedCost', t.fixed_cost,
      'operatingNet', t.total_revenue - t.operating_outflow,
      'netAfterOverhead', t.total_revenue - (t.operating_outflow + t.salary_cost + t.fixed_cost)
    )
  )
  FROM totals t
  CROSS JOIN service_json sj;
$$;

REVOKE ALL ON FUNCTION public.finance_ledger_range(int, int, date, date, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finance_debt_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finance_reports_snapshot(date, date) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.finance_ledger_range(int, int, date, date, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.finance_debt_stats() TO service_role;
GRANT EXECUTE ON FUNCTION public.finance_reports_snapshot(date, date) TO service_role;
