-- ═══════════════════════════════════════════════════════════
-- Contracts RLS Hardening — 2026-06-05
-- ═══════════════════════════════════════════════════════════
-- Enables RLS on 6 contract tables so browser-direct reads (client-direct)
-- become safe. Server actions are UNAFFECTED because withAuth() uses
-- service_role (createAdminClient) which bypasses RLS by default.
--
-- Pattern per table (2 policies):
--   1. service_role ALL: explicit pass-through for server actions (redundant
--      with default service_role bypass, but documents intent).
--   2. authenticated SELECT: only active employees (status='active',
--      deleted_at IS NULL) can read — matches existing app-level gate
--      isActiveEmployeeContext() in lib/auth_utils.ts.
--
-- NOT GRANTED to authenticated:
--   - INSERT / UPDATE / DELETE: writes stay on service_role (admin client).
--     If browser ever needs to write, add WITH CHECK policies in a follow-up.
--
-- ROLLBACK (run only if needed):
--   ALTER TABLE public.contracts             DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.contract_events       DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.contract_checklists   DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.work_tasks            DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.payment_plans         DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.contract_notes        DISABLE ROW LEVEL SECURITY;
-- ═══════════════════════════════════════════════════════════

-- Shared SELECT predicate for authenticated employees.
-- Inlined per table because PG RLS USING accepts any expression returning
-- boolean; using EXISTS keeps it efficient (planner uses index on
-- employees.auth_user_id when present).

-- ─── 1. contracts ────────────────────────────────────────────
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY contracts_service_role_all ON public.contracts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY contracts_authenticated_read ON public.contracts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.auth_user_id = auth.uid()
        AND e.deleted_at IS NULL
        AND e.status = 'active'
    )
  );

-- ─── 2. contract_events ─────────────────────────────────────
ALTER TABLE public.contract_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY contract_events_service_role_all ON public.contract_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY contract_events_authenticated_read ON public.contract_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.auth_user_id = auth.uid()
        AND e.deleted_at IS NULL
        AND e.status = 'active'
    )
  );

-- ─── 3. contract_checklists ─────────────────────────────────
ALTER TABLE public.contract_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY contract_checklists_service_role_all ON public.contract_checklists
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY contract_checklists_authenticated_read ON public.contract_checklists
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.auth_user_id = auth.uid()
        AND e.deleted_at IS NULL
        AND e.status = 'active'
    )
  );

-- ─── 4. work_tasks ──────────────────────────────────────────
ALTER TABLE public.work_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY work_tasks_service_role_all ON public.work_tasks
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY work_tasks_authenticated_read ON public.work_tasks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.auth_user_id = auth.uid()
        AND e.deleted_at IS NULL
        AND e.status = 'active'
    )
  );

-- ─── 5. payment_plans ───────────────────────────────────────
ALTER TABLE public.payment_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY payment_plans_service_role_all ON public.payment_plans
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY payment_plans_authenticated_read ON public.payment_plans
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.auth_user_id = auth.uid()
        AND e.deleted_at IS NULL
        AND e.status = 'active'
    )
  );

-- ─── 6. contract_notes ──────────────────────────────────────
ALTER TABLE public.contract_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY contract_notes_service_role_all ON public.contract_notes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY contract_notes_authenticated_read ON public.contract_notes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.auth_user_id = auth.uid()
        AND e.deleted_at IS NULL
        AND e.status = 'active'
    )
  );

-- ─── Smoke test (run after apply) ───────────────────────────
-- Expected: every row → t (true) on staging where data exists.
-- See plans/260603-native-feel-performance/RLS-TEST-PLAN.sql for full
-- multi-role verification (active employee / disabled / anon).
