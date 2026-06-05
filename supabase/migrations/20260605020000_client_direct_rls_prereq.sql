-- ═══════════════════════════════════════════════════════════
-- Client-Direct RLS Pre-req (Batch C 4.2a) — 2026-06-05
-- ═══════════════════════════════════════════════════════════
-- Makes contracts-drawer JOIN dependencies safely readable by the browser
-- (role `authenticated`) so client-direct reads work without leaking
-- sensitive data. Server actions are UNAFFECTED (service_role bypasses RLS).
--
-- 1. employees_public VIEW — browser-safe projection. The employees TABLE
--    stays unreadable by `authenticated` (no grant) so salary/bank/auth
--    columns NEVER reach the REST surface. The drawer resolves assignee
--    names from this view client-side (drops the employees FK-embed).
--    The view intentionally runs with owner privileges (default,
--    security_invoker = off) so it bypasses the employees-table RLS and
--    exposes ONLY the projected columns; access is gated by GRANT (only
--    authenticated, never anon).
--
-- 2. payment_plan_allocations — enable RLS + 2 policies (service_role ALL +
--    authenticated read for active employees), consistent with the contract
--    tables hardened in 20260605000000.
--
-- ROLLBACK (run only if needed):
--   DROP VIEW IF EXISTS public.employees_public;
--   ALTER TABLE public.payment_plan_allocations DISABLE ROW LEVEL SECURITY;
--   DROP POLICY IF EXISTS payment_plan_allocations_service_role_all ON public.payment_plan_allocations;
--   DROP POLICY IF EXISTS payment_plan_allocations_authenticated_read ON public.payment_plan_allocations;
-- ═══════════════════════════════════════════════════════════

-- ─── 1. employees_public view (browser-safe projection) ──────
CREATE OR REPLACE VIEW public.employees_public AS
  SELECT
    id,
    full_name,
    avatar_url,
    department,
    "position",
    status
  FROM public.employees;

-- Gate via GRANT, not RLS: anon gets nothing, authenticated gets the
-- projected columns only. employees TABLE itself remains ungranted to
-- authenticated, so sensitive columns are never exposed via REST.
REVOKE ALL ON public.employees_public FROM anon;
GRANT SELECT ON public.employees_public TO authenticated;

-- ─── 2. payment_plan_allocations RLS ─────────────────────────
ALTER TABLE public.payment_plan_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY payment_plan_allocations_service_role_all ON public.payment_plan_allocations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY payment_plan_allocations_authenticated_read ON public.payment_plan_allocations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.auth_user_id = auth.uid()
        AND e.deleted_at IS NULL
        AND e.status = 'active'
    )
  );
