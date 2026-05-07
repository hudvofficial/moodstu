-- Complete inventory business flows:
-- - Contract add-on sale: contract adjustment payment + contract item + stock decrement in one RPC.
-- - Inventory sale/void stock restoration triggers.
-- - Finance profit/report RPCs include inventory COGS.

CREATE OR REPLACE FUNCTION public.restore_inventory_from_transaction(
  p_source_type text,
  p_source_id uuid,
  p_reason text,
  p_actor_id uuid DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_tx record;
  v_current_stock integer;
BEGIN
  FOR v_tx IN
    SELECT it.*
    FROM public.inventory_transactions it
    WHERE it.transaction_type = 'stock_out'
      AND it.source_type = p_source_type
      AND it.source_id = p_source_id
      AND NOT EXISTS (
        SELECT 1
        FROM public.inventory_transactions restored
        WHERE restored.transaction_type = 'stock_in'
          AND restored.source_type = 'return'
          AND restored.source_id = p_source_id
          AND restored.item_id = it.item_id
      )
  LOOP
    SELECT COALESCE(current_stock, 0)
    INTO v_current_stock
    FROM public.inventory_items
    WHERE id = v_tx.item_id
    FOR UPDATE;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    INSERT INTO public.inventory_transactions (
      item_id, transaction_type, quantity, unit_cost,
      contract_id, reason, notes, customer_name, customer_phone,
      source_type, source_id, receipt_id, sale_unit_price, sale_total, payment_method,
      performed_by, created_by
    ) VALUES (
      v_tx.item_id,
      'stock_in',
      v_tx.quantity,
      COALESCE(v_tx.unit_cost, 0),
      v_tx.contract_id,
      p_reason,
      CONCAT('Restore from stock-out transaction: ', v_tx.id::text),
      v_tx.customer_name,
      v_tx.customer_phone,
      'return',
      p_source_id,
      v_tx.receipt_id,
      v_tx.sale_unit_price,
      v_tx.sale_total,
      v_tx.payment_method,
      p_actor_id,
      p_actor_id
    );

    UPDATE public.inventory_items
    SET current_stock = v_current_stock + COALESCE(v_tx.quantity, 0),
        updated_at = now(),
        updated_by = p_actor_id
    WHERE id = v_tx.item_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql VOLATILE SET search_path = public;

CREATE OR REPLACE FUNCTION public.restore_inventory_on_receipt_void()
RETURNS trigger AS $$
BEGIN
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    PERFORM public.restore_inventory_from_transaction(
      'retail_sale',
      NEW.id,
      'Hoan kho do huy phieu ban vat tu',
      COALESCE(NEW.updated_by, NEW.created_by)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql VOLATILE SET search_path = public;

DROP TRIGGER IF EXISTS trg_restore_inventory_on_receipt_void ON public.receipts;
CREATE TRIGGER trg_restore_inventory_on_receipt_void
AFTER UPDATE OF deleted_at ON public.receipts
FOR EACH ROW
WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
EXECUTE FUNCTION public.restore_inventory_on_receipt_void();

CREATE OR REPLACE FUNCTION public.restore_inventory_on_contract_payment_void()
RETURNS trigger AS $$
BEGIN
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    PERFORM public.restore_inventory_from_transaction(
      'contract_addon_sale',
      NEW.id,
      'Hoan kho do huy phieu ban them hop dong',
      COALESCE(NEW.voided_by, NEW.updated_by, NEW.created_by)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql VOLATILE SET search_path = public;

DROP TRIGGER IF EXISTS trg_restore_inventory_on_contract_payment_void ON public.payments;
CREATE TRIGGER trg_restore_inventory_on_contract_payment_void
AFTER UPDATE OF deleted_at ON public.payments
FOR EACH ROW
WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
EXECUTE FUNCTION public.restore_inventory_on_contract_payment_void();

CREATE OR REPLACE FUNCTION public.create_contract_inventory_addon_sale_atomic(
  p_contract_id uuid,
  p_item_id uuid,
  p_quantity integer,
  p_sale_unit_price numeric,
  p_payment_method public.payment_method_enum,
  p_payment_date date,
  p_notes text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_contract public.contracts%ROWTYPE;
  v_item public.inventory_items%ROWTYPE;
  v_payment_id uuid := gen_random_uuid();
  v_contract_item_id uuid;
  v_receipt_code text;
  v_total_amount numeric;
  v_new_stock integer;
  v_new_total numeric;
  v_new_paid numeric;
  v_new_remaining numeric;
  v_payment_status text;
  v_stage_label text;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: actor_id is required';
  END IF;

  IF p_contract_id IS NULL OR p_item_id IS NULL THEN
    RAISE EXCEPTION 'Contract and item are required';
  END IF;

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than 0';
  END IF;

  IF p_sale_unit_price IS NULL OR p_sale_unit_price <= 0 THEN
    RAISE EXCEPTION 'Sale price must be greater than 0';
  END IF;

  IF p_payment_date IS NULL THEN
    RAISE EXCEPTION 'Payment date is required';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.finance_monthly_closes
    WHERE period = to_char(p_payment_date, 'YYYY-MM')
      AND status = 'locked'
  ) THEN
    RAISE EXCEPTION 'Ky nay da chot so, khong the thay doi du lieu.';
  END IF;

  SELECT *
  INTO v_contract
  FROM public.contracts
  WHERE id = p_contract_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Khong tim thay hop dong';
  END IF;

  IF v_contract.status = 'da_huy' THEN
    RAISE EXCEPTION 'Hop dong da huy, khong the ban them vat tu';
  END IF;

  SELECT *
  INTO v_item
  FROM public.inventory_items
  WHERE id = p_item_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item does not exist';
  END IF;

  IF v_item.status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'Cannot sell discontinued inventory item';
  END IF;

  IF COALESCE(v_item.current_stock, 0) < p_quantity THEN
    RAISE EXCEPTION '% does not have enough stock. Remaining %', v_item.name, COALESCE(v_item.current_stock, 0);
  END IF;

  v_total_amount := p_quantity * p_sale_unit_price;
  v_new_stock := COALESCE(v_item.current_stock, 0) - p_quantity;
  v_receipt_code := public.contract_payment_receipt_code(v_payment_id, p_payment_date);
  v_stage_label := public.payment_stage_display_label_v2('phat_sinh', 'Phat sinh hop dong');

  INSERT INTO public.contract_items (
    contract_id,
    type,
    item_name,
    quantity,
    unit_price,
    original_price,
    discount_amount,
    total_amount,
    is_addon,
    addon_category,
    notes,
    added_by
  )
  VALUES (
    p_contract_id,
    'phat_sinh'::public.item_type_enum,
    LEFT(CONCAT('Vat tu: ', v_item.name, ' (', v_item.item_code, ')'), 120),
    p_quantity,
    p_sale_unit_price,
    p_sale_unit_price,
    0,
    v_total_amount,
    true,
    'khac'::public.addon_category_enum,
    NULLIF(BTRIM(COALESCE(p_notes, '')), ''),
    p_user_id
  )
  RETURNING id INTO v_contract_item_id;

  INSERT INTO public.payments (
    id,
    contract_id,
    customer_id,
    amount,
    payment_method,
    payment_date,
    payment_stage,
    notes,
    receipt_code,
    created_by,
    approved_by,
    is_contract_adjustment,
    contract_adjustment_item_id
  )
  VALUES (
    v_payment_id,
    p_contract_id,
    v_contract.customer_id,
    v_total_amount,
    p_payment_method,
    p_payment_date,
    v_stage_label,
    NULLIF(BTRIM(COALESCE(p_notes, '')), ''),
    v_receipt_code,
    p_user_id,
    p_user_id,
    true,
    v_contract_item_id
  );

  INSERT INTO public.inventory_transactions (
    item_id, transaction_type, quantity, unit_cost,
    contract_id, reason, notes, customer_name, customer_phone,
    source_type, source_id, sale_unit_price, sale_total, payment_method,
    performed_by, created_by
  )
  VALUES (
    p_item_id,
    'stock_out',
    p_quantity,
    COALESCE(v_item.average_unit_price, 0),
    p_contract_id,
    CONCAT('Ban them HD ', COALESCE(v_contract.contract_code, p_contract_id::text)),
    NULLIF(BTRIM(COALESCE(p_notes, '')), ''),
    NULL,
    NULL,
    'contract_addon_sale',
    v_payment_id,
    p_sale_unit_price,
    v_total_amount,
    p_payment_method::text,
    p_user_id,
    p_user_id
  );

  UPDATE public.inventory_items
  SET current_stock = v_new_stock,
      updated_at = now(),
      updated_by = p_user_id
  WHERE id = p_item_id;

  v_new_total := COALESCE(v_contract.total_amount, 0) + v_total_amount;
  v_new_paid := COALESCE(v_contract.paid_amount, 0) + v_total_amount;
  v_new_remaining := GREATEST(0, v_new_total - v_new_paid);
  v_payment_status := public.contract_payment_status_v2(v_new_paid, v_new_remaining);

  UPDATE public.contracts
  SET total_amount = v_new_total,
      paid_amount = v_new_paid,
      remaining_amount = v_new_remaining,
      payment_status = v_payment_status,
      updated_at = now(),
      updated_by = p_user_id
  WHERE id = p_contract_id;

  RETURN jsonb_build_object(
    'payment_id', v_payment_id,
    'receipt_code', v_receipt_code,
    'contract_item_id', v_contract_item_id,
    'item_id', p_item_id,
    'current_stock', v_new_stock,
    'new_total', v_new_total,
    'new_paid', v_new_paid,
    'new_remaining', v_new_remaining,
    'payment_status', v_payment_status
  );
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public;

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
  inventory_cost NUMERIC,
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
  inventory_totals AS (
    SELECT
      it.contract_id,
      SUM(COALESCE(it.total_cost, COALESCE(it.quantity, 0) * COALESCE(it.unit_cost, 0))) AS amount
    FROM public.inventory_transactions it
    WHERE it.transaction_type = 'stock_out'
      AND it.contract_id IS NOT NULL
      AND COALESCE(it.source_type, 'contract_fulfillment') IN ('contract_fulfillment', 'contract_addon_sale')
    GROUP BY it.contract_id
  ),
  enriched AS (
    SELECT
      f.*,
      COALESCE(i.package_revenue, 0) AS package_revenue,
      COALESCE(i.addon_revenue, 0) AS addon_revenue,
      COALESCE(t.amount, 0) AS task_cost,
      COALESCE(p.amount, 0) AS print_cost,
      COALESCE(e.amount, 0) AS expense_cost,
      COALESCE(inv.amount, 0) AS inventory_cost,
      COUNT(*) OVER()::INT AS total_count
    FROM filtered f
    LEFT JOIN item_totals i ON i.contract_id = f.id
    LEFT JOIN task_totals t ON t.contract_id = f.id
    LEFT JOIN print_totals p ON p.contract_id = f.id
    LEFT JOIN expense_totals e ON e.contract_id = f.id
    LEFT JOIN inventory_totals inv ON inv.contract_id = f.id
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
    e.inventory_cost,
    e.task_cost + e.print_cost + e.expense_cost + e.inventory_cost AS total_cost,
    e.total_amount - (e.task_cost + e.print_cost + e.expense_cost + e.inventory_cost) AS profit,
    CASE
      WHEN e.total_amount = 0 THEN 0::NUMERIC
      ELSE ROUND(((e.total_amount - (e.task_cost + e.print_cost + e.expense_cost + e.inventory_cost)) / e.total_amount) * 100, 1)::NUMERIC
    END AS profit_margin,
    e.total_count
  FROM enriched e;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

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
    SELECT gs::date AS month_start, (gs + interval '1 month - 1 day')::date AS month_end
    FROM params p,
      generate_series(date_trunc('month', p.start_date)::date, date_trunc('month', p.end_date)::date, interval '1 month') AS gs
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
    SELECT COALESCE(SUM(COALESCE(ci.total_amount, 0)), 0) AS addon_revenue, COUNT(ci.id)::numeric AS addon_count
    FROM contracts_scope c
    JOIN public.contract_items ci ON ci.contract_id = c.id
    WHERE ci.is_addon IS TRUE
      AND ci.deleted_at IS NULL
  ),
  service_rows AS (
    SELECT service_type AS name, COUNT(*)::numeric AS value, COALESCE(SUM(total_amount), 0) AS revenue
    FROM contracts_scope
    GROUP BY service_type
  ),
  service_json AS (
    SELECT COALESCE(jsonb_agg(jsonb_build_object('name', name, 'value', value, 'revenue', revenue) ORDER BY revenue DESC, value DESC), '[]'::jsonb) AS items
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
  inventory_costs AS (
    SELECT
      COALESCE((
        SELECT SUM(COALESCE(it.total_cost, COALESCE(it.quantity, 0) * COALESCE(it.unit_cost, 0)))
        FROM public.inventory_transactions it
        JOIN contracts_scope c ON c.id = it.contract_id
        WHERE it.transaction_type = 'stock_out'
          AND COALESCE(it.source_type, 'contract_fulfillment') IN ('contract_fulfillment', 'contract_addon_sale')
      ), 0) AS contract_inventory_cost,
      COALESCE((
        SELECT SUM(COALESCE(it.total_cost, COALESCE(it.quantity, 0) * COALESCE(it.unit_cost, 0)))
        FROM public.inventory_transactions it
        LEFT JOIN public.receipts r ON r.id = it.receipt_id
        CROSS JOIN params p
        WHERE it.transaction_type = 'stock_out'
          AND it.source_type = 'retail_sale'
          AND COALESCE(r.receipt_date, it.created_at::date) >= p.start_date
          AND COALESCE(r.receipt_date, it.created_at::date) <= p.end_date
      ), 0) AS retail_inventory_cost
  ),
  direct_costs AS (
    SELECT
      COALESCE((SELECT SUM(wt.cost) FROM public.work_tasks wt JOIN contracts_scope c ON c.id = wt.contract_id), 0) AS task_cost,
      COALESCE((SELECT SUM(po.total_amount) FROM public.printing_orders po JOIN contracts_scope c ON c.id = po.contract_id WHERE po.deleted_at IS NULL), 0) AS print_cost,
      COALESCE((
        SELECT SUM(e.amount)
        FROM public.expenses e
        JOIN contracts_scope c ON c.id = e.contract_id
        WHERE e.deleted_at IS NULL
          AND COALESCE(e.description, '') NOT LIKE '[Auto-Print]%'
      ), 0) AS contract_expense_cost
  ),
  expense_summary AS (
    SELECT COALESCE(SUM(e.amount) FILTER (WHERE e.contract_id IS NULL), 0) AS operating_cost, COALESCE(SUM(e.amount), 0) AS operating_outflow
    FROM public.expenses e
    CROSS JOIN params p
    WHERE e.deleted_at IS NULL
      AND e.expense_date >= p.start_date
      AND e.expense_date <= p.end_date
  ),
  salary_summary AS (
    SELECT COALESCE(SUM(COALESCE(ms.total_salary, 0) * mr.ratio), 0) AS salary_cost
    FROM month_ratios mr
    LEFT JOIN public.monthly_salaries ms ON ms.year = mr.year AND ms.month = mr.month
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
      ic.contract_inventory_cost + ic.retail_inventory_cost AS inventory_cost,
      dc.task_cost + dc.print_cost + dc.contract_expense_cost + ic.contract_inventory_cost + ic.retail_inventory_cost AS direct_cost,
      es.operating_cost,
      es.operating_outflow,
      ss.salary_cost,
      fcs.fixed_cost
    FROM cash_revenue_summary crs
    CROSS JOIN contract_summary cs
    CROSS JOIN addon_summary ads
    CROSS JOIN direct_costs dc
    CROSS JOIN inventory_costs ic
    CROSS JOIN expense_summary es
    CROSS JOIN salary_summary ss
    CROSS JOIN fixed_cost_summary fcs
  )
  SELECT jsonb_build_object(
    'summary', jsonb_build_object(
      'totalRevenue', t.report_revenue,
      'totalCost', t.direct_cost + t.operating_cost + t.salary_cost + t.fixed_cost,
      'directCost', t.direct_cost,
      'inventoryCost', t.inventory_cost,
      'operatingCost', t.operating_cost,
      'salaryCost', t.salary_cost,
      'fixedCost', t.fixed_cost,
      'netProfit', t.report_revenue - (t.direct_cost + t.operating_cost + t.salary_cost + t.fixed_cost),
      'profitMargin', CASE WHEN t.report_revenue > 0 THEN ROUND(((t.report_revenue - (t.direct_cost + t.operating_cost + t.salary_cost + t.fixed_cost)) / t.report_revenue) * 1000) / 10 ELSE 0 END,
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
      jsonb_build_object('label', 'Doanh thu hop dong', 'amount', t.contract_revenue, 'percentage', CASE WHEN t.report_revenue > 0 THEN ROUND((t.contract_revenue / t.report_revenue) * 1000) / 10 ELSE 0 END),
      jsonb_build_object('label', 'Thu khac', 'amount', t.standalone_receipt_revenue, 'percentage', CASE WHEN t.report_revenue > 0 THEN ROUND((t.standalone_receipt_revenue / t.report_revenue) * 1000) / 10 ELSE 0 END)
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

REVOKE ALL ON FUNCTION public.restore_inventory_from_transaction(text, uuid, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_contract_inventory_addon_sale_atomic(uuid, uuid, integer, numeric, public.payment_method_enum, date, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finance_contract_profit_report(TEXT, DATE, DATE, INT, INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finance_reports_snapshot(date, date) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.restore_inventory_from_transaction(text, uuid, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_contract_inventory_addon_sale_atomic(uuid, uuid, integer, numeric, public.payment_method_enum, date, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.finance_contract_profit_report(TEXT, DATE, DATE, INT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.finance_reports_snapshot(date, date) TO service_role;
