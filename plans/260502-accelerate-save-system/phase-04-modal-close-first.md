# Phase 04 - Modal Close First

Scope: normalize remaining modal save flows so successful writes close the UI before list/cache refresh callbacks run.

## Completed Slices

- Finance forms:
  - expenses
  - categories
  - budget
  - fixed costs
  - investments
  - goals
  - goal contributions
  - salary adjustments
  - monthly close create
- CRM:
  - lead create/update modal closes before list refresh callback.
- Dresses:
  - rental create and return modals close before dress cache refresh.
  - dress cache refresh now runs fire-and-forget after the modal closes.
- Goal detail drawer:
  - undo contribution clears confirm state immediately after server success.
  - goal/cashflow/contribution cache refresh runs in background.

## Decisions

- Keep server action writes awaited before success UI.
- Keep parent `onSaved()` callbacks for current-page refresh, but run them after close where possible.
- Do not change Settings full-route refresh in this phase because those screens receive server props and need a separate state strategy.

## Remaining For Later Phases

- Settings/Profile/Credit Card local-state refresh strategy to replace `router.refresh()`.
- Finance SSOT invalidation coverage beyond page-local `mutate`.
- Broader optimistic cache patch/rollback layer.
