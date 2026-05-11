# Phase 04: Deferred Section RPCs
Status: Done and Deployed

## Objective
Keep dashboard sections streamed, then reduce row transfer and REST fanout inside the sections that remain slow after the critical KPI fix.

## Current Deferred Sections
- Revenue chart: raw payments + raw standalone receipts for 6 months, grouped in TypeScript.
- Service breakdown: raw current-month contracts grouped in TypeScript.
- Upcoming events: contract events, schedules, and work tasks with relation joins.
- Payment reminders: payment plans plus fallback contract debt, grouped in TypeScript.

## Candidate Optimizations
1. Revenue chart
   - Use an aggregate RPC. Existing `finance_revenue_by_month(p_year)` is close but returns 12 months and finance labels. Either adapt output or create `dashboard_revenue_chart(p_month, p_year, p_months)`.

2. Service breakdown
   - Existing `finance_service_distribution(p_month, p_year)` may be reusable if formula and return fields match.
   - Otherwise create a dashboard-specific RPC that returns count, revenue, and percentage.

3. Payment reminders
   - Only optimize after timing proves it. A combined SQL query/RPC can reduce two REST calls and TypeScript grouping, but this logic is business-sensitive.

4. Upcoming events
   - Only optimize after timing proves it. A union RPC could combine contract events, schedules, and work tasks, but must preserve dedupe/grouping behavior.

## Implementation Tasks
1. Add section-specific timing thresholds before changing each section.
2. Implement revenue chart RPC first if still > 300ms warm.
3. Implement service breakdown RPC if still > 300ms warm.
4. Implement reminders/events RPCs only if they exceed the threshold repeatedly.
5. Keep fallback query paths for rollout.
6. Update `verify:dashboard` and `smoke:dashboard` to cover each RPC path used by production code.

## Acceptance Criteria
- Deferred sections do not block KPI first paint.
- Warm chart/service section targets: <= 250ms each.
- Reminders/events targets: <= 400ms each unless remote network dominates.
- No data loss in grouped milestones or payment reminder installment counts.

## Result
- Added and deployed `supabase/migrations/20260510201000_dashboard_deferred_sections.sql`.
- `dashboard_revenue_chart(p_month, p_year, p_months)` now aggregates six-month dashboard revenue in SQL.
- `dashboard_service_breakdown(p_month, p_year)` now aggregates current-month service counts and revenue in SQL.
- Kept REST fallbacks as `queryRevenueChartFallback()` and `queryServiceBreakdownFallback()`.
- Updated `verify:dashboard` and `smoke:dashboard` to cover both deployed RPCs.
- Did not convert reminders/events yet because their grouping and dedupe rules are more business-sensitive and remain streamed.

## Risks
- SQL union/grouping can drift from TypeScript behavior. Do not optimize reminders/events without a direct parity smoke.
- Reusing finance RPCs may expose finance-specific formulas that do not exactly match `/dashboard`.
