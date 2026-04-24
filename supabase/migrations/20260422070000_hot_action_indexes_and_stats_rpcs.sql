-- Hot action performance pass.
-- Targets list/stat actions used by finance, contracts, employees, and services.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION pg_temp.has_columns(p_table text, VARIADIC p_columns text[])
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT to_regclass('public.' || p_table) IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM unnest(p_columns) AS requested(column_name)
      WHERE NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = p_table
          AND column_name = requested.column_name
      )
    );
$$;

DO $$
BEGIN
  IF pg_temp.has_columns('receipts', 'deleted_at', 'receipt_date', 'created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_receipts_active_date_created_desc ON public.receipts(receipt_date DESC, created_at DESC) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('receipts', 'deleted_at', 'receipt_type', 'receipt_date', 'created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_receipts_active_type_date_created_desc ON public.receipts(receipt_type, receipt_date DESC, created_at DESC) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('receipts', 'deleted_at', 'contract_code') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_receipts_contract_code_trgm ON public.receipts USING gin(contract_code gin_trgm_ops) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('receipts', 'deleted_at', 'customer_name') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_receipts_customer_name_trgm ON public.receipts USING gin(customer_name gin_trgm_ops) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('receipts', 'deleted_at', 'category_name') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_receipts_category_name_trgm ON public.receipts USING gin(category_name gin_trgm_ops) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('receipts', 'deleted_at', 'notes') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_receipts_notes_trgm ON public.receipts USING gin(notes gin_trgm_ops) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('expenses', 'deleted_at', 'expense_date', 'created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_expenses_active_date_created_desc ON public.expenses(expense_date DESC, created_at DESC) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('expenses', 'deleted_at', 'approved_by', 'expense_date', 'created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_expenses_pending_date_created_desc ON public.expenses(expense_date DESC, created_at DESC) WHERE deleted_at IS NULL AND approved_by IS NULL';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_expenses_approved_date_created_desc ON public.expenses(expense_date DESC, created_at DESC) WHERE deleted_at IS NULL AND approved_by IS NOT NULL';
  END IF;

  IF pg_temp.has_columns('expenses', 'deleted_at', 'contract_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_expenses_active_contract ON public.expenses(contract_id) WHERE deleted_at IS NULL AND contract_id IS NOT NULL';
  END IF;

  IF pg_temp.has_columns('payments', 'deleted_at', 'payment_date', 'created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_payments_active_date_created_desc ON public.payments(payment_date DESC, created_at DESC) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('payments', 'deleted_at', 'contract_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_payments_active_contract ON public.payments(contract_id) WHERE deleted_at IS NULL AND contract_id IS NOT NULL';
  END IF;

  IF pg_temp.has_columns('contracts', 'deleted_at', 'created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_contracts_active_created_desc ON public.contracts(created_at DESC) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('contracts', 'deleted_at', 'status', 'created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_contracts_active_status_created_desc ON public.contracts(status, created_at DESC) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('contracts', 'deleted_at', 'contract_date', 'created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_contracts_active_contract_date_created_desc ON public.contracts(contract_date DESC, created_at DESC) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('contracts', 'deleted_at', 'work_date') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_contracts_active_work_date_asc ON public.contracts(work_date ASC) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('contracts', 'deleted_at', 'remaining_amount', 'contract_date') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_contracts_active_remaining_contract_date_desc ON public.contracts(contract_date DESC) WHERE deleted_at IS NULL AND remaining_amount > 0';
  END IF;

  IF pg_temp.has_columns('contracts', 'deleted_at', 'total_amount') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_contracts_active_total_amount_desc ON public.contracts(total_amount DESC) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('contracts', 'deleted_at', 'contract_code') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_contracts_contract_code_trgm ON public.contracts USING gin(contract_code gin_trgm_ops) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('customers', 'deleted_at', 'full_name') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_customers_active_full_name_trgm ON public.customers USING gin(full_name gin_trgm_ops) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('customers', 'full_name') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_customers_full_name_trgm ON public.customers USING gin(full_name gin_trgm_ops)';
  END IF;

  IF pg_temp.has_columns('employees', 'deleted_at', 'created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_employees_active_created_desc ON public.employees(created_at DESC) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('employees', 'deleted_at', 'department') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_employees_active_department ON public.employees(department) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('employees', 'deleted_at', 'role') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_employees_active_role ON public.employees(role) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('employees', 'deleted_at', 'status') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_employees_active_status ON public.employees(status) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('employees', 'deleted_at', 'full_name') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_employees_full_name_trgm ON public.employees USING gin(full_name gin_trgm_ops) WHERE deleted_at IS NULL';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_employees_active_full_name ON public.employees(full_name) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('employees', 'deleted_at', 'employee_code') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_employees_employee_code_trgm ON public.employees USING gin(employee_code gin_trgm_ops) WHERE deleted_at IS NULL';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_employees_active_employee_code ON public.employees(employee_code) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('employees', 'deleted_at', 'phone') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_employees_phone_trgm ON public.employees USING gin(phone gin_trgm_ops) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('employees', 'deleted_at', 'email') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_employees_email_trgm ON public.employees USING gin(email gin_trgm_ops) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('services', 'deleted_at', 'created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_services_active_created_desc ON public.services(created_at DESC) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('services', 'deleted_at', 'category_id', 'created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_services_active_category_created_desc ON public.services(category_id, created_at DESC) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('services', 'deleted_at', 'status', 'created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_services_active_status_created_desc ON public.services(status, created_at DESC) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('services', 'deleted_at', 'fulfillment_type', 'created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_services_active_fulfillment_created_desc ON public.services(fulfillment_type, created_at DESC) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('services', 'deleted_at', 'name') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_services_name_trgm ON public.services USING gin(name gin_trgm_ops) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('services', 'deleted_at', 'service_code') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_services_service_code_trgm ON public.services USING gin(service_code gin_trgm_ops) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('service_categories', 'sort_order', 'name') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_service_categories_sort_name ON public.service_categories(sort_order, name)';
  END IF;

  IF pg_temp.has_columns('service_bundles', 'parent_service_id', 'sort_order') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_service_bundles_parent_sort ON public.service_bundles(parent_service_id, sort_order)';
  END IF;

  IF pg_temp.has_columns('transaction_categories', 'type', 'name') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_transaction_categories_type_name ON public.transaction_categories(type, name)';
  END IF;

  IF pg_temp.has_columns('contract_items', 'deleted_at', 'contract_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_contract_items_active_contract ON public.contract_items(contract_id) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('work_tasks', 'contract_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_work_tasks_contract ON public.work_tasks(contract_id)';
  END IF;

  IF pg_temp.has_columns('printing_orders', 'deleted_at', 'contract_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_printing_orders_active_contract ON public.printing_orders(contract_id) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('printing_orders', 'deleted_at', 'lab_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_printing_orders_active_lab ON public.printing_orders(lab_id) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('lab_payments', 'lab_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_lab_payments_lab ON public.lab_payments(lab_id)';
  END IF;

  IF pg_temp.has_columns('contract_events', 'deleted_at', 'contract_id', 'event_date') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_contract_events_active_contract_event_date ON public.contract_events(contract_id, event_date ASC) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('contract_checklists', 'contract_id', 'created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_contract_checklists_contract_created ON public.contract_checklists(contract_id, created_at ASC)';
  END IF;

  IF pg_temp.has_columns('work_tasks', 'contract_id', 'deadline') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_work_tasks_contract_deadline ON public.work_tasks(contract_id, deadline ASC)';
  END IF;

  IF pg_temp.has_columns('payment_plans', 'contract_id', 'created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_payment_plans_contract_created ON public.payment_plans(contract_id, created_at ASC)';
  END IF;

  IF pg_temp.has_columns('dress_reservations', 'contract_id', 'created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_dress_reservations_contract_created ON public.dress_reservations(contract_id, created_at DESC)';
  END IF;

  IF pg_temp.has_columns('audit_logs', 'table_name', 'record_id', 'created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record_created_desc ON public.audit_logs(table_name, record_id, created_at DESC)';
  END IF;

  IF pg_temp.has_columns('inventory_items', 'deleted_at', 'created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_inventory_items_active_created_desc ON public.inventory_items(created_at DESC) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('inventory_items', 'deleted_at', 'status', 'created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_inventory_items_active_status_created_desc ON public.inventory_items(status, created_at DESC) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('inventory_items', 'deleted_at', 'category', 'created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_inventory_items_active_category_created_desc ON public.inventory_items(category, created_at DESC) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('inventory_items', 'deleted_at', 'current_stock') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_inventory_items_active_current_stock ON public.inventory_items(current_stock) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('inventory_items', 'deleted_at', 'name') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_inventory_items_name_trgm ON public.inventory_items USING gin(name gin_trgm_ops) WHERE deleted_at IS NULL';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_inventory_items_active_name ON public.inventory_items(name) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('inventory_items', 'deleted_at', 'item_code') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_inventory_items_item_code_trgm ON public.inventory_items USING gin(item_code gin_trgm_ops) WHERE deleted_at IS NULL';
  END IF;

  IF pg_temp.has_columns('inventory_transactions', 'item_id', 'created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item_created_desc ON public.inventory_transactions(item_id, created_at DESC)';
  END IF;

  IF pg_temp.has_columns('inventory_transactions', 'transaction_type', 'created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type_created_desc ON public.inventory_transactions(transaction_type, created_at DESC)';
  END IF;

  IF pg_temp.has_columns('inventory_transactions', 'contract_id', 'created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_inventory_transactions_contract_created_desc ON public.inventory_transactions(contract_id, created_at DESC) WHERE contract_id IS NOT NULL';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.finance_receipt_stats(
  p_month INT DEFAULT NULL,
  p_year INT DEFAULT NULL
) RETURNS TABLE (
  total_receipts BIGINT,
  total_amount NUMERIC,
  completed_count BIGINT,
  pending_count BIGINT
) AS $$
  WITH bounds AS (
    SELECT
      CASE WHEN p_month BETWEEN 1 AND 12 AND p_year IS NOT NULL THEN make_date(p_year, p_month, 1) END AS start_date,
      CASE
        WHEN p_month BETWEEN 1 AND 11 AND p_year IS NOT NULL THEN make_date(p_year, p_month + 1, 1)
        WHEN p_month = 12 AND p_year IS NOT NULL THEN make_date(p_year + 1, 1, 1)
      END AS end_date
  ),
  filtered AS (
    SELECT r.receipt_amount, lower(coalesce(r.status, '')) AS status
    FROM public.receipts r
    CROSS JOIN bounds b
    WHERE r.deleted_at IS NULL
      AND (b.start_date IS NULL OR (r.receipt_date >= b.start_date AND r.receipt_date < b.end_date))
  )
  SELECT
    COUNT(*)::BIGINT AS total_receipts,
    COALESCE(SUM(receipt_amount), 0)::NUMERIC AS total_amount,
    COUNT(*) FILTER (WHERE status IN ('completed', 'confirmed', 'approved', 'hoan_thanh'))::BIGINT AS completed_count,
    COUNT(*) FILTER (
      WHERE status NOT IN ('completed', 'confirmed', 'approved', 'hoan_thanh', 'cancelled', 'da_huy')
    )::BIGINT AS pending_count
  FROM filtered;
$$ LANGUAGE sql STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.finance_expense_stats(
  p_month INT DEFAULT NULL,
  p_year INT DEFAULT NULL
) RETURNS TABLE (
  total_expenses BIGINT,
  total_amount NUMERIC,
  approved_count BIGINT,
  pending_count BIGINT
) AS $$
  WITH bounds AS (
    SELECT
      CASE WHEN p_month BETWEEN 1 AND 12 AND p_year IS NOT NULL THEN make_date(p_year, p_month, 1) END AS start_date,
      CASE
        WHEN p_month BETWEEN 1 AND 11 AND p_year IS NOT NULL THEN make_date(p_year, p_month + 1, 1)
        WHEN p_month = 12 AND p_year IS NOT NULL THEN make_date(p_year + 1, 1, 1)
      END AS end_date
  ),
  filtered AS (
    SELECT e.amount, e.approved_by
    FROM public.expenses e
    CROSS JOIN bounds b
    WHERE e.deleted_at IS NULL
      AND (b.start_date IS NULL OR (e.expense_date >= b.start_date AND e.expense_date < b.end_date))
  )
  SELECT
    COUNT(*)::BIGINT AS total_expenses,
    COALESCE(SUM(amount), 0)::NUMERIC AS total_amount,
    COUNT(*) FILTER (WHERE approved_by IS NOT NULL)::BIGINT AS approved_count,
    COUNT(*) FILTER (WHERE approved_by IS NULL)::BIGINT AS pending_count
  FROM filtered;
$$ LANGUAGE sql STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.employee_stats()
RETURNS TABLE (
  total BIGINT,
  active BIGINT,
  inactive BIGINT,
  departments JSONB
) AS $$
  WITH active_rows AS (
    SELECT coalesce(nullif(department, ''), 'Khac') AS department, status
    FROM public.employees
    WHERE deleted_at IS NULL
  ),
  inactive_rows AS (
    SELECT COUNT(*)::BIGINT AS inactive
    FROM public.employees
    WHERE deleted_at IS NOT NULL
  ),
  department_counts AS (
    SELECT department, COUNT(*)::BIGINT AS count
    FROM active_rows
    GROUP BY department
  )
  SELECT
    (SELECT COUNT(*)::BIGINT FROM active_rows) + (SELECT inactive FROM inactive_rows) AS total,
    (SELECT COUNT(*)::BIGINT FROM active_rows WHERE status = 'active') AS active,
    (SELECT inactive FROM inactive_rows) AS inactive,
    COALESCE((SELECT jsonb_object_agg(department, count) FROM department_counts), '{}'::JSONB) AS departments;
$$ LANGUAGE sql STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.contract_stats()
RETURNS TABLE (
  total BIGINT,
  active BIGINT,
  pending BIGINT,
  completed BIGINT,
  revenue NUMERIC,
  outstanding NUMERIC,
  growth_total INT
) AS $$
  WITH periods AS (
    SELECT
      date_trunc('month', now()) AS this_month_start,
      date_trunc('month', now()) - INTERVAL '1 month' AS last_month_start
  ),
  base AS (
    SELECT status, total_amount, remaining_amount, created_at
    FROM public.contracts
    WHERE deleted_at IS NULL
      AND status <> 'da_huy'
  ),
  month_counts AS (
    SELECT
      COUNT(*) FILTER (
        WHERE created_at >= (SELECT this_month_start FROM periods)
      )::NUMERIC AS this_month_count,
      COUNT(*) FILTER (
        WHERE created_at >= (SELECT last_month_start FROM periods)
          AND created_at < (SELECT this_month_start FROM periods)
      )::NUMERIC AS last_month_count
    FROM base
  )
  SELECT
    COUNT(*)::BIGINT AS total,
    COUNT(*) FILTER (WHERE status = 'dang_thuc_hien')::BIGINT AS active,
    COUNT(*) FILTER (WHERE status = 'cho_xu_ly')::BIGINT AS pending,
    COUNT(*) FILTER (WHERE status = 'hoan_thanh')::BIGINT AS completed,
    COALESCE(SUM(total_amount), 0)::NUMERIC AS revenue,
    COALESCE(SUM(remaining_amount), 0)::NUMERIC AS outstanding,
    CASE
      WHEN (SELECT last_month_count FROM month_counts) > 0 THEN
        ROUND((((SELECT this_month_count FROM month_counts) - (SELECT last_month_count FROM month_counts)) / (SELECT last_month_count FROM month_counts)) * 100)::INT
      ELSE 0
    END AS growth_total
  FROM base;
$$ LANGUAGE sql STABLE SET search_path = public;

REVOKE ALL ON FUNCTION public.finance_receipt_stats(INT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finance_expense_stats(INT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.employee_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.contract_stats() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.finance_receipt_stats(INT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.finance_expense_stats(INT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.employee_stats() TO service_role;
GRANT EXECUTE ON FUNCTION public.contract_stats() TO service_role;
