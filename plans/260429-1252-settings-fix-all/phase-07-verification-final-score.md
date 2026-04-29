# Phase 07: Verification + Final Scoring
Status: Complete
Dependencies: Phase 06
Priority: P0

## Objective
Prove the module is fixed end-to-end and produce the final score.

## Automated Verification
- [x] `npm run verify:settings`
- [x] `npm run lint -- settings impacted files`
- [x] `npx tsc --noEmit --pretty false`
- [x] `npm run build`
- [x] `node scripts/perf-audit.mjs`
- [x] `npm run smoke:settings`

## Manual QA Matrix

### Normal user
- [x] Can open `/settings`.
- [x] Cannot see admin system links.
- [x] Cannot call Google OAuth route successfully.
- [x] Can update own profile.
- [x] Can update own notification prefs.

### Admin/manager
- [x] Can open `/settings/studio`.
- [x] Can save studio info.
- [x] Logo upload final-save semantics covered by static action review; destructive storage upload not run in smoke.
- [x] Moodie model/key raw secret exposure covered by `verify:settings` and static lint gate.
- [x] Google OAuth init emits a valid state and callback rejects invalid/missing code before token exchange.
- [x] Can disconnect Google Calendar and calendar auth is cleared immediately.
- [x] Can view members once and refresh via runtime smoke.
- [x] Current user member actions are disabled in UI; server self-protection covered by `user-management` implementation gate.
- [x] Unlinking another user revokes stale role to `ctv`.

### Credit cards
- [x] Admin can open `/settings/credit-cards`.
- [x] Non-admin is redirected.
- [x] Create card works.
- [x] Edit card works.
- [x] Clear credit limit works.
- [x] Delete linked card is blocked.
- [x] Delete unlinked card works.

### Regression checks
- [x] `/audit-logs` link still works for admin.
- [x] Existing finance debt installment flow still sees cards via linked-card smoke data.
- [x] Moodie runtime config path covered by `verify:settings` and build.
- [x] Google calendar token storage/disconnect path covered; live Google event fetch/create/update/delete still depends on a real connected Google account.

## Final Report
- [x] Update `docs/reports/audit_2026-04-29_settings_full.md`.
- [x] Include before/after scoring table.
- [x] Include fixed findings list.
- [x] Include remaining accepted risks, if any.

## Final Target Score
Expected after all phases:
- Business logic: 9.3/10
- Time-load/performance: 9.1/10
- Security: 9.3/10
- Maintainability/UI: 9.0/10
- Overall: 9.2/10

## Release Criteria
No release if:
- Any P0 remains.
- Google OAuth lacks state/admin callback guard.
- Unlinked admin keeps admin access.
- Raw secret appears in client payload or audit log.
- TypeScript or build fails.
