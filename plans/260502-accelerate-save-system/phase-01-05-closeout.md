# Phase 01-05 - Local Closeout

Scope: close the local/code acceptance for the earlier performance phases after the later save/cache/PWA batches filled the remaining gaps.

## Phase 01 - Cache/Refetch Contract

- `lib/swr.ts` is the cache key SSOT.
- `lib/cache-invalidation.ts` owns module invalidators for contracts, finance, CRM, employees, services, inventory, dresses, printing, and calendar/productivity.
- Broad post-mutation refreshes were replaced across the main modules with SWR mutate/revalidate paths.
- Remaining `router.refresh()` usage is limited to documented route/setup-level cases and the realtime fallback.

## Phase 02 - Realtime Strategy

- `hooks/use-realtime.ts` supports payload-aware callbacks, dynamic cache keys, prefixes, filters, and debounce.
- Detail screens use row-level filters where correctness needs them, especially contract detail.
- List pages use namespace invalidation/debounce instead of default route refresh behavior.
- `npm run perf:audit` guards against accidental broad refresh/reload regressions.

## Phase 03 - Server Data & Database Performance

- Hot-path migrations and RPC verification are covered by module verify scripts.
- Simple `select("*")` audit in `app` and `lib` has no matches.
- Reports, dashboard, printing, productivity, inventory, services, employees, and dresses verification scripts validate RPC/table exposure and important query contracts.
- Production p75 TTFB still belongs to Phase 09 monitoring, not local code closeout.

## Phase 04 - Bundle & Code Splitting

- Heavy charts, DnD, PDF, QR, and modal/drawer chunks are lazy-loaded where they affect route budgets.
- `npm run perf:chunks` passes with no app route chunk over 80KB.
- `npm run perf:audit` blocks static imports of `html2pdf.js`, `qr-scanner`, and `qr-code-styling`.

## Phase 05 - Route UX, Streaming & Skeletons

- Major protected modules have loading, empty, error, or retry states in their list/detail/drawer flows.
- Slow dashboard/report/chart sections use lazy loading or skeletons.
- Safe route/data prefetch behavior exists through navigation/data prefetch helpers and module SWR keys.

## Verification Evidence

- `npm run verify:contracts`: pass.
- `npm run verify:reports`: pass.
- `npm run verify:dashboard`: pass.
- `npm run verify:services`: pass.
- `npm run verify:inventory`: pass.
- `npm run verify:dresses`: pass.
- `npm run verify:printing`: pass.
- `npm run verify:calendar`: pass.
- `npm run verify:productivity`: pass.
- `npm run verify:settings`: pass.
- `npm run verify:employees`: pass.
- `npm run smoke:contracts`: pass.
- `npm run smoke:dashboard`: pass.
- `npm run smoke:calendar`: pass.
- `npm run smoke:employees`: pass.
- `npm run smoke:settings`: pass.
