# Phase 02: Transactional Service and Bundle Writes
**Status:** Completed
**Priority:** P1
**Dependencies:** Phase 00, Phase 01
**Audit issues:** Critical 4

## Objective

Make service create/update and bundle item sync atomic so bundle data cannot be lost on partial failure.

## Target Files

- `supabase/migrations/*_services_atomic_writes.sql` (new)
- `app/actions/service-mutations.ts`
- `types/database.types.ts`
- `scripts/verify-services.mjs`

## Implementation Steps

1. Create DB RPCs for atomic writes.
   - `save_service_atomic(p_actor_id uuid, p_service jsonb, p_bundle_items jsonb, p_expected_updated_at timestamptz nullable)`
   - Optional `delete_service_atomic(p_actor_id uuid, p_service_id uuid)`.
   - Validate current `updated_at` inside the function.
   - Insert/update service and bundle rows inside one transaction.

2. Preserve optimistic locking.
   - Update requires `expected_updated_at`.
   - Return clear conflict error when row changed.

3. Validate bundle children in SQL or server before RPC.
   - Child exists.
   - Child is active.
   - Child `deleted_at IS NULL`.
   - Child `fulfillment_type = 'single'`.
   - Child is not the parent.

4. Replace delete-then-insert helper.
   - Remove unsafe `syncBundleItems` standalone destructive flow.
   - Ensure create/update either fully succeeds or rolls back.

5. Verify.
   - Service update with valid bundle persists all rows.
   - Invalid child fails without modifying existing bundle rows.

## Acceptance Criteria

- No partial service/bundle writes.
- Existing bundle rows remain intact if new bundle write fails.
- Optimistic locking still blocks stale updates.
- Verification script covers bundle integrity.

## Test Commands

```powershell
npx supabase db push --dry-run
npm run verify:services
npx tsc --noEmit --pretty false
npm run build
```

---
Next Phase: [Phase 03 - Validation and Builder Contract Fixes](./phase-03-validation-builder-contract.md)
