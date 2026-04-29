# Phase 01: Supabase RLS/Public Exposure Hardening
**Status:** Completed
**Priority:** P0
**Dependencies:** Phase 00
**Audit issues:** Critical 3

## Objective

Stop direct anon reads of internal service catalog and builder tables. Keep any public-facing data intentionally narrow and redacted.

## Target Files

- `supabase/migrations/*_services_rls_hardening.sql` (new)
- `scripts/verify-services.mjs` (new)
- `package.json`
- `docs/reports/services_audit_2026_04_28.md`

## Implementation Steps

1. Add migration.
   - Enable/force RLS where appropriate for:
     - `services`
     - `service_categories`
     - `service_bundles`
     - `service_relations`
     - `price_rules`
   - Revoke broad direct access from `anon`.
   - Keep service-role access for server actions.

2. Decide public quote/catalog stance.
   - Default: no anon direct reads.
   - If public quote is required later, create a dedicated `public_service_quote` view/RPC with only safe fields.

3. Harden `studio_info` exposure.
   - If public logo/name/hotline are needed, expose a redacted view/RPC.
   - Do not expose bank/auth/config fields directly.

4. Add `verify:services`.
   - Load `.env.local`.
   - Service-role can read services/categories.
   - Anon reads are denied for internal tables.
   - If redacted public RPC/view exists, assert it excludes `cost_price`, audit fields, and builder config.

5. Push and verify.

## Acceptance Criteria

- Anon direct select on internal service tables is denied.
- Service-role server actions still work.
- `npm run verify:services` passes.
- `npx supabase db push --dry-run` reports clean after push.

## Test Commands

```powershell
npx supabase db push --dry-run
npx supabase db push
npm run verify:services
npx tsc --noEmit --pretty false
```

---
Next Phase: [Phase 02 - Transactional Service and Bundle Writes](./phase-02-transactional-bundle-writes.md)
