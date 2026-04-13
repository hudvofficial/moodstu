# Audit Report — Finance Dashboard `/finance`
**Ngày:** 2026-04-13
**Scope:** Full Audit — Navigation, Features, Performance, Code Quality, UX
**Benchmark:** V1 (`0Moodstudio/webapp`) — đã thống nhất V2 = V1 + tối ưu

---

## Summary

| Severity | Count |
|:--------:|:-----:|
| 🔴 Critical | 5 |
| 🟡 Warning | 6 |
| 🟢 Info | 4 |

---

## 🔴 Critical Issues (Phải sửa)

### C1: Navigation downgrade — 13-tab SubNav thay thế QuickNav Grid

**File:** `components/finance/finance-sub-nav.tsx`, `app/(protected)/finance/layout.tsx`

**V1 (đúng):** Layout passthrough + QuickNav grid (6 icon cards) + Smart Banner CTA
**V2 (sai):** `FinanceSubNav` = 13 tab pills ngang, horizontal scroll

**Hậu quả:**
- Desktop: chỉ thấy ~8/13 tab, còn lại ẩn ngoài viewport
- Mobile: chỉ thấy 2-3 tab, user không biết có tab nào ẩn
- Vi phạm Apple HIG (max 5 tabs)
- Chiếm ~48px vertical space trên MỌI sub-page (kể cả receipts, expenses...)

**Cách sửa:**
- Bỏ `FinanceSubNav` khỏi `layout.tsx` → layout passthrough
- Tạo `FinanceQuickNav` component (V2 tokens, grid icon cards)
- Chỉ render QuickNav trên `/finance` dashboard page

---

### C2: Smart Dashboard bị xóa hoàn toàn

**V1 có:** `/finance/dashboard` page với 15+ widgets thông minh
**V2:** Không tồn tại

**Danh sách features mất (18 items):**

| # | Widget | Business value |
|:-:|--------|---------------|
| 1 | HealthScore | Điểm sức khỏe tài chính tổng hợp |
| 2 | CashflowRunway | Runway — còn trụ được bao lâu |
| 3 | BreakEvenIntel | Điểm hòa vốn + chiến lược |
| 4 | CashflowForecast | Dự báo dòng tiền 3-6 tháng |
| 5 | ExpenseBreakdown | Chi phí theo category |
| 6 | ReceivableAging | Phân tích tuổi nợ phải thu |
| 7 | BudgetVsActual | Ngân sách vs Thực tế |
| 8 | ScenarioPlanning | Kịch bản tài chính (what-if) |
| 9 | CustomerMetrics | LTV, CAC khách hàng |
| 10 | RevenueBreakdown | Doanh thu theo dịch vụ |
| 11 | DressROI | ROI trang phục cho thuê |
| 12 | InventoryCosts | Chi phí tồn kho |
| 13 | AdvancedKPIGrid | KPI nâng cao (5 metrics) |
| 14 | PeriodComparison | So sánh kỳ trước |
| 15 | RecentTransactions | Giao dịch gần đây |
| 16 | CashflowInfoCard | Thông tin dòng tiền |
| 17 | AIAnalysisDrawer | Phân tích AI |
| 18 | AIInsightStrip | Insight nhanh |

**Analytics backend mất:** 13 files (71KB) — `lib/analytics/*`

---

### C3: FinanceFAB bị xóa

**V1:** 285 dòng — FAB nổi bao gồm:
- ➕ Lập phiếu thu nhanh (modal)
- ➖ Lập phiếu chi nhanh (modal)
- 🧠 AI Insight popup (doanh thu trend + dòng tiền status)
- 📊 AI Analysis Drawer (phân tích chi tiết)

**V2:** Không có. User phải navigate qua 13 tab → vào sub-page → click button.

---

### C4: KPI downgrade — Thiếu metrics quan trọng

**V1:** 6 StatCards (clickable → deep-link đến sub-page):
1. Doanh thu tháng → `/finance/receipts`
2. Chi phí tháng → `/finance/expenses`
3. Lợi nhuận ròng
4. **Burn Rate (Tháng)**
5. **Nợ ngắn hạn**
6. Chờ thu (Công nợ)

**V2:** 4 KPICards (KHÔNG clickable):
1. Doanh thu tháng
2. HĐ mới
3. Công nợ
4. Hoàn thành

**Mất:** Burn Rate, Nợ ngắn hạn, Chi phí tháng, Lợi nhuận ròng
**Thêm nhưng ít giá trị:** HĐ mới, Hoàn thành (thông tin contract, không phải financial)

---

### C5: Smart Dashboard Banner CTA bị xóa

**V1:** Banner premium gradient xanh → CTA "Xem ngay" → `/finance/dashboard`
- Instant render (no data dependency)
- Mô tả rõ ràng: "Điểm hòa vốn, dự báo dòng tiền và sức khỏe doanh nghiệp"
- Visual: gradient, animated icon, hover effects

**V2:** Không có. Không có entry point nào dẫn đến analytics/intelligence.

---

## 🟡 Warnings (Nên sửa)

### W1: Streaming SSR → Client-side SWR — Performance regression

**V1:** Server-side streaming SSR với 3 Suspense zones
```
Zone 1 (Critical): StatCards → stream first
Zone 2 (Charts): ProfitReport + BreakEven → stream second
Zone 3 (Bottom): Widgets → stream last
```
- FCP nhanh vì mỗi zone stream independent
- No JS needed cho initial render

