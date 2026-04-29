# Dashboard Audit Fix Max Plan

Date: 2026-04-29

Scope: main `/dashboard` route. Excludes `/finance/dashboard` except where finance SSOT formulas are needed.

Audit source: `docs/reports/dashboard_audit_2026_04_29.md`

## Goal

Bring `/dashboard` from the initial 5.0/10 state to a production-grade 9.8/10.

The maximum practical score without broader browser automation evidence is 9.8/10. A 9.9/10 requires seeded role E2E coverage, realtime proof, and visual regression checks across desktop and mobile.

## Current Blockers

- Resolved: production dashboard no longer renders hardcoded KPI values.
- Resolved: chart, upcoming events, service breakdown, and payment reminders are no longer backed by mock constants.
- Resolved: visible dashboard/navigation/KPI mojibake was corrected.
- Resolved: route consumes one authoritative server-side dashboard contract.
- Resolved: RBAC/privacy behavior is explicit in `DashboardVisibility`.
- Resolved: query errors surface through the dashboard error banner and verify/smoke scripts.
- Resolved: realtime route refresh hooks cover dashboard source tables.
- Remaining: seeded authenticated browser E2E by role and responsive visual smoke.

## Phase Order

1. Phase 00 - Baseline Audit and Contract Freeze
2. Phase 01 - Server Data Contract and No-Mock Route
3. Phase 02 - Business Logic SSOT and Formula Tests
4. Phase 03 - Security, RBAC, and Privacy
5. Phase 04 - Realtime, Cache, and Performance
6. Phase 05 - UX, Localization, and Responsive Polish
7. Phase 06 - Verification, Smoke, and Final Score

## Definition of Done

- `/dashboard` has zero production mock data.
- `/dashboard` uses a typed `DashboardBootstrapData` style contract from the server boundary.
- Every dashboard metric has a documented source table, filter, date window, and role visibility rule.
- UI Vietnamese copy is correctly encoded with no mojibake.
- All dashboard components have real loading, empty, and error states.
- Supabase failures are handled explicitly.
- RBAC checks are enforced server-side, not only hidden in UI.
- Realtime/cache invalidation covers the tables that feed visible dashboard data.
- Verification scripts, smoke checks, typecheck, lint, build, and performance checks pass.

## Scoring Rubric

- 9.8/10: all phases complete, automated verification passes, and manual smoke finds no critical defects.
- 9.7/10: all production code is fixed, but realtime proof or seeded role smoke is partial.
- 9.4/10: no mock data remains, but RBAC/privacy or performance evidence is incomplete.
- 8.5/10: real data is connected, but formula tests and error states are weak.
- Below 8.0/10: any production mock KPI, mojibake, or silent data failure remains.

## Implementation Result

Current verified score: 9.7/10.

The code path is ready for 9.8/10 after browser smoke confirms authenticated role rendering and responsive screenshots.
