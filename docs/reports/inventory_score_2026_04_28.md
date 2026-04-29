# Inventory Score - 2026-04-28

Final score: 9.6/10

## What Changed

- Added and pushed `20260428200000_inventory_security_hardening.sql`.
- Revoked anon/authenticated direct access to `inventory_items`, `inventory_transactions`, and inventory RPCs.
- Added `inventory_stats`, `inventory_list`, `inventory_item_transaction_totals`, and `nextval_inventory_code`.
- Added `npm run verify:inventory`.
- Replaced generic inventory `withAdmin` access with explicit `withInventoryAccess`.
- Stock in/out now rejects discontinued items at the database RPC layer.
- Delete now blocks items with current stock or transaction history.
- Detail total in/out now uses lifetime SQL aggregates, not only the latest 50 transactions.
- Stats now use SQL aggregate RPC instead of reading every inventory item into Node.
- `/inventory` and `/inventory/[id]` are SSR-hydrated.
- Inventory picker is active-only, server-searchable, and paginated.
- Search UI, low-stock, and out-of-stock filters are wired.
- Realtime invalidation is debounced.

## Verification

```powershell
npx tsc --noEmit --pretty false
npm run lint
npm run verify:inventory
npm run perf:audit
npm run build
npm run perf:chunks
npx supabase db push --dry-run
npx supabase db push
npx supabase migration list
```

Results:

- TypeScript: passed.
- Lint: passed with 0 errors and 19 pre-existing warnings outside inventory.
- Inventory remote verification: passed.
- Perf audit: passed.
- Production build: passed.
- Chunk budget: passed; `/inventory` route chunk is 37.7KB.
- Remote migration: `20260428200000` is present locally and remotely.

## Residual Risk

The remaining gap to 10/10 is automated browser E2E with seeded admin/manager/sale/media/viewer accounts and production-like stock scenarios for create, update, stock in, stock out, discontinued item blocking, delete blocking, and search/filter behavior.
