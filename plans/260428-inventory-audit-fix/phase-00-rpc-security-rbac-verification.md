# Phase 00: RPC Security, RBAC, and Verification
**Status:** Completed
**Priority:** P0
**Target score impact:** 7.5 -> 8.3

## Goal

Close the highest-risk security gap: inventory stock RPCs are currently callable with the anon key on remote Supabase. Add explicit app-level inventory authorization and repeatable verification.

## Work Items

1. Add Supabase migration, expected name:
   - `supabase/migrations/20260428200000_inventory_security_hardening.sql`
2. In migration:
   - `REVOKE ALL` on `inventory_stock_in_atomic` and `inventory_stock_out_atomic` from `PUBLIC`, `anon`, and `authenticated`.
   - `GRANT EXECUTE` only to `service_role`.
   - Recreate stock RPCs with `SET search_path = public`.
   - Keep row locking and transaction behavior intact.
3. Add inventory app permission helper:
   - `requireInventoryAccess(supabase, userId)`
   - `withInventoryAccess(action)`
4. Replace inventory query/mutation `withAdmin` usage with explicit inventory access wrappers.
5. Add `scripts/verify-inventory.mjs`.
6. Add `verify:inventory` to `package.json`.

## Acceptance Criteria

- Admin/manager server-action calls still work.
- Sale/media/viewer direct server-action calls fail with permission errors.
- Anon RPC calls return permission denied, not business errors.
- Service-role RPC calls reach the function and return expected fake-item business errors.
- No direct table data is readable by anon.

## Verification

```powershell
npm run verify:inventory
npx tsc --noEmit --pretty false
npm run lint
npx supabase db push --dry-run
npx supabase db push
```

## Notes

- This phase should not change visible UI behavior.
- If finance receipt sale options depend on inventory, keep that action under finance permission or document why inventory permission is required.
