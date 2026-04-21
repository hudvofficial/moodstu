# Phase 03a: UI Slice 1 — Dashboard (Full) + Ledger Read-Only
Status: ⬜ Pending
Dependencies: Phase 02 ✅ (actions hardened, dashboard queries ready)
Stitch Mockup: `projects/6640710053908312506` (Desktop + Mobile)

## 2026-04-21 Audit Delta - Dashboard/Ledger Hardening

Reference: `docs/reports/audit_2026-04-21_finance_dashboard_v1_parity.md`

Do not close this phase until these finance SSOT gates pass:

- [ ] Dashboard, ledger, reports, goals, and intelligence use one revenue formula.
- [ ] Dashboard/ledger SQL RPCs filter `receipts.deleted_at IS NULL` wherever receipts are aggregated or unioned.
- [ ] Profit report SQL returns every UI column: package revenue, addon revenue, discount, task cost, print cost, expense cost, total cost, profit, margin.
- [ ] Finance server actions enforce finance access in addition to login.
- [ ] `/finance/dashboard` route exists or banner CTA is disabled; no production 404.
- [ ] Smart dashboard uses real RPC data, not mock data.
- [ ] Server rendering uses Suspense/cache for expensive analytics and dynamic chart islands for Recharts.

## Objective
Dựng layout chính module Finance, Dashboard page **đầy đủ 6 sections** (khớp V1 feature parity), và Ledger view (paginated read-only).

> ⚠️ **V1 PARITY**: Dashboard PHẢI có 6 sections: KPIs, Doanh thu bar chart, Phân bổ dịch vụ donut, HĐ sắp chụp, Cần thu tiền, Báo cáo Lợi nhuận Theo HĐ.

---

## 1. Dependencies Check

| Package | Status | Action |
|---------|--------|--------|
| `recharts` | `^3.8.0` ✅ | Bar chart + Donut chart + Area chart |
| `swr` | `^2.4.1` ✅ | Data fetching |
| `react-hook-form` | ❌ Không cần phase này | Dùng ở 03b |
| `@tanstack/react-virtual` | ❌ Không cần | Dùng pagination thay vì virtual scroll |

---

## 2. Server Queries — Tạo/Mở rộng trước UI

> **⚠️ BẮT BUỘC**: Queries hoàn thành và test trước khi code UI. Mọi query dùng `withAuth` (read-only) hoặc `withAdmin` (mutation).

### 2.1 File: `app/actions/finance-dashboard-queries.ts`

| Query | Mô tả | Data Source | Status |
|-------|--------|-------------|--------|
| `getDashboardMetrics(month, year)` | 4 KPI cards: doanh thu, HĐ mới, công nợ, hoàn thành | payments + receipts + expenses + contracts | ⚠️ Mở rộng (hiện chỉ có thu/chi) |
| `getRevenueByMonth(year)` | Bar chart 6 tháng gần nhất | payments + receipts GROUP BY month | ❌ **MỚI** |
| `getServiceDistribution(month, year)` | Donut chart phân bổ dịch vụ | contracts JOIN services GROUP BY type | ❌ **MỚI** |
| `getUpcomingContracts(limit)` | HĐ sắp chụp | contracts WHERE shooting_date > now() ORDER BY date LIMIT 5 | ❌ **MỚI** |
| `getPendingCollections(limit)` | Cần thu tiền | contracts WHERE remaining_amount > 0 | ❌ **MỚI** |
| `getContractProfitReport(filters)` | Báo cáo LN theo HĐ | contracts + payments + expenses + employee allocations | ❌ **MỚI** |
| `getCashflowTimeline(start, end)` | Cashflow chart data | payments + receipts + expenses | ✅ Có |
| `fetchLedger(params)` | Sổ cái paginated | payments + receipts + expenses UNION | ⚠️ Stub cần implement |

### 2.2 Performance Rules cho Queries

| Rule | PHẢI | KHÔNG ĐƯỢC |
|------|------|------------|
| Date filter | WHERE clause server-side | ❌ Fetch all → filter client |
| Aggregation | Dùng SQL `SUM()`, `GROUP BY` | ❌ Fetch raw rows → `.reduce()` client |
| Pagination | `LIMIT/OFFSET` server-side | ❌ Fetch all → slice client |
| Profit calc | JOIN + subquery server-side | ❌ N+1 queries per contract |
| Lõi DB Indexing | BẮT BUỘC tạo/kiểm tra SQL Index trên `date`, `status`, `type` | ❌ Full table scan gánh cục DB khổng lồ |

