# Phase 03: Section Timing & Query Profiling
Status: Done

## Objective
Measure the real slow parts before adding DB migrations or RPCs.

## Current Query Shape

Admin/manager dashboard can run roughly these reads:

- KPI
  - payments current month
  - receipts current month
  - payments previous month
  - receipts previous month
  - contracts debt rows
  - current contract count
  - previous contract count
  - current completed count
  - previous completed count
- Revenue chart
  - payments 6-month window
  - receipts 6-month window
- Service breakdown
  - contracts by service type for current month
- Upcoming events
  - contract_events
  - schedules
  - work_tasks
- Payment reminders
  - payment_plans
  - fallback contracts with remaining amount

## Implementation Tasks

1. Add a small `profileDashboardSection(label, loader)` helper in `lib/api/dashboard.ts`.
2. Log section timings when:
   - `DASHBOARD_PROFILE=1`, or
   - section duration exceeds a threshold such as 500ms.
3. Log the total dashboard critical time separately from deferred section times.
4. Add labels:
   - `dashboard.access`
   - `dashboard.kpis`
   - `dashboard.revenueChart`
   - `dashboard.serviceBreakdown`
   - `dashboard.upcomingEvents`
   - `dashboard.paymentReminders`
5. Run local verification and, after deploy, collect production logs from real login/dashboard navigation.

## Acceptance Criteria

- Logs can identify which section is slow without exposing user/customer data.
- There is enough timing data to decide whether KPI, reminders, events, or charts deserve DB/RPC work.
- No performance fix is claimed without measured before/after timings.

## Result

- Added `profileDashboardSection()` in `lib/api/dashboard.ts`.
- Timing labels are threshold/env gated:
  - `dashboard.access`
  - `dashboard.critical`
  - `dashboard.kpis`
  - `dashboard.revenueChart`
  - `dashboard.serviceBreakdown`
  - `dashboard.upcomingEvents`
  - `dashboard.paymentReminders`

## Risk

- Logging every request can be noisy. Keep env/threshold gated.
