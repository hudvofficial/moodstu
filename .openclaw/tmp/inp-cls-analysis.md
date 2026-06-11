# INP & CLS audit for `/dashboard` and protected routes

## Executive summary

- `INP 592ms` is most likely driven by cumulative client-side work on every protected route: `AppShell` is a client boundary, it mounts multiple providers, global navigation helpers, mobile detection hooks, pull-to-refresh listeners, realtime refresh, and several root-level client providers before the dashboard widgets even become interactive.
- `CLS 0.18` is very likely caused by skeleton/layout mismatches in `app/(protected)/dashboard/page.tsx` and `app/(protected)/dashboard/loading.tsx`, especially Quick Access and the fixed 400px chart/list placeholders that do not match the real card heights.
- The dashboard page also uses multiple animated/interactive client widgets (`Recharts`, realtime refresh, search/header/nav behaviors), which increases long-task risk during hydration and first interaction.

## 1) Protected layout hydration cost

### `app/(protected)/layout.tsx`
- Direct wrappers around `children`: only **1 client shell boundary**: `AppShell`.
- The layout itself is server-side, but once `AppShell` mounts, all protected routes pay the client hydration cost.

### `components/layout/app-shell.tsx`
Inside `AppShell`, `children` are wrapped by **3 context providers**:
1. `HeaderSlotsProvider`
2. `ScrollContainerProvider`
3. `PullToRefreshProvider`

Additional always-mounted client helpers in the shell:
- `NavigationWarmup`
- `NavigationProgress`
- `Header`
- `BottomNav` on most protected routes
- `Sidebar` on larger screens

### Important implication\nEven though the protected layout file looks light, `/dashboard` sits under a fairly heavy always-on client shell. That means any interaction can compete with:
- provider hydration
- route prefetch warmup
- header/search state sync
- global click listener for progress bar
- pull-to-refresh touch listeners
- bottom nav prefetch logic

## 2) Dashboard skeleton vs actual layout mismatch (CLS source)

### `app/(protected)/dashboard/page.tsx`
`DashboardSkeleton()` diverges from the real dashboard in several important ways:

#### Quick Access mismatch
- Skeleton uses `grid-cols-3 sm:grid-cols-6` and always renders **6** placeholders.
- Real `QuickAccessGrid` uses `grid-cols-5` and renders a **role-dependent number of modules**.
- Real grid is `lg:hidden`; the page skeleton version is not wrapped in `lg:hidden`.

Why this matters:
- On mobile, column count changes from 3/6 to 5.
- On desktop, skeleton can reserve space for a section that the real component hides.
- Role-dependent item count means the real height may differ from the placeholder height.

#### Header mismatch
- Page skeleton includes `DashboardHeader`, which is good.
- But the fallback omits `DashboardRealtimeRefresh`, and does not replicate exactly the same structure/order as the final streamed content.
- This is a smaller issue than the grid/chart/list mismatches.

#### Chart placeholder height mismatch
- Skeleton uses `ChartSkeleton height={400}` for both chart cards.
- Real chart content uses inner chart areas `h-52 lg:h-64` in `RevenueChart` and `h-52 lg:h-56` in `ServicePieChart`.
- With card padding/header included, the real cards are materially shorter than 400px.

Why this matters:
- When the real chart cards replace 400px skeletons, content below can move upward.
- Repeated shifts across two charts can accumulate noticeable CLS.

#### List placeholder height mismatch
- Skeleton list card is hard-coded `h-[400px]`.
- Real list cards (`UpcomingEventsList`, `PaymentReminders`) are content-driven and can be much shorter, especially empty or low-data states.
- Empty states use `min-h-38`, not 400px.

Why this matters:
- If data is empty or short, the replacement collapses substantially.
- The second half of the page can jump upward after stream resolution.

### `app/(protected)/dashboard/loading.tsx`
This file is closer to the real layout than `DashboardSkeleton()`, but still has CLS risk:

#### Better than page fallback
- Quick Access uses `grid-cols-5` and 5 items, which matches the real mobile structure more closely.
- KPI cards use `h-28`, closer to the actual card size.

#### Remaining problems
- `ChartSkeleton` uses random bar heights via `Math.random()`.
  - This does not directly create CLS by itself, but it makes the loading UI non-deterministic and can increase visual instability perception.
- Chart cards still do not reserve the exact same total height as the final chart components.
- List skeleton always renders four rows, while actual lists can be empty, 1-2 rows, or many rows.

### Biggest CLS suspects
1. `app/(protected)/dashboard/page.tsx` Quick Access placeholder mismatch
2. `app/(protected)/dashboard/page.tsx` fixed `400px` chart skeletons
3. `app/(protected)/dashboard/page.tsx` fixed `400px` list skeletons
4. Mobile-only/desktop-hidden behavior not mirrored exactly in the fallback

## 3) `AppShell` audit: heavy listeners / DOM work