---

## 3. Files to Create

### 3.1 Layout & Navigation

| File | Purpose | Max Lines |
|------|---------|-----------|
| `app/(protected)/finance/layout.tsx` | Finance layout, admin-only gate, sub-nav tabs | 80 |
| `app/(protected)/finance/page.tsx` | Dashboard server component → fetch 6 datasets → `fallbackData` | 60 |
| `components/finance/finance-sub-nav.tsx` | Sub-nav tabs component (reusable across all finance pages) | 50 |

### 3.2 Dashboard Components (6 Sections)

| File | Section | SSOT Components | Max Lines |
|------|---------|----------------|-----------|
| `components/finance/dashboard/finance-dashboard-client.tsx` | Orchestrator: month picker + render all sections | SWR hooks + layout | 200 |
| `components/finance/dashboard/revenue-bar-chart.tsx` | **Doanh thu theo tháng** — Bar chart 6 months | `card-base` + Recharts `<BarChart>` | 120 |
| `components/finance/dashboard/service-donut-chart.tsx` | **Phân bổ dịch vụ** — Donut chart | `card-base` + Recharts `<PieChart>` | 120 |
| `components/finance/dashboard/upcoming-contracts.tsx` | **HĐ sắp chụp** — Upcoming list | `card-base` + `card-interactive` items | 100 |
| `components/finance/dashboard/pending-collections.tsx` | **Cần thu tiền** — Pending list | `card-base` + `card-interactive` items | 100 |
| `components/finance/dashboard/profit-report-table.tsx` | **Báo cáo LN theo HĐ** — Table + filters + pagination | `card-base` + `<TableWrapper>` + `<Pagination>` | 250 |

> **KPI cards** render trực tiếp trong `finance-dashboard-client.tsx` bằng `<KPICard>` — KHÔNG tạo component riêng.

### 3.3 Ledger (Read-Only)

| File | Purpose | Max Lines |
|------|---------|-----------|
| `app/(protected)/finance/cashflow/page.tsx` | Server component → fetch initial → `fallbackData` | 40 |
| `components/finance/cashflow/ledger-client.tsx` | Client: SWR + filter + pagination orchestrator | 150 |
| `components/finance/cashflow/ledger-desktop-table.tsx` | Desktop: `<TableWrapper>` + `<THead>` + `<TBody>` | 150 |
| `components/finance/cashflow/ledger-mobile-list.tsx` | Mobile: card list | 100 |

---

## 4. SSOT Token Compliance (ZERO TOLERANCE)

> **Ref: `ssot-token-map.md`** — Đây là source of truth duy nhất. KHÔNG query ngoài file này.

### 4.1 Layout Tokens

| Element | PHẢI dùng | KHÔNG ĐƯỢC |
|---------|-----------|------------|
| Page wrapper | `main-container` | ❌ `p-4 px-6 py-8` tự viết |
| Detail 2-col | `detail-grid` + `detail-main` + `detail-sidebar` | ❌ `grid grid-cols-12` tự viết |
| Icon container | `icon-box` | ❌ `w-10 h-10 rounded-lg grid place-items-center` |

### 4.2 Card Tokens

| Element | PHẢI dùng | Khi nào |
|---------|-----------|---------|
| KPI cards | `<KPICard>` (auto render `stats-card` + `icon-box`) | Dashboard KPIs |
| Chart wrappers | `card-base` | Revenue chart, Donut chart |
| Clickable items | `card-interactive` | HĐ sắp chụp, Cần thu tiền items |
| Profit report card | `card-base` | Table container |

### 4.3 Table Tokens

| Element | PHẢI dùng |
|---------|-----------|
| Table container | `<TableWrapper>` |
| Header row | `<THead>` → auto `table-header` |
| Body | `<TBody>` |
| Header cell | `<TH>` |
| Row | `<TR>` |
| Cell | `<TD>` |
| Section title | `section-title` |

### 4.4 Badge Tokens

| Trạng thái | Class |
|-----------|-------|
| Đã hoàn thành | `badge badge-success` |
| Đang thực hiện | `badge badge-warning` |
| Đã hủy | `badge badge-error` |
| Draft | `badge badge-neutral` |
| Thông tin | `badge badge-info` |
| Tags | `tag-badge` |

### 4.5 Tab Tokens

| Element | Class |
|---------|-------|
| Tab item | `tab-pill` |
| Active | `tab-pill tab-pill-active` |
| Inactive | `tab-pill tab-pill-inactive` |

### 4.6 Number/Currency Formatting

