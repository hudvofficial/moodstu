# Phase 05: Credit Cards Integrity
Status: Complete
Dependencies: Phase 04
Priority: P1

## Objective
Make `/settings/credit-cards` consistent with Settings admin expectations and finance data integrity.

## Implementation Steps

### 1. Add explicit Settings admin route guard
- [x] File: `app/(protected)/settings/credit-cards/page.tsx`
- [x] Use `getAuthenticatedUserContext()`.
- [x] Redirect non-admin/non-manager to `/settings`.
- [x] Keep `fetchCreditCards()` permission behavior or add a dedicated admin/settings query wrapper.

### 2. Fix clear credit limit
- [x] File: `components/settings/credit-cards/credit-card-form-modal.tsx`
- [x] Submit `credit_limit: null` when user clears the value.
- [x] Do not convert `0`/null through `|| undefined`.

### 3. Add update locking
- [x] Include `updated_at` in `CreditCardOption`.
- [x] Fetch it in `fetchCreditCards()`.
- [x] Pass `expectedUpdatedAt` to update action.
- [x] Reject stale updates with friendly conflict message.

### 4. Block delete when linked debts exist
- [x] File: `app/actions/debt-actions.ts`
- [x] Before soft-deleting credit card, count active `debts` where `card_id = id` and `deleted_at IS NULL`.
- [x] If count > 0, throw: card is used by installment debts and cannot be deleted.
- [x] Optionally allow archive only if UI labels it correctly.

### 5. Revalidate correct paths
- [x] Add `revalidatePath("/settings/credit-cards")` for credit card create/update/delete.
- [x] Keep finance revalidation if debts/finance pages consume the same data.

### 6. Input normalization
- [x] Trim bank name.
- [x] Force `last_4` digits in client and server validation.
- [x] Ensure statement/due day are integers 1-31.
- [x] Add duplicate warning if same bank + last4 exists and active.

## Test Criteria
- [x] Non-admin cannot open `/settings/credit-cards`.
- [x] Clearing credit limit persists as `null`.
- [x] Updating stale card shows conflict.
- [x] Deleting a card linked to active installment debts is blocked.
- [x] Create/update/delete refreshes current settings route.

## Notes
This phase fixes business logic and data integrity around finance configuration.

---
Next Phase: phase-06-ui-maintainability-ssot.md
