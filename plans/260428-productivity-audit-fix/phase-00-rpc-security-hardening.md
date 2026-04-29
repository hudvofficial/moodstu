# Phase 00: RPC Security Hardening and Verification
**Status:** Completed
**Priority:** P0
**Dependencies:** None
**Audit issues:** Critical 1

## Objective

Stop direct public execution of productivity RPCs and establish a repeatable remote security check.

Remote audit showed all 4 productivity RPCs are callable by `PUBLIC`, `anon`, and `authenticated`. Even when anon returns zero rows today, staff productivity RPCs should not be publicly executable.

## Target Files

- `supabase/migrations/*_productivity_rpc_security_hardening.sql` (new)
- `scripts/verify-productivity.mjs` (new)
- `package.json`
- `docs/reports/productivity_audit_2026_04_28.md`

## Implementation Steps

1. Add hardening migration.
   - Revoke `PUBLIC`, `anon`, and broad `authenticated` execute from:
     - `get_employee_productivity(date, date)`
     - `get_employee_job_details(uuid, date, date)`
     - `get_my_employee_productivity(date, date)`
     - `get_my_employee_job_details(date, date)`
   - Grant team RPCs only to `service_role`.
   - For self RPCs, choose one of two safe patterns:
     - Preferred: make self RPCs service-role-only and call them via server actions after app-level auth.
     - Acceptable: grant self RPCs only to `authenticated`, ensure strict `auth.uid()` scoping, cost redaction, and `search_path = public`.

2. Pin security context.
   - Recreate `SECURITY DEFINER` self RPCs with `SET search_path = public`.
   - Confirm team RPCs do not require `SECURITY DEFINER`, or convert to service-role-only if they need bypass behavior.

3. Add `verify:productivity`.
   - Load `.env.local`.
   - Service-role call verifies team overview and detail shapes.
   - Anon calls must fail permission checks.
   - If self RPCs remain authenticated-callable, verify anon denied and unauthenticated denied.

4. Push and verify remote.
   - Run dry-run, push, then `npm run verify:productivity`.

## Acceptance Criteria

- Anon cannot execute any productivity RPC.
- Team RPCs are not callable outside service-role server actions.
- Self RPCs are either service-role-only or authenticated-only with strict self scope.
- `npm run verify:productivity` passes against remote Supabase.
- `npx supabase db push --dry-run` reports remote up to date after push.

## Test Commands

```powershell
npx supabase db push --dry-run
npx supabase db push
npm run verify:productivity
npx tsc --noEmit --pretty false
```

---
Next Phase: [Phase 01 - Detail Correctness and Stale Data Fix](./phase-01-detail-correctness-stale-data.md)