```tsx
// BẮT BUỘC cho mọi cột tiền
<span className="tabular-nums font-bold">
  {amount.toLocaleString("vi-VN")}₫
</span>

// Percentage
<span className={`tabular-nums ${value >= 0 ? 'text-success' : 'text-error'}`}>
  {value >= 0 ? '↑' : '↓'}{Math.abs(value)}%
</span>
```

### 4.7 Color Tokens (KHÔNG hardcode)

| Semantic | CSS Variable | Hex (reference only) |
|----------|-------------|---------------------|
| Text chính | `var(--color-primary)` | `#8b5e3c` |
| CTA buttons | `var(--color-interactive)` | `#cf6717` |
| Thu/profit+ | `var(--color-success)` | `#4caf50` |
| Chi/nợ/loss | `var(--color-error)` | `#f44336` |
| Warning | `var(--color-warning)` | `#ff9800` |
| Info | `var(--color-info)` | `#2196f3` |
| Card bg | `var(--color-bg-card)` | `#ffffff` |
| Sidebar bg | `var(--color-bg-sidebar)` | `#f5efe6` |

> ❌ **GREP VERIFY**: `grep -rn "#[0-9a-fA-F]\{3,6\}" components/finance/ --include="*.tsx"` — Expected: **0 results**

### 4.8 Animation Tokens

| Tình huống | Class |
|-----------|-------|
| Page sections entrance | `entrance entrance-{1..6}` (mỗi section 1 delay) |
| List items | `stagger-item` |
| Cards | `card-entrance` |
| Loading | `skeleton` + `skeleton-text` / `skeleton-card` |

---

## 5. SWR Cache Strategy

### 5.1 Cache Keys — Đăng ký tại `lib/swr.ts` SSOT

```ts
// Thêm vào lib/swr.ts
export const cacheKeys = {
  // ... existing keys ...
  financeDashboard: (month: number, year: number) => `finance-dashboard:${year}-${month}`,
  financeRevenue: (year: number) => `finance-revenue:${year}`,
  financeServiceDist: (month: number, year: number) => `finance-service-dist:${year}-${month}`,
  financeUpcoming: () => `finance-upcoming-contracts`,
  financePending: () => `finance-pending-collections`,
  financeProfitReport: (status: string, from: string, to: string) => `finance-profit:${status}:${from}:${to}`,
  financeCashflow: (start: string, end: string) => `finance-cashflow:${start}:${end}`,
  financeLedger: (page: number, month: number, year: number, type?: string) => `finance-ledger:${page}:${year}-${month}:${type || 'all'}`,
};
```

### 5.2 SWR Rules

| Rule | Implementation | KHÔNG ĐƯỢC |
|------|---------------|------------|
| Initial data | Server component fetch → `fallbackData` prop | ❌ `useEffect + fetch` |
| Cache key | `cacheKeys.financeXxx()` từ `lib/swr.ts` | ❌ Hardcode string inline |
| Revalidation | `mutate(cacheKey)` sau mutation | ❌ Full page reload |
| Stale data | `keepPreviousData: true` (global default) | ❌ Flash blank screen |
| Error handling | SWR `error` state → toast | ❌ Silent fail |

### 5.3 Đánh lừa thị giác — Trải nghiệm tốc độ 0ms (MỚI)

| UX Factor | Tech Stack | Yêu cầu Code |
|-----------|------------|--------------|
| **Data Prefetching** | SWR `preload(cacheKey, fetcher)` | Bắt sự kiện `onMouseEnter` tại các Tab (`finance-sub-nav.tsx`). Khi user rẽ tab, data đã sẵn sàng. |
| **Optimistic UX** | `mutate(key, optimisticData, false)` | Áp dụng ở các thao tác *Duyệt/Thu tiền/Tạo mới.* UI đổi trạng thái ngay lập tức khi ấn nút (trước khi API trả về). |

---

## 6. Finance Sub-Navigation

```
/finance            → Dashboard (default)
/finance/cashflow   → Sổ cái thu chi
/finance/receipts   → Phiếu thu
/finance/expenses   → Phiếu chi
/finance/categories → Danh mục
/finance/debts      → Công nợ KH
/finance/lab-debts  → Công nợ Lab
/finance/salaries   → Bảng lương
/finance/fixed-costs → Chi phí cố định
/finance/investments → Tài sản đầu tư
/finance/goals      → Mục tiêu
/finance/budget     → Ngân sách
/finance/closes     → Chốt sổ
```

