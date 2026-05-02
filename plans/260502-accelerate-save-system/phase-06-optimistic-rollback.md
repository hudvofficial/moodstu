# Phase 06 - Optimistic Rollback Contract

Scope: standardize optimistic UI writes so instant feedback always has an explicit rollback path.

## Completed Slices

- Added `lib/optimistic-mutation.ts`:
  - applies the UI change before the server action resolves.
  - rolls back when the action returns `success: false`.
  - rolls back when the action throws or rejects.
  - centralizes success/error callbacks without owning toast copy.
- Contracts checklist:
  - detail checklist toggle now uses the shared optimistic contract.
  - drawer checklist toggle keeps the existing double-click lock and uses the shared rollback path.
- Contract event tasks:
  - task status changes now use the shared optimistic contract.
  - parent timeline status echo still updates immediately and rolls back with the modal state.
- CRM:
  - lead list status changes use the shared optimistic contract and preserve existing override rollback behavior.
  - lead detail drawer patches SWR detail state immediately and rolls back on action failure.
- Printing:
  - printing order status changes patch the current SWR page immediately and roll back on failure.
  - contract/detail/list caches still revalidate after server success.
- Dresses:
  - standalone rental start/cancel patches the current rental row immediately and rolls back on failure.
  - dress drawer start/cancel/cleaned actions patch local dress status immediately and roll back on failure.
- Performance audit:
  - removed the Moodie `window.location.reload()` exception.
  - Moodie setup refresh now uses route refresh for the server-only migration/setup case.

## Decisions

- Keep money/stock writes conservative. They can close UI quickly and revalidate in the background, but they should not fake final financial or stock totals without a module-specific rollback model.
- Keep toast text at component level because user-facing copy differs by module.
- Keep route refresh allowlisted only where the state is route/session/setup-level.

## Remaining For Later Phases

- Add browser smoke coverage for optimistic success and rollback cases.