### `components/layout/app-shell.tsx`
Observed behavior:
- Uses `usePathname`, `useIsMobile`, `useIsTablet`, and local menu state.
- Recomputes several regex route-mode checks on each render.
- Mounts `NavigationWarmup` and `NavigationProgress` globally for all protected routes.
- Wraps content in `PullToRefreshProvider`, which applies inline `transform` styles during pull gestures.

### Direct concerns
- `React.useEffect(() => { if (!isMobile) setIsMobileMenuOpen(false); }, [isMobile])`
  - Not a major INP issue alone.
- The shell itself is not doing heavy DOM mutation, but it is the attachment point for many other interactive subsystems.

### Real risk is composition
The shell is lightweight per line of code, but expensive in aggregate because it guarantees these systems mount together on every protected route:
- header scroll behavior
- pull-to-refresh touch handling
- global navigation click interception
- route warmup/prefetch timers
- bottom-nav prefetch and popup logic

## 4) `pull-to-refresh-context` rerender risk

### `contexts/pull-to-refresh-context.tsx`
Key behavior:
- Stores `refreshCallback` in React state.
- Consumes `usePullToRefresh`, which updates `pullDistance`, `isRefreshing`, and `progress` during touch movement.
- Provides context value with `registerRefresh`, `unregisterRefresh`, `isRefreshing`, and `pullDistance`.
- Wraps all route content in a transformed `<div>` whose inline style changes with pull distance.

### Why this can hurt INP
- Every `pullDistance` update re-renders the provider subtree because the provider value changes and the wrapper style changes.
- `Header` consumes `usePullDistance()`, so header also re-renders during pull.
- Any component reading `useIsPullRefreshing` or `usePullDistance` joins that update path.
- On touch devices, `touchmove` calls `setPullDistance(distance)` continuously; this is a classic source of main-thread work.

### Is it the main cause of INP 592ms?
- Probably not the only cause.
- But it is a meaningful always-on interaction system on every protected route, and it can worsen responsiveness on mobile devices.

### Specific structural issue
- `registerRefresh` uses `setRefreshCallback(() => callback)`, which forces a provider re-render whenever pages register/unregister.
- Better architecture would keep the callback in a `ref` to avoid rerendering the provider subtree for callback registration alone.

## 5) Heavy `useEffect` / `addEventListener` findings

Search scope: `components/layout/`, `components/dashboard/`

### Highest-interest files

#### `components/layout/navigation-progress.tsx`
- Adds a global `document.addEventListener("click", onClick, { capture: true })`.
- On every click, it traverses DOM with `target.closest("a[href]")`, builds `URL` objects, compares current vs target route, and schedules state updates.

Risk:
- This runs for essentially every click in the app, including clicks unrelated to navigation.
- Global capture-phase click work can show up in interaction latency on weaker devices.

#### `components/layout/navigation-warmup.tsx`
- After 3 seconds, schedules idle work and then multiple staggered `router.prefetch()` calls.
- Also calls `prewarmRouteData()` for the first two routes.

Risk:
- Good for navigation speed, but it increases background main-thread/network activity on protected routes.
- On low-end devices this can overlap with user interactions and worsen INP.

#### `components/layout/header.tsx`
- Keeps search state synchronized with URL query params.
- Debounces `router.replace()` on input changes.
- During pull-to-refresh, sets CSS var on `document.documentElement`.
- Uses scroll-direction hook and pull-distance hook.

Risk:
- Not catastrophic alone, but header is always mounted and participates in multiple reactive systems.
- Search interactions trigger URL updates and rerenders of the route segment.

#### `components/layout/bottom-nav.tsx`
- Prefetches on pointer enter/focus.
- When "More" popup opens, it schedules up to 8 delayed warmups with `setTimeout`.

Risk:
- Additional background work and route warming on mobile.
- Can steal time from the main thread if the user interacts quickly after opening nav.

#### `components/dashboard/dashboard-realtime-refresh.tsx`
- On mount, creates a Supabase client, fetches session, subscribes to multiple tables, debounces invalidation, and dispatches `window` custom events.

Risk:
- Not interaction-heavy by itself, but it adds startup work specifically on the dashboard.
- If subscriptions or invalidations land during first-use interactions, they can amplify latency.

#### `hooks/use-pull-to-refresh.ts`
- Adds `touchstart`, `touchmove`, and `touchend` listeners to the scroll container.
- `touchmove` uses `preventDefault()` and continuously updates React state.

Risk:
- This is one of the clearest candidates for mobile interaction cost.
- Continuous state writes during gestures are expensive if large subtrees rerender.
\n## 6) Font loading strategy in `app/layout.tsx`

### Current state
- Uses `next/font/local` with `InterVariable.woff2`.
- `display: "swap"` is configured.
- Variable font is applied via CSS variable on `<html>` and `<body>`.

### Assessment
- This is generally the correct Next.js strategy.
- `next/font/local` should self-host and preload automatically when used at layout level.
- `display: swap` avoids FOIT, which is good for LCP and perceived performance.

### Remaining CLS risk from fonts
- `swap` can still produce small text reflow if fallback metrics differ significantly from `InterVariable.woff2`.
- However, compared with the dashboard skeleton mismatches, font loading is likely a secondary CLS contributor here.

