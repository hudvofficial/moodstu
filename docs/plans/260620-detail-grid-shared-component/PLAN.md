# PLAN: Option C — Shared `TwoColumnGrid` component cho Detail + Edit

**Date:** 2026-06-20  
**Lead:** Claude (planning + review)  
**Coder:** Codex 5.5  
**Status:** 🔴 TODO

---

## Bối cảnh & Vấn đề

Playwright đo được tại viewport 1100px:
- **Edit form** (dùng `FullpageFormShell`): grid width = **966px**, sidebar = 372px
- **Detail page** (dùng `.detail-grid` CSS class): grid width = **902px**, sidebar = 346px

Nguyên nhân: `contract-detail-client.tsx` dùng **cả 2 class** `main-container detail-shell-page` trên cùng 1 div. `main-container` thêm `padding-left/right: 32px` → grid bị hẹp hơn 64px so với edit form.

### Root cause
```tsx
// contract-detail-client.tsx line 719
<div className="main-container detail-shell-page max-lg:pb-24">
//              ^^^^^^^^^^^^^^
//              Thêm padding 32px mỗi bên → grid hẹp hơn edit 64px
```

### Mục tiêu Option C
- Detail page dùng **cùng component** (`TwoColumnGrid`) với edit form
- Xóa `main-container` khỏi outer wrapper → bỏ side padding dư thừa
- Grid detail = grid edit về behavior, width, ratio

---

## Breakpoint mapping (không đổi)

| Tier | Width | Grid | Ratio |
|------|-------|------|-------|
| Desktop | 1024–1279px (`lg:`) | 10-col | 6/4 |
| Large desktop | ≥1280px (`xl:`) | 12-col | 8/4 |

---

## Tasks

### TASK C1 — Thêm `TwoColumnGrid` export vào `fullpage-form-shell.tsx`

**File:** `components/layout/fullpage-form-shell.tsx`

**Action:** Thêm component mới `TwoColumnGrid` (exported) TRƯỚC `FullpageFormShell`. Sau đó `FullpageFormShell` dùng `TwoColumnGrid` nội bộ thay vì hardcode grid div.

**Interface mới (thêm vào trước FullpageFormShellProps):**
```tsx
interface TwoColumnGridProps {
  /** LEFT column — main content */
  children: React.ReactNode;
  /** RIGHT sticky panel */
  rightPanel: React.ReactNode;
  /** Extra className for the grid root */
  className?: string;
}
```

**Component mới (thêm trước FullpageFormShell):**
```tsx
/**
 * TwoColumnGrid — Shared 2-column responsive grid.
 * Dùng bởi cả FullpageFormShell (EDIT/CREATE) và DesktopLayout (DETAIL).
 * lg: 10-col 6/4  |  xl: 12-col 8/4
 */
export function TwoColumnGrid({ children, rightPanel, className }: TwoColumnGridProps) {
  return (
    <div className={cn("detail-grid xl:grid-cols-12 xl:gap-8 lg:grid-cols-10 lg:gap-6", className)}>
      <div className="detail-main space-y-6 min-w-0 xl:col-span-8 lg:col-span-6">
        {children}
      </div>
      <div className="detail-sidebar detail-sidebar-sticky hidden lg:flex xl:col-span-4 lg:col-span-4">
        {rightPanel}
      </div>
    </div>
  );
}
```

**Cập nhật `FullpageFormShell` (thay block two-column):**

Tìm đoạn hiện tại:
```tsx
{rightPanel ? (
  <div className="detail-grid xl:grid-cols-12 xl:gap-8 lg:grid-cols-10 lg:gap-6">
    <div className="detail-main space-y-6 min-w-0 xl:col-span-8 lg:col-span-6">
      {children}
    </div>
    <div className="detail-sidebar detail-sidebar-sticky hidden lg:flex xl:col-span-4 lg:col-span-4">
      <div className="space-y-4 w-full">
        {rightPanel}
      </div>
    </div>
  </div>
) : (
```

Thay thành:
```tsx
{rightPanel ? (
  <TwoColumnGrid
    rightPanel={
      <div className="space-y-4 w-full">
        {rightPanel}
      </div>
    }
  >
    {children}
  </TwoColumnGrid>
) : (
```

