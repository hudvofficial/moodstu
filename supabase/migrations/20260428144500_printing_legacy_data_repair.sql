-- Repair legacy printing accounting drift detected by printing_integrity_report().

DO $$
DECLARE
  v_order_id uuid;
BEGIN
  FOR v_order_id IN
    WITH active_expense_links AS (
      SELECT printing_order_id
      FROM public.expenses
      WHERE deleted_at IS NULL
        AND printing_order_id IS NOT NULL
      GROUP BY printing_order_id
    )
    SELECT po.id
    FROM public.printing_orders po
    LEFT JOIN active_expense_links ael ON ael.printing_order_id = po.id
    WHERE po.deleted_at IS NULL
      AND COALESCE(po.status, '') <> 'da_huy'
      AND COALESCE(po.total_amount, 0) > 0
      AND ael.printing_order_id IS NULL
  LOOP
    PERFORM public.upsert_printing_expense(v_order_id, NULL);
  END LOOP;
END $$;

WITH allocation_totals AS (
  SELECT
    printing_order_id,
    COALESCE(SUM(amount), 0)::numeric AS allocated_amount
  FROM public.lab_payment_allocations
  GROUP BY printing_order_id
)
UPDATE public.printing_orders po
SET payment_status = 'chua_thanh_toan',
    updated_at = now()
FROM allocation_totals at
WHERE at.printing_order_id = po.id
  AND po.deleted_at IS NULL
  AND COALESCE(po.status, '') <> 'da_huy'
  AND po.payment_status = 'da_thanh_toan'
  AND COALESCE(at.allocated_amount, 0) + 0.01 < COALESCE(po.total_amount, 0);

UPDATE public.printing_orders po
SET payment_status = 'chua_thanh_toan',
    updated_at = now()
WHERE po.deleted_at IS NULL
  AND COALESCE(po.status, '') <> 'da_huy'
  AND po.payment_status = 'da_thanh_toan'
  AND COALESCE(po.total_amount, 0) > 0
  AND NOT EXISTS (
    SELECT 1
    FROM public.lab_payment_allocations lpa
    WHERE lpa.printing_order_id = po.id
  );
