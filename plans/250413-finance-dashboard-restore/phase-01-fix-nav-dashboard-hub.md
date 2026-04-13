# Phase 01: Fix Navigation + Dashboard Hub
**Status:** ⬜ Pending
**Effort:** 2-3 giờ
**Dependencies:** Không

## Objective

Bỏ 13-tab SubNav → thay bằng V1-style QuickNav Grid + Smart Banner CTA.
Nâng KPIs từ 4 → 6 metrics (clickable). Thêm bottom widgets.

## Audit Issues Addressed
- 🔴 C1: Navigation downgrade (13-tab SubNav)
- 🔴 C4: KPI downgrade (4 metrics, não clickable)
- 🔴 C5: Smart Dashboard Banner CTA bị xóa
- 🟡 W3: ActionResult<T> duplicated 3 lần
- 🟡 W5: Bottom widgets lost

---

## Implementation Steps

### Step 1: Centralize ActionResult type
- [ ] Tạo `types/action-result.ts` với `ActionResult<T>` type
- [ ] Update imports ở `finance-dashboard-queries.ts`, `finance-sub-nav.tsx`, `finance-dashboard-client.tsx`

**Files:**
- `[NEW] types/action-result.ts`
- `[MODIFY] app/actions/finance-dashboard-queries.ts` — remove local type
- `[MODIFY] components/finance/finance-sub-nav.tsx` — remove local type
- `[MODIFY] components/finance/dashboard/finance-dashboard-client.tsx` — remove local type

---

### Step 2: Bỏ SubNav khỏi layout
- [ ] `finance/layout.tsx` → bỏ `<FinanceSubNav />`, layout passthrough
- [ ] KHÔNG xóa file `finance-sub-nav.tsx` vội (các sub-page có thể back-link)

**V1 Logic (tham khảo):**
```tsx
// V1 layout.tsx = simple passthrough  
export default function FinanceLayout({ children }) {
  return <>{children}</>;
}
```

**V2 tối ưu:**
```tsx
// Giữ auth check, bỏ SubNav
export default async function FinanceLayout({ children }) {
  const context = await getAuthenticatedUserContext();
  if (!context) redirect("/login");
  if (!canAccess(context.shellRole, "finance")) redirect("/dashboard");
  return <div className="main-container">{children}</div>;
}
```

**Files:**
- `[MODIFY] app/(protected)/finance/layout.tsx` — bỏ `<FinanceSubNav />`

---

### Step 3: Tạo FinanceQuickNav component
- [ ] Grid 3×2 mobile, 1 row trên desktop
- [ ] Dùng Lucide icons (KHÔNG material-symbols)
- [ ] V2 design tokens (card-base, text-h3, etc.)
- [ ] Click → navigate to sub-page

**V1 Logic (port):**
```
NAV_ITEMS = [
  { href: "/finance/categories", label: "Danh mục", icon: "category", color: "blue" },
  { href: "/finance/expenses", label: "Chi phí", icon: "wallet", color: "red" },
  { href: "/finance/salaries", label: "Bảng lương", icon: "badge", color: "indigo" },
  { href: "/finance/debts", label: "Công nợ", icon: "landmark", color: "orange" },
  { href: "/finance/investments", label: "Đầu tư", icon: "trending-up", color: "emerald" },
  { href: "/finance/goals", label: "Mục tiêu", icon: "flag", color: "violet" },
]
```

**V2 tối ưu:**
- Thay `material-symbols-outlined` → Lucide icons
- Thay Tailwind dynamic classes (`bg-${color}-50`) → CSS custom properties hoặc mapped object
- Responsive: `grid-cols-3 md:grid-cols-6`
- Thêm: `/finance/receipts` (Phiếu thu), `/finance/cashflow` (Sổ cái), `/finance/closes` (Chốt sổ) — V2 có nhưng V1 QuickNav thiếu

**Proposed NavItems (V2 enhanced — 9 items, grid 3×3 mobile, flex-row desktop):**

| # | Link | Label | Icon (Lucide) | Color |
|:-:|------|-------|:---:|:---:|
| 1 | /finance/receipts | Phiếu thu | `receipt-text` | emerald |
| 2 | /finance/expenses | Phiếu chi | `wallet` | red |
| 3 | /finance/cashflow | Sổ cái | `book-open` | blue |
| 4 | /finance/debts | Công nợ KH | `landmark` | orange |
| 5 | /finance/salaries | Bảng lương | `badge-check` | indigo |
| 6 | /finance/categories | Danh mục | `layers` | slate |
| 7 | /finance/investments | Đầu tư | `trending-up` | teal |
| 8 | /finance/goals | Mục tiêu | `flag` | violet |
| 9 | /finance/closes | Chốt sổ | `lock` | amber |

**Files:**
- `[NEW] components/finance/dashboard/finance-quick-nav.tsx`

---

