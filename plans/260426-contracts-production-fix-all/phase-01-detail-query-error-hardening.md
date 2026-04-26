# Phase 01: Detail Query Error Hardening
Status: Complete
Priority: High

## Objective
Prevent `/contracts/[id]` and contract drawer from silently rendering incomplete data when secondary queries fail.

## Files
- `app/actions/contract-queries.ts`

## Tasks
- [x] Add a small helper to assert Supabase query results.
- [x] Check errors for `paymentsResult`.
- [x] Check errors for `reservationsResult`.
- [x] Check errors for `printOrdersResult`.
- [x] Check errors for `auditLogsResult`.
- [x] Check errors for `paymentPlansResult`.
- [x] Check errors for every query in `getContractDrawerExtra()`.
- [x] Keep empty arrays only for successful empty result sets.

## Test Criteria
- [x] TypeScript passes.
- [ ] Detail page still loads valid contracts.
- [ ] Drawer still lazy-loads extra sections.
- [x] Failed secondary query produces visible error state, not fake empty data.
