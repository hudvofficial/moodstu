-- Repair finance_ledger_range's strict RETURNS TABLE contract.
-- PostgreSQL does not implicitly accept varchar/enum expressions for TEXT output
-- columns in RETURN QUERY, even when their values are text-compatible.

CREATE OR REPLACE FUNCTION public.finance_ledger_range(
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 20,
  p_from_date DATE DEFAULT NULL,
  p_to_date DATE DEFAULT NULL,
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
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_count INT := 0;
  v_page INT := GREATEST(COALESCE(p_page, 1), 1);
  v_page_size INT := LEAST(GREATEST(COALESCE(p_page_size, 20), 1), 50);
BEGIN
  WITH counts AS (
    SELECT COUNT(*) AS cnt
    FROM public.payments p
    WHERE p.deleted_at IS NULL
      AND (p_from_date IS NULL OR p.payment_date >= p_from_date)
      AND (p_to_date IS NULL OR p.payment_date <= p_to_date)
      AND (p_type IS NULL OR p_type = 'all' OR p_type = 'in')
    UNION ALL
    SELECT COUNT(*) AS cnt
    FROM public.receipts r
    WHERE r.deleted_at IS NULL
      AND r.contract_id IS NULL
      AND (p_from_date IS NULL OR r.receipt_date >= p_from_date)
      AND (p_to_date IS NULL OR r.receipt_date <= p_to_date)
      AND (p_type IS NULL OR p_type = 'all' OR p_type = 'in')
    UNION ALL
    SELECT COUNT(*) AS cnt
    FROM public.expenses e
    WHERE e.deleted_at IS NULL
      AND (p_from_date IS NULL OR e.expense_date >= p_from_date)
      AND (p_to_date IS NULL OR e.expense_date <= p_to_date)
      AND (p_type IS NULL OR p_type = 'all' OR p_type = 'out')
  )
  SELECT COALESCE(SUM(cnt), 0)::INT INTO v_total_count FROM counts;

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
      CASE WHEN p.approved_by IS NULL THEN 'pending' ELSE 'approved' END::TEXT AS status,
      p.created_at
    FROM public.payments p
    LEFT JOIN public.contracts c ON c.id = p.contract_id
    LEFT JOIN public.customers cu ON cu.id = COALESCE(p.customer_id, c.customer_id)
    LEFT JOIN public.transaction_categories tc ON tc.id = p.category_id
    WHERE p.deleted_at IS NULL
      AND (p_from_date IS NULL OR p.payment_date >= p_from_date)
      AND (p_to_date IS NULL OR p.payment_date <= p_to_date)
      AND (p_type IS NULL OR p_type = 'all' OR p_type = 'in')

    UNION ALL

    SELECT
      r.id,
      'receipts'::TEXT,
      'in'::TEXT,
      r.receipt_date,
      r.receipt_amount::NUMERIC,
      COALESCE(r.contract_code, CONCAT('REC-', LEFT(r.id::TEXT, 8)))::TEXT,
      r.customer_name::TEXT,
      COALESCE(r.category_name, tc.name)::TEXT,
      r.payment_type::TEXT,
      r.notes::TEXT,
      COALESCE(r.status, 'confirmed')::TEXT,
      r.created_at
    FROM public.receipts r
    LEFT JOIN public.transaction_categories tc ON tc.id = r.category_id
    WHERE r.deleted_at IS NULL
      AND r.contract_id IS NULL
      AND (p_from_date IS NULL OR r.receipt_date >= p_from_date)
      AND (p_to_date IS NULL OR r.receipt_date <= p_to_date)
      AND (p_type IS NULL OR p_type = 'all' OR p_type = 'in')

    UNION ALL

    SELECT
      e.id,
      'expenses'::TEXT,
      'out'::TEXT,
      e.expense_date,
      e.amount::NUMERIC,
      COALESCE(c.contract_code, CONCAT('EXP-', LEFT(e.id::TEXT, 8)))::TEXT,
      COALESCE(e.recipient, cu.full_name)::TEXT,
      tc.name::TEXT,
      e.payment_method::TEXT,
      e.description::TEXT,
      CASE WHEN e.approved_by IS NULL THEN 'pending' ELSE 'approved' END::TEXT,
      e.created_at
    FROM public.expenses e
    LEFT JOIN public.contracts c ON c.id = e.contract_id
    LEFT JOIN public.customers cu ON cu.id = c.customer_id
    LEFT JOIN public.transaction_categories tc ON tc.id = e.category_id
    WHERE e.deleted_at IS NULL
      AND (p_from_date IS NULL OR e.expense_date >= p_from_date)
      AND (p_to_date IS NULL OR e.expense_date <= p_to_date)
      AND (p_type IS NULL OR p_type = 'all' OR p_type = 'out')
  )
  SELECT
    entry.id::UUID,
    entry.source_table::TEXT,
    entry.direction::TEXT,
    entry.transaction_date::DATE,
    entry.amount::NUMERIC,
    entry.code::TEXT,
    COALESCE(entry.customer_name, '-')::TEXT,
    COALESCE(entry.category_name, '-')::TEXT,
    entry.payment_method::TEXT,
    COALESCE(entry.description, '')::TEXT,
    entry.status::TEXT,
    v_total_count::INT
  FROM entries entry
  ORDER BY entry.transaction_date DESC, entry.created_at DESC NULLS LAST, entry.id DESC
  LIMIT v_page_size
  OFFSET (v_page - 1) * v_page_size;
END;
$$;

REVOKE ALL ON FUNCTION public.finance_ledger_range(INT, INT, DATE, DATE, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finance_ledger_range(INT, INT, DATE, DATE, TEXT) TO service_role;