### Step 4: Tạo Smart Dashboard Banner
- [ ] Banner CTA → link đến `/finance/dashboard` (page sẽ tạo ở Phase 2)
- [ ] Gradient background dùng V2 primary color (#8B5E3C)
- [ ] Title: "Dashboard Thông Minh"
- [ ] Subtitle: "Điểm hòa vốn • Dự báo dòng tiền • Sức khỏe tài chính"
- [ ] CTA button: "Xem phân tích →"

**V1 Logic (port):**
```tsx
// V1 page.tsx inline banner — simple link card
<Link href="/finance/dashboard" className="premium-banner">
  <h3>Dashboard Thông Minh</h3>
  <p>Điểm hoà vốn, dự báo dòng tiền và sức khỏe doanh nghiệp</p>
  <span>Xem ngay →</span>
</Link>
```

**V2 tối ưu:**
- Component riêng (reusable, testable)
- CSS gradient dùng design tokens
- Subtle animation (shimmer/pulse on CTA)
- Analytics disabled → banner shows "Đang phát triển" (Phase 2 sẽ enable)

**Files:**
- `[NEW] components/finance/dashboard/smart-dashboard-banner.tsx`

---

### Step 5: Nâng cấp KPIs 4 → 6, thêm clickable
- [ ] Giữ 4 KPI hiện tại + thêm 2: **Chi phí tháng**, **Lợi nhuận ròng**
- [ ] Cards clickable → deep link đến sub-pages
- [ ] Query thêm `totalOutflow` (đã có trong `DashboardMetrics`) + compute `profit`

**V1 Logic (port):**
```
6 StatCards:
1. Doanh thu tháng → /finance/receipts     (totalInflow)
2. Chi phí tháng   → /finance/expenses      (totalOutflow)
3. Lợi nhuận ròng  → (totalInflow - totalOutflow)
4. HĐ mới          → /contracts             (contractsNew)
5. Công nợ          → /finance/debts         (totalDebt)
6. Hoàn thành       → (contractsDone)
```

**V2 tối ưu:**
- Dùng existing `KPICard` component + thêm `href` prop
- Grid: `grid-cols-2 lg:grid-cols-3` (V1 dùng 3 cols, V2 hiện 4 cols → 3 cols tốt hơn vì thêm trend badges)
- Hiển thị trend % cho tất cả KPIs có data

**DashboardMetrics đã có đủ data:** `totalInflow`, `totalOutflow`, `profit`, `monthChangePercent`, `contractsNew`, `contractsDone`, `totalDebt`

**Files:**
- `[MODIFY] components/finance/dashboard/finance-dashboard-client.tsx` — KPI section
- `[MODIFY] components/ui/kpi-card.tsx` — thêm `href` prop (optional)

---

### Step 6: Thêm bottom widgets
- [ ] Tạo `RecentTransactionsWidget` — hiện 5 giao dịch gần nhất
- [ ] Data source: reuse `fetchLedger` (đã có) với sort by date desc, limit 5
- [ ] Grid section: 3 cols → Upcoming | Pending | RecentTransactions

**V1 Logic (port):**
```
FinanceBottomWidgets = grid 3 cols:
  1. RecentTransactionsCard (giao dịch gần đây)
  2. CashflowInfoCard (thông tin dòng tiền)
  3. PeriodComparison (so sánh kỳ trước)
```

**V2 tối ưu (Phase 1 — chỉ thêm RecentTransactions):**
```
Bottom Section = grid 3 cols (lg):
  1. UpcomingContracts (giữ V2)
  2. PendingCollections (giữ V2)
  3. RecentTransactionsWidget (MỚI — port logic V1)
```
→ CashflowInfoCard và PeriodComparison → Phase 2 (cần analytics RPC)

**Files:**
- `[NEW] components/finance/dashboard/recent-transactions.tsx`
- `[MODIFY] components/finance/dashboard/finance-dashboard-client.tsx` — bottom grid 2→3 cols

---

### Step 7: Assemble Dashboard Page
- [ ] Thứ tự sections trên dashboard page:

```
1. Header (title + month/year selectors)    ← giữ V2
2. Smart Dashboard Banner CTA               ← MỚI (Step 4)
3. QuickNav Grid                            ← MỚI (Step 3)
4. KPI Cards (6 metrics, clickable)         ← UPGRADE (Step 5)
5. Charts (Revenue bar + Service donut)     ← giữ V2
6. Bottom Widgets (3 cols)                  ← UPGRADE (Step 6)
7. Profit Report Table                      ← giữ V2
```

**Files:**
- `[MODIFY] components/finance/dashboard/finance-dashboard-client.tsx` — layout restructure
- `[MODIFY] app/(protected)/finance/page.tsx` — add recent transactions query

---

## Test Criteria

- [ ] Navigate `/finance` → QuickNav visible, SubNav KHÔNG hiện
- [ ] Click mỗi QuickNav item → navigate đến đúng sub-page
- [ ] Click Smart Banner → navigate đến `/finance/dashboard` (hoặc 404 nếu chưa tạo page)
- [ ] 6 KPI cards hiển thị đúng data, clickable
- [ ] Mobile (375px): QuickNav grid 3×3, KPIs grid 2 cols
- [ ] Desktop (1440px): QuickNav 1 row, KPIs 3 cols
- [ ] Bottom widgets: 3 columns trên desktop
- [ ] Sub-pages (receipts, expenses...) KHÔNG bị SubNav chiếm space
- [ ] Không có TypeScript errors
- [ ] Build thành công

---
Next Phase: [Phase 02 — Smart Dashboard](./phase-02-smart-dashboard.md)
 
## 2026-04-13 Implementation Update

Completed in code:
- Central `ActionResult<T>` added.
- Finance layout no longer renders the 13-tab SubNav.
- `/finance` hub now has Smart Dashboard banner, 9-item QuickNav, 6 clickable KPI cards, and recent transactions widget.
- `/finance` page fetches the latest ledger entries for the bottom widget.
- Scoped ESLint and `npm run build` passed.
