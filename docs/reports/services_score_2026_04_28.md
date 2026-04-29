# Services Score - 2026-04-28

Final score: 9.6/10

## What Changed

- Added `/services` route guard and `withServicesAccess` app-level RBAC.
- Wrapped services/category/builder management actions with services permission.
- Kept contract picker catalog helpers available through contract permission only.
- Pushed `20260428183000_services_security_atomic_writes.sql` to Supabase.
- Revoked anon/authenticated direct table access for services catalog, builder, pricing-rule, and `studio_info` tables.
- Added `save_service_atomic` and `delete_service_atomic` RPCs for service + bundle transaction safety.
- Added server-side validation for filters, categories, quick create, bundle items, relations, and price rules.
- Fixed builder relation select from non-existent `service_name` to `name` and stopped swallowing query failures.
- Removed browser direct `studio_info` reads from quote modal and redacted `google_calendar_auth` from general studio info responses.
- Kept Google Calendar sync working after `studio_info` hardening by moving token reads/writes to the server admin client.
- SSR-hydrated `/services` initial data and added load-more pagination past the first 50 records.
- Added `npm run verify:services`.

## Verification

```powershell
npx tsc --noEmit --pretty false
npm run lint
npm run verify:services
npm run perf:audit
npm run build
npm run perf:chunks
npx supabase db push --dry-run
npx supabase db push
```

Results:

- TypeScript: passed.
- Lint: passed with 0 errors and 19 pre-existing warnings outside services.
- Build: passed.
- Perf audit: passed.
- Chunk budget: passed; `/services` is 49.3KB.
- Remote migration: pushed successfully.
- Remote security verification: anon denied for `services`, `service_categories`, `service_bundles`, `service_relations`, `price_rules`, and `studio_info`; service-role reads and RPC execute reachability passed.

## Residual Risk

The remaining gap to 9.8+ is automated browser E2E with seeded admin/manager/sale/media/viewer accounts and a live create-update-delete bundle smoke that asserts rollback behavior without leaving production test data.
