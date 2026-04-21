-- Finance dashboard production hardening.
-- Fixes soft-delete parity, profit report column parity, and intelligence RPC security.

CREATE OR REPLACE FUNCTION public.finance_dashboard_metrics(
  p_month INT,
  p_year INT
) RETURNS TABLE (
  total_inflow NUMERIC,
  total_outflow NUMERIC,
  profit NUMERIC,
  month_change_percent NUMERIC,
  contracts_new BIGINT,
  contracts_done BIGINT,
  total_debt NUMERIC
) AS $$
DECLARE
  v_start DATE := make_date(p_year, p_month, 1);
  v_end DATE := (make_date(p_year, p_month, 1) + INTERVAL '1 month')::DATE;
  v_prev_start DATE := (make_date(p_year, p_month, 1) - INTERVAL '1 month')::DATE;
  v_current_inflow NUMERIC := 0;
  v_previous_inflow NUMERIC := 0;
  v_current_outflow NUMERIC := 0;
BEGIN
  SELECT
    COALESCE((SELECT SUM(amount) FROM public.payments
      WHERE deleted_at IS NULL AND payment_date >= v_start AND payment_date < v_end), 0)
    +
    COALESCE((SELECT SUM(receipt_amount) FROM public.receipts
      WHERE deleted_at IS NULL AND contract_id IS NULL AND receipt_date >= v_start AND receipt_date < v_end), 0)
  INTO v_current_inflow;

  SELECT
    COALESCE((SELECT SUM(amount) FROM public.payments
      WHERE deleted_at IS NULL AND payment_date >= v_prev_start AND payment_date < v_start), 0)
    +
    COALESCE((SELECT SUM(receipt_amount) FROM public.receipts
      WHERE deleted_at IS NULL AND contract_id IS NULL AND receipt_date >= v_prev_start AND receipt_date < v_start), 0)
  INTO v_previous_inflow;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_current_outflow
  FROM public.expenses
  WHERE deleted_at IS NULL
    AND expense_date >= v_start
    AND expense_date < v_end;

  RETURN QUERY
  SELECT
    v_current_inflow AS total_inflow,
    v_current_outflow AS total_outflow,
    v_current_inflow - v_current_outflow AS profit,
    CASE
      WHEN v_previous_inflow = 0 AND v_current_inflow > 0 THEN 100
      WHEN v_previous_inflow = 0 THEN 0
      ELSE ROUND(((v_current_inflow - v_previous_inflow) / v_previous_inflow) * 100, 1)
    END AS month_change_percent,
    (SELECT COUNT(*) FROM public.contracts
      WHERE deleted_at IS NULL AND contract_date >= v_start AND contract_date < v_end) AS contracts_new,
    (SELECT COUNT(*) FROM public.contracts
      WHERE deleted_at IS NULL AND status = 'hoan_thanh'
      AND updated_at >= v_start AND updated_at < v_end) AS contracts_done,
    COALESCE((SELECT SUM(remaining_amount) FROM public.contracts
      WHERE deleted_at IS NULL AND remaining_amount > 0), 0) AS total_debt;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.finance_revenue_by_month(
  p_year INT
) RETURNS TABLE (
  raw_month INT,
  month_label TEXT,
  revenue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH months AS (
    SELECT generate_series(make_date(p_year, 1, 1), make_date(p_year, 12, 1), INTERVAL '1 month')::DATE AS month_start
  ),
  payments_by_month AS (
    SELECT date_trunc('month', payment_date)::DATE AS month_start, SUM(amount) AS amount
    FROM public.payments
    WHERE deleted_at IS NULL
      AND payment_date >= make_date(p_year, 1, 1)
      AND payment_date < make_date(p_year + 1, 1, 1)
    GROUP BY 1
  ),
  receipts_by_month AS (
    SELECT date_trunc('month', receipt_date)::DATE AS month_start, SUM(receipt_amount) AS amount
    FROM public.receipts
    WHERE deleted_at IS NULL
      AND contract_id IS NULL
      AND receipt_date >= make_date(p_year, 1, 1)
      AND receipt_date < make_date(p_year + 1, 1, 1)
    GROUP BY 1
  )
  SELECT
    EXTRACT(MONTH FROM m.month_start)::INT AS raw_month,
    CONCAT('Thang ', EXTRACT(MONTH FROM m.month_start)::INT) AS month_label,
    COALESCE(p.amount, 0) + COALESCE(r.amount, 0) AS revenue
  FROM months m
  LEFT JOIN payments_by_month p ON p.month_start = m.month_start
  LEFT JOIN receipts_by_month r ON r.month_start = m.month_start
  ORDER BY m.month_start;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

DROP FUNCTION IF EXISTS public.finance_contract_profit_report(TEXT, DATE, DATE, INT, INT);

CREATE OR REPLACE FUNCTION public.finance_contract_profit_report(
  p_status TEXT DEFAULT 'all',
  p_from DATE DEFAULT NULL,
  p_to DATE DEFAULT NULL,
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 10
) RETURNS TABLE (
  id UUID,
  contract_code TEXT,
  customer_name TEXT,
  contract_date DATE,
  status TEXT,
  total_amount NUMERIC,
  paid_amount NUMERIC,
  remaining_amount NUMERIC,
  package_revenue NUMERIC,
  addon_revenue NUMERIC,
  discount NUMERIC,
  task_cost NUMERIC,
  print_cost NUMERIC,
  expense_cost NUMERIC,
  total_cost NUMERIC,
  profit NUMERIC,
  profit_margin NUMERIC,
  total_count INT
) AS $$
BEGIN
  RETURN QUERY
  WITH filtered AS (
    SELECT
      c.id,
      c.contract_code,
      cu.full_name AS customer_name,
      c.contract_date,
      c.status,
      c.total_amount,
      COALESCE(c.paid_amount, 0) AS paid_amount,
      COALESCE(c.remaining_amount, 0) AS remaining_amount,
      COALESCE(c.discount_amount, 0) AS discount
    FROM public.contracts c
    LEFT JOIN public.customers cu ON cu.id = c.customer_id
    WHERE c.deleted_at IS NULL
      AND (p_status IS NULL OR p_status = 'all' OR c.status = p_status)
      AND (p_from IS NULL OR c.contract_date >= p_from)
      AND (p_to IS NULL OR c.contract_date <= p_to)
  ),
  item_totals AS (
    SELECT
      ci.contract_id,
      SUM(CASE WHEN COALESCE(ci.is_addon, FALSE) THEN COALESCE(ci.total_amount, 0) ELSE 0 END) AS addon_revenue,
      SUM(CASE WHEN COALESCE(ci.is_addon, FALSE) THEN 0 ELSE COALESCE(ci.total_amount, 0) END) AS package_revenue
    FROM public.contract_items ci
    WHERE ci.deleted_at IS NULL
    GROUP BY ci.contract_id
  ),
  task_totals AS (
    SELECT wt.contract_id, SUM(COALESCE(wt.cost, 0)) AS amount
    FROM public.work_tasks wt
    GROUP BY wt.contract_id
  ),
  print_totals AS (
    SELECT po.contract_id, SUM(COALESCE(po.total_amount, 0)) AS amount
    FROM public.printing_orders po
    WHERE po.deleted_at IS NULL
    GROUP BY po.contract_id
  ),
  expense_totals AS (
    SELECT ex.contract_id, SUM(COALESCE(ex.amount, 0)) AS amount
    FROM public.expenses ex
    WHERE ex.deleted_at IS NULL
      AND ex.contract_id IS NOT NULL
      AND (ex.description IS NULL OR ex.description NOT LIKE '[Auto-Print]%')
    GROUP BY ex.contract_id
  ),
  enriched AS (
    SELECT
      f.*,
      COALESCE(i.package_revenue, 0) AS package_revenue,
      COALESCE(i.addon_revenue, 0) AS addon_revenue,
      COALESCE(t.amount, 0) AS task_cost,
      COALESCE(p.amount, 0) AS print_cost,
      COALESCE(e.amount, 0) AS expense_cost,
      COUNT(*) OVER()::INT AS total_count
    FROM filtered f
    LEFT JOIN item_totals i ON i.contract_id = f.id
    LEFT JOIN task_totals t ON t.contract_id = f.id
    LEFT JOIN print_totals p ON p.contract_id = f.id
    LEFT JOIN expense_totals e ON e.contract_id = f.id
    ORDER BY f.contract_date DESC, f.contract_code DESC
    LIMIT p_page_size
    OFFSET GREATEST(p_page - 1, 0) * p_page_size
  )
  SELECT
    e.id,
    e.contract_code::TEXT,
    COALESCE(e.customer_name, 'Khach vang lai')::TEXT AS customer_name,
    e.contract_date,
    e.status::TEXT,
    e.total_amount,
    e.paid_amount,
    e.remaining_amount,
    e.package_revenue,
    e.addon_revenue,
    e.discount,
    e.task_cost,
    e.print_cost,
    e.expense_cost,
    e.task_cost + e.print_cost + e.expense_cost AS total_cost,
    e.total_amount - (e.task_cost + e.print_cost + e.expense_cost) AS profit,
    CASE
      WHEN e.total_amount = 0 THEN 0::NUMERIC
      ELSE ROUND(((e.total_amount - (e.task_cost + e.print_cost + e.expense_cost)) / e.total_amount) * 100, 1)::NUMERIC
    END AS profit_margin,
    e.total_count
  FROM enriched e;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.finance_ledger(
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 20,
  p_month INT DEFAULT NULL,
  p_year INT DEFAULT NULL,
  p_type TEXT DEFAULT NULL
) RETURNS TABLE (
  id UUID,
  source_table TEXT,
  direction TEXT,
  transaction_date DATE,
  amount NUMERIC,
  code TEXT,
  customer_name TEXT,
  category_name TEXT,
  payment_method TEXT,
  description TEXT,
  status TEXT,
  total_count INT
) AS $$
BEGIN
  RETURN QUERY
  WITH entries AS (
    SELECT
      p.id,
      'payments'::TEXT AS source_table,
      'in'::TEXT AS direction,
      p.payment_date AS transaction_date,
      p.amount,
      COALESCE(p.receipt_code, c.contract_code, CONCAT('PAY-', LEFT(p.id::TEXT, 8))) AS code,
      cu.full_name AS customer_name,
      tc.name AS category_name,
      p.payment_method::TEXT AS payment_method,
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
      'receipts'::TEXT AS source_table,
      'in'::TEXT AS direction,
      r.receipt_date AS transaction_date,
      r.receipt_amount AS amount,
      COALESCE(r.contract_code, CONCAT('REC-', LEFT(r.id::TEXT, 8))) AS code,
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
      'expenses'::TEXT AS source_table,
      'out'::TEXT AS direction,
      e.expense_date AS transaction_date,
      e.amount,
      COALESCE(c.contract_code, CONCAT('EXP-', LEFT(e.id::TEXT, 8))) AS code,
      COALESCE(e.recipient, cu.full_name) AS customer_name,
      tc.name AS category_name,
      e.payment_method::TEXT AS payment_method,
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
    WHERE (p_month IS NULL OR EXTRACT(MONTH FROM e.transaction_date)::INT = p_month)
      AND (p_year IS NULL OR EXTRACT(YEAR FROM e.transaction_date)::INT = p_year)
      AND (p_type IS NULL OR p_type = 'all' OR e.direction = p_type)
  ),
  counted AS (
    SELECT f.*, COUNT(*) OVER()::INT AS total_count
    FROM filtered f
    ORDER BY f.transaction_date DESC, f.created_at DESC NULLS LAST, f.id DESC
    LIMIT p_page_size
    OFFSET GREATEST(p_page - 1, 0) * p_page_size
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
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_finance_intelligence()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now date := current_date;
  v_first_day date := date_trunc('month', v_now)::date;
  v_last_day date := (date_trunc('month', v_now) + interval '1 month - 1 day')::date;
  v_prev_first date := date_trunc('month', v_now - interval '1 month')::date;
  v_prev_last date := (date_trunc('month', v_now - interval '1 month') + interval '1 month - 1 day')::date;
  v_current_rev numeric := 0;
  v_current_exp numeric := 0;
  v_prev_rev numeric := 0;
  v_prev_exp numeric := 0;
  v_lifetime_rev numeric := 0;
  v_lifetime_exp numeric := 0;
  v_receivables numeric := 0;
  v_payables numeric := 0;
  v_current_cash numeric := 0;
  v_fixed_cost numeric := 0;
  v_salary_component numeric := 0;
  v_burn_rate numeric := 0;
  v_profit_margin numeric := 0;
  v_profit_score int := 0;
  v_profit_label text := '';
  v_target numeric := 0;
  v_be_percent numeric := 0;
  v_be_score int := 0;
  v_be_label text := '';
  v_runway_months numeric := 99;
  v_runway_score int := 0;
  v_runway_label text := '';
  v_rec_ratio numeric := 0;
  v_rec_score int := 0;
  v_rec_label text := '';
  v_cash_score int := 0;
  v_cash_label text := '';
  v_total_score int := 0;
  v_health_status text := '';
  v_health_message text := '';
BEGIN
  SELECT
    COALESCE((SELECT SUM(amount) FROM payments WHERE deleted_at IS NULL AND payment_date BETWEEN v_first_day AND v_last_day), 0)
    +
    COALESCE((SELECT SUM(receipt_amount) FROM receipts WHERE deleted_at IS NULL AND contract_id IS NULL AND receipt_date BETWEEN v_first_day AND v_last_day), 0)
  INTO v_current_rev;

  SELECT
    COALESCE((SELECT SUM(amount) FROM payments WHERE deleted_at IS NULL AND payment_date BETWEEN v_prev_first AND v_prev_last), 0)
    +
    COALESCE((SELECT SUM(receipt_amount) FROM receipts WHERE deleted_at IS NULL AND contract_id IS NULL AND receipt_date BETWEEN v_prev_first AND v_prev_last), 0)
  INTO v_prev_rev;

  SELECT
    COALESCE((SELECT SUM(amount) FROM payments WHERE deleted_at IS NULL), 0)
    +
    COALESCE((SELECT SUM(receipt_amount) FROM receipts WHERE deleted_at IS NULL AND contract_id IS NULL), 0)
  INTO v_lifetime_rev;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_current_exp
  FROM expenses
  WHERE deleted_at IS NULL
    AND expense_date BETWEEN v_first_day AND v_last_day;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_prev_exp
  FROM expenses
  WHERE deleted_at IS NULL
    AND expense_date BETWEEN v_prev_first AND v_prev_last;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_lifetime_exp
  FROM expenses
  WHERE deleted_at IS NULL;

  SELECT COALESCE(SUM(remaining), 0)
  INTO v_receivables
  FROM debts
  WHERE type = 'receivable'
    AND COALESCE(status, 'open') NOT IN ('closed', 'da_thanh_toan')
    AND deleted_at IS NULL;

  SELECT COALESCE(SUM(remaining), 0)
  INTO v_payables
  FROM debts
  WHERE type = 'payable'
    AND COALESCE(status, 'open') NOT IN ('closed', 'da_thanh_toan')
    AND deleted_at IS NULL;

  SELECT COALESCE(SUM(monthly_amount), 0)
  INTO v_fixed_cost
  FROM fixed_costs
  WHERE deleted_at IS NULL
    AND (start_date IS NULL OR start_date <= v_last_day)
    AND (end_date IS NULL OR end_date >= v_first_day);

  SELECT COALESCE(SUM(total_salary), 0)
  INTO v_salary_component
  FROM monthly_salaries
  WHERE month = extract(month from v_now)
    AND year = extract(year from v_now);

  v_burn_rate := v_fixed_cost + v_salary_component;
  IF v_burn_rate = 0 THEN
    SELECT COALESCE(SUM(amount) / 3, 0)
    INTO v_burn_rate
    FROM expenses
    WHERE deleted_at IS NULL
      AND expense_date BETWEEN (v_first_day - interval '3 months')::date AND v_last_day;
  END IF;

  v_current_exp := v_current_exp + v_salary_component;
  v_lifetime_exp := v_lifetime_exp + v_salary_component;
  v_current_cash := v_lifetime_rev - v_lifetime_exp;

  IF v_current_rev > 0 THEN
    v_profit_margin := (v_current_rev - v_current_exp) / v_current_rev;
  END IF;

  IF v_profit_margin >= 0.3 THEN
    v_profit_score := 20; v_profit_label := 'Bien loi nhuan cao';
  ELSIF v_profit_margin >= 0.15 THEN
    v_profit_score := 16; v_profit_label := 'Co lai tot';
  ELSIF v_profit_margin > 0 THEN
    v_profit_score := 12; v_profit_label := 'Lai mong';
  ELSIF v_current_rev > 0 THEN
    v_profit_score := 5; v_profit_label := 'Hoa von / Lo';
  ELSE
    v_profit_score := 0; v_profit_label := 'Chua co doanh thu';
  END IF;

  v_target := GREATEST(v_burn_rate, v_current_exp);
  IF v_target > 0 THEN
    v_be_percent := ROUND((v_current_rev / v_target) * 100);
  END IF;

  IF v_be_percent >= 100 THEN
    v_be_score := 25; v_be_label := 'Vuot muc tieu';
  ELSIF v_be_percent >= 50 THEN
    v_be_score := 15; v_be_label := 'Tien trien tot';
  ELSE
    v_be_score := 5; v_be_label := 'Can day manh';
  END IF;

  IF v_burn_rate > 0 THEN
    v_runway_months := ROUND((v_current_cash / v_burn_rate) * 10.0) / 10.0;
  END IF;

  IF v_runway_months > 6 THEN
    v_runway_score := 25; v_runway_label := 'An toan';
  ELSIF v_runway_months > 3 THEN
    v_runway_score := 20; v_runway_label := 'Tot';
  ELSIF v_runway_months > 1 THEN
    v_runway_score := 10; v_runway_label := 'Can chu y';
  ELSE
    v_runway_score := 0; v_runway_label := 'Nguy hiem';
  END IF;

  IF v_current_rev > 0 THEN
    v_rec_ratio := v_receivables / v_current_rev;
  END IF;

  IF v_payables = 0 AND v_receivables = 0 THEN
    v_rec_score := 15; v_rec_label := 'Lanh manh';
  ELSIF v_receivables > v_payables AND v_rec_ratio < 2 THEN
    v_rec_score := 15; v_rec_label := 'Lanh manh';
  ELSIF v_receivables > v_payables THEN
    v_rec_score := 10; v_rec_label := 'Phai thu cao';
  ELSE
    v_rec_score := 5; v_rec_label := 'No phai tra cao';
  END IF;

  IF (v_current_rev - v_current_exp) > 0 THEN
    v_cash_score := 15; v_cash_label := 'Duong';
  ELSIF v_current_exp = 0 THEN
    v_cash_score := 10; v_cash_label := 'Chua phat sinh';
  ELSE
    v_cash_score := 0; v_cash_label := 'Am';
  END IF;

  v_total_score := LEAST(100, GREATEST(0, v_profit_score + v_be_score + v_runway_score + v_rec_score + v_cash_score));

  IF v_total_score < 30 THEN
    v_health_status := 'CRITICAL'; v_health_message := 'Cua hang dang gap rui ro dong tien lon.';
  ELSIF v_total_score < 60 THEN
    v_health_status := 'WARNING'; v_health_message := 'Can chu y toi uu chi phi va thu hoi cong no.';
  ELSIF v_total_score > 85 THEN
    v_health_status := 'EXCELLENT'; v_health_message := 'Tinh hinh tai chinh dang o muc rat an tam.';
  ELSE
    v_health_status := 'STABLE'; v_health_message := 'Suc khoe tai chinh on dinh.';
  END IF;

  RETURN json_build_object(
    'health_score', v_total_score,
    'health_status', v_health_status,
    'health_message', v_health_message,
    'breakdown', json_build_object(
      'profitability', json_build_object('score', v_profit_score, 'label', v_profit_label),
      'breakeven', json_build_object('score', v_be_score, 'label', v_be_label),
      'runway', json_build_object('score', v_runway_score, 'label', v_runway_label),
      'receivables', json_build_object('score', v_rec_score, 'label', v_rec_label),
      'cashflow', json_build_object('score', v_cash_score, 'label', v_cash_label)
    ),
    'cashflow', json_build_object(
      'currentCash', v_current_cash,
      'burnRate', v_burn_rate,
      'runwayMonths', v_runway_months,
      'projectedBalance', v_current_cash + v_receivables - v_payables,
      'lowCashWarning', v_current_cash < (v_burn_rate * 1.5)
    ),
    'breakeven', json_build_object(
      'target', v_target,
      'current', v_current_rev,
      'percent', v_be_percent,
      'remainingAmount', GREATEST(0, v_target - v_current_rev)
    ),
    'stats', json_build_object(
      'monthlyRevenue', v_current_rev,
      'monthlyExpense', v_current_exp,
      'monthlyProfit', v_current_rev - v_current_exp,
      'receivables', v_receivables,
      'payables', v_payables,
      'prevRevenue', v_prev_rev,
      'prevExpense', v_prev_exp
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_cashflow_forecast(p_days integer DEFAULT 30)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := current_date;
  v_current_cash numeric := 0;
  v_lifetime_rev numeric := 0;
  v_lifetime_exp numeric := 0;
  v_fixed_cost numeric := 0;
  v_salary_component numeric := 0;
  v_forecast jsonb := '[]'::jsonb;
  v_running_bal numeric := 0;
  v_total_inflow numeric := 0;
  v_total_outflow numeric := 0;
  v_lowest_cash numeric := 0;
  v_critical_date date := NULL;
  v_curr_date date;
  v_contract_sum numeric;
  v_day_inflow numeric;
  v_day_outflow numeric;
  v_events jsonb;
BEGIN
  SELECT
    COALESCE((SELECT SUM(amount) FROM payments WHERE deleted_at IS NULL), 0)
    +
    COALESCE((SELECT SUM(receipt_amount) FROM receipts WHERE deleted_at IS NULL AND contract_id IS NULL), 0)
  INTO v_lifetime_rev;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_lifetime_exp
  FROM expenses
  WHERE deleted_at IS NULL;

  v_current_cash := v_lifetime_rev - v_lifetime_exp;
  v_running_bal := v_current_cash;
  v_lowest_cash := v_current_cash;

  SELECT COALESCE(SUM(monthly_amount), 0)
  INTO v_fixed_cost
  FROM fixed_costs
  WHERE deleted_at IS NULL
    AND (start_date IS NULL OR start_date <= (v_today + p_days))
    AND (end_date IS NULL OR end_date >= v_today);

  SELECT COALESCE(SUM(total_salary), 0)
  INTO v_salary_component
  FROM monthly_salaries
  WHERE month = extract(month from v_today)
    AND year = extract(year from v_today);

  FOR i IN 0..(p_days - 1) LOOP
    v_curr_date := v_today + i;
    v_day_inflow := 0;
    v_day_outflow := 0;
    v_events := '[]'::jsonb;

    SELECT COALESCE(SUM(c.remaining_amount), 0)
    INTO v_contract_sum
    FROM contracts c
    WHERE c.work_date::date = v_curr_date
      AND c.remaining_amount > 0
      AND c.deleted_at IS NULL;

    IF v_contract_sum > 0 THEN
      v_day_inflow := v_day_inflow + v_contract_sum;
      v_events := v_events || jsonb_build_object('title', 'Du thu hop dong', 'amount', v_contract_sum, 'type', 'IN');
    END IF;

    IF extract(day from v_curr_date) = 1 AND v_fixed_cost > 0 THEN
      v_day_outflow := v_day_outflow + v_fixed_cost;
      v_events := v_events || jsonb_build_object('title', 'Chi phi co dinh', 'amount', v_fixed_cost, 'type', 'OUT');
    END IF;

    IF extract(day from v_curr_date) = 5 AND v_salary_component > 0 THEN
      v_day_outflow := v_day_outflow + v_salary_component;
      v_events := v_events || jsonb_build_object('title', 'Bang luong du kien', 'amount', v_salary_component, 'type', 'OUT');
    END IF;

    v_running_bal := v_running_bal + v_day_inflow - v_day_outflow;
    v_total_inflow := v_total_inflow + v_day_inflow;
    v_total_outflow := v_total_outflow + v_day_outflow;

    IF v_running_bal < v_lowest_cash THEN
      v_lowest_cash := v_running_bal;
      v_critical_date := v_curr_date;
    END IF;

    v_forecast := v_forecast || jsonb_build_object(
      'date', to_char(v_curr_date, 'YYYY-MM-DD'),
      'projectedIncome', v_day_inflow,
      'projectedExpense', v_day_outflow,
      'balance', v_running_bal,
      'events', v_events
    );
  END LOOP;

  RETURN json_build_object(
    'currentBalance', v_current_cash,
    'monthlyBurnRate', v_fixed_cost + v_salary_component,
    'forecast30Days', v_forecast,
    'summary', json_build_object(
      'projectedInflow', v_total_inflow,
      'projectedOutflow', v_total_outflow,
      'netChange', v_total_inflow - v_total_outflow,
      'criticalDate', to_char(v_critical_date, 'YYYY-MM-DD')
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_expense_breakdown(p_month integer, p_year integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total numeric;
  v_result jsonb;
BEGIN
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total
  FROM expenses
  WHERE extract(month from expense_date) = p_month
    AND extract(year from expense_date) = p_year
    AND deleted_at IS NULL;

  SELECT jsonb_agg(
    jsonb_build_object(
      'category_name', COALESCE(ec.name, 'Khac'),
      'total', COALESCE(s.amt, 0),
      'percentage', CASE WHEN v_total > 0 THEN round((COALESCE(s.amt, 0) / v_total) * 100) ELSE 0 END,
      'count', COALESCE(s.cnt, 0)
    )
    ORDER BY COALESCE(s.amt, 0) DESC
  )
  INTO v_result
  FROM (
    SELECT category_id, SUM(amount) AS amt, COUNT(*) AS cnt
    FROM expenses
    WHERE extract(month from expense_date) = p_month
      AND extract(year from expense_date) = p_year
      AND deleted_at IS NULL
    GROUP BY category_id
  ) s
  LEFT JOIN transaction_categories ec ON ec.id = s.category_id
  WHERE COALESCE(s.amt, 0) > 0;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_receivable_aging()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  WITH raw_agings AS (
    SELECT remaining_amount, (current_date - contract_date::date) AS age_days
    FROM contracts
    WHERE remaining_amount > 0
      AND deleted_at IS NULL
  ),
  bucketed AS (
    SELECT
      CASE
        WHEN age_days <= 30 THEN '0_30'
        WHEN age_days <= 60 THEN '31_60'
        WHEN age_days <= 90 THEN '61_90'
        ELSE '90_plus'
      END AS bucket,
      remaining_amount
    FROM raw_agings
  )
  SELECT json_build_object(
    '0_30', json_build_object('total', COALESCE(SUM(remaining_amount) FILTER (WHERE bucket = '0_30'), 0), 'count', COUNT(*) FILTER (WHERE bucket = '0_30')),
    '31_60', json_build_object('total', COALESCE(SUM(remaining_amount) FILTER (WHERE bucket = '31_60'), 0), 'count', COUNT(*) FILTER (WHERE bucket = '31_60')),
    '61_90', json_build_object('total', COALESCE(SUM(remaining_amount) FILTER (WHERE bucket = '61_90'), 0), 'count', COUNT(*) FILTER (WHERE bucket = '61_90')),
    '90_plus', json_build_object('total', COALESCE(SUM(remaining_amount) FILTER (WHERE bucket = '90_plus'), 0), 'count', COUNT(*) FILTER (WHERE bucket = '90_plus'))
  )
  INTO v_result
  FROM bucketed;

  RETURN COALESCE(v_result, '{"0_30":{"total":0,"count":0},"31_60":{"total":0,"count":0},"61_90":{"total":0,"count":0},"90_plus":{"total":0,"count":0}}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_budget_vs_actual(p_month integer, p_year integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  WITH actuals AS (
    SELECT COALESCE(ec.name, 'Khac') AS cat_name, SUM(e.amount) AS actual_amount
    FROM expenses e
    LEFT JOIN transaction_categories ec ON e.category_id = ec.id
    WHERE extract(month from e.expense_date) = p_month
      AND extract(year from e.expense_date) = p_year
      AND e.deleted_at IS NULL
    GROUP BY COALESCE(ec.name, 'Khac')
  ),
  budgets_agg AS (
    SELECT category_name AS cat_name, SUM(budget_amount) AS budget_amount
    FROM budgets
    WHERE period_month = p_month
      AND period_year = p_year
      AND deleted_at IS NULL
    GROUP BY category_name
  ),
  all_cats AS (
    SELECT cat_name FROM actuals
    UNION
    SELECT cat_name FROM budgets_agg
  )
  SELECT json_agg(
    json_build_object(
      'category', ac.cat_name,
      'budget', COALESCE(b.budget_amount, 0),
      'actual', COALESCE(a.actual_amount, 0),
      'variance', COALESCE(b.budget_amount, 0) - COALESCE(a.actual_amount, 0),
      'variance_pct', CASE WHEN COALESCE(b.budget_amount, 0) > 0 THEN round(((COALESCE(b.budget_amount, 0) - COALESCE(a.actual_amount, 0)) / b.budget_amount) * 100) ELSE 0 END
    )
  )
  INTO v_result
  FROM all_cats ac
  LEFT JOIN budgets_agg b ON ac.cat_name = b.cat_name
  LEFT JOIN actuals a ON ac.cat_name = a.cat_name;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.finance_dashboard_metrics(INT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finance_revenue_by_month(INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finance_contract_profit_report(TEXT, DATE, DATE, INT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finance_ledger(INT, INT, INT, INT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_finance_intelligence() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_cashflow_forecast(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_expense_breakdown(integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_receivable_aging() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_budget_vs_actual(integer, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.finance_dashboard_metrics(INT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.finance_revenue_by_month(INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.finance_contract_profit_report(TEXT, DATE, DATE, INT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.finance_ledger(INT, INT, INT, INT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_finance_intelligence() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_cashflow_forecast(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_expense_breakdown(integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_receivable_aging() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_budget_vs_actual(integer, integer) TO service_role;