**Verify:** `grep -n "TwoColumnGrid" components/layout/fullpage-form-shell.tsx` → xuất hiện ở cả definition và usage trong FullpageFormShell.

---

### TASK C2 — Dùng `TwoColumnGrid` trong `detail-layout-sections.tsx`

**File:** `components/contracts/detail/detail-layout-sections.tsx`

**Action:** 
1. Thêm import `TwoColumnGrid` ở đầu file
2. Trong `DesktopLayout`, thay block `<div className="detail-grid mt-6">...</div>` bằng `TwoColumnGrid`

**Import thêm (sau các import hiện có):**
```tsx
import { TwoColumnGrid } from "@/components/layout/fullpage-form-shell";
```

**Tìm block cần thay (lines 111–221):**
```tsx
<div className="detail-grid mt-6">
  {/* LEFT COLUMN (67%) — Info + Events + Actions */}
  <div className="detail-main">
    ...tất cả left content...
  </div>

  {/* RIGHT COLUMN (33%) — Finance + Sidebar */}
  <div className="detail-sidebar detail-sidebar-sticky">
    ...tất cả right content...
  </div>
</div>
```

**Thay thành:**
```tsx
<TwoColumnGrid
  className="mt-6"
  rightPanel={
    <>
      <div className="pb-6">
        <div data-section-payment className="flex flex-col gap-6">
          <FinancialDashboard
            totalAmount={contract.total_amount}
            paidAmount={contract.paid_amount}
            remainingAmount={contract.remaining_amount}
            onPaymentClick={onPaymentClick}
            subtotal={contract.total_amount + (contract.discount_amount || 0)}
            discountAmount={contract.discount_amount}
            estimatedProfit={estimatedProfit}
            hrCost={hrCost > 0 ? hrCost : undefined}
            printingCost={printingCost > 0 ? printingCost : undefined}
          />
          <PaymentPlanCard
            paymentPlans={paymentPlans}
            onCollectPlan={(planId) => onCollectPlan?.(planId)}
          />
          <PaymentReceiptsCard payments={payments} />
        </div>
      </div>
      <div id="section-drive">
        <LazyLoad fallback={<SkeletonCard className="h-64" />}>
          <DriveGalleryBlock contractId={contract.id} initialGalleries={initialGalleries} />
        </LazyLoad>
      </div>
      <LazyLoad fallback={<SkeletonCard className="h-64" />}>
        <NotesTimeline contractId={contract.id} />
      </LazyLoad>
    </>
  }
>
  {/* LEFT COLUMN */}
  <div className="card-base p-6">
    <SummaryCard
      contract={contract}
      customer={contract.customers || null}
      embedded
    />
    <div className="h-px bg-border/30 my-4" />
    <CustomerInfoBlock
      customer={contract.customers || null}
      notes={contract.notes}
      embedded
      brideName={contract.customers?.bride_name}
      groomName={contract.customers?.groom_name}
      bridePhone={contract.customers?.bride_phone}
      groomPhone={contract.customers?.groom_phone}
      brideHeight={contract.customers?.bride_height}
      brideWeight={contract.customers?.bride_weight}
      brideShoeSize={contract.customers?.bride_shoe_size}
      groomHeight={contract.customers?.groom_height}
      groomWeight={contract.customers?.groom_weight}
      groomShoeSize={contract.customers?.groom_shoe_size}
    />
  </div>

  <EventTimeline
    events={contract.contract_events || []}
    tasks={contract.work_tasks || []}
    activeEmployees={activeEmployees}
    activeVendors={activeVendors}
    onRefresh={refreshContract}
    onTaskAdded={onTaskAdded}
    onTaskDeleted={onTaskDeleted}
    onTaskStatusChange={onTaskStatusChange}
    onAddEvent={onAddEvent}
    onEventDeleted={onEventDeleted}
  />

  <QuickActionsGrid
    onAction={onQuickAction}
    paymentLabel={contract.remaining_amount > 0 ? "Thu tiền" : "Phát sinh"}
  />

  <ServiceDetailsBlock
    items={contract.contract_items || []}
    totalAmount={contract.total_amount}
    discountAmount={contract.discount_amount}
  />

  <CostumesBlock
    reservations={reservations}
    contractId={contract.id}
    onStatusChange={onMuteRealtime}
    onAdd={() => onQuickAction("costume")}
  />

  <PrintOrdersBlock
    orders={printOrders}
    contractId={contract.id}
    customerName={contract.customers?.full_name}
    contractCode={contract.contract_code}
    remainingAmount={contract.remaining_amount}
    onStatusChange={onMuteRealtime}
    onAdd={() => onQuickAction("print")}
  />
</TwoColumnGrid>
```

