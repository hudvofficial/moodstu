# Phase 00: Auth Context, Termination, and Route/Action RBAC
**Status:** Completed
**Priority:** P0
**Target score impact:** 6.4 -> 7.5

## Goal

Close the highest-risk gap: an employee row can be inactive or soft-deleted while the linked auth identity still receives app role context and access.

## Work Items

1. Update auth context reads in `lib/auth_utils.ts`:
   - Include `status` and `deleted_at`.
   - Treat `deleted_at IS NOT NULL` as denied for protected app context.
   - Treat non-active employee status as denied unless a deliberate bootstrap/admin recovery path is being executed.
2. Add employee-specific authorization helpers:
   - `requireEmployeesAccess`
   - `requireEmployeesWriteAccess`
   - `withEmployeesAccess`
   - `withEmployeesWriteAccess`
3. Replace generic employee action boundaries:
   - `app/actions/employee-queries.ts`
   - `app/actions/employee-mutations.ts`
4. Confirm route guard behavior for:
   - `app/(protected)/employees/layout.tsx`
   - `app/(protected)/employees/page.tsx`
   - `app/(protected)/employees/[id]/page.tsx`
5. Define role policy:
   - `admin`, `manager`: read/write employee management.
   - Other roles: denied from `/employees` management unless a future explicit HR role exists.
6. Ensure failed auth/permission checks return consistent action errors and do not silently render empty employee lists.

## Acceptance Criteria

- Soft-deleted employee identities cannot access `/employees` or employee server actions.
- Inactive employee identities cannot keep app-level admin/manager permissions.
- Generic `withAuth` is not used for employee-management data/actions.
- Generic `withAdmin` is replaced or wrapped with an employees-specific intent where appropriate.
- Route and action permission behavior matches the same role policy.

## Verification

```powershell
rg -n "withEmployeesAccess|withEmployeesWriteAccess|requireEmployeesAccess|requireEmployeesWriteAccess" lib app/actions app/\(protected\)/employees
rg -n "withAuth\\(|withAdmin\\(" app/actions/employee-queries.ts app/actions/employee-mutations.ts
npx tsc --noEmit --pretty false
npm run lint
```

## Notes

- Do not delete Supabase auth users in this phase.
- If a locked-out admin recovery path is needed, document it separately instead of keeping inactive employees authorized.