**V2:** Toàn bộ `FinanceDashboardClient` là client component
- Server fetch initial data → truyền qua props
- SWR revalidate trên client
- **Vấn đề:** Client component bundle lớn hơn, hydration time không cần thiết cho static sections

---

### W2: SubNav prefetch quá aggressive

**File:** `finance-sub-nav.tsx:41-61`

```tsx
function prefetchTab(href: string) {
  if (href === "/finance") {
    // Prefetch 6 queries khi hover Dashboard tab
    prefetch(cacheKeys.financeDashboard(...));
    prefetch(cacheKeys.financeRevenue(...));
    prefetch(cacheKeys.financeServiceDist(...));
    // ... 3 more
  }
}
```

Mỗi lần hover Dashboard tab → fire 6 server actions. Nếu SubNav ở layout (mọi page) → user hover qua lại = spam requests.

---

### W3: `ActionResult<T>` type duplicated 3 lần

Duplicated ở:
- `finance-dashboard-queries.ts:17`
- `finance-sub-nav.tsx:17`
- `finance-dashboard-client.tsx:40`

Nên centralize vào `types/` hoặc `lib/`.

---

### W4: BreakEven widget bị xóa khỏi Profit Section

**V1:** `FinanceProfitSection` = grid 3:1 → Profit Report (3) + BreakEven Widget (1)
**V2:** `ProfitReportTable` full width → Không có BreakEven.

---

### W5: Bottom widgets lost — Recent Transactions, Cashflow Info, Period Comparison

**V1:** 3-widget grid bên dưới (dashboard bottom):
1. `RecentTransactionsCard` — giao dịch gần đây
2. `CashflowInfoCard` — thông tin dòng tiền
3. `PeriodComparison` — so sánh kỳ trước

**V2:** Thay bằng Upcoming + Pending (2 widgets). Thiếu context giao dịch và so sánh kỳ.

---

### W6: Chart section thiếu chi phí (expense) overlay

**V2 Revenue chart:** chỉ hiện doanh thu (1 bar). V1 có expense overlay hoặc ExpenseBreakdown card riêng.
Không thể đánh giá lợi nhuận nếu chỉ thấy doanh thu.

---

## 🟢 Info / Suggestions

### I1: Data layer tốt — RPC + fallback pattern ổn
`finance-dashboard-queries.ts` dùng RPC-first + JS fallback = pattern tốt, giữ nguyên.

### I2: SWR caching keys well-structured
`cacheKeys.finance*` naming convention tốt, consistent.

### I3: Chart components dùng design tokens đúng
`var(--color-primary)`, `var(--color-border)` → đúng V2 SSOT.

### I4: TypeScript types đầy đủ
`types/finance-dashboard.ts` typed rõ ràng, có `satisfies`.

---

## 📋 Phác đồ Fix — 3 Phases

### Phase 1: Fix Navigation + Dashboard Hub (Effort: 2-3 giờ)

| # | Task | File | Chi tiết |
|:-:|------|------|----------|
| 1.1 | Bỏ SubNav khỏi layout | `finance/layout.tsx` | Layout passthrough (giống V1) |
| 1.2 | Tạo QuickNav Grid | `components/finance/dashboard/finance-quick-nav.tsx` | V2 tokens, grid 3×2, Lucide icons |
| 1.3 | Tạo Smart Banner CTA | `components/finance/dashboard/smart-dashboard-banner.tsx` | Link → `/finance/dashboard` (placeholder) |
| 1.4 | Nâng cấp KPIs | `finance-dashboard-client.tsx` | 6 metrics (V1), clickable → sub-pages |
| 1.5 | Thêm bottom widgets | New components | PeriodComparison + RecentTransactions |

### Phase 2: Port Smart Dashboard (Effort: 2-3 ngày)

| # | Task | Priority |
|:-:|------|:--------:|
| 2.1 | Tạo `get_finance_intelligence` RPC | P0 |
| 2.2 | HealthScore widget | P0 |
| 2.3 | CashflowRunway widget | P0 |
| 2.4 | BreakEvenIntel widget | P0 |
| 2.5 | CashflowForecast widget | P1 |
| 2.6 | ExpenseBreakdown widget | P1 |
| 2.7 | ReceivableAging widget | P1 |
| 2.8 | BudgetVsActual widget | P2 |
| 2.9 | ScenarioPlanning widget | P2 |

### Phase 3: FAB + AI Integration (Effort: 3-4 giờ)

| # | Task | Chi tiết |
|:-:|------|----------|
| 3.1 | Tạo FinanceFAB | Quick create receipts/expenses |
| 3.2 | AI Insight popup | Doanh thu trend + dòng tiền status |
| 3.3 | Merge AI vào Moodie | Finance tools → Moodie AI system |

---

## Next Steps

```
📋 Chọn hành động:

1️⃣ Xem chi tiết từng issue
2️⃣ Bắt tay Phase 1 ngay (Fix Nav + Dashboard Hub)
3️⃣ Lên plan chi tiết trước rồi fix
4️⃣ Lưu report vào /save-brain
5️⃣ FIX ALL — Tự động sửa tuần tự 3 phases
```