**Desktop**: horizontal tab-pills, overflow scroll nếu cần.
**Mobile**: scrollable horizontal `tab-pill` container + `no-scrollbar`.

---

## 7. Dashboard Layout (Desktop 1440px)

```
┌─────────────────────────────────────────────────────────────┐
│  entrance-1: [KPI] [KPI] [KPI] [KPI]        4 cột đều     │
│  entrance-2: [Revenue Bar 65%] [Service Donut 35%]          │
│  entrance-3: [HĐ sắp chụp 50%] [Cần thu tiền 50%]         │
│  entrance-4: [Báo cáo Lợi nhuận Theo HĐ — full width]     │
└─────────────────────────────────────────────────────────────┘
```

**Mobile (375px)**: Tất cả stacked full-width, KPIs = 2×2 grid.

---

## 8. Component Map (SSOT Cross-Reference)

### Dashboard (6 Sections)

| UI Element | SSOT Component/Class | Ref |
|---|---|---|
| Page wrapper | `main-container` | layout.css |
| Sub-nav tabs | `tab-pill` + `tab-pill-active/inactive` | tabs.css |
| KPI cards (4) | **`<KPICard>`** — `label, value, icon, iconColor, iconBg, trend, trendUp` | kpi-card.tsx |
| Revenue bar chart | **Lazy Load (`next/dynamic`)** + `card-base` wrapper + `<BarChart>` | cards.css |
| Service donut | **Lazy Load (`next/dynamic`)** + `card-base` wrapper + `<PieChart>` | cards.css |
| Upcoming contracts list | `card-base` → `card-interactive` items | cards.css |
| Pending collections list | `card-base` → `card-interactive` items + `tabular-nums text-error` | cards.css |
| Profit report table | `card-base` → `<TableWrapper>` + `<Pagination>` | table.tsx |
| Status badges | `badge badge-success/warning/error` | badges.css |
| Number format | `tabular-nums font-bold` | utilities.css |
| Trend arrows | `text-success` / `text-error` + arrow icons | utilities.css |
| Page entrance | `entrance entrance-{1..4}` per section | animations.css |
| Chart colors | `var(--color-primary)` for Thu, `var(--color-error)` for Chi | globals.css @theme |
| Loading state | `<SkeletonCard>` + `<SkeletonText>` | skeleton.tsx |

### Ledger

| UI Element | SSOT Component/Class | Ref |
|---|---|---|
| Desktop table | `<TableWrapper>` + `<THead>` + `<TBody>` + `<TH>` + `<TD>` + `<TR>` | table.tsx |
| Table heading | `section-title` | tables.css |
| Mobile cards | `card-interactive` | cards.css |
| Status badges | `badge badge-success/warning/error` | badges.css |
| Row overdue | `overdue-indicator` | utilities.css |
| Pagination | `<Pagination page={page} totalPages={totalPages} onChange={setPage} />` | pagination.tsx |
| Filter inputs | `input-base` + `select-trigger` | forms.css |
| Search | `search-input` | forms.css |
| Empty state | `text-text-muted text-body-sm` | — |
| Loading | `<SkeletonTable rows={5} />` | skeleton.tsx |

---

## 9. Implementation Steps (Ordered)

### Phase A: Backend Queries (tạo trước)
1. [ ] Mở rộng `getDashboardMetrics()` — thêm contractsNew, contractsDone, totalDebt
2. [ ] Tạo `getRevenueByMonth(year)` — SQL GROUP BY month
3. [ ] Tạo `getServiceDistribution(month, year)` — JOIN services
4. [ ] Tạo `getUpcomingContracts(limit)` — WHERE shooting_date > now()
5. [ ] Tạo `getPendingCollections(limit)` — WHERE remaining > 0
6. [ ] Tạo `getContractProfitReport(filters)` — JOIN + aggregate
7. [ ] Implement `fetchLedger()` — UNION payments + receipts + expenses + pagination
8. [ ] Test: mỗi query chạy `< 200ms` trên production data

### Phase B: Cache Keys + Layout
9. [ ] Update `lib/swr.ts` thêm finance cache keys (§5.1)
10. [ ] Tạo `finance-sub-nav.tsx` — horizontal tab-pills
11. [ ] Tạo `finance/layout.tsx` — admin gate + sub-nav
12. [ ] Tạo `finance/page.tsx` — server component fetch 6 datasets

