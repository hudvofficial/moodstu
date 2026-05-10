# Phase 02: Deferred Dashboard Streaming
Status: Done

## Objective
Refactor `/dashboard` so the first screen is not blocked by every dashboard section.

## Current Problem

`app/(protected)/dashboard/page.tsx` currently does:

```ts
const data = await getDashboardBootstrap();
```

That means KPI, chart data, service breakdown, upcoming events, and reminders all have to finish before React can send the dashboard page.

## Target Structure

Use the existing finance dashboard pattern:

```tsx
export default async function DashboardPage() {
  const critical = await getDashboardCritical();

  return (
    <div className="main-container">
      <QuickAccessGrid role={critical.access.role} />
      <DashboardKpiGrid data={critical.kpis} />

      <Suspense fallback={<RevenueChartSkeleton />}>
        <RevenueChartSection />
      </Suspense>

      <Suspense fallback={<ServiceBreakdownSkeleton />}>
        <ServiceBreakdownSection />
      </Suspense>

      <Suspense fallback={<UpcomingEventsSkeleton />}>
        <UpcomingEventsSection />
      </Suspense>

      <Suspense fallback={<PaymentRemindersSkeleton />}>
        <PaymentRemindersSection />
      </Suspense>
    </div>
  );
}
```

## Implementation Tasks

1. Extract KPI rendering into a small local component or `components/dashboard/kpi-grid.tsx`.
2. Add async server sections:
   - `RevenueChartSection`
   - `ServiceBreakdownSection`
   - `UpcomingEventsSection`
   - `PaymentRemindersSection`
3. Each section calls only its own data loader.
4. Each section has local `SkeletonCard` fallback matching current dimensions.
5. Section errors should stay local, not collapse the whole dashboard.
6. Keep `QuickAccessGrid` outside Suspense because it only needs role.

## Acceptance Criteria

- `/dashboard` sends shell + KPI before deferred sections finish.
- A slow payment reminder query does not block revenue chart or KPI render.
- Visual layout does not jump: skeleton sizes match final cards.
- `app/(protected)/dashboard/loading.tsx` remains useful for route-level cold load only.

## Result

- Refactored `app/(protected)/dashboard/page.tsx` to render critical KPI data first.
- Wrapped revenue chart, service breakdown, upcoming events, and payment reminders in local `Suspense` boundaries.
- Added section-level skeleton fallbacks using existing `SkeletonCard`.

## Risk

- Too many independent sections can increase duplicate auth/access reads. Use request-level `cache()` around access helpers.
