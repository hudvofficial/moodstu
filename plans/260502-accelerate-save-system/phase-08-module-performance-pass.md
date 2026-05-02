# Phase 08 - Module Performance Pass

Scope: close the module-by-module pass after the save/cache/realtime/PWA fixes and verify no obvious stale-data or bundle budget blocker remains.

## Completed Slices

- Contracts:
  - detail realtime subscriptions remain filtered by `contract_id` or row id.
  - checklist, notes, events, payment, dress reservation, and printing writes revalidate contract detail/list views through module cache paths instead of relying on a full route refresh.
- Finance:
  - receipt, expense, goal, salary, budget, close, category, investment, and fixed-cost forms revalidate the affected finance dashboards/lists.
  - money totals stay conservative and wait for server success before final cache confirmation.
- CRM:
  - customers/leads lists use cache namespace revalidation.
  - lead status and lead detail updates have optimistic rollback paths.
- Calendar/Productivity:
  - realtime updates target calendar/productivity cache namespaces instead of broad page reload behavior.
- Inventory/Dresses/Printing:
  - list/detail/stats caches are grouped by module keys.
  - operational status actions update current UI first where safe and revalidate related contract/finance views after success.
- Services/Employees/Settings:
  - option sources and forms revalidate their own cache keys.
  - settings writes update local/SWR state without a routine full route refresh.
- Shell/PWA:
  - protected navigation caching is disabled.
  - live Supabase REST business data is `NetworkOnly`.

## Audits

- `npm run perf:chunks`: pass, no app route chunk over 80KB.
- `npm run perf:audit`: pass.
- Remaining `router.refresh()`/reload usage:
  - `hooks/use-realtime.ts`: documented fallback only.
  - `components/settings/settings-view.tsx`: route-level settings refresh.
  - `components/moodie/moodie-page-client.tsx`: manual retry/setup refresh.
  - `components/layout/service-worker-update-reload.tsx`: controlled one-time app-version reload after service worker update.
- Simple `select("*")` search in `app` and `lib`: no matches.

## Decisions

- Phase 08 can be marked complete because the module-level budget/cache/stale-data checklist is now satisfied locally.
- Phase 09/10 still require browser and production validation before final 100% because Web Vitals p75, authenticated smoke journeys, and deploy monitoring cannot be proven by static audit alone.

## Remaining For Later Phases

- Add Playwright/browser smoke for representative cross-module mutations.
- Capture staging/production Web Vitals and route TTFB after deploy.
- Watch service worker update behavior on real mobile sessions.
