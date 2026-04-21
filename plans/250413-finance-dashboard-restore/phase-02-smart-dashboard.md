# Phase 02: Smart Dashboard + Analytics RPCs
**Status:** Complete
**Effort:** 2-3 ngày
**Dependencies:** Phase 01

## 2026-04-21 Audit Delta - Production Blockers

Reference: `docs/reports/audit_2026-04-21_finance_dashboard_v1_parity.md`

This phase is **not production complete** until all blockers below are closed:

- [ ] Create the actual route `app/(protected)/finance/dashboard/page.tsx`; the current banner points to `/finance/dashboard` but that route does not exist.
- [ ] Remove `USE_MOCK = true` from `app/actions/finance-intelligence-queries.ts` and make every smart widget use real RPC data.
- [ ] Add a finance action guard equivalent to `requireFinanceAccess`; `withAuth` alone is not enough because it authenticates then uses an admin client.
- [ ] Align revenue SSOT across dashboard metrics, intelligence, chart, cashflow forecast, reports, goals, and close. Current V2 mixes `payments + standalone receipts` with `receipts only`.
- [ ] Fix receipt soft-delete filtering in dashboard/ledger RPCs; SQL path must match fallback path.
- [ ] Extend `finance_contract_profit_report` RPC to return `package_revenue`, `addon_revenue`, and `discount`, because the UI/action maps those fields.
- [ ] Harden intelligence RPCs: `SET search_path = public`, revoke public execute, grant execute only to `service_role`.
- [ ] Include salary/fixed-cost obligations in burn-rate/cashflow formulas where required, not only `expenses.amount` or budgets.
- [ ] Restore V1 streaming pattern with Server Components + Suspense zones; do not make the entire smart dashboard a client/SWR page.
- [ ] Use request-level dedupe via `cache()` or the existing server cache wrapper for repeated analytics calls.
- [ ] Apply V2 SSOT tokens only: `main-container`, `card-base`, `stats-card`, `card-interactive`, `icon-box`, `badge badge-*`, shared table/chart primitives, and CSS variables for chart colors.

Additional V1 parity items still missing from V2:

- [ ] Scenario planning.
- [ ] Customer metrics / CLV / conversion rate.
- [ ] Revenue breakdown by service as smart widget.
- [ ] Dress ROI.
- [ ] Inventory cost intelligence.
- [ ] Advanced KPI grid.
- [ ] Optional Moodie AI finance analysis entry, not a separate hardcoded AI drawer.

### 2026-04-21 Implementation Update

Completed in code and linked Supabase:

- [x] Created `app/(protected)/finance/dashboard/page.tsx` and `loading.tsx`.
- [x] Removed mock return path from `app/actions/finance-intelligence-queries.ts`.
- [x] Added app-level finance permission guard for dashboard/intelligence actions.
- [x] Added migration `20260421113000_finance_dashboard_production_hardening.sql`.
- [x] Pushed migration to linked Supabase and smoke-checked updated RPC signatures.
- [x] Build passed with `/finance/dashboard` in the route manifest.

Still open after this implementation:

- [ ] Scenario planning, customer metrics, dress ROI, inventory cost intelligence, and advanced KPI grid are not ported yet.
- [ ] Full finance module-wide revenue/outflow SSOT should continue through reports/goals/close, not only dashboard/intelligence.

### 2026-04-21 Advanced Completion Update

Completed after the V2 optimization pass:

- [x] Added and pushed `20260421124500_finance_advanced_intelligence_rpc.sql`.
- [x] Added guarded action `getFinanceAdvancedIntelligence(month, year)`.
- [x] Added advanced V2 widgets for scenario planning, customer metrics, service revenue mix, dress ROI, inventory cost intelligence, and KPI grid.
- [x] Wired advanced widgets into `/finance/dashboard` Detail zone using Server Components, `cache()`, and SSOT token classes.
- [x] Verified scoped lint, production build, and Supabase smoke query `advanced_ok=true`.

Remaining outside this dashboard phase:

- [ ] Finance-wide revenue/outflow SSOT propagation through reports/goals/close remains tracked in the finance optimization plan.

## Objective

Tạo `/finance/dashboard` page — port toàn bộ V1 Smart Dashboard logic.
Viết lại analytics bằng PostgreSQL RPCs (tối ưu, KHÔNG copy V1 JS logic).

---

## V1 → V2 Port Strategy