### Phase C: Dashboard UI
13. [ ] Tạo `finance-dashboard-client.tsx` — orchestrator + KPI cards
14. [ ] Tạo `revenue-bar-chart.tsx` — Recharts BarChart
15. [ ] Tạo `service-donut-chart.tsx` — Recharts PieChart
16. [ ] Tạo `upcoming-contracts.tsx` — card list
17. [ ] Tạo `pending-collections.tsx` — card list
18. [ ] Tạo `profit-report-table.tsx` — table + filter + pagination

### Phase D: Ledger UI
19. [ ] Tạo `cashflow/page.tsx` + `ledger-client.tsx`
20. [ ] Tạo `ledger-desktop-table.tsx`
21. [ ] Tạo `ledger-mobile-list.tsx`

### Phase E: Verification
22. [ ] SSOT grep commands pass (§4.7 + ssot-token-map §4)
23. [ ] `npm run build` pass
24. [ ] Browser visual verify (desktop + mobile)

---

## 10. SSOT Acceptance Criteria (PHẢI pass 100%)

> **Checklist kiểm được — grep verify. Fail bất kỳ → KHÔNG qua Phase 03b.**

- [ ] Page wrapper dùng `main-container` — KHÔNG `p-4 px-6` tự viết
- [ ] KPI cards dùng `<KPICard>` — KHÔNG tạo card component mới
- [ ] Chart card wrapper dùng `card-base` — KHÔNG `bg-white rounded-xl` tự viết
- [ ] Sub-nav tabs dùng `tab-pill` + `tab-pill-active` / `tab-pill-inactive`
- [ ] Desktop table dùng `<TableWrapper>` + `<THead>` + `<TBody>` + `<TH>` + `<TD>` + `<TR>`
- [ ] Pagination dùng `<Pagination>` từ `components/ui/pagination.tsx`
- [ ] Loading states dùng `<SkeletonCard>` + `<SkeletonTable>` từ `components/ui/skeleton.tsx`
- [ ] Mọi cột tiền có class `tabular-nums`
- [ ] Status badges dùng `badge badge-*` — KHÔNG custom badge
- [ ] Entrance animation: `entrance entrance-{1..N}` cho mỗi dashboard section
- [ ] List items dùng `stagger-item` class
- [ ] Chart colors dùng CSS variables `var(--color-*)` — KHÔNG hardcode hex
- [ ] **0 hardcoded hex/rgb/hsl colors** — `grep -rn "#[0-9a-fA-F]\{3,6\}" components/finance/` = 0
- [ ] **0 CSS modules mới** — KHÔNG tạo file `.module.css` hay `.css` mới cho finance
- [ ] **0 custom modals** — dùng `<UnifiedModal>` nếu cần
- [ ] **0 `<input type="number">`** — dùng `<CurrencyInput>` nếu có amount input
- [ ] Cache keys đăng ký trong `lib/swr.ts` — KHÔNG hardcode inline
- [ ] Mọi file < 250 lines
- [ ] Icons chỉ từ `lucide-react`
- [ ] Recharts chart colors dùng `getComputedStyle()` hoặc CSS variable string

---

## 11. Test/Verification Criteria

### Functional
- [ ] Navigate `/finance` → Dashboard hiển thị đầy đủ 6 sections
- [ ] KPI cards hiển thị số liệu chính xác
- [ ] Bar chart render 6 tháng gần nhất
- [ ] Donut chart render phân bổ dịch vụ
- [ ] HĐ sắp chụp list hiển thị (link → contract detail)
- [ ] Cần thu tiền list hiển thị (amounts tabular-nums)
- [ ] Profit report table + filter + pagination hoạt động
- [ ] Navigate `/finance/cashflow` → paginated ledger
- [ ] Month picker thay đổi → SWR revalidate tất cả sections

### Responsive
- [ ] Desktop: full layout, 2-col charts, 2-col lists
- [ ] Mobile: stacked, KPIs = 2×2, horizontal scroll tabs
- [ ] Mobile: table → card list

### Performance & UX (Gold Standard Gate)
- [ ] **Lighthouse Performance Score ≥ 90** (Màn Dashboard)
- [ ] **TTI (Time to Interactive) < 1.5s**
- [ ] Mỗi query backend < 200ms *(Đã verify DB Indexing)*
- [ ] Dashboard initial load < 1s (Server Component + Lazy Load Charts)
- [ ] Thao tác chuyển Tab Sub-nav cảm giác 0ms nhờ Data Prefetching
- [ ] No layout shift khi data load

### SSOT Compliance
- [ ] Tất cả grep commands (§10) pass
- [ ] `npm run build` pass
- [ ] Visual check vs Stitch mockup `projects/6640710053908312506`

---
Next Phase: `phase-03b-ui-create-approve.md`
