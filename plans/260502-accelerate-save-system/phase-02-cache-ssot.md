# Phase 02 - Cache Invalidation SSOT

Scope: move write-after-cache-refresh behavior into one shared invalidation layer.

## Completed Slices

- Added `lib/cache-invalidation.ts` as the SSOT for module cache refresh:
  - contracts
  - inventory
  - services
  - employees
  - finance
  - printing
  - calendar
  - CRM/dress support for later phases
- Routed old contract cache helpers through the SSOT:
  - `revalidateContractCaches`
  - `revalidateContractDetailCaches`
- Routed old inventory cache helper through the SSOT:
  - `revalidateInventory`
- Updated fast-save write paths to call `invalidate*AfterWrite` directly where already touched in Phase 01.
- Removed an unused printing drawer import after moving to the shared invalidation helper.

## Decisions

- Keep legacy helper names as compatibility wrappers so existing screens do not need a risky bulk rewrite.
- Keep list/detail realtime refresh points working, but make their refresh path share the same cache key scope.
- Keep UI close/navigation-first behavior from Phase 01; Phase 02 only centralizes cache scope.

## Non-goals

- No database schema or RPC changes.
- No optimistic data patching/rollback framework yet.
- No removal of server-side `revalidatePath` yet.
