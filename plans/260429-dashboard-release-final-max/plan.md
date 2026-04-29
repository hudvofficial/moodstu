# Dashboard Release Final Max Plan

Date: 2026-04-29

Scope: main `/dashboard` route plus the shared auth/data helpers that directly affect dashboard release quality.

Source audit:

- `docs/reports/dashboard_audit_2026_04_29.md`
- Follow-up business audit after `/dashboard` implementation

## Goal

Move `/dashboard` from verified 8.8/10 business-readiness to release-final 9.8/10.

Stretch target: 9.9/10 if browser E2E proves role-specific behavior, realtime freshness, and responsive screenshots.

Status on 2026-04-29: automated release-final gate reached 9.8/10. Browser E2E/screenshot proof remains the stretch gate for 9.9/10.

## Release Blockers

1. Resolved: inactive employee accounts are redirected away from protected UI.
2. Resolved: dashboard upcoming work now merges contract events, schedules, and work tasks.
3. Resolved: payment reminders now prioritize payment-plan due dates before contract debt fallback.
4. Stretch remaining: browser role smoke and responsive proof are still needed for 9.9/10.

## Phase Order

1. Phase 00 - Release Baseline and Contract Freeze
2. Phase 01 - Auth and Inactive Employee Gate
3. Phase 02 - Operational Calendar SSOT
4. Phase 03 - Collections Reminder SSOT
5. Phase 04 - Product UX and Performance Polish
6. Phase 05 - Release Verification and Final Score

## Definition of Done

- Done: inactive/deleted employees cannot access protected app pages.
- Done: dashboard upcoming work merges the operational sources needed by management without duplicate or cancelled rows.
- Done: payment reminders prioritize overdue and due payment-plan stages before generic contract debt fallback.
- Done: role-sensitive dashboard payload behavior is covered by source verification and Supabase smoke.
- Done: `verify:dashboard`, `smoke:dashboard`, eslint, typecheck, build, performance audit, and chunk audit pass.
- Pending for 9.9: dashboard browser smoke on desktop and mobile with seeded authenticated roles.

## Target Score

- 9.8/10 after all phases and automated checks pass. Achieved on 2026-04-29.
- 9.9/10 after seeded authenticated browser E2E and screenshot evidence.
