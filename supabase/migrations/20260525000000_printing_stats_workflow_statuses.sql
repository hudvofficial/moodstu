-- =====================================================
-- Update printing_stats() RPC to include all workflow statuses
-- =====================================================
-- Phase 2 Fix: Add dat_coc, da_giao, hoan_thanh, huy_don counts
-- =====================================================

-- Drop old function
DROP FUNCTION IF EXISTS public.printing_stats();

-- Recreate with all statuses (legacy + workflow)
CREATE OR REPLACE FUNCTION public.printing_stats()
RETURNS TABLE (
  total bigint,
  cho_xu_ly bigint,
  dat_coc bigint,      -- NEW
  dang_in bigint,
  da_in bigint,
  da_giao bigint,      -- NEW
  hoan_thanh bigint,   -- NEW
  huy_don bigint,      -- NEW
  da_nhan bigint,      -- LEGACY
  da_huy bigint,       -- LEGACY
  total_cost numeric,
  unpaid_cost numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*)::bigint AS total,
    COUNT(*) FILTER (WHERE status = 'cho_xu_ly')::bigint AS cho_xu_ly,
    COUNT(*) FILTER (WHERE status = 'dat_coc')::bigint AS dat_coc,
    COUNT(*) FILTER (WHERE status = 'dang_in')::bigint AS dang_in,
    COUNT(*) FILTER (WHERE status = 'da_in')::bigint AS da_in,
    COUNT(*) FILTER (WHERE status = 'da_giao')::bigint AS da_giao,
    COUNT(*) FILTER (WHERE status = 'hoan_thanh')::bigint AS hoan_thanh,
    COUNT(*) FILTER (WHERE status = 'huy_don')::bigint AS huy_don,
    COUNT(*) FILTER (WHERE status = 'da_nhan')::bigint AS da_nhan,
    COUNT(*) FILTER (WHERE status = 'da_huy')::bigint AS da_huy,

    -- Total cost (exclude cancelled orders)
    COALESCE(SUM(total_amount) FILTER (
      WHERE status NOT IN ('da_huy', 'huy_don')
    ), 0)::numeric AS total_cost,

    -- Unpaid cost (unpaid or partial payment, exclude cancelled and legacy completed)
    COALESCE(SUM(total_amount) FILTER (
      WHERE payment_status IN ('unpaid', 'partial')
        AND status NOT IN ('da_huy', 'huy_don', 'hoan_thanh', 'da_nhan')
    ), 0)::numeric AS unpaid_cost

  FROM public.printing_orders
  WHERE deleted_at IS NULL;
$$;

-- Grant permissions (service_role only for security)
REVOKE ALL ON FUNCTION public.printing_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.printing_stats() TO service_role;

-- Add comment
COMMENT ON FUNCTION public.printing_stats IS 'Returns aggregated statistics for printing orders including all workflow statuses (Phase 2)';

-- =====================================================
-- Migration complete
-- =====================================================
