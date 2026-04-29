# Phase 00: Search and List Correctness
**Status:** Completed
**Priority:** P0
**Target score impact:** 7.0 -> 7.6

## Goal

Fix the `/contracts?q=...` regression so list search is reliable for authenticated users and does not rely on invalid PostgREST OR logic across embedded `customers` fields.

## Work Items

1. Replace the current unsafe query in `app/actions/contract-queries.ts`.
2. Preferred implementation:
   - Add a service-role-only `contract_list` or `contract_search_ids` RPC.
   - Accept filters for `q`, status, payment status, date range, paging, and sort.
   - Search across `contracts.contract_code`, `customers.full_name`, `customers.customer_code`, `customers.phone`, `customers.bride_name`, and `customers.groom_name`.
   - Return a deterministic total count contract.
3. Acceptable fast fix if the full RPC is deferred:
   - Search matching customer IDs in a separate safe query.
   - Filter contracts by `contract_code` OR the matched `customer_id` set without referencing embedded `customers.full_name` in `.or(...)`.
   - Preserve pagination and existing customer embed.
4. Add indexes needed for the selected approach:
   - `contracts(contract_code)`
   - `contracts(customer_id)`
   - `customers(full_name)`, `customers(customer_code)`, `customers(phone)`
   - Prefer `pg_trgm` indexes for `ilike` search if using SQL/RPC search.
5. Keep list badges working:
   - Progress badge still receives task summary or minimum task fields.
   - Missing-info badge still receives checklist summary or minimum checklist fields.
6. Add `scripts/verify-contracts.mjs` coverage for search:
   - Query by contract code.
   - Query by customer name.
   - Query by phone/customer code if seed data exists.
   - Assert no PostgREST parse error is returned.
7. Add `verify:contracts` to `package.json`.

## Acceptance Criteria

- `/contracts?q=<contract-code>` returns the expected contract.
- `/contracts?q=<customer-name>` returns contracts for that customer.
- Empty/no-match search returns an empty successful list, not an exception.
- The observed `failed to parse logic tree` error cannot be reproduced.
- Pagination and filters still work with and without `q`.
- TypeScript and scoped lint pass.

## Verification

```powershell
npm run verify:contracts
npx tsc --noEmit --pretty false
npx eslint app/actions/contract-queries.ts hooks/useContractFilters.ts lib/hooks/use-contracts.ts components/contracts
npm run perf:audit
```

## Notes

- A DB-backed list/search RPC is the better long-term path because Phase 04 also needs list aggregation and tighter count behavior.
- Do not remove badge data without updating the table/card components to consume aggregate badge fields.
