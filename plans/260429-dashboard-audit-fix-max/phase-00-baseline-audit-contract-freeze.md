# Phase 00 - Baseline Audit and Contract Freeze

## Objective

Freeze the `/dashboard` scope, document the broken behaviors, and prevent implementation drift before code changes start.

## Tasks

1. Confirm route scope is `app/(protected)/dashboard/page.tsx`.
2. Confirm `/finance/dashboard` is out of scope except for shared financial formulas.
3. Inventory every visible widget:
   - KPI summary cards
   - revenue chart
   - service distribution chart
   - upcoming events
   - payment reminders
   - quick access grid
   - warmup behavior
4. Mark each widget as real, mock, hardcoded, stale-risk, or role-sensitive.
5. Define the typed server payload shape before replacing UI code.
6. Record current score and blockers in `docs/reports/dashboard_audit_2026_04_29.md`.

## Acceptance Criteria

- Dedicated dashboard audit report exists.
- Phase plan exists and is separate from contracts/calendar/finance dashboard plans.
- Every widget has a planned real data source.
- No implementation begins until mock removal and formula ownership are explicit.

## Status

Completed.
