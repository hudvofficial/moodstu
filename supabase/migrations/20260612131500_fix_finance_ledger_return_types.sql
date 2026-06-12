-- Fix finance_ledger RPC return type mismatches.
-- Postgres requires each RETURN QUERY column to match RETURNS TABLE exactly.
-- Some COALESCE/CASE expressions were inferred as varchar, causing:
--   42804: Returned type character varying does not match expected type text in column 6.

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
      COALESCE(p.receipt_code, c.contract_code, CONCAT('PAY-', LEFT(p.id::TEXT, 8)))::TEXT AS code,
      cu.full_name::TEXT AS customer_name,
      tc.name::TEXT AS category_name,
      p.payment_method::TEXT AS payment_method,
      COALESCE(p.notes, p.payment_stage, c.contract_code)::TEXT AS description,
      (CASE WHEN p.approved_by IS NULL THEN 'pending' ELSE 'approved' END)::TEXT AS status,
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
      COALESCE(r.contract_code, CONCAT('REC-', LEFT(r.id::TEXT, 8)))::TEXT AS code,
      r.customer_name::TEXT AS customer_name,
      COALESCE(r.category_name, tc.name)::TEXT AS category_name,
      r.payment_type::TEXT AS payment_method,
      r.notes::TEXT AS description,
      COALESCE(r.status, 'confirmed')::TEXT AS status,
      r.created_at
    FROM public.receipts r
    LEFT JOIN public.transaction_categories tc ON tc.id = r.category_id

    UNION ALL

    SELECT
      e.id,
      'expenses'::TEXT AS source_table,
      'out'::TEXT AS direction,
      e.expense_date AS transaction_date,
      e.amount,
      COALESCE(c.contract_code, CONCAT('EXP-', LEFT(e.id::TEXT, 8)))::TEXT AS code,
      COALESCE(e.recipient, cu.full_name)::TEXT AS customer_name,
      tc.name::TEXT AS category_name,
      e.payment_method::TEXT AS payment_method,
      e.description::TEXT AS description,
      (CASE WHEN e.approved_by IS NULL THEN 'pending' ELSE 'approved' END)::TEXT AS status,
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
    c.source_table::TEXT,
    c.direction::TEXT,
    c.transaction_date,
    c.amount,
    c.code::TEXT,
    COALESCE(c.customer_name, '-')::TEXT AS customer_name,
    COALESCE(c.category_name, '-')::TEXT AS category_name,
    c.payment_method::TEXT,
    COALESCE(c.description, '')::TEXT AS description,
    c.status::TEXT,
    c.total_count
  FROM counted c;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

REVOKE ALL ON FUNCTION public.finance_ledger(INT, INT, INT, INT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finance_ledger(INT, INT, INT, INT, TEXT) TO service_role;