-- ═══════════════════════════════════════════════════════════
-- Active-employee RLS helper + fix contract policies — 2026-06-05
-- ═══════════════════════════════════════════════════════════
-- BUG caught by client-direct network test: the authenticated_read policies
-- (migration 20260605000000 + 020000) inline `EXISTS (SELECT 1 FROM employees
-- ...)`. But `employees` is REVOKED from authenticated (server-only table) +
-- has RLS on, so when an authenticated (browser) user reads a contract table,
-- the policy's subquery hits employees → "permission denied for table
-- employees" → the whole request 403s. The policies were effectively
-- fail-closed (nothing could read), so server actions (service_role, bypass
-- RLS) were unaffected and the app kept working — but client-direct reads got 403.
--
-- FIX: a SECURITY DEFINER function runs with the OWNER's privileges, so it can
-- read employees regardless of the caller's grants/RLS. Standard Supabase
-- pattern for "is the current user an active employee?" in RLS. Rewrite every
-- authenticated_read policy to use it. employees stays locked (the function
-- bypasses internally; no grant added to authenticated).
--
-- ROLLBACK: revert policies to inline EXISTS (see 20260605000000) +
--   DROP FUNCTION IF EXISTS public.is_active_employee();
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.is_active_employee()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.auth_user_id = auth.uid()
      AND e.deleted_at IS NULL
      AND e.status = 'active'
  );
$$;

REVOKE ALL ON FUNCTION public.is_active_employee() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_employee() TO authenticated, service_role;

-- ─── Rewrite authenticated_read policies to use the helper ───
DROP POLICY IF EXISTS contracts_authenticated_read ON public.contracts;
CREATE POLICY contracts_authenticated_read ON public.contracts
  FOR SELECT TO authenticated USING (public.is_active_employee());

DROP POLICY IF EXISTS contract_events_authenticated_read ON public.contract_events;
CREATE POLICY contract_events_authenticated_read ON public.contract_events
  FOR SELECT TO authenticated USING (public.is_active_employee());

DROP POLICY IF EXISTS contract_checklists_authenticated_read ON public.contract_checklists;
CREATE POLICY contract_checklists_authenticated_read ON public.contract_checklists
  FOR SELECT TO authenticated USING (public.is_active_employee());

DROP POLICY IF EXISTS work_tasks_authenticated_read ON public.work_tasks;
CREATE POLICY work_tasks_authenticated_read ON public.work_tasks
  FOR SELECT TO authenticated USING (public.is_active_employee());

DROP POLICY IF EXISTS payment_plans_authenticated_read ON public.payment_plans;
CREATE POLICY payment_plans_authenticated_read ON public.payment_plans
  FOR SELECT TO authenticated USING (public.is_active_employee());

DROP POLICY IF EXISTS contract_notes_authenticated_read ON public.contract_notes;
CREATE POLICY contract_notes_authenticated_read ON public.contract_notes
  FOR SELECT TO authenticated USING (public.is_active_employee());

DROP POLICY IF EXISTS payment_plan_allocations_authenticated_read ON public.payment_plan_allocations;
CREATE POLICY payment_plan_allocations_authenticated_read ON public.payment_plan_allocations
  FOR SELECT TO authenticated USING (public.is_active_employee());
