# Phase 02: Contract Write Gates and Data Integrity
**Status:** Completed
**Priority:** P0
**Target score impact:** 8.5 -> 9.0

## Goal

Make server-side contract mutations enforce explicit role boundaries and data invariants, even when called outside the current UI.

## Work Items

1. Add contract permission helpers in `lib/auth_utils.ts`:
   - `withContractAccess`
   - `withContractWriteAccess`
   - `withContractDestructiveAccess`
   - `requireContractWriteAccess`
   - `requireContractDestructiveAccess`
2. Replace broad `withAuth` plus `requireContractAccess` patterns where write policy needs more precision:
   - `app/actions/contract-mutations.ts`
   - `app/actions/contract-lifecycle.ts`
   - `app/actions/contract-event-actions.ts`
   - `app/actions/work-task-actions.ts`
   - `app/actions/checklist-actions.ts` if checklist writes need separate gates.
3. Codify lifecycle policy:
   - `admin`, `manager`: cancel/delete/reactivate/status transitions.
   - `sale`: read/create/update/payment only unless explicitly approved.
   - Deny destructive actions to `media`, `viewer`, and unauthenticated users.
4. Add server-side date-order validation in `lib/validations/contract.schema.ts`:
   - `work_date >= contract_date` when both are present.
   - `delivery_date >= work_date` when both are present.
   - `delivery_date >= contract_date` when both are present.
   - Keep client validation messages consistent with server validation.
5. Fix manual event date semantics in `app/actions/contract-event-actions.ts`:
   - On-set events use `event_date` and `deadline = null`.
   - Off-set/post-production/manual task events use `deadline` and `event_date = null`.
   - Do not store today's date as a fake `event_date` for off-set events.
6. Harden work task ownership:
   - Before insert, prove `eventId` belongs to `contractId`.
   - Before update/status/delete, load task plus event and verify both resolve to the same contract.
   - Reject mismatched or stale client IDs before using the admin client update path.
7. Add optional DB-level guardrails if schema allows:
   - Trigger/check to prevent `work_tasks.contract_id` from differing from `contract_events.contract_id`.
   - Date-order check constraints for `contracts`.
   - Event semantic check for manual off-set/on-set dates.
8. Extend verification:
   - Invalid date order rejected by server action.
   - Mismatched `eventId`/`contractId` task create rejected.
   - Cross-contract task status update rejected.
   - Sale destructive action denied if the role policy restricts it.

## Acceptance Criteria

- Direct server action calls cannot persist invalid contract date order.
- Task creation/update/delete/status changes cannot cross contract/event ownership boundaries.
- Manual off-set events do not appear as events "today" because of fake `event_date` values.
- Destructive lifecycle actions are denied unless the actor role is explicitly allowed.
- Existing create/edit/task flows still work for authorized roles.

## Verification

```powershell
npm run verify:contracts
npx tsc --noEmit --pretty false
npx eslint app/actions/contract-mutations.ts app/actions/contract-lifecycle.ts app/actions/contract-event-actions.ts app/actions/work-task-actions.ts lib/auth_utils.ts lib/validations/contract.schema.ts
npx supabase db push --dry-run
```

## Notes

- Do not silently change `sale` capabilities without documenting the business policy in the final report.
- DB constraints are preferred where they can be added without breaking existing data; otherwise add a data repair migration first.
