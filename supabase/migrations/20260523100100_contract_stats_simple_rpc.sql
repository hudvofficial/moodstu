-- ============================================================================
-- Contract Stats Simple RPC (Fallback)
-- Simpler version of contract_stats for faster execution as backup
-- Uses single scan with FILTER for all counts
-- ============================================================================

CREATE OR REPLACE FUNCTION contract_stats_simple()
RETURNS TABLE(
  total bigint,
  active bigint,
  pending bigint,
  completed bigint,
  this_month bigint,
  last_month bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH base AS (
    SELECT
      status,
      created_at
    FROM contracts
    WHERE deleted_at IS NULL
  ),
  month_bounds AS (
    SELECT
      date_trunc('month', CURRENT_DATE)::date AS this_month_start,
      (date_trunc('month', CURRENT_DATE) - INTERVAL '1 month')::date AS last_month_start,
      date_trunc('month', CURRENT_DATE)::date - 1 AS last_month_end
  )
  SELECT
    COUNT(*) FILTER (WHERE b.status != 'da_huy') AS total,
    COUNT(*) FILTER (WHERE b.status = 'dang_thuc_hien') AS active,
    COUNT(*) FILTER (WHERE b.status = 'cho_xu_ly') AS pending,
    COUNT(*) FILTER (WHERE b.status = 'hoan_thanh') AS completed,
    COUNT(*) FILTER (WHERE b.status != 'da_huy' AND b.created_at >= m.this_month_start) AS this_month,
    COUNT(*) FILTER (WHERE b.status != 'da_huy' AND b.created_at >= m.last_month_start AND b.created_at <= m.last_month_end) AS last_month
  FROM base b
  CROSS JOIN month_bounds m;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION contract_stats_simple() TO authenticated;

COMMENT ON FUNCTION contract_stats_simple() IS
'Lightweight contract stats fallback - single table scan with FILTER aggregation';
