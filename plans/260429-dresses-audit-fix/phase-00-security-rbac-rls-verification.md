# Phase 00: Security, RBAC, RLS, and Verification
**Status:** Completed
**Priority:** P0
**Target score impact:** 5.8 -> 7.0

## Goal

Close the highest-risk production gap: remote anon can read dress data, and server actions only require a logged-in user before using the admin client.

## Work Items

1. Add route guard:
   - `app/(protected)/dresses/layout.tsx`
   - Use `canAccess(role, "dresses")` or the existing app-permission pattern.
2. Add explicit dresses authorization helpers:
   - `requireDressesAccess(supabase, userId)`
   - `withDressesAccess(action)`
   - `requireDressesCatalogWriteAccess`
   - `requireDressesBookingAccess`
3. Replace `withAuth` in:
   - `app/actions/dress-queries.ts`
   - `app/actions/dress-mutations.ts`
   - `app/actions/rental-queries.ts`
   - `app/actions/rental-mutations.ts`
4. Enforce role split:
   - `admin`, `manager`: full catalog and booking access.
   - `sale`: read catalog and manage bookings/rentals.
   - `media`, `viewer`, unauthenticated: denied.
5. Add Supabase hardening migration:
   - Enable/force RLS where appropriate.
   - Revoke table grants from `PUBLIC`, `anon`, and broad `authenticated`.
   - Grant direct table/RPC access only where explicitly required.
   - Keep app paths through service-role server actions or service-role-only RPCs.
6. Add `scripts/verify-dresses.mjs`.
7. Add `verify:dresses` to `package.json`.

## Acceptance Criteria

- Remote anon cannot select from `dresses`, `dress_reservations`, `dress_rentals`, or `dress_rental_accessories`.
- Authenticated users without dresses permission cannot call dress/rental server actions successfully.
- `admin` and `manager` can still use catalog and booking flows.
- `sale` can use intended booking/rental flows but cannot delete/retire/update catalog if the role policy restricts those operations.
- `npm run verify:dresses` fails loudly if anon table reads or unsafe grants return.

## Verification

```powershell
npx supabase db push --dry-run
npx supabase db push
npm run verify:dresses
npx tsc --noEmit --pretty false
npm run lint
```

## Notes

- This phase should not attempt to redesign availability or lifecycle logic.
- If public catalog image reads are intentional, document that as a storage decision; do not leave upload/delete protected only by generic login.