| V1 (JS-based) | V2 (RPC-optimized) |
|---|---|
| `financeIntelligence.ts` (4.6KB) — JS tính score | → `get_finance_intelligence` RPC — SQL compute |
| `financeCalculators.ts` (5.9KB) — JS calculateHealthScore | → Logic trong RPC, TypeScript chỉ map kết quả |
| `cashflowForecast.ts` (5.3KB) — JS loop 30 ngày | → `get_cashflow_forecast` RPC — SQL compute |
| `generateBreakEvenAdvice.ts` (5.2KB) — Gemini AI | → Bỏ (merge vào Moodie AI tool system) |
| `extendedFinanceData.ts` (4.1KB) — expense breakdown | → `get_expense_breakdown` RPC |
| `debtAging.ts` (1.9KB) — aging buckets | → `get_receivable_aging` RPC |
| `phase3Data.ts` (8.3KB) — budget/scenario | → `get_budget_vs_actual` RPC |

---

## Implementation Steps

### Step 1: Tạo PostgreSQL RPCs (Analytics Engine)

#### RPC 1: `get_finance_intelligence`
- [ ] Input: không (dùng current date)
- [ ] Output: `{ health_score, health_status, health_message, breakdown, cashflow, trends, stats }`
- [ ] Logic port từ V1:
  - `calculateHealthScore()` — 5 dimension scoring (profitability 0-20, breakeven 0-25, runway 0-25, receivables 0-15, cashflow 0-15)
  - `calculateGrowth()` — MoM growth %
  - `processDebts()` — compute payables vs receivables
  - Runway = currentCash / burnRate
  - Break-even: target = max(burnRate, monthlyExpense), percent = revenue/target*100

#### RPC 2: `get_cashflow_forecast`
- [ ] Input: `p_days INTEGER DEFAULT 30`
- [ ] Output: `JSONB[]` — `{ date, projected_income, projected_expense, balance, events }`
- [ ] Logic port từ V1:
  - Get current balance (revenue lifetime - expense lifetime)
  - Map projected income từ contracts có work_date trong 30 ngày tới + remaining_amount > 0
  - Projected expense: fixed costs on day 1, salary on day 5
  - Running balance = current + income - expense daily
  - Track lowest cash point + critical date

#### RPC 3: `get_expense_breakdown`
- [ ] Input: `p_month, p_year`
- [ ] Output: `{ category, total, percentage, count }`
- [ ] Logic: GROUP BY category trên expenses table

#### RPC 4: `get_receivable_aging`
- [ ] Input: không
- [ ] Output: `{ bucket, count, total }` — buckets: 0-30, 31-60, 61-90, 90+
- [ ] Logic: contracts WHERE remaining_amount > 0, aging = days since contract_date

#### RPC 5: `get_budget_vs_actual`
- [ ] Input: `p_month, p_year`
- [ ] Output: `{ category, budget, actual, variance, variance_pct }`
- [ ] Logic: LEFT JOIN budgets table với expenses aggregated

**Files:**
- `[NEW] supabase/migrations/xxx_finance_intelligence_rpcs.sql`

---

### Step 2: Tạo Server Actions wrapper

- [ ] `app/actions/finance-intelligence-queries.ts`
  - `getFinanceIntelligence()` — gọi RPC `get_finance_intelligence`
  - `getCashflowForecast(days?)` — gọi RPC `get_cashflow_forecast`
  - `getExpenseBreakdown(month, year)` — gọi RPC `get_expense_breakdown`
  - `getReceivableAging()` — gọi RPC `get_receivable_aging`
  - `getBudgetVsActual(month, year)` — gọi RPC `get_budget_vs_actual`
- [ ] Mỗi action follow pattern: `withAuth` → `supabase.rpc()` → type mapping
- [ ] Fallback JS logic cho mỗi RPC (giống pattern `finance-dashboard-queries.ts`)

**Files:**
- `[NEW] app/actions/finance-intelligence-queries.ts`
- `[NEW] types/finance-intelligence.ts`

---

### Step 3: Tạo Dashboard Widgets (P0 — Critical)

#### Widget 1: HealthScoreCard
- [ ] Circular gauge (0-100) với color gradient
- [ ] Status badge: EXCELLENT / STABLE / WARNING / CRITICAL
- [ ] 5-dimension breakdown bars
- [ ] V1 ref: `HealthScore.tsx` (288 lines)
- [ ] V2: viết lại compact hơn (~150 lines), dùng CSS custom properties

#### Widget 2: CashflowRunwayCard
- [ ] Runway (còn X tháng)
- [ ] Burn rate /tháng
- [ ] Projected balance
- [ ] Low cash warning badge
- [ ] V1 ref: `CashflowRunway.tsx` (165 lines)
- [ ] V2: viết lại, dùng V2 tokens

