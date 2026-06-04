-- ═══════════════════════════════════════════════════════════
-- RLS Test Plan — Contracts (run on STAGING after migration apply)
-- ═══════════════════════════════════════════════════════════
-- Run each section in the Supabase SQL Editor on the STAGING project.
-- Each section sets a role + JWT context, then runs SELECTs. The
-- "expected" comments tell you what should happen — if anything mismatches
-- DO NOT apply to production.

-- ─── §0 — Sanity: RLS enabled? policies exist? ──────────────
-- Expected: all 6 tables show rowsecurity=true, each has 2 policies.
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'contracts','contract_events','contract_checklists',
    'work_tasks','payment_plans','contract_notes'
  )
ORDER BY tablename;

SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'contracts','contract_events','contract_checklists',
    'work_tasks','payment_plans','contract_notes'
  )
ORDER BY tablename, policyname;

-- ─── §1 — service_role: must read EVERYTHING (server actions OK) ─
-- Expected: counts match raw row counts; no error.
SET LOCAL ROLE service_role;
SELECT 'contracts'           AS t, count(*) FROM public.contracts UNION ALL
SELECT 'contract_events',    count(*) FROM public.contract_events UNION ALL
SELECT 'contract_checklists',count(*) FROM public.contract_checklists UNION ALL
SELECT 'work_tasks',         count(*) FROM public.work_tasks UNION ALL
SELECT 'payment_plans',      count(*) FROM public.payment_plans UNION ALL
SELECT 'contract_notes',     count(*) FROM public.contract_notes;
RESET ROLE;

-- ─── §2 — anon (unauthenticated): MUST READ 0 rows ──────────
-- Expected: every count = 0. If any > 0 → POLICY LEAKS DATA TO PUBLIC. STOP.
SET LOCAL ROLE anon;
SELECT 'contracts'           AS t, count(*) FROM public.contracts UNION ALL
SELECT 'contract_events',    count(*) FROM public.contract_events UNION ALL
SELECT 'contract_checklists',count(*) FROM public.contract_checklists UNION ALL
SELECT 'work_tasks',         count(*) FROM public.work_tasks UNION ALL
SELECT 'payment_plans',      count(*) FROM public.payment_plans UNION ALL
SELECT 'contract_notes',     count(*) FROM public.contract_notes;
RESET ROLE;

-- ─── §3 — authenticated as ACTIVE employee: must read all ───
-- Expected: counts match service_role counts (full read).
-- Replace <ACTIVE_AUTH_UID> with auth.users.id of an active employee:
--   SELECT auth_user_id FROM public.employees
--   WHERE deleted_at IS NULL AND status='active' LIMIT 1;
DO $$
DECLARE v_uid uuid := '<ACTIVE_AUTH_UID>'::uuid;  -- ← paste real uid
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.sub', v_uid::text, true);
  PERFORM set_config('request.jwt.claims',
                     json_build_object('sub', v_uid, 'role','authenticated')::text,
                     true);
END $$;
SELECT 'contracts'           AS t, count(*) FROM public.contracts UNION ALL
SELECT 'contract_events',    count(*) FROM public.contract_events UNION ALL
SELECT 'contract_checklists',count(*) FROM public.contract_checklists UNION ALL
SELECT 'work_tasks',         count(*) FROM public.work_tasks UNION ALL
SELECT 'payment_plans',      count(*) FROM public.payment_plans UNION ALL
SELECT 'contract_notes',     count(*) FROM public.contract_notes;
RESET ROLE;

-- ─── §4 — authenticated as DISABLED/DELETED employee: 0 rows ─
-- Expected: every count = 0. If any > 0 → policy doesn't gate inactive
-- employees. STOP.
-- Pick an inactive employee (or temporarily mark one inactive on staging):
--   UPDATE public.employees SET status='inactive' WHERE id='<EMP_ID>';
--   SELECT auth_user_id FROM public.employees WHERE status<>'active' LIMIT 1;
DO $$
DECLARE v_uid uuid := '<INACTIVE_AUTH_UID>'::uuid;  -- ← paste real uid
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.sub', v_uid::text, true);
  PERFORM set_config('request.jwt.claims',
                     json_build_object('sub', v_uid, 'role','authenticated')::text,
                     true);
END $$;
SELECT 'contracts'           AS t, count(*) FROM public.contracts UNION ALL
SELECT 'contract_events',    count(*) FROM public.contract_events UNION ALL
SELECT 'contract_checklists',count(*) FROM public.contract_checklists UNION ALL
SELECT 'work_tasks',         count(*) FROM public.work_tasks UNION ALL
SELECT 'payment_plans',      count(*) FROM public.payment_plans UNION ALL
SELECT 'contract_notes',     count(*) FROM public.contract_notes;
RESET ROLE;

-- ─── §5 — authenticated random uid (no matching employee) ───
-- Expected: every count = 0.
DO $$
DECLARE v_uid uuid := '00000000-0000-0000-0000-000000000000'::uuid;
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.sub', v_uid::text, true);
  PERFORM set_config('request.jwt.claims',
                     json_build_object('sub', v_uid, 'role','authenticated')::text,
                     true);
END $$;
SELECT 'contracts'           AS t, count(*) FROM public.contracts UNION ALL
SELECT 'contract_events',    count(*) FROM public.contract_events UNION ALL
SELECT 'contract_checklists',count(*) FROM public.contract_checklists UNION ALL
SELECT 'work_tasks',         count(*) FROM public.work_tasks UNION ALL
SELECT 'payment_plans',      count(*) FROM public.payment_plans UNION ALL
SELECT 'contract_notes',     count(*) FROM public.contract_notes;
RESET ROLE;

-- ─── §6 — App smoke (via staging Next app) ──────────────────
-- After SQL tests pass, also test in the running app pointed at staging:
--   1. Login as admin → /contracts loads, drawer opens, all data shows.
--   2. Create / edit / cancel a contract → server actions still succeed
--      (writes go through service_role → bypass RLS).
--   3. Add a note / event / toggle a checklist → success.
--   4. Logout → /contracts redirects to login.
--
-- Only after §0-§6 ALL pass → apply migration to production.
