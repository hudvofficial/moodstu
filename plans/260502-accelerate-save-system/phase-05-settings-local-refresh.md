# Phase 05 - Settings Local Refresh

Scope: remove heavy full-route refresh from Settings flows where local state/cache refresh is enough.

## Completed Slices

- Studio settings:
  - saving studio info updates the local saved baseline instead of calling `router.refresh()`.
  - studio info SWR keys are updated directly for consumers such as quotes/receipts.
  - Moodie AI settings update the local baseline so the save button resets correctly.
- Google Calendar:
  - disconnect updates local connected state and refreshes the studio info cache instead of full route refresh.
- Credit cards:
  - create/update/delete closes modal first.
  - card list reloads through `fetchCreditCards()` and local state instead of `router.refresh()`.
- Profile edit:
  - settings profile card updates local profile state after save.
  - avatar URL is applied from the upload result without full route refresh.

## Decisions

- Keep logout using `router.refresh()` because auth/session state is a route-level concern.
- Keep realtime fallback `router.refresh()` untouched because it is only used when no cache target is available.
- Keep server-side `revalidatePath` in actions for other tabs/routes; this phase only removes client-side full refresh after local writes.

## Remaining For Later Phases

- Add a dedicated Settings SWR hook if more settings screens become client-driven.
- Replace remaining server-prop refresh patterns only when each page has local fallback state.
