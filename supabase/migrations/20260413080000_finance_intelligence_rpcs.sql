-- 1. get_finance_intelligence
CREATE OR REPLACE FUNCTION get_finance_intelligence()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
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
        SELECT COALESCE(SUM(receipt_amount), 0) INTO v_current_rev FROM receipts WHERE receipt_date BETWEEN v_first_day AND v_last_day AND deleted_at IS NULL;
        SELECT COALESCE(SUM(amount), 0) INTO v_current_exp FROM expenses WHERE expense_date BETWEEN v_first_day AND v_last_day AND deleted_at IS NULL;
        
        SELECT COALESCE(SUM(receipt_amount), 0) INTO v_prev_rev FROM receipts WHERE receipt_date BETWEEN v_prev_first AND v_prev_last AND deleted_at IS NULL;
        SELECT COALESCE(SUM(amount), 0) INTO v_prev_exp FROM expenses WHERE expense_date BETWEEN v_prev_first AND v_prev_last AND deleted_at IS NULL;
        
        SELECT COALESCE(SUM(receipt_amount), 0) INTO v_lifetime_rev FROM receipts WHERE deleted_at IS NULL;
        SELECT COALESCE(SUM(amount), 0) INTO v_lifetime_exp FROM expenses WHERE deleted_at IS NULL;
        
        SELECT COALESCE(SUM(remaining), 0) INTO v_receivables FROM debts WHERE type = 'receivable' AND status != 'closed' AND deleted_at IS NULL;
        SELECT COALESCE(SUM(remaining), 0) INTO v_payables FROM debts WHERE type = 'payable' AND status != 'closed' AND deleted_at IS NULL;
        
        v_current_cash := v_lifetime_rev - v_lifetime_exp;
        
        SELECT COALESCE(SUM(budget_amount), 0) INTO v_burn_rate FROM budgets WHERE period_month = extract(month from v_now) AND period_year = extract(year from v_now) AND deleted_at IS NULL;
        
        IF v_burn_rate = 0 THEN
            SELECT COALESCE(SUM(amount)/3, 0) INTO v_burn_rate FROM expenses WHERE expense_date BETWEEN (v_first_day - interval '3 months')::date AND v_last_day AND deleted_at IS NULL;
        END IF;
        
        IF v_current_rev > 0 THEN
            v_profit_margin := (v_current_rev - v_current_exp) / v_current_rev;
        END IF;
        
        IF v_profit_margin >= 0.3 THEN
            v_profit_score := 20; v_profit_label := 'Biên lợi nhuận cao';
        ELSIF v_profit_margin >= 0.15 THEN
            v_profit_score := 16; v_profit_label := 'Có lãi tốt';
        ELSIF v_profit_margin > 0 THEN
            v_profit_score := 12; v_profit_label := 'Lãi mỏng';
        ELSIF v_current_rev > 0 THEN
            v_profit_score := 5; v_profit_label := 'Hòa vốn / Lỗ';
        ELSE
            v_profit_score := 0; v_profit_label := 'Chưa có doanh thu';
        END IF;
        
        v_target := GREATEST(v_burn_rate, v_current_exp);
        IF v_target > 0 THEN
            v_be_percent := round((v_current_rev / v_target) * 100);
        END IF;
        IF v_be_percent >= 100 THEN
            v_be_score := 25; v_be_label := 'Vượt mục tiêu';
        ELSIF v_be_percent >= 50 THEN
            v_be_score := 15; v_be_label := 'Tiến triển tốt';
        ELSE
            v_be_score := 5; v_be_label := 'Cần đẩy mạnh';
        END IF;
        
        IF v_burn_rate > 0 THEN
            v_runway_months := round((v_current_cash / v_burn_rate) * 10.0) / 10.0;
        END IF;
        
        IF v_runway_months > 6 THEN
            v_runway_score := 25; v_runway_label := 'An toàn';
        ELSIF v_runway_months > 3 THEN
            v_runway_score := 20; v_runway_label := 'Tốt';
        ELSIF v_runway_months > 1 THEN
            v_runway_score := 10; v_runway_label := 'Cần chú ý';
        ELSE
            v_runway_score := 0; v_runway_label := 'Nguy hiểm';
        END IF;
        
        IF v_current_rev > 0 THEN
            v_rec_ratio := v_receivables / v_current_rev;
        END IF;
        IF v_payables = 0 AND v_receivables = 0 THEN
            v_rec_score := 15; v_rec_label := 'Lành mạnh';
        ELSIF v_receivables > v_payables AND v_rec_ratio < 2 THEN
            v_rec_score := 15; v_rec_label := 'Lành mạnh';
        ELSIF v_receivables > v_payables THEN
            v_rec_score := 10; v_rec_label := 'Phải thu cao';
        ELSE
            v_rec_score := 5; v_rec_label := 'Nợ phải trả cao';
        END IF;
        
        IF (v_current_rev - v_current_exp) > 0 THEN
            v_cash_score := 15; v_cash_label := 'Dương';
        ELSIF v_current_exp = 0 THEN
            v_cash_score := 10; v_cash_label := 'Chưa phát sinh';
        ELSE
            v_cash_score := 0; v_cash_label := 'Âm';
        END IF;
        
        v_total_score := v_profit_score + v_be_score + v_runway_score + v_rec_score + v_cash_score;
        IF v_total_score > 100 THEN v_total_score := 100; END IF;
        
        IF v_total_score < 30 THEN
            v_health_status := 'CRITICAL'; v_health_message := 'Cửa hàng đang gặp rủi ro dòng tiền cực lớn.';
        ELSIF v_total_score < 60 THEN
            v_health_status := 'WARNING'; v_health_message := 'Cần chú ý tối ưu chi phí và thu hồi công nợ.';
        ELSIF v_total_score > 85 THEN
            v_health_status := 'EXCELLENT'; v_health_message := 'Tình hình tài chính đang ở mức rất an tâm.';
        ELSE
            v_health_status := 'STABLE'; v_health_message := 'Sức khỏe tài chính ổn định.';
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
                'lowCashWarning', CASE WHEN v_current_cash < (v_burn_rate * 1.5) THEN true ELSE false END
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
-- 2. get_cashflow_forecast
CREATE OR REPLACE FUNCTION get_cashflow_forecast(p_days integer DEFAULT 30)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_today date := current_date;
    v_current_cash numeric := 0;
    v_lifetime_rev numeric := 0;
    v_lifetime_exp numeric := 0;
    v_burn_rate numeric := 0;
    v_fixed_cost numeric := 0;
    
    v_forecast jsonb := '[]'::jsonb;
    v_running_bal numeric := 0;
    v_total_inflow numeric := 0;
    v_total_outflow numeric := 0;
    v_lowest_cash numeric := 0;
    v_critical_date date := NULL;
    v_day_record jsonb;
    v_events jsonb;
    
    v_curr_date date;
    v_contract_sum numeric;
    v_day_inflow numeric;
    v_day_outflow numeric;
    
    BEGIN
        SELECT COALESCE(SUM(receipt_amount), 0) INTO v_lifetime_rev FROM receipts WHERE deleted_at IS NULL;
        SELECT COALESCE(SUM(amount), 0) INTO v_lifetime_exp FROM expenses WHERE deleted_at IS NULL;
        v_current_cash := v_lifetime_rev - v_lifetime_exp;
        
        v_running_bal := v_current_cash;
        v_lowest_cash := v_current_cash;
        
        SELECT COALESCE(SUM(budget_amount), 0) INTO v_fixed_cost FROM budgets WHERE period_month = extract(month from v_today) AND period_year = extract(year from v_today) AND deleted_at IS NULL;
        
        FOR i IN 0..(p_days - 1) LOOP
            v_curr_date := v_today + i;
            v_day_inflow := 0;
            v_day_outflow := 0;
            v_events := '[]'::jsonb;
            
            SELECT COALESCE(SUM(c.remaining_amount), 0) INTO v_contract_sum 
            FROM contracts c
            WHERE (c.service_type::text ILIKE '%chụp%' OR c.service_type::text ILIKE '%photo%' OR c.service_type::text ILIKE '%wedding%' OR c.service_type::text ILIKE '%combo%')
            AND c.work_date::date = v_curr_date
            AND c.remaining_amount > 0 AND c.deleted_at IS NULL;
            
            IF v_contract_sum > 0 THEN
                v_day_inflow := v_contract_sum;
                v_events := v_events || jsonb_build_object('title', 'Dự thu hợp đồng', 'amount', v_contract_sum, 'type', 'IN');
            END IF;
            
            IF extract(day from v_curr_date) = 1 AND v_fixed_cost > 0 THEN
                v_day_outflow := v_fixed_cost;
                v_events := v_events || jsonb_build_object('title', 'Chi phí định kỳ', 'amount', v_fixed_cost, 'type', 'OUT');
            END IF;
            
            v_running_bal := v_running_bal + v_day_inflow - v_day_outflow;
            v_total_inflow := v_total_inflow + v_day_inflow;
            v_total_outflow := v_total_outflow + v_day_outflow;
            
            IF v_running_bal < v_lowest_cash THEN
                v_lowest_cash := v_running_bal;
                v_critical_date := v_curr_date;
            END IF;
            
            v_day_record := jsonb_build_object(
                'date', to_char(v_curr_date, 'YYYY-MM-DD'),
                'projectedIncome', v_day_inflow,
                'projectedExpense', v_day_outflow,
                'balance', v_running_bal,
                'events', v_events
            );
            v_forecast := v_forecast || v_day_record;
        END LOOP;
        
        RETURN json_build_object(
            'currentBalance', v_current_cash,
            'monthlyBurnRate', v_fixed_cost,
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
-- 3. get_expense_breakdown
CREATE OR REPLACE FUNCTION get_expense_breakdown(p_month integer, p_year integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total numeric;
    v_result jsonb;
BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO v_total FROM expenses WHERE extract(month from expense_date) = p_month AND extract(year from expense_date) = p_year AND deleted_at IS NULL;
    
    SELECT jsonb_agg(
        jsonb_build_object(
            'category_name', ec.name,
            'total', COALESCE(s.amt, 0),
            'percentage', CASE WHEN v_total > 0 THEN round((COALESCE(s.amt, 0) / v_total) * 100) ELSE 0 END,
            'count', COALESCE(s.cnt, 0)
        )
    ) INTO v_result
    FROM transaction_categories ec
    LEFT JOIN (
        SELECT category_id, SUM(amount) as amt, COUNT(*) as cnt 
        FROM expenses 
        WHERE extract(month from expense_date) = p_month AND extract(year from expense_date) = p_year AND deleted_at IS NULL
        GROUP BY category_id
    ) s ON s.category_id = ec.id
    WHERE COALESCE(s.amt, 0) > 0 AND ec.type = 'Chi';
    
    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;
-- 4. get_receivable_aging
CREATE OR REPLACE FUNCTION get_receivable_aging()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result jsonb;
BEGIN
    WITH raw_agings AS (
        SELECT remaining_amount, 
               (current_date - contract_date::date) as age_days
        FROM contracts
        WHERE remaining_amount > 0 AND deleted_at IS NULL
    ), bucketed AS (
        SELECT 
            CASE 
                WHEN age_days <= 30 THEN '0_30'
                WHEN age_days <= 60 THEN '31_60'
                WHEN age_days <= 90 THEN '61_90'
                ELSE '90_plus'
            END as bucket,
            remaining_amount
        FROM raw_agings
    )
    SELECT json_build_object(
        '0_30', json_build_object('total', COALESCE(SUM(remaining_amount) FILTER (WHERE bucket = '0_30'), 0), 'count', COUNT(*) FILTER (WHERE bucket = '0_30')),
        '31_60', json_build_object('total', COALESCE(SUM(remaining_amount) FILTER (WHERE bucket = '31_60'), 0), 'count', COUNT(*) FILTER (WHERE bucket = '31_60')),
        '61_90', json_build_object('total', COALESCE(SUM(remaining_amount) FILTER (WHERE bucket = '61_90'), 0), 'count', COUNT(*) FILTER (WHERE bucket = '61_90')),
        '90_plus', json_build_object('total', COALESCE(SUM(remaining_amount) FILTER (WHERE bucket = '90_plus'), 0), 'count', COUNT(*) FILTER (WHERE bucket = '90_plus'))
    ) INTO v_result
    FROM bucketed;
    
    RETURN COALESCE(v_result, '{"0_30":{"total":0,"count":0},"31_60":{"total":0,"count":0},"61_90":{"total":0,"count":0},"90_plus":{"total":0,"count":0}}'::jsonb);
END;
$$;
-- 5. get_budget_vs_actual
CREATE OR REPLACE FUNCTION get_budget_vs_actual(p_month integer, p_year integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result jsonb;
BEGIN
    WITH actuals AS (
        SELECT ec.name as cat_name, SUM(e.amount) as actual_amount 
        FROM expenses e
        JOIN transaction_categories ec ON e.category_id = ec.id
        WHERE extract(month from e.expense_date) = p_month AND extract(year from e.expense_date) = p_year AND e.deleted_at IS NULL
        GROUP BY ec.name
    ), budgets_agg AS (
        SELECT category_name as cat_name, SUM(budget_amount) as budget_amount
        FROM budgets
        WHERE period_month = p_month AND period_year = p_year AND deleted_at IS NULL
        GROUP BY category_name
    ), all_cats AS (
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
    ) INTO v_result
    FROM all_cats ac
    LEFT JOIN budgets_agg b ON ac.cat_name = b.cat_name
    LEFT JOIN actuals a ON ac.cat_name = a.cat_name;

    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;