### Recommendation
- Keep `next/font/local`.
- If CLS remains after skeleton fixes, consider metric-compatible fallback tuning in CSS, but do not treat fonts as the primary issue yet.

## 7) `next.config.ts` bundle / optimization review

### Positive signals
- `optimizePackageImports` is enabled for several packages.
- Compression is enabled.
- Images and fonts have sensible caching.
- Bundle analyzer is available.

### Potential concerns relevant to INP
- `reactCompiler: true`
  - Not automatically bad, but worth validating because compiler output can change runtime characteristics in a large app.
- PWA + Sentry + Speed Insights + Web Vitals + global SW logic increase baseline client JS and startup side effects.
- `NEXT_PUBLIC_BUILD_DATE` is injected each build, which is fine, but global SW reload/update logic means more client runtime code on every page.
- No explicit evidence of bad webpack chunking in this config, but there is also no sign of route-level isolation for dashboard-heavy client bundles.

### Practical conclusion
- I do **not** see a single obvious webpack misconfiguration causing the regression.
- The bigger issue is probably **too much client JavaScript mounted on protected routes**, not one broken config flag.

## 8) Prioritized likely root causes

### For INP 592ms
1. Too many always-mounted client systems in protected shell (`AppShell` + providers + header/nav helpers + root providers)
2. Pull-to-refresh state updates on touch interactions causing subtree rerenders
3. Global click interception in `NavigationProgress`
4. Background route warmup/prefetch from `NavigationWarmup` and `BottomNav`
5. Dashboard-specific client work: charts + realtime refresh + interactive header/nav

### For CLS 0.18
1. `DashboardSkeleton()` does not match actual Quick Access layout
2. Chart skeletons reserve 400px while real cards are much shorter
3. List skeletons reserve 400px while actual cards are content-sized / often shorter
4. Differences between `loading.tsx` and page-level `Suspense` fallback can create inconsistent placeholder behavior
5. Minor text/font shifts may exist, but likely not the main driver

## 9) Concrete fix recommendations

### Highest-priority CLS fixes
1. Make `DashboardSkeleton()` structurally identical to the real dashboard layout.
   - Match `QuickAccessGrid` breakpoint behavior exactly (`lg:hidden`).
   - Use the same column count as real UI (`grid-cols-5` on mobile).
   - Avoid guessing module count; either reserve the smallest stable height or render a fixed design that matches the final footprint.
2. Replace fixed `400px` chart skeleton heights with heights matching the final cards.
   - Match real card header + chart area sizes (`h-52` mobile, `lg:h-64` / `lg:h-56`).
3. Replace fixed `400px` list skeletons with content-matched card shells.
   - Use realistic min-heights closer to actual empty/default states.
4. Remove randomness from loading placeholders.
   - `Math.random()` in skeletons hurts visual consistency.
5. Consider using only one canonical dashboard skeleton source.
   - Right now `loading.tsx` and `DashboardSkeleton()` can drift.

### Highest-priority INP fixes
1. Reduce client work in protected shell.
   - Audit whether `NavigationWarmup`, `NavigationProgress`, pull-to-refresh, and realtime helpers all need to mount on every protected route.
2. Refactor `PullToRefreshProvider` to avoid provider-wide rerenders on gesture updates.
   - Store refresh callback in a `ref`, not state.
   - Keep pull distance out of context unless consumers truly need live values.
   - Consider applying pull animation with direct DOM/CSS variable updates instead of React state for every `touchmove`.
3. Revisit `NavigationProgress` global click listener.
   - Scope it more narrowly, or use route transition hooks if possible.
   - Avoid expensive URL parsing for every click in capture phase.
4. Throttle/defer warmup work more aggressively.
   - Limit `router.prefetch()` / `prewarmRouteData()` to high-confidence routes only.
   - Disable warmup on low-end/mobile if necessary.
5. Reduce dashboard hydration surface.
   - Consider dynamically importing heavy chart widgets.
   - Keep more sections server-rendered and defer client-only enhancements until after initial interaction readiness.

### Medium-priority follow-ups
1. Profile `useScrollDirection`, `useIsMobile`, and `useVirtualKeyboard` hooks for extra listeners and rerender churn.
2. Run bundle analysis specifically for `/dashboard` to identify oversized client chunks.
3. Use React Profiler and Chrome Performance panel on a throttled mobile profile to confirm:
   - first tap latency after load
   - long tasks during hydration
   - rerender frequency during pull gesture
4. If CLS remains after skeleton fixes, inspect text metric shifts and image/icon intrinsic sizing.

## 10) Quick verdict

- **Primary INP diagnosis:** protected-route client shell is too busy, and pull-to-refresh/global navigation helpers likely add avoidable interaction overhead.
- **Primary CLS diagnosis:** dashboard fallback skeletons do not match the real rendered geometry, especially Quick Access and 400px chart/list placeholders.
- **Best first fixes:** align skeletons 1:1 with final layout, then trim shell-wide client work starting with pull-to-refresh and global navigation progress interception.
