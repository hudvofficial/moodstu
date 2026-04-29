# Productivity Score - 2026-04-28

Final score: 9.6/10

## What Changed

- Pushed `20260428170000_productivity_rpc_hardening.sql` to Supabase.
- Revoked public/anon execute from all productivity RPCs.
- Kept team RPCs service-role-only and self RPCs authenticated-only with `auth.uid()` scope, cost redaction, and `SET search_path = public`.
- Fixed employee detail stale data by disabling previous detail reuse.
- Added server-action validation for period, UUID, ISO dates, date order, and max 120-day detail range.
- Hardened task assignment/deadline/status actions with explicit calendar/task permission checks.
- Added productivity invalidation after task mutations.
- Reduced realtime load by removing broad detail subscriptions to contracts, customers, and contract events.
- Added `npm run verify:productivity`.

## Verification

```powershell
npx tsc --noEmit --pretty false
npm run lint
npm run verify:productivity
npm run perf:audit
npm run build
npm run perf:chunks
npx supabase db push --dry-run
npx supabase db push
npx supabase migration list
```

Results:

- TypeScript: passed.
- Lint: passed with 0 errors and 19 pre-existing warnings outside productivity.
- Build: passed.
- Perf audit: passed.
- Chunk budget: passed; `/productivity` remains 58.6KB.
- Remote migration: pushed and listed locally/remotely as `20260428170000`.
- RPC verification: service-role overview/detail passed; anon denied for all 4 productivity RPCs.

## Residual Risk

The remaining gap to 9.8+ is automated browser E2E with seeded credentials for admin, manager, media, sale, and viewer, plus a task mutation smoke that checks live client refresh behavior.
