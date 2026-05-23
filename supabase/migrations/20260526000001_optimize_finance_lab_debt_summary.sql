-- Tối ưu hóa RPC finance_lab_debt_summary để tránh Full Table Scan
-- 1. Loại bỏ CTE allocation_totals tính tổng toàn bộ bảng lab_payment_allocations
-- 2. Dùng correlated subquery để chỉ tính tổng thanh toán cho những đơn chưa thanh toán xong
-- 3. Thêm bộ lọc po.payment_status <> 'da_thanh_toan' để giảm thiểu số lượng đơn cần xử lý

CREATE OR REPLACE FUNCTION public.finance_lab_debt_summary()
RETURNS TABLE (
  lab_id uuid,
  lab_name text,
  order_count bigint,
  total_orders numeric,
  total_paid numeric,
  remaining numeric,
  last_order_date timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH balances AS (
    SELECT
      po.id,
      po.lab_id,
      po.total_amount,
      po.order_date,
      (SELECT COALESCE(SUM(amount), 0)::numeric FROM public.lab_payment_allocations WHERE printing_order_id = po.id) AS allocated
    FROM public.printing_orders po
    WHERE po.deleted_at IS NULL
      AND po.lab_id IS NOT NULL
      AND COALESCE(po.status, '') <> 'da_huy'
      AND COALESCE(po.payment_status, '') <> 'da_thanh_toan'
  )
  SELECT
    l.id AS lab_id,
    l.lab_name::text AS lab_name,
    COUNT(b.id)::bigint AS order_count,
    COALESCE(SUM(COALESCE(b.total_amount, 0)), 0)::numeric AS total_orders,
    COALESCE(SUM(COALESCE(b.allocated, 0)), 0)::numeric AS total_paid,
    COALESCE(SUM(GREATEST(COALESCE(b.total_amount, 0) - COALESCE(b.allocated, 0), 0)), 0)::numeric AS remaining,
    MAX(b.order_date)::timestamptz AS last_order_date
  FROM balances b
  JOIN public.labs l ON l.id = b.lab_id
  WHERE GREATEST(COALESCE(b.total_amount, 0) - COALESCE(b.allocated, 0), 0) > 0
    AND l.deleted_at IS NULL
  GROUP BY l.id, l.lab_name
  ORDER BY remaining DESC;
$$;
