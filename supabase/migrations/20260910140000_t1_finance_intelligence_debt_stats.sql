-- #18 T1 · get_finance_intelligence: công nợ đọc finance_debt_stats() thay bảng debts rỗng — agent/HANDOFFS/T-20260910-health-score-debt-stats.spec.md
-- (migrate-direct.mjs tự bọc BEGIN/COMMIT). Revert: agent/HANDOFFS/T-20260910-health-score-debt-stats.revert.sql
-- Thân hàm sống 10/09, đổi đúng 1 khối (2 SELECT FROM debts → 1 SELECT FROM finance_debt_stats()). Phần còn lại giữ nguyên (tự cộng payments/expenses/fixed_costs/monthly_salaries → #29).

CREATE OR REPLACE FUNCTION public.get_finance_intelligence()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- #18 (T1, 10/09): công nợ đọc sổ canonical finance_debt_stats() — HĐ còn nợ + phải trả lab/thợ (finance_payable_summary) + debts tay —
  -- thay vì bảng debts rỗng (0 dòng từ ngày đầu → điểm công nợ luôn "Lanh manh" giả).
  SELECT COALESCE(d.receivable, 0), COALESCE(d.payable, 0)
  INTO v_receivables, v_payables
  FROM public.finance_debt_stats() d;
  -- SELECT ... INTO gán NULL nếu nguồn trả 0 dòng (COALESCE trong SELECT-list không cứu vì không có dòng nào);
  -- hàm sổ canonical luôn trả 1 dòng, nhưng tiền thì không để NULL lọt xuống 5 thang điểm phía dưới.
  v_receivables := COALESCE(v_receivables, 0);
  v_payables := COALESCE(v_payables, 0);

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

  -- ADR-016 M5: KHONG cong sheet luong len chi that (expenses da chua phieu chi luong payee_type='employee'); burn rate van = co dinh + sheet
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
$function$;

-- ACL: hàm SECURITY DEFINER trả toàn bộ số tài chính; app chỉ gọi qua withAuth (service role). Trước 10/09 anon + authenticated cũng EXECUTE được.
REVOKE ALL ON FUNCTION public.get_finance_intelligence() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_finance_intelligence() TO service_role;
