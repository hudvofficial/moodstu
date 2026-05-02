# Phase 00 - Save Performance Map

Goal: speed up perceived save time without changing business logic.

## Rules

- Close or navigate UI immediately after a successful server action.
- Run SWR/cache refresh in the background with `void`.
- Keep validation, DB writes, RPCs, and rollback behavior unchanged.
- Do not use optimistic updates for money/stock unless rollback is explicit.

## First Safe Targets

- Inventory create/edit: `components/inventory/inventory-form-modal.tsx`
- Inventory stock in/out: `components/inventory/stock-in-modal.tsx`, `components/inventory/stock-out-modal.tsx`
- Services create/edit/delete: `components/services/form/hooks/useServiceForm.ts`
- Service categories: `components/services/category-manager-modal.tsx`

## Current Pattern

Several components do:

1. await server action
2. show success toast
3. await cache revalidation
4. close modal or navigate

Phase 1 changes step 3 to background refresh after closing/navigating.
