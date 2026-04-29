# Phase 01: Supabase RLS, RPC Grants, and Verification Script
**Status:** Completed
**Priority:** P0
**Target score impact:** 7.5 -> 8.3

## Goal

Make employee and payroll-adjacent data fail closed at the database boundary, then prove the posture with a repeatable script.

## Work Items

1. Add Supabase hardening migration:
   - Enable/force RLS where appropriate for `employees`.
   - Revoke broad table grants from `PUBLIC`, `anon`, and direct `authenticated` where the app uses service-role server actions.
   - Explicitly grant service-role access needed by server actions/RPCs.
2. Include payroll-adjacent tables in the exposure check:
   - `employees`
   - `employee_salaries`
   - `monthly_salaries`
   - `attendance`
   - `evaluations`
3. Harden `employee_stats`:
   - `SECURITY DEFINER` only if needed.
   - `SET search_path = public`.
   - Revoke `PUBLIC`, `anon`, and broad `authenticated` execute if not intentionally public.
   - Grant execute to `service_role`.
4. Add `scripts/verify-employees.mjs`.
5. Add `verify:employees` to `package.json`.

## Acceptance Criteria

- Anon cannot directly read sensitive employee/payroll-adjacent rows.
- `employee_stats` is not callable by anon.
- Service role can still read required data and execute required RPCs.
- Verification script fails loudly if grants regress.

## Verification

```powershell
npx supabase db push --dry-run
npx supabase db push
npm run verify:employees
npx tsc --noEmit --pretty false
npm run lint
```

## Notes

- A `200` with zero rows from anon is not enough for high score if grants still allow broad direct querying. Prefer explicit deny where feasible.
- If an intentional public-safe employee directory is required later, expose a narrow redacted view/RPC rather than the base table.