**Verify:** `grep -n "detail-grid\|detail-main\|detail-sidebar" components/contracts/detail/detail-layout-sections.tsx` → 0 kết quả (tất cả đã được replaced bằng TwoColumnGrid).

---

### TASK C3 — Sửa outer wrapper trong `contract-detail-client.tsx`

**File:** `components/contracts/detail/contract-detail-client.tsx`  
**Line:** 719

**Action:** Xóa `main-container` khỏi className, giữ nguyên `detail-shell-page`, thêm flex layout thay thế:

**OLD (line 719):**
```tsx
<div className="main-container detail-shell-page max-lg:pb-24">
```

**NEW:**
```tsx
<div className="detail-shell-page flex flex-col gap-4 lg:gap-6 max-lg:pb-24">
```

**Giải thích:**
- Bỏ `main-container` → xóa 32px side padding dư thừa
- Thêm `flex flex-col gap-4 lg:gap-6` → giữ layout spacing giữa TopActionBar / CancelBanner / DesktopLayout / MobileLayout
- Giữ `detail-shell-page` → max-width centering vẫn hoạt động

**Verify:** 
- Không còn `main-container` trong file tại context này
- `grep -n "main-container" components/contracts/detail/contract-detail-client.tsx` → 0 (hoặc chỉ ở comments)

---

## Review Checklist (Claude verify sau khi Codex xong)

- [ ] C1: `TwoColumnGrid` exported từ `fullpage-form-shell.tsx`
- [ ] C1: `FullpageFormShell` dùng `TwoColumnGrid` nội bộ (không duplicate grid code)
- [ ] C2: `detail-layout-sections.tsx` import và dùng `TwoColumnGrid`
- [ ] C2: Không còn raw `detail-grid`, `detail-main`, `detail-sidebar` classNames trong `DesktopLayout`
- [ ] C3: `main-container` đã xóa khỏi `contract-detail-client.tsx` wrapper
- [ ] Playwright verify @1100px: detail grid width = edit grid width (cả 2 = ~966px)
- [ ] Playwright verify @1440px: detail grid width = edit grid width (cả 2 = ~1130px)
- [ ] `pnpm build` pass, 0 error

---

## Ghi chú cho Codex

- Chỉ sửa đúng 3 files được chỉ định
- `TwoColumnGrid` là pure layout component — không có state, không có logic business
- `FullpageFormShell` vẫn giữ nguyên `detail-shell-page flex-1` outer wrapper và `pb-24 lg:pb-6` padding
- Không xóa `.detail-grid`, `.detail-main`, `.detail-sidebar` CSS classes trong `layout.css` — chúng vẫn dùng bởi `TwoColumnGrid`
- Không sửa `MobileLayout` — chỉ `DesktopLayout` cần thay đổi

---

# ROUND 2 — Fix lề 2 bên (max-width cap) + build error

**Date:** 2026-06-20 (sau khi review C1–C3 PASS)
**Status:** 🔴 TODO

## Kết quả review Round 1 (Playwright, đã verify)

C1–C3 **ĐẠT**. Detail giờ khớp pixel với edit ở mọi viewport:

| Viewport | Detail grid | Edit grid | Khớp? |
|---|---|---|---|
| 1100px | 966px (10-col, 6/4) | 966px | ✅ |
| 1440px | 1130px (12-col, 8/4) | 1130px | ✅ |

## Vấn đề còn lại (user feedback: "vẫn rộng 2 bên quá")

Không phải detail≠edit nữa — mà **cả 2 trang đều thừa lề** trên màn lớn.
Đo bằng Playwright **@1920px**:
- `main` = 1664px, nhưng `.detail-shell-page` cap cứng **max-width: 88rem (1408px)**
- → lề trống **125px trái + 131px phải** (~256px bỏ phí)
- Màn càng rộng (2K/4K) lề càng to.

