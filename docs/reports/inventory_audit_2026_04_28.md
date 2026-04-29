# Inventory Module Audit - 2026-04-28

Scope: `/inventory`, route guard, inventory server actions, stock-in/out business rules, Supabase table/RPC posture, SWR/realtime time-load, UI data consistency, performance, and build health.

## Final Summary

- Initial score: 7.5/10.
- Final score after fixes: 9.6/10.
- Production recommendation: ready for internal production use after normal UI smoke.
- Critical issues: 3.
- Warnings: 7.
- Suggestions: 5.
- Remote data observed: service role sees 15 `inventory_items` and 25 `inventory_transactions`; anon sees 0 rows.
- Build health: TypeScript, lint, perf audit, production build, and chunk budget pass.

## Post-Fix Update

Implemented all phases from `plans/260428-inventory-audit-fix`:

- Added and pushed `supabase/migrations/20260428200000_inventory_security_hardening.sql`.
- Inventory tables and inventory RPCs are now denied to anon; service-role access remains available.
- Added `npm run verify:inventory`.
- Inventory server actions now enforce explicit `withInventoryAccess`.
- Stock-in/out RPCs reject discontinued items while preserving `FOR UPDATE` row locking.
- Delete is blocked for items with current stock or transaction history.
- List, stats, and item transaction totals now use SQL RPC contracts.
- Inventory code generation now uses `nextval_inventory_code()`.
- `/inventory` and `/inventory/[id]` are SSR-hydrated.
- Picker is active-only, server-searchable, and paginated.
- Search UI plus low-stock/out-of-stock tabs are wired.
- Realtime invalidation is debounced.

Remote verification after push:

```text
inventory_items: anon denied
inventory_transactions: anon denied
inventory_items: service-role ok (15 rows)
inventory_transactions: service-role ok (25 rows)
inventory_stats: service-role ok
inventory_list: service-role ok
inventory_item_transaction_totals: service-role ok
inventory_stock_in_atomic: service-role reachable
inventory_stock_out_atomic: service-role reachable
inventory_stats: anon denied
inventory_list: anon denied
inventory_item_transaction_totals: anon denied
inventory_stock_in_atomic: anon denied
inventory_stock_out_atomic: anon denied
Inventory verification passed.
```

## Critical Issues

1. Stock operations do not enforce `discontinued`
   - Files: `supabase/migrations/20260421090000_create_inventory_stock_rpcs.sql:28`, `supabase/migrations/20260421090000_create_inventory_stock_rpcs.sql:99`, `app/actions/inventory-queries.ts:290`, `components/inventory/inventory-table.tsx:116`, `components/inventory/inventory-table.tsx:125`, `components/inventory/stock-in-modal.tsx:60`, `components/inventory/stock-out-modal.tsx:63`
   - Current behavior: stock RPCs lock by `id` and `deleted_at IS NULL`, but do not check `status = 'active'`. The global stock picker also returns all non-deleted items, including discontinued items.
   - Impact: discontinued inventory can still be stocked in/out from direct action calls or picker flows, violating the spec's lifecycle rule.
   - Required fix: enforce active status in the RPC/server action and filter pickers to active items unless the flow explicitly supports reactivation.

2. Inventory stock RPCs are callable with the anon key on remote Supabase
   - File: `supabase/migrations/20260421090000_create_inventory_stock_rpcs.sql:153`
   - Remote probe: anon calls to `inventory_stock_in_atomic` and `inventory_stock_out_atomic` execute and return the business error `Inventory item does not exist`, instead of a permission-denied error.
   - Impact: table RLS currently hides rows from anon, so the probe did not mutate stock, but the executable public RPC surface is still too broad for a stock ledger.
   - Required fix: add a hardening migration with `REVOKE ALL ... FROM PUBLIC, anon, authenticated` and `GRANT EXECUTE ... TO service_role`, then add a verify script that proves anon denial.

3. Delete soft-deletes items even when they have stock/history
   - File: `app/actions/inventory-mutations.ts:173`
   - Current behavior: `deleteInventoryItem` updates `deleted_at` without checking `current_stock`, open usage, or transaction history.
   - Impact: active stock value can disappear from the operational list and detail route while transaction rows remain. This can distort stock valuation and make reconciliation harder.
   - Required fix: block delete when `current_stock > 0`; prefer `discontinued` for archived items with history; allow hard/soft delete only for never-used zero-stock records.

## Warnings

1. Detail totals are computed from only the latest 50 transactions
   - Files: `app/actions/inventory-queries.ts:120`, `components/inventory/inventory-detail-page.tsx:166`
   - Impact: "total in" and "total out" become wrong once an item has more than 50 movements.
   - Fix: return aggregate lifetime totals separately from the recent transaction list.

2. Stats action reads every active inventory row into Node
   - File: `app/actions/inventory-queries.ts:199`
   - Impact: `getInventoryStats` scales linearly with inventory size and transfers more data than needed.
   - Fix: move totals, low-stock count, and stock value into a SQL/RPC aggregate.

