-- Finance dashboard advanced intelligence.
-- One RPC keeps V2 dashboard parity with V1 while preserving server-side SSOT.

CREATE OR REPLACE FUNCTION public.get_finance_advanced_intelligence(
  p_month integer,
  p_year integer
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start date;
  v_end date;
  v_prev_start date;
  v_monthly_revenue numeric := 0;
  v_monthly_expense numeric := 0;
  v_monthly_profit numeric := 0;
  v_contracts_month integer := 0;
  v_contract_value_month numeric := 0;
  v_contracts_all integer := 0;
  v_contract_value_all numeric := 0;
  v_total_customers integer := 0;
  v_contract_customer_count integer := 0;
  v_repeat_customer_count integer := 0;
  v_avg_contract_value numeric := 0;
  v_repeat_rate numeric := 0;
  v_avg_purchases numeric := 0;
  v_estimated_clv numeric := 0;
  v_total_leads integer := 0;
  v_won_leads integer := 0;
  v_conversion_rate numeric := 0;
  v_marketing_spend numeric := 0;
  v_inventory_turnover numeric := 0;
  v_total_dresses integer := 0;
  v_total_rentals integer := 0;
  v_scenarios jsonb := '[]'::jsonb;
  v_revenue_breakdown jsonb := '[]'::jsonb;
  v_dress_roi jsonb := '[]'::jsonb;
  v_inventory_costs jsonb := '[]'::jsonb;
BEGIN
  IF p_month IS NULL OR p_month < 1 OR p_month > 12 THEN
    RAISE EXCEPTION 'Invalid month: %', p_month;
  END IF;

  IF p_year IS NULL OR p_year < 2000 THEN
    RAISE EXCEPTION 'Invalid year: %', p_year;
  END IF;

  v_start := make_date(p_year, p_month, 1);
  v_end := (v_start + interval '1 month')::date;
  v_prev_start := (v_start - interval '1 month')::date;

  SELECT
    COALESCE((SELECT SUM(amount) FROM public.payments
      WHERE deleted_at IS NULL AND payment_date >= v_start AND payment_date < v_end), 0)
    +
    COALESCE((SELECT SUM(receipt_amount) FROM public.receipts
      WHERE deleted_at IS NULL AND contract_id IS NULL AND receipt_date >= v_start AND receipt_date < v_end), 0)
  INTO v_monthly_revenue;

  SELECT
    COALESCE((SELECT SUM(amount) FROM public.expenses
      WHERE deleted_at IS NULL AND expense_date >= v_start AND expense_date < v_end), 0)
    +
    COALESCE((SELECT SUM(total_salary) FROM public.monthly_salaries
      WHERE month = p_month AND year = p_year), 0)
  INTO v_monthly_expense;

  v_monthly_profit := v_monthly_revenue - v_monthly_expense;

  SELECT COUNT(*)::integer, COALESCE(SUM(total_amount), 0)
  INTO v_contracts_month, v_contract_value_month
  FROM public.contracts
  WHERE deleted_at IS NULL
    AND status IS DISTINCT FROM 'da_huy'
    AND contract_date >= v_start
    AND contract_date < v_end;

  SELECT COUNT(*)::integer, COALESCE(SUM(total_amount), 0)
  INTO v_contracts_all, v_contract_value_all
  FROM public.contracts
  WHERE deleted_at IS NULL
    AND status IS DISTINCT FROM 'da_huy';

  SELECT COUNT(*)::integer
  INTO v_total_customers
  FROM public.customers
  WHERE deleted_at IS NULL;

  WITH customer_contracts AS (
    SELECT customer_id, COUNT(*)::integer AS contract_count
    FROM public.contracts
    WHERE deleted_at IS NULL
      AND status IS DISTINCT FROM 'da_huy'
    GROUP BY customer_id
  )
  SELECT
    COALESCE(COUNT(*)::integer, 0),
    COALESCE((COUNT(*) FILTER (WHERE contract_count > 1))::integer, 0),
    COALESCE(AVG(contract_count), 0)
  INTO v_contract_customer_count, v_repeat_customer_count, v_avg_purchases
  FROM customer_contracts;

  v_avg_contract_value := CASE
    WHEN v_contracts_all > 0 THEN ROUND(v_contract_value_all / v_contracts_all, 0)
    ELSE 0
  END;

  v_repeat_rate := CASE
    WHEN v_contract_customer_count > 0 THEN ROUND((v_repeat_customer_count::numeric / v_contract_customer_count) * 100, 1)
    ELSE 0
  END;

  v_estimated_clv := ROUND(v_avg_contract_value * GREATEST(v_avg_purchases, 1) * (1 + (v_repeat_rate / 100)), 0);

  SELECT
    COUNT(*)::integer,
    (COUNT(*) FILTER (WHERE status = 'da_chot'))::integer
  INTO v_total_leads, v_won_leads
  FROM public.crm_leads
  WHERE deleted_at IS NULL;

  v_conversion_rate := CASE
    WHEN v_total_leads > 0 THEN ROUND((v_won_leads::numeric / v_total_leads) * 100, 1)
    ELSE 0
  END;

  SELECT COALESCE(SUM(e.amount), 0)
  INTO v_marketing_spend
  FROM public.expenses e
  LEFT JOIN public.transaction_categories tc ON tc.id = e.category_id
  WHERE e.deleted_at IS NULL
    AND e.expense_date >= v_start
    AND e.expense_date < v_end
    AND (
      lower(COALESCE(tc.name, '')) LIKE '%marketing%'
      OR lower(COALESCE(tc.category_code, '')) LIKE '%marketing%'
      OR lower(COALESCE(e.description, '')) LIKE '%marketing%'
      OR lower(COALESCE(e.description, '')) LIKE '%ads%'
      OR lower(COALESCE(e.description, '')) LIKE '%quang cao%'
      OR lower(COALESCE(e.description, '')) LIKE '%quảng cáo%'
    );

  SELECT ROUND(
    COALESCE((
      SELECT SUM(quantity)
      FROM public.inventory_transactions
      WHERE transaction_type = 'stock_out'
        AND created_at >= v_start
        AND created_at < v_end
    ), 0)::numeric
    / GREATEST((SELECT COUNT(*) FROM public.inventory_items WHERE deleted_at IS NULL), 1),
    1
  )
  INTO v_inventory_turnover;

  SELECT COUNT(*)::integer
  INTO v_total_dresses
  FROM public.dresses
  WHERE deleted_at IS NULL;

  SELECT COUNT(*)::integer
  INTO v_total_rentals
  FROM public.dress_rentals
  WHERE COALESCE(status, '') <> 'cancelled';

  v_scenarios := jsonb_build_array(
    jsonb_build_object(
      'label', 'Thận trọng',
      'type', 'conservative',
      'nextMonthRevenue', ROUND(v_monthly_revenue * 0.85, 0),
      'nextMonthProfit', ROUND((v_monthly_revenue * 0.85) - (v_monthly_expense * 0.95), 0),
      'threeMonthRevenue', ROUND(v_monthly_revenue * 0.85 * 3, 0),
      'threeMonthProfit', ROUND(((v_monthly_revenue * 0.85) - (v_monthly_expense * 0.95)) * 3, 0),
      'description', 'Giả định doanh thu giảm 15% và biên lợi nhuận bị nén.'
    ),
    jsonb_build_object(
      'label', 'Cơ sở',
      'type', 'base',
      'nextMonthRevenue', ROUND(v_monthly_revenue, 0),
      'nextMonthProfit', ROUND(v_monthly_profit, 0),
      'threeMonthRevenue', ROUND(v_monthly_revenue * 3, 0),
      'threeMonthProfit', ROUND(v_monthly_profit * 3, 0),
      'description', 'Giữ nhịp hiện tại theo dữ liệu thu chi production.'
    ),
    jsonb_build_object(
      'label', 'Tăng trưởng',
      'type', 'aggressive',
      'nextMonthRevenue', ROUND(v_monthly_revenue * 1.20, 0),
      'nextMonthProfit', ROUND((v_monthly_revenue * 1.20) - (v_monthly_expense * 1.05), 0),
      'threeMonthRevenue', ROUND(v_monthly_revenue * 1.20 * 3, 0),
      'threeMonthProfit', ROUND(((v_monthly_revenue * 1.20) - (v_monthly_expense * 1.05)) * 3, 0),
      'description', 'Giả định doanh thu tăng 20% và kiểm soát chi phí tốt hơn.'
    )
  );

  WITH service_totals AS (
    SELECT
      COALESCE(NULLIF(c.service_type::text, ''), 'Khác') AS service_type,
      COUNT(*)::integer AS contract_count,
      COALESCE(SUM(c.total_amount), 0) AS service_total
    FROM public.contracts c
    WHERE c.deleted_at IS NULL
      AND c.status IS DISTINCT FROM 'da_huy'
      AND c.contract_date >= v_start
      AND c.contract_date < v_end
    GROUP BY COALESCE(NULLIF(c.service_type::text, ''), 'Khác')
  ),
  ranked_services AS (
    SELECT
      service_type,
      contract_count,
      service_total,
      SUM(service_total) OVER () AS all_service_total
    FROM service_totals
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'service_type', service_type,
        'total', service_total,
        'count', contract_count,
        'percentage', CASE WHEN all_service_total > 0 THEN ROUND((service_total / all_service_total) * 100, 1) ELSE 0 END
      )
      ORDER BY service_total DESC
    ),
    '[]'::jsonb
  )
  INTO v_revenue_breakdown
  FROM ranked_services;

  WITH dress_totals AS (
    SELECT
      d.id,
      d.name,
      d.item_code,
      COALESCE(d.purchase_price, 0) AS purchase_price,
      (COUNT(dr.id) FILTER (WHERE COALESCE(dr.status, '') <> 'cancelled'))::integer AS rental_count,
      COALESCE(SUM(COALESCE(dr.rental_price, 0)) FILTER (WHERE COALESCE(dr.status, '') <> 'cancelled'), 0) AS rental_revenue
    FROM public.dresses d
    LEFT JOIN public.dress_rentals dr ON dr.item_id = d.id
    WHERE d.deleted_at IS NULL
    GROUP BY d.id, d.name, d.item_code, d.purchase_price
  ),
  ranked_dresses AS (
    SELECT *
    FROM dress_totals
    WHERE rental_count > 0 OR purchase_price > 0
    ORDER BY rental_revenue DESC, rental_count DESC, name ASC
    LIMIT 5
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'name', name,
        'code', item_code,
        'purchasePrice', purchase_price,
        'totalRentals', rental_count,
        'totalRevenue', rental_revenue,
        'roi', CASE
          WHEN purchase_price > 0 THEN ROUND(((rental_revenue - purchase_price) / purchase_price) * 100, 1)
          WHEN rental_revenue > 0 THEN 100
          ELSE 0
        END
      )
      ORDER BY rental_revenue DESC, rental_count DESC, name ASC
    ),
    '[]'::jsonb
  )
  INTO v_dress_roi
  FROM ranked_dresses;

  WITH this_month AS (
    SELECT
      COALESCE(NULLIF(ii.category, ''), 'Khác') AS category,
      COALESCE(SUM(COALESCE(it.total_cost, it.quantity * COALESCE(it.unit_cost, ii.average_unit_price, ii.purchase_price, 0))), 0) AS amount
    FROM public.inventory_transactions it
    JOIN public.inventory_items ii ON ii.id = it.item_id AND ii.deleted_at IS NULL
    WHERE it.transaction_type = 'stock_out'
      AND it.created_at >= v_start
      AND it.created_at < v_end
    GROUP BY COALESCE(NULLIF(ii.category, ''), 'Khác')
  ),
  prev_month AS (
    SELECT
      COALESCE(NULLIF(ii.category, ''), 'Khác') AS category,
      COALESCE(SUM(COALESCE(it.total_cost, it.quantity * COALESCE(it.unit_cost, ii.average_unit_price, ii.purchase_price, 0))), 0) AS amount
    FROM public.inventory_transactions it
    JOIN public.inventory_items ii ON ii.id = it.item_id AND ii.deleted_at IS NULL
    WHERE it.transaction_type = 'stock_out'
      AND it.created_at >= v_prev_start
      AND it.created_at < v_start
    GROUP BY COALESCE(NULLIF(ii.category, ''), 'Khác')
  ),
  categories AS (
    SELECT category FROM this_month
    UNION
    SELECT category FROM prev_month
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'category', c.category,
        'thisMonth', COALESCE(tm.amount, 0),
        'lastMonth', COALESCE(pm.amount, 0),
        'change', CASE
          WHEN COALESCE(pm.amount, 0) > 0 THEN ROUND(((COALESCE(tm.amount, 0) - pm.amount) / pm.amount) * 100, 1)
          WHEN COALESCE(tm.amount, 0) > 0 THEN 100
          ELSE 0
        END
      )
      ORDER BY COALESCE(tm.amount, 0) DESC, c.category ASC
    ),
    '[]'::jsonb
  )
  INTO v_inventory_costs
  FROM categories c
  LEFT JOIN this_month tm ON tm.category = c.category
  LEFT JOIN prev_month pm ON pm.category = c.category;

  RETURN jsonb_build_object(
    'scenarios', v_scenarios,
    'customerMetrics', jsonb_build_object(
      'totalCustomers', v_total_customers,
      'avgContractValue', v_avg_contract_value,
      'repeatCustomerRate', v_repeat_rate,
      'estimatedCLV', v_estimated_clv,
      'conversionRate', v_conversion_rate,
      'totalLeads', v_total_leads,
      'wonLeads', v_won_leads
    ),
    'revenueBreakdown', v_revenue_breakdown,
    'dressROI', v_dress_roi,
    'inventoryCosts', v_inventory_costs,
    'advancedKPIs', jsonb_build_object(
      'conversionRate', v_conversion_rate,
      'avgOrderValue', CASE WHEN v_contracts_month > 0 THEN ROUND(v_contract_value_month / v_contracts_month, 0) ELSE 0 END,
      'inventoryTurnover', COALESCE(v_inventory_turnover, 0),
      'cac', CASE WHEN v_contracts_month > 0 THEN ROUND(v_marketing_spend / v_contracts_month, 0) ELSE 0 END,
      'totalLeads', v_total_leads,
      'totalContracts', v_contracts_month,
      'totalDresses', v_total_dresses,
      'totalRentals', v_total_rentals
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_finance_advanced_intelligence(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_finance_advanced_intelligence(integer, integer) TO service_role;
