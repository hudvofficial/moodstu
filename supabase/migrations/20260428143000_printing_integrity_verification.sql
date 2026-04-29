-- Printing integrity verification helpers.

UPDATE public.expenses e
SET printing_order_id = po.id,
    updated_at = now()
FROM public.printing_orders po
WHERE e.printing_order_id IS NULL
  AND e.deleted_at IS NULL
  AND po.order_code IS NOT NULL
  AND e.description LIKE ('[Auto-Print] ' || po.order_code || ':%');

CREATE OR REPLACE FUNCTION public.printing_integrity_report()
RETURNS TABLE (
  check_name text,
  issue_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH active_expense_links AS (
    SELECT
      printing_order_id,
      COUNT(*)::bigint AS active_expense_count,
      COALESCE(SUM(amount), 0)::numeric AS active_expense_amount
    FROM public.expenses
    WHERE deleted_at IS NULL
      AND printing_order_id IS NOT NULL
    GROUP BY printing_order_id
  ),
  allocation_totals AS (
    SELECT
      printing_order_id,
      COALESCE(SUM(amount), 0)::numeric AS allocated_amount
    FROM public.lab_payment_allocations
    GROUP BY printing_order_id
  )
  SELECT 'active_order_missing_expense'::text AS check_name, COUNT(*)::bigint AS issue_count
  FROM public.printing_orders po
  LEFT JOIN active_expense_links ael ON ael.printing_order_id = po.id
  WHERE po.deleted_at IS NULL
    AND COALESCE(po.status, '') <> 'da_huy'
    AND COALESCE(po.total_amount, 0) > 0
    AND ael.printing_order_id IS NULL

  UNION ALL

  SELECT 'active_order_duplicate_expense'::text AS check_name, COUNT(*)::bigint AS issue_count
  FROM active_expense_links
  WHERE active_expense_count > 1

  UNION ALL

  SELECT 'active_order_expense_amount_mismatch'::text AS check_name, COUNT(*)::bigint AS issue_count
  FROM public.printing_orders po
  JOIN active_expense_links ael ON ael.printing_order_id = po.id
  WHERE po.deleted_at IS NULL
    AND COALESCE(po.status, '') <> 'da_huy'
    AND COALESCE(po.total_amount, 0) > 0
    AND abs(COALESCE(po.total_amount, 0) - COALESCE(ael.active_expense_amount, 0)) > 0.01

  UNION ALL

  SELECT 'inactive_order_active_expense'::text AS check_name, COUNT(*)::bigint AS issue_count
  FROM public.printing_orders po
  JOIN public.expenses e
    ON e.printing_order_id = po.id
   AND e.deleted_at IS NULL
  WHERE po.deleted_at IS NOT NULL
     OR COALESCE(po.status, '') = 'da_huy'

  UNION ALL

  SELECT 'legacy_unlinked_auto_print_expense'::text AS check_name, COUNT(*)::bigint AS issue_count
  FROM public.expenses
  WHERE deleted_at IS NULL
    AND printing_order_id IS NULL
    AND description LIKE '[Auto-Print] %'

  UNION ALL

  SELECT 'paid_order_underallocated'::text AS check_name, COUNT(*)::bigint AS issue_count
  FROM public.printing_orders po
  LEFT JOIN allocation_totals at ON at.printing_order_id = po.id
  WHERE po.deleted_at IS NULL
    AND COALESCE(po.status, '') <> 'da_huy'
    AND po.payment_status = 'da_thanh_toan'
    AND COALESCE(at.allocated_amount, 0) + 0.01 < COALESCE(po.total_amount, 0)

  UNION ALL

  SELECT 'open_order_overallocated'::text AS check_name, COUNT(*)::bigint AS issue_count
  FROM public.printing_orders po
  JOIN allocation_totals at ON at.printing_order_id = po.id
  WHERE po.deleted_at IS NULL
    AND COALESCE(po.status, '') <> 'da_huy'
    AND COALESCE(at.allocated_amount, 0) - 0.01 > COALESCE(po.total_amount, 0);
$$;

REVOKE ALL ON FUNCTION public.printing_integrity_report() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.printing_integrity_report() TO service_role;
