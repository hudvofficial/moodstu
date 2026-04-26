# Phase 06: Production Verification Gate
Status: In Progress
Priority: High

## Objective
Run final gates for `/contracts` before moving to the next module audit.

## Commands
- [x] `npx tsc --noEmit`
- [x] `npm run lint` exits 0; remaining 21 warnings are non-blocking existing warnings.
- [x] `npm run build`

## Route Checks
- [x] `/contracts` terminal smoke: protected redirect 307 without auth cookie
- [x] `/contracts?status=dang_thuc_hien` terminal smoke: protected redirect 307 without auth cookie
- [x] `/contracts/create` terminal smoke: protected redirect 307 without auth cookie
- [x] `/contracts/[id]` terminal smoke: protected redirect 307 without auth cookie
- [x] `/contracts/[id]/edit` terminal smoke: protected redirect 307 without auth cookie
- [x] `/contracts/[id]/print` terminal smoke: protected redirect 307 without auth cookie
- [x] `/contracts/[id]/gallery` terminal smoke: protected redirect 307 without auth cookie

## Manual Scenarios
- [ ] Search/filter/sort/page list.
- [ ] Open drawer and navigate to detail.
- [x] Cold-load detail URL: authenticated browser log shows detail load after audit FK fix.
- [x] Update event task status: code path rolls back optimistic UI on returned failure or rejected action.
- [ ] Add payment.
- [ ] Create draft contract.
- [ ] Edit existing contract.
- [ ] Cancel/reactivate contract.

## Final Criteria
- [ ] No critical/high findings remain.
- [ ] Production score is at least 9.2/10.

## Notes
- Terminal route smoke cannot validate authenticated UI because protected routes redirect without browser cookies.
- Latest `npx tsc --noEmit`, `npm run lint`, and `npm run build` passed after task/event hardening.
- `audit_logs` employee join was corrected from `user_id` to `employee_id`.
- Active event status now ignores cancelled tasks and does not rewrite cancelled events.
