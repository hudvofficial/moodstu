# Phase 02: Employee Lifecycle and Business Invariants
**Status:** Completed
**Priority:** P1
**Target score impact:** 8.3 -> 8.9

## Goal

Make employee lifecycle mutations safe under concurrency and prevent operational lockouts or stale overwrites.

## Work Items

1. Harden soft delete:
   - Block self-delete/self-deactivate.
   - Block deleting/deactivating the last admin/manager with employee-management permission.
   - Downgrade or disable linked auth identity app access without deleting the auth account.
   - Audit old/new state.
2. Harden restore:
   - Require employee write permission.
   - Define whether restore re-enables app access automatically or requires explicit relink/reactivation.
   - Audit the transition.
3. Add optimistic locking to `updateEmployee`:
   - Require expected `updated_at` or equivalent version.
   - Return a stale-write error when the row changed after the form loaded.
4. Replace Node-side employee code scan:
   - Add DB sequence/RPC such as `next_employee_code()`.
   - Initialize sequence from current max `employee_code`.
   - Keep unique constraint behavior as the final guard.
5. Ensure salary/profile merges do not erase unknown existing JSON fields.
6. Add focused tests or verification probes where practical.

## Acceptance Criteria

- Current user cannot remove their own employee-management access through soft delete.
- Last privileged employee cannot be deleted or deactivated.
- Linked auth identity cannot continue with stale privileged app metadata after employee soft delete.
- Concurrent updates cannot silently overwrite newer employee edits.
- Employee code generation is atomic and does not query thousands of rows in application code.
- Audit log records lifecycle transitions with useful old/new data.

## Verification

```powershell
rg -n "next_employee_code|expectedUpdatedAt|updated_at|softDeleteEmployee|restoreEmployee|syncAuthIdentity" app lib supabase
npx supabase db push --dry-run
npx supabase db push
npm run verify:employees
npx tsc --noEmit --pretty false
npm run lint
```

## Notes

- Prefer DB-backed atomic allocation for codes; retry loops are acceptable only around unique-constraint conflicts.
- Restore should not become an accidental privilege-escalation path.
