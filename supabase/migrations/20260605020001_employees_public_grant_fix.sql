-- ═══════════════════════════════════════════════════════════
-- Fix employees_public grants (Batch C 4.2a) — 2026-06-05
-- ═══════════════════════════════════════════════════════════
-- BUG caught in verify: Supabase default privileges auto-granted ALL
-- (INSERT/UPDATE/DELETE/TRUNCATE) on the new employees_public view to
-- `authenticated`. A simple single-table view is AUTO-UPDATABLE, and the
-- view runs with owner privileges (security_invoker off) → an authenticated
-- user could UPDATE/DELETE rows in the underlying employees TABLE through the
-- view, bypassing employees RLS. Lock the view down to SELECT-only.
--
-- ROLLBACK: (re-grant is not desirable; to remove the view entirely)
--   DROP VIEW IF EXISTS public.employees_public;
-- ═══════════════════════════════════════════════════════════

REVOKE ALL ON public.employees_public FROM anon, authenticated;
GRANT SELECT ON public.employees_public TO authenticated;
