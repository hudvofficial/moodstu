# Plan: Settings Module Fix-All + Max Score Optimization
Created: 2026-04-29T12:52
Status: Verified

## Objective
Nang module `/settings` tu diem audit hien tai ~6.4/10 len muc production-grade cao nhat co the trong codebase hien tai.

Target score sau khi xong:
- Business logic: >= 9.2/10
- Time-load/performance: >= 9.0/10
- Security: >= 9.2/10
- Maintainability/UI gate: >= 9.0/10
- Overall: >= 9.1/10

## Scope
Routes:
- `/settings`
- `/settings/studio`
- `/settings/credit-cards`
- `/audit-logs` link tu Settings
- `/api/auth/google`
- `/api/auth/google/callback`

Code areas:
- `app/actions/settings-*.ts`
- `app/actions/user-management.ts`
- `app/actions/profile-actions.ts`
- `app/actions/notification-actions.ts`
- `app/actions/debt-actions.ts`
- `app/actions/finance-operations-queries.ts`
- `app/api/auth/google/**`
- `components/settings/**`
- `lib/auth_utils.ts`
- `lib/system-settings.ts`
- `lib/googleCalendarService.ts`
- Supabase migrations for settings/secrets/RLS/integrity

## Current Audit Baseline
Key blockers:
- P0: Google OAuth Settings route lacks admin guard and OAuth state.
- P0: Unlink employee does not revoke stale auth JWT/app role.
- P1: Google Calendar auth cache can stay stale after connect/disconnect.
- P1: Members list mounts twice and calls `auth.admin.listUsers()` twice.
- P1: Studio + Moodie save is not atomic but UI treats it as one save.
- P2: Credit card settings cannot clear limit and can delete linked cards.
- P2: Gemini API key and Google OAuth tokens are stored as plain secrets.
- P2: Some Settings UI files exceed target size and SSOT gate has border violations.

## Phases

| Phase | Name | Priority | Target Impact | Files |
|---|---|---:|---|---|
| 00 | Baseline + Regression Gates | P0 | Lock audit baseline, avoid blind edits | docs/scripts/tests |
| 01 | OAuth + Secret Security Hardening | P0 | Fix highest security risks | api routes, secrets helper, migrations |
| 02 | RBAC + Member Management Hardening | P0 | Remove stale privilege paths | auth utils, user-management |
| 03 | Atomic Settings Consistency | P1 | Prevent partial saves/conflict bugs | settings actions, UI save flow, RPC |
| 04 | Time-load + Cache Optimization | P1 | Faster Settings and no stale calendar | SettingsView, MembersSection, calendar service |
| 05 | Credit Cards Integrity | P1 | Correct finance config behavior | credit-card page/modal/actions |
| 06 | UI Maintainability + SSOT Cleanup | P2 | Raise maintainability score | components/settings, CSS gate |
| 07 | Verification + Final Scoring | P0 | Prove score and prevent regressions | verify script, lint/tsc/build/manual |

## Execution Rules
- Fix security blockers before any visual/perf polish.
- Each phase must leave the app compiling.
- Do not weaken app-level RBAC because server actions use service role.
- Any setting write must have validation, authorization, audit log, revalidation, and conflict behavior.
- Secrets must not be returned to non-server code except masked status.
- Settings UI must pass `tasks/gates/settings-code-gate.md`.

## Done Criteria
- [x] No settings P0/P1 finding remains in code.
- [x] `npm run lint -- settings scope` passes.
- [x] `npx tsc --noEmit --pretty false` passes.
- [x] `npm run build` passes.
- [x] A settings-specific verification script passes.
- [x] Runtime smoke QA covers normal user, manager/admin, Google OAuth guard/state, Google disconnect, members management, studio info, notification prefs, credit card CRUD, and linked-card delete guard.

## Quick Start
Recommended order:
1. `phase-00-baseline-and-gates.md`
2. `phase-01-oauth-secret-security.md`
3. `phase-02-rbac-members-hardening.md`
4. `phase-03-atomic-settings-consistency.md`
5. `phase-04-timeload-performance.md`
6. `phase-05-credit-cards-integrity.md`
7. `phase-06-ui-maintainability-ssot.md`
8. `phase-07-verification-final-score.md`
