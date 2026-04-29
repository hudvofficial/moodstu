# Phase 01 - Server Data Contract and No-Mock Route

## Objective

Replace the production `/dashboard` mock shell with a real, typed, server-loaded dashboard contract.

## Tasks

1. Create or harden a dashboard server contract, for example `DashboardBootstrapData`.
2. Route `/dashboard` through one authoritative data loader.
3. Remove hardcoded KPI values from `app/(protected)/dashboard/page.tsx`.
4. Replace `MOCK_DATA`, `MOCK_EVENTS`, and `MOCK_REMINDERS` in production widgets.
5. Make widgets receive typed props instead of owning fake local data.
6. Add controlled loading, empty, and error states for each widget.
7. Make Supabase query failures explicit and observable.

## Candidate Data Sources

- Contracts: active/new contract counts and recent contract activity.
- Payments/receipts: revenue, debt, overdue reminders, collection status.
- Schedules: upcoming events.
- Work tasks: personal or team tasks due soon.
- Services/packages: service distribution where a reliable source exists.

## Acceptance Criteria

- `rg "MOCK_|mock|hardcoded" app components lib` shows no production dashboard data mocks.
- Dashboard page renders from real server data.
- Failed data queries do not silently appear as valid zero states.
- TypeScript catches missing widget fields.

## Status

Completed.

Implemented with `getDashboardBootstrap`, typed dashboard props, and no production dashboard mock data.