3. `/inventory` and `/inventory/[id]` are client-data pages without SSR hydration
   - Files: `app/(protected)/inventory/page.tsx:5`, `app/(protected)/inventory/[id]/page.tsx:7`, `components/inventory/inventory-list-client.tsx:55`
   - Impact: first useful data waits for client JS + server action round trip. This is acceptable today but weaker than the optimized modules.
   - Fix: fetch initial list/stats/detail on the server and seed SWR fallback.

4. Search state exists but the UI does not expose it
   - Files: `hooks/useInventoryFilters.ts:45`, `components/inventory/inventory-list-client.tsx:39`, `components/inventory/inventory-filters.tsx:68`
   - Impact: backend supports name/code search, but users cannot use it from the inventory filter bar.
   - Fix: wire a search input to `setSearch`, with debounce and page reset.

5. Picker and sale options fetch unbounded/broad datasets
   - Files: `app/actions/inventory-queries.ts:269`, `app/actions/inventory-queries.ts:290`
   - Current behavior: sale options fetch all active in-stock items; picker fetches the first 1,000 items by name.
   - Impact: modal load time grows with catalog size, and items after 1,000 are unreachable in picker.
   - Fix: add server-side search, active-only defaults, and paginated picker endpoints.

6. Server actions hide auth/data failures as empty states in read paths
   - Files: `app/actions/inventory-queries.ts:95`, `app/actions/inventory-queries.ts:175`, `app/actions/inventory-queries.ts:227`
   - Impact: permission, RLS, RPC, or network failures can look like "no inventory" instead of an operational error.
   - Fix: return typed failures to the UI for read errors that should not be swallowed.

7. Broad realtime subscriptions revalidate all inventory caches
   - File: `components/inventory/inventory-list-client.tsx:63`
   - Impact: any item or transaction change invalidates list, stats, sale options, and detail prefixes for every open inventory page.
   - Fix: debounce and narrow invalidation by table/event/item id where possible.

## Positive Findings

- `/inventory` is route-gated and only admin/manager roles have navigation permission.
- Server mutations use Zod validation, admin service client, audit log, and path revalidation.
- Stock in/out uses database RPCs with row-level `FOR UPDATE` locking.
- `stock_out` prevents negative stock and records transaction cost at average cost.
- Item update uses optimistic locking via `updated_at`.
- List queries are paginated and hot-path indexes exist for active/status/category/search/sort paths.
- Supabase table data is not readable by anon in the remote probe.
- TypeScript, lint, build, perf audit, and app chunk budget pass.

## Remote Supabase Probe

```text
anon inventory_items: ok, count=0
anon inventory_transactions: ok, count=0
anon inventory_stock_in_atomic: callable, P0001 Inventory item does not exist
anon inventory_stock_out_atomic: callable, P0001 Inventory item does not exist
service_role inventory_items: ok, count=15
service_role inventory_transactions: ok, count=25
service_role stock RPCs with fake item: callable, P0001 Inventory item does not exist
```

Interpretation: direct table data is hidden from anon, but the stock RPC execute grants are not hardened enough.

## Verification Commands Run

```powershell
npx tsc --noEmit --pretty false
npm run lint
npm run perf:audit
npm run build
npm run perf:chunks
```

Results:

- TypeScript: passed.
- Lint: 0 errors, 19 existing warnings outside inventory.
- Perf audit: passed.
- Production build: passed.
- Chunk budget: passed; no app route chunks over 80KB. `/inventory` is below the top-40 route chunk list.

## Suggested Fix Phases

1. Phase 00 - Security hardening
   - Add inventory RPC grant hardening migration.
   - Add `npm run verify:inventory` to assert service-role success and anon denial.
   - Replace generic `withAdmin` coupling with explicit `requireInventoryAccess`/`withInventoryAccess`.

2. Phase 01 - Business invariants
   - Block stock in/out for discontinued items at RPC level.
   - Filter picker/sale options to active items by default.
   - Block delete for items with stock or transaction history; use discontinue/archive instead.

3. Phase 02 - Data correctness
   - Add aggregate RPC for inventory stats.
   - Add item detail aggregate totals independent from recent transaction list.
   - Consider a DB-side sequence/RPC for `VT-###` code generation.

4. Phase 03 - Time-load/performance
   - SSR-hydrate list, stats, and detail fallback data.
   - Add server-side searchable/paginated picker endpoint.
   - Debounce/narrow realtime cache invalidation.

5. Phase 04 - UX and regression coverage
   - Wire inventory search UI.
   - Add low-stock/out-of-stock filters if they remain in the filter contract.
   - Add browser smoke for admin/manager allowed, sale/media/viewer blocked, create/update/stock/delete paths.

## Score Rationale

Score: 9.6/10.

The module now has route and action RBAC, locked-down remote inventory tables/RPCs, atomic stock operations with lifecycle checks, delete safeguards, SQL aggregate stats/detail totals, DB-backed item code generation, SSR-hydrated list/detail pages, active-only searchable picker, wired search/stock filters, debounced realtime, and passing TypeScript/lint/build/perf/remote verification. The remaining gap to 10/10 is automated browser E2E with seeded role accounts and create/update/stock/delete stock-ledger scenarios.