**Quyết định user:** màn đang dùng = **1920 (Full HD)**; muốn **nới cap → 110rem (1760px)**.
Ở 1920: cap 1760 > main content 1616 → content lấp đầy, hết lề trống. 2K/4K vẫn cap nhẹ cho readability.

---

### TASK D1 — Nới ultra-wide cap trong `app/styles/layout.css`
**File:** `app/styles/layout.css`
**Action:** Sửa block ultra-wide (≥1536px) — đổi `88rem (1408px)` → `110rem (1760px)`. Chỉ tier này, KHÔNG đụng tier tablet/desktop/large.

**OLD (lines 139–144):**
```css
/* Ultra-wide (>=1536px): cap 1408px */
@media (min-width: 1536px) {
  .detail-shell-page {
    max-width: 88rem; /* 1408px */
  }
}
```
**NEW:**
```css
/* Ultra-wide (>=1536px): cap 1760px */
@media (min-width: 1536px) {
  .detail-shell-page {
    max-width: 110rem; /* 1760px */
  }
}
```

**Comment-only updates (cho khớp giá trị mới, KHÔNG đổi logic):**
- `layout.css` line 106: `... / 1280 / 1408` → `... / 1280 / 1760`
- `components/layout/fullpage-form-shell.tsx` line 56 (JSDoc table): `max-w-[88rem] (1408)` → `max-w-[110rem] (1760)`
- `components/layout/fullpage-form-shell.tsx` line 78 (inline comment): `ultra-wide (>=1536): max-w-[88rem] (1408)` → `... max-w-[110rem] (1760)`
- `components/contracts/detail/contract-detail-client.tsx` line 717: `ultra-wide >=1536: max-w-[88rem]` → `... max-w-[110rem]`

**Verify:** `grep -rn "88rem\|1408" app/styles/layout.css components/layout/fullpage-form-shell.tsx components/contracts/detail/contract-detail-client.tsx` → 0 kết quả.

---

### TASK D2 — Fix build error `playwright/global-setup.ts:119`
**File:** `playwright/global-setup.ts`
**Lỗi thật (đã chạy `npx tsc --noEmit`):**
```
playwright/global-setup.ts(119,60): error TS2345:
  Argument of type 'T[]' is not assignable to parameter of type
  'RejectExcessProperties<any, T> | RejectExcessProperties<any, T>[]'
```
Nguyên nhân: helper `batchInsert<T extends Record<string, unknown>>` truyền `slice: T[]` vào `.insert()` — supabase-js typed `insert` không nhận generic `T[]`.

**OLD (line 119):**
```ts
    const { data, error } = await admin.from(table).insert(slice).select("id");
```
**NEW (cast để qua type-check, KHÔNG đổi runtime):**
```ts
    const { data, error } = await admin.from(table).insert(slice as never).select("id");
```
> `slice as never` là workaround chuẩn của supabase-js cho dynamic insert; runtime vẫn là array y nguyên.

**Verify:** `npx tsc --noEmit` → **0 error** (cả global-setup lẫn 3 file grid đều sạch).

---

## Review Checklist Round 2 (Claude verify sau Codex)
- [ ] D1: `.detail-shell-page` ultra-wide = `110rem`; các comment 1408/88rem đã update
- [ ] D2: `npx tsc --noEmit` → 0 error
- [ ] Playwright @1920px: lề 2 bên ~0 (content lấp đầy main, chỉ còn padding 24px); detail = edit
- [ ] Playwright @1440px + @1100px: KHÔNG đổi (vẫn 1130 / 966) — regression check
- [ ] `pnpm build` pass
- [ ] Sau khi PASS hết → commit Tasks 1–7 + C1–C3 + D1–D2

## Ghi chú cho Codex
- Chỉ sửa đúng 2 file logic (`layout.css` D1 + `global-setup.ts` D2) + 3 comment-only updates ở D1
- KHÔNG đụng giá trị tier tablet/desktop/large (672/1024/1280) — chỉ ultra-wide
- KHÔNG refactor `batchInsert` — chỉ cast tại call site
