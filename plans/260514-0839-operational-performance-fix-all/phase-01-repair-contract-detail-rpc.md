# Phase 01: Repair Contract Detail RPC
Status: Completed
Priority: P0

## Objective
Make `get_contract_detail_v2` succeed in remote DB and keep it covered by smoke checks.

## Current Bug
`get_contract_detail_v2` references `l.name`, but the fallback query uses `labs (id, name:lab_name)`. Remote timing confirmed RPC failure: `column l.name does not exist`.

## Files
- `supabase/migrations/20260509140000_contract_detail_v2_rpc.sql`
- New corrective migration, e.g. `supabase/migrations/20260514xxxx_fix_contract_detail_v2_rpc.sql`
- `scripts/smoke-contracts.mjs`
- `app/actions/contract-queries.ts`

## Tasks
1. Add corrective migration with `CREATE OR REPLACE FUNCTION public.get_contract_detail_v2(...)`.
2. Replace `l.name` with the actual lab column, likely `l.lab_name`.
3. Confirm the returned JSON key still matches app expectation.
4. Add smoke assertion that direct RPC call succeeds for one active contract.
5. In `getContractDetail()`, improve fallback warning so it logs the RPC error once with actionable context.

## Acceptance Criteria
- `supabase migration list` shows local and remote aligned after deploy.
- Direct remote probe for `get_contract_detail_v2` returns data without error.
- `getContractDetail()` does not print fallback warning on healthy DB.
- `npm run smoke:contracts` fails if the RPC breaks again.

## Result
- Added and deployed `supabase/migrations/20260514084500_fix_contract_detail_v2_rpc_labs.sql`.
- `supabase migration list` shows `20260514084500` both local and remote.
- `scripts/smoke-contracts.mjs` now creates a lab and printing order, calls `get_contract_detail_v2`, and asserts `print_orders[].labs.name`.
- `getContractDetail()` fallback warning now includes contract id and RPC error context.
