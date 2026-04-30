# Phase 02: Create-Path Business Logic Hardening
**Status:** Completed  
**Priority:** P1  
**Dependencies:** Phase 01  
**Score impact:** 9.25 -> 9.45

## Objective

Tighten create validation and error handling without changing the service module data model.

## Target Files

- `components/services/form/hooks/useServiceForm.ts`
- `components/services/form/ServiceInfoSection.tsx`
- `components/services/form/ServicePriceSection.tsx`
- `lib/validations/service.schema.ts`
- `app/actions/service-mutations.ts`
- `supabase/migrations/*` only if RPC guard is missing and cannot be enforced in existing migration

## Implementation Steps

1. Strengthen client validation.
   - Required name.
   - Non-negative finite `selling_price` and `cost_price`.
   - Valid URL for `image_url` when present.
   - Bundle has at least one child item when fulfillment is `bundle`.

2. Improve below-cost handling.
   - Decide business rule:
     - Block `selling_price < cost_price`, or
     - allow with explicit warning.
   - Prefer warning if discounts/loss-leader services are legitimate.

3. Map server errors to user-friendly messages.
   - Duplicate `service_code` -> field-level service code error.
   - Validation failure -> field/section message.
   - RPC failure -> concise toast plus console/server log.

4. Verify bundle server guarantees.
   - Children must be active.
   - Children must not be deleted.
   - Children must be `single`.
   - Parent cannot reference itself.
   - Save remains atomic.

## Acceptance Criteria

- Invalid create payload is rejected before mutation when possible.
- Server action rejects invalid direct calls.
- Duplicate code does not show raw DB text.
- Bundle write remains atomic.

## Verification

```powershell
npx tsc --noEmit --pretty false
npm run lint
npm run verify:services
```

Manual:

- Negative price.
- Invalid image URL.
- Duplicate service code.
- Bundle with invalid or no child.
