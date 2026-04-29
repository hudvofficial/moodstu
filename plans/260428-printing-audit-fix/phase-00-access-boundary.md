# Phase 00: Printing Access Boundary
**Status:** Done
**Priority:** P0
**Dependencies:** None
**Audit issues:** Critical 1

## Objective

Every Printing/Labs page and server action must enforce the existing `printing` module permission before reading or mutating data with the admin Supabase client.

The current risk is the same pattern fixed in Finance: `withAuth` authenticates the user, then passes `createAdminClient()` to the action. Without a module gate, any authenticated role can call the action directly.

## Target Files

- `lib/auth_utils.ts`
- `app/(protected)/printing/layout.tsx` (new)
- `app/actions/printing-queries.ts`
- `app/actions/printing-reference-queries.ts`
- `app/actions/printing-mutations.ts`
- `app/actions/lab-queries.ts`
- `app/actions/lab-mutations.ts`
- `app/actions/printing-actions.ts`

## Implementation Steps

1. Add a printing module gate.
   - Add `requirePrintingAccess(supabase, userId)` in `lib/auth_utils.ts`.
   - Reuse role normalization and `canAccess(role, "printing")`.
   - Follow `requireFinanceAccess` / `requireContractAccess` patterns.

2. Add a wrapper.
   - Add `withPrintingAccess<T>(action)`.
   - Internally call `withAuth`, then `requirePrintingAccess`, then execute the action.
   - Preserve the existing `ActionResult<T>` return shape.

3. Add route layout guard.
   - Create `app/(protected)/printing/layout.tsx`.
   - Fetch `getAuthenticatedUserContext()`.
   - Redirect unauthenticated users to `/login`.
   - Redirect roles without `printing` to `/dashboard`.

4. Convert printing read actions.
   - Replace bare `withAuth` in `printing-queries.ts`.
   - Replace bare `withAuth` in `printing-reference-queries.ts`.
   - Replace bare `withAuth` in `lab-queries.ts`.

5. Convert printing/lab mutations.
   - Replace bare `withAuth` in `printing-mutations.ts`.
   - Replace bare `withAuth` in `lab-mutations.ts`.
   - For `printing-actions.ts`, keep bridge exports but gate `updateReservationStatus` or move it to dress domain in Phase 05.

6. Decide contract-detail entry point policy.
   - Contract detail can show printing orders through contract access, but create/update print order must require `printing` unless explicitly allowing sale to create print jobs.
   - If sales must create print jobs from contracts, add a narrow `requirePrintOrderCreateAccess` policy and document it. Default recommendation: printing access only.

## Acceptance Criteria

- `/printing` and `/printing/labs` redirect non-printing roles.
- Every printing/lab server action has a printing gate or a documented narrower exception.
- Existing admin/manager printing pages still load.
- TypeScript passes.

## Test Commands

```powershell
rg -n 'withAuth\(' app/actions/printing-queries.ts app/actions/printing-reference-queries.ts app/actions/printing-mutations.ts app/actions/lab-queries.ts app/actions/lab-mutations.ts app/actions/printing-actions.ts
npx tsc --noEmit --pretty false
npm run perf:audit
```

## Manual Checks

- Admin/manager can open `/printing` and `/printing/labs`.
- Sale/media/viewer cannot open `/printing`.
- Direct server-action calls as sale/media/viewer return `success: false`.

---
Next Phase: [Phase 01 - RPC and Data Contract Foundation](./phase-01-rpc-data-contract.md)