#### Widget 3: BreakEvenCard
- [ ] Progress bar (current/target)
- [ ] Remaining amount
- [ ] Contracts needed to break even
- [ ] V1 ref: `BreakEvenIntel.tsx` (196 lines) — bỏ phần Gemini AI advice
- [ ] V2: only show data, AI advice → Moodie AI

**Files:**
- `[NEW] components/finance/dashboard/health-score-card.tsx`
- `[NEW] components/finance/dashboard/cashflow-runway-card.tsx`
- `[NEW] components/finance/dashboard/break-even-card.tsx`

---

### Step 4: Tạo Dashboard Widgets (P1 — Important)

#### Widget 4: CashflowForecastChart
- [ ] 30-day line chart (balance over time)
- [ ] Event markers (income/expense dots)
- [ ] Summary: projected inflow, outflow, net change
- [ ] V1 ref: `CashflowForecastCard.tsx` (228 lines)
- [ ] V2: Recharts LineChart, V2 tokens

#### Widget 5: ExpenseBreakdownDonut
- [ ] Donut chart by category
- [ ] Legend with amounts
- [ ] V1 ref: `ExpenseBreakdown.tsx` (131 lines)
- [ ] V2: Recharts PieChart

#### Widget 6: ReceivableAgingBars
- [ ] Stacked bar: 0-30d, 31-60d, 61-90d, 90d+
- [ ] Total outstanding
- [ ] V1 ref: `ReceivableAging.tsx` (102 lines)

**Files:**
- `[NEW] components/finance/dashboard/cashflow-forecast-chart.tsx`
- `[NEW] components/finance/dashboard/expense-breakdown-donut.tsx`
- `[NEW] components/finance/dashboard/receivable-aging-bars.tsx`

---

### Step 5: Tạo Dashboard Widgets (P2 — Nice-to-have)

#### Widget 7: BudgetVsActualCard
- [ ] Bar chart: budget vs actual per category
- [ ] Variance column (green/red)
- [ ] V1 ref: `BudgetVsActual.tsx` (139 lines)

#### Widget 8: PeriodComparisonCard
- [ ] Current month vs previous month summary
- [ ] Revenue, Expense, Profit deltas
- [ ] V1 ref: `PeriodComparison.tsx` — moved from hub bottom widgets

**Files:**
- `[NEW] components/finance/dashboard/budget-vs-actual-card.tsx`
- `[NEW] components/finance/dashboard/period-comparison-card.tsx`

---

### Step 6: Tạo Dashboard Page + Streaming Layout

- [ ] Tạo `app/(protected)/finance/dashboard/page.tsx`
- [ ] **Streaming SSR** với `Suspense` zones (V1 had 3 zones)
- [ ] Layout structure:

```
/finance/dashboard
├── <Suspense> Zone 1 — Critical (streams first)
│   ├── ← Back to Finance Hub
│   ├── HealthScoreCard
│   ├── CashflowRunwayCard
│   └── BreakEvenCard
│
├── <Suspense> Zone 2 — Charts (streams second)
│   ├── CashflowForecastChart
│   ├── ExpenseBreakdownDonut
│   └── ReceivableAgingBars
│
└── <Suspense> Zone 3 — Details (streams last)
    ├── BudgetVsActualCard
    └── PeriodComparisonCard
```

**V2 tối ưu vs V1:**
- V1: dùng `React.cache()` server-side
- V2: dùng **Server Components + Suspense** cho streaming
- Each zone = separate async Server Component → independent data fetch
- Skeleton fallbacks per zone

**Files:**
- `[NEW] app/(protected)/finance/dashboard/page.tsx`
- `[NEW] app/(protected)/finance/dashboard/loading.tsx` — skeleton fallback

---

### Step 7: Update Smart Dashboard Banner
- [ ] Phase 1 banner shows "Đang phát triển"
- [ ] Phase 2 complete → Banner shows real data (health score preview)
- [ ] Mini health indicator on banner (green/yellow/red dot)

**Files:**
- `[MODIFY] components/finance/dashboard/smart-dashboard-banner.tsx` — add health indicator

---

## Test Criteria

- [ ] Navigate `/finance/dashboard` → page loads with streaming zones
- [ ] HealthScore displays 0-100 gauge with correct color
- [ ] CashflowRunway shows runway months
- [ ] BreakEven shows progress bar
- [ ] CashflowForecast chart renders 30-day timeline
- [ ] ExpenseBreakdown donut shows categories
- [ ] ReceivableAging bars show aging buckets
- [ ] All RPCs return valid data
- [ ] Fallback JS logic works khi RPC chưa tồn tại
- [ ] Mobile responsive
- [ ] No TypeScript errors, build thành công

---
Next Phase: [Phase 03 — FAB + Quick Actions](./phase-03-fab-quick-actions.md)
