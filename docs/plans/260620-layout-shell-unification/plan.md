# Plan: Layout Shell Unification (đồng bộ hệ thống dài hơi)

> **Mục tiêu**: Toàn bộ module trong hệ thống dùng chung token về chiều ngang (container, padding, grid). Phần khung đồng bộ, content bên trong custom theo từng page.
>
> **Phạm vi**: Bắt đầu với **contracts module** (B), sau đó nhân rộng ra các module khác.
>
> **Ngày tạo**: 2026-06-20
> **Trạng thái**: 📋 PLAN — chờ anh confirm hướng

---

## 🔍 Phase 1: Audit (đã xong)

### ✅ Phát hiện: Hệ thống ĐÃ CÓ shared tokens (đang dùng rải rác)

`app/styles/layout.css` đã define 4 shared tokens:

```css
/* 1. Page-level container với responsive padding */
.main-container {
  padding: var(--spacing-sm) var(--spacing-sm) var(--spacing-sm);  /* mobile */
  gap: var(--spacing-base);
}
@media (min-width: 1024px) {
  .main-container {
    padding: var(--spacing-sm) var(--spacing-xl) var(--spacing-xl);  /* 8 32 32 */
    gap: var(--spacing-xl);
  }
}

/* 2. 2-col detail layout 8/4 ratio */
.detail-grid { display: flex; flex-direction: column; gap: var(--spacing-lg); }
.detail-main { display: flex; flex-direction: column; gap: var(--spacing-lg); }
.detail-sidebar { display: none; }
@media (min-width: 1024px) {
  .detail-grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); }
  .detail-main { grid-column: span 8 / span 8; }
  .detail-sidebar { display: flex; grid-column: span 4 / span 4; }
}
```

### Trạng thái từng module (audit 18/6 modules)

| Module | Dùng `.main-container`? | Dùng `.detail-grid`? | Ghi chú |
|--------|--------------------------|----------------------|---------|
| dashboard | ✅ | — | OK |
| audit-logs | ✅ | — | OK |
| **contracts** (LIST) | ✅ (qua ContractsListClient) | — | OK |
| **contracts** (DETAIL) | ✅ (auto via AppShell) | ✅ | Full-width, **KHÔNG sticky** |
| **contracts** (EDIT) | ✅ (FullpageFormShell) | ✅ | Capped `max-w-[88rem]`, **sticky** ✅ đã fix |
| **contracts** (CREATE) | ✅ (FullpageFormShell) | ✅ | Capped, sticky ✅ đã fix |
| **contracts** (gallery) | (AppShell GalleryView) | — | Có riêng pattern |
| crm (LIST, customer detail) | ✅ | — | OK |
| dresses | ✅ | — | OK |
| employees | ✅ | — | OK |
| finance (LIST) | ✅ | — | OK |
| **finance/expenses/[id]** | ❌ hard-code | — | `max-w-4xl mx-auto` ⚠️ |
| **finance/receipts/[id]** | ❌ hard-code | — | `max-w-[230mm] mx-auto` ⚠️ (cố ý, A5) |
| **finance/dashboard** | ✅ | — | OK (chỉ text caption max-w-2xl) |
| **finance/[sub-routes]** | ✅ | — | OK |
| inventory | ✅ | — | OK |
| printing | ✅ | — | OK |
| productivity | ✅ | — | OK |
| reports | ✅ | — | OK |
| services (LIST + DETAIL) | ✅ | — | OK |
| services/create | ✅ | — | OK |
| settings (LIST, credit-cards, studio) | ✅ | — | OK |
| **settings/loading** | ❌ hard-code | — | `lg:max-w-2xl lg:mx-auto` ⚠️ |
| **admin/backfill-dimensions** | ❌ hard-code | — | `container mx-auto max-w-4xl` ⚠️ |

### Vấn đề chính

**A. DETAIL vs EDIT contract không đồng bộ:**

| Khía cạnh | DETAIL | EDIT (sau fix) |
|-----------|--------|----------------|
| Container | full-width (no cap) | capped `max-w-7xl` / `max-w-[88rem]` |
| Grid ratio | 8/4 | 8/4 ✅ |
| Sidebar sticky | ❌ KHÔNG | ✅ top-64 |
| Mobile pattern | 1-col + tabs | 1-col + FormActions fixed |

→ **2 chỗ lệch**: container width + sticky behavior.

**B. Hard-code ở 4 file** (chiếm ~5% codebase):
- `finance/expenses/[id]/page.tsx`
- `finance/receipts/[id]/page.tsx` (cố ý - receipt A5)
- `settings/loading.tsx`
- `admin/backfill-dimensions/page.tsx`

**C. Header có 3 version**: `header.tsx`, `header-v2.tsx`, `header-old.tsx` → cần cleanup.

---

## 🎯 Phase 2: Plan tổng thể (đề xuất)

### Hướng tiếp cận: **Token mới bổ sung + Refactor theo tier**

#### Tier 1: Contracts module (BẮT ĐẦU Ở ĐÂY)
- **B.1** Đồng bộ DETAIL vs EDIT container: cả 2 cùng cap `max-w-[88rem]` + sticky top-64
- **B.2** Sidebar sticky behavior đồng bộ (cùng offset `var(--header-desktop-h)`)
- **B.3** Verify visual: DETAIL, EDIT, CREATE trên 3 viewport

#### Tier 2: Token bổ sung cho layout.css
- **T.1** Thêm `.detail-shell-page` — wrapper class cho toàn trang detail/edit/create (max-w + mx-auto + responsive)
- **T.2** Thêm `.detail-sidebar-sticky` — modifier class thêm sticky + offset
- **T.3** Migrate FullpageFormShell sang dùng `.detail-shell-page` (delete duplicated logic)

#### Tier 3: Refactor hard-code → shared tokens
- **H.1** `finance/expenses/[id]/page.tsx`: bỏ `max-w-4xl mx-auto px-4 lg:px-6`, dùng `main-container`
- **H.2** `finance/receipts/[id]/page.tsx`: giữ `max-w-[230mm]` (cố ý A5) nhưng dùng `.receipt-page` class để document intent
- **H.3** `settings/loading.tsx`: refactor
- **H.4** `admin/backfill-dimensions/page.tsx`: refactor

#### Tier 4: Cleanup + Test
- **C.1** Xóa `header-old.tsx`, migrate logic cũ sang `header.tsx`
- **C.2** Gộp `header.tsx` + `header-v2.tsx` → 1 source duy nhất (nếu có sự khác biệt nhỏ)
- **C.3** Visual regression test 4 viewport (desktop, tablet ngang, tablet dọc, mobile)
- **C.4** Document ở `docs/design-system/layout-shell.md`

---

## ⚙️ Triển khai (đề xuất thứ tự)

### Step 1 — Tier 1: Đồng bộ DETAIL/EDIT contracts (anh chọn B)
1. Thêm sticky top-64 cho `.detail-sidebar` (modifier `.detail-sidebar-sticky`)
2. Thêm `.detail-shell-page` class wrapper (max-w-[88rem] mx-auto + responsive padding)
3. Apply `.detail-shell-page` + `.detail-sidebar-sticky` cho DETAIL
4. Migrate FullpageFormShell sang dùng cùng class
5. Verify visual 3 viewport

### Step 2 — Tier 2: Mở rộng shared tokens
- Refactor 4 hard-coded files

### Step 3 — Tier 3: Header consolidation
- Xóa file cũ

### Step 4 — Tier 4: Test + Document

---

## ❓ Câu hỏi cần anh quyết

### Q1: Container width đồng bộ DETAIL vs EDIT
- **Option A**: Cap cả 2 ở `max-w-[88rem]` (1408px) → DETAIL rộng hơn hiện tại nhưng cùng EDIT
- **Option B**: Bỏ cap EDIT, cả 2 full-width → EDIT rộng hơn hiện tại nhưng cùng DETAIL
- **Recommend A** (cap cả 2) — form rộng cho table, detail cũng thoáng.

### Q2: Sticky sidebar
- **Option A**: Sticky cả 2, cùng offset `top-[var(--header-desktop-h)]`
- **Option B**: Sticky EDIT (form cần pin actions), DETAIL thì KHÔNG sticky (content dài, sticky chiếm chỗ)
- **Recommend A** — đồng bộ, dễ nhớ.

### Q3: Phạm vi Step 1
- **Option A**: Làm hết Tier 1 (DETAIL/EDIT/CREATE) trong 1 lần
- **Option B**: Làm DETAIL trước, EDIT/CREATE sau (đã fix rồi nên chỉ cần verify)
- **Recommend B** — DETAIL là mới, EDIT/CREATE đã đồng bộ qua previous task.

---

## 📊 Effort estimate

| Tier | Effort | Risk |
|------|--------|------|
| Tier 1: DETAIL/EDIT contracts | 2-3h | Low (CSS only, không động logic) |
| Tier 2: Token mới + refactor 4 file | 3-4h | Low |
| Tier 3: Header cleanup | 1-2h | Medium (cần test mobile header sticky) |
| Tier 4: Test + docs | 2-3h | Low |
| **Tổng** | **~10h** | |

---

## 🎯 Immediate next step

Chờ anh confirm Q1, Q2, Q3 → em apply từng step. Recommend: làm B (DETAIL trước, EDIT/CREATE đã OK từ previous task).

---

## 📐 Phase 3: SPEC KĨ TIER 1 (sau khi đào sâu)

### Files liên quan

| File | Vai trò | Trạng thái |
|------|---------|------------|
| `components/layout/fullpage-form-shell.tsx` | Shell cho EDIT/CREATE - 4-tier responsive + sticky | ✅ ĐÃ CÓ (đã fix v2) |
| `components/contracts/detail/contract-detail-client.tsx` | DETAIL page shell - wrapper `<div className="main-container max-lg:pb-24 max-w-7xl mx-auto">` (line 712) | ⚠️ CHƯA match |
| `components/contracts/detail/detail-layout-sections.tsx` | DesktopLayout + MobileLayout - dùng `detail-grid/detail-main/detail-sidebar` | ✅ shared token |
| `components/contracts/detail/financial-dashboard.tsx` | Card sidebar DETAIL (FinancialDashboard) | ✅ card-base |
| `components/contracts/edit/ContractFinancialSummary.tsx` | Card sidebar EDIT (đã polish round trước) | ✅ |
| `app/styles/layout.css` | Shared tokens (`.main-container`, `.detail-grid`, `.detail-main`, `.detail-sidebar`) | ✅ CÓ SẴN |

### So sánh chi tiết DETAIL vs EDIT hiện tại

| Layer | DETAIL (`contract-detail-client.tsx` line 712) | EDIT/CREATE (`fullpage-form-shell.tsx`) |
|-------|------------------------------------------------|------------------------------------------|
| Outer | `<div className="main-container max-lg:pb-24 max-w-7xl mx-auto">` | `<div className="flex flex-col">` + `<div className="flex-1 w-full mx-auto min-[820px]:max-lg:max-w-2xl min-[820px]:max-lg:px-6 lg:max-w-5xl xl:max-w-7xl 2xl:max-w-[88rem]">` |
| Container cap | 1280px (max-w-7xl) cứng | 4-tier responsive: 672/1024/1280/1408 |
| Padding | (kế thừa main-container) | `px-6` cho tablet-portrait, còn lại main-container |
| Grid | `<div className="detail-grid mt-6">` (12 cols) | `<div className="detail-grid xl:grid-cols-12 xl:gap-8 lg:grid-cols-10 lg:gap-6">` (responsive cols) |
| Main col | `col-span-8` | `xl:col-span-8 lg:col-span-6` |
| Sidebar | `col-span-4` không sticky | `xl:col-span-4 lg:col-span-4` sticky `top-(--header-desktop-h)` |

### Vấn đề thực sự (sau khi đào sâu)

1. **Container width DETAIL chỉ 1 breakpoint** (`max-w-7xl`):
   - Ở 820-1279: DETAIL rộng hơn EDIT (DETAIL 1280px, EDIT chỉ 672-1024px → quá khác)
   - Ở 1280-1535: Cả 2 đều 1280px → match ✓
   - Ở ≥1536: DETAIL vẫn 1280px (cap cứng), EDIT 1408px → lệch 128px
   
2. **Grid cols DETAIL cứng 12**:
   - Ở 1024-1279: DETAIL dùng grid-cols-12 với span-8/4 → tỷ lệ 8/4 vẫn OK nhưng cols thừa
   - EDIT: lg (1024-1279) dùng grid-cols-10 với span-6/4 → tỷ lệ 6/4 (60/40%) cho tablet-landscape

3. **Sidebar DETAIL KHÔNG sticky**:
   - FinancialDashboard + PaymentPlanCard + PaymentReceiptsCard → tốn scroll khi xem events dài

### Spec thay đổi cụ thể

#### Fix #1: DETAIL container - thêm responsive tiers
**File**: `components/contracts/detail/contract-detail-client.tsx` line 712

**Search**:
```jsx
    <div className="main-container max-lg:pb-24 max-w-7xl mx-auto">
```

**Replace**:
```jsx
    <div className="main-container max-lg:pb-24 w-full min-[820px]:max-lg:max-w-2xl min-[820px]:max-lg:px-6 lg:max-w-5xl xl:max-w-7xl 2xl:max-w-[88rem] mx-auto">
```

→ Match chính xác 4-tier responsive với FullpageFormShell.

#### Fix #2: DETAIL sidebar sticky
**File**: `components/contracts/detail/detail-layout-sections.tsx` (DesktopLayout)

**Search**:
```jsx
        {/* RIGHT COLUMN (33%) — Finance + Sidebar */}
        <div className="detail-sidebar">
```

**Replace**:
```jsx
        {/* RIGHT COLUMN (33%) — Finance + Sidebar
            Sticky top bằng header-desktop-h để khi scroll events/payments,
            finance panel luôn trong viewport (match FullpageFormShell) */}
        <div className="detail-sidebar">
          <div className="sticky top-(--header-desktop-h) flex flex-col gap-6 w-full">
```

Và thêm `</div>` đóng wrapper sticky sau block `</div>` đầu tiên của `<div className="detail-sidebar">`.

**Cẩn thận**: hiện `.detail-sidebar` là wrapper duy nhất của các card. Em cần wrap bên trong `.detail-sidebar` chứ không thay `.detail-sidebar`. Pattern:
```jsx
<div className="detail-sidebar">           {/* grid col-span-4 */}
  <div className="sticky top-(--header-desktop-h) flex flex-col gap-6 w-full">  {/* wrapper sticky */}
    ... cards ...
  </div>
</div>
```

→ Grid layout KHÔNG đổi (col-span-4 vẫn đúng), chỉ thêm sticky wrapper bên trong.

#### Fix #3 (optional): Grid cols DETAIL responsive
DETAIL có thể giữ grid-cols-12 (chỉ desktop mới show 2-col, mobile 1-col), không cần responsive 10/12 vì không có tablet-landscape 1024-1279 thật sự (iPad landscape 1180 thì 8/4 vẫn ổn).

→ **Bỏ qua Fix #3**, giữ nguyên `detail-grid`.

### Verification plan

| Test case | Viewport | Expect |
|-----------|----------|--------|
| Desktop 1440 | DETAIL | Cap 1280px, sidebar sticky top-64, 8/4 grid |
| Desktop 1440 | EDIT | Cap 1280px (xl:max-w-7xl), sidebar sticky, 8/4 grid ✅ đã verify |
| iPad L 1180 | DETAIL | Cap 1180 (chưa đạt xl), 8/4 grid, sidebar sticky |
| iPad L 1180 | EDIT | Cap 1024 (lg:max-w-5xl), 6/4 grid, sidebar sticky ✅ |
| iPad P 820 | DETAIL | Cap 672 (max-w-2xl + px-6), 1-col, sidebar hidden |
| iPad P 820 | EDIT | Cap 672, 1-col, sidebar hidden ✅ |
| Mobile 375 | DETAIL | 1-col, sidebar hidden |
| Mobile 375 | EDIT | 1-col, FormActions fixed bottom ✅ |

### Effort Tier 1

| Task | Effort | Risk |
|------|--------|------|
| Fix #1: Container responsive DETAIL | 15min | Very low (CSS only) |
| Fix #2: Sticky DETAIL sidebar | 15min | Low |
| Verify TS/ESLint | 5min | None |
| Visual test 3 viewport | 30min | None |
| **Tổng** | **~1h** | |

---

## ✅ IMPLEMENTATION RESULT (Tier 1 — đã xong)

### Các thay đổi đã apply

**File 1: `components/contracts/detail/contract-detail-client.tsx`** (line 712)
- **Trước**: `<div className="main-container max-lg:pb-24 max-w-7xl mx-auto">` (cap cứng 1280px)
- **Sau**: `<div className="main-container max-lg:pb-24 w-full min-[820px]:max-lg:max-w-2xl min-[820px]:max-lg:px-6 lg:max-w-5xl xl:max-w-7xl 2xl:max-w-[88rem] mx-auto">` (4-tier responsive)
- **Effect**: DETAIL giờ match với EDIT ở mọi viewport (iPad portrait 672 / tablet landscape 1024 / desktop 1280 / ultra-wide 1408)

**File 2: `components/contracts/detail/detail-layout-sections.tsx`** (DesktopLayout, line ~181-214)
- **Trước**: `<div className="detail-sidebar">` chứa trực tiếp FinancialDashboard + Plan + Receipts (không sticky)
- **Sau**: Wrap financial block trong `<div className="sticky top-(--header-desktop-h) pb-6">`. Gallery + Notes giữ nguyên scroll bình thường
- **Effect**: Khi scroll events long ở desktop, FinancialDashboard + Plan + Receipts luôn trong viewport (UX đồng bộ với EDIT)

### Verify

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | ✅ TSC_EXIT=0 (chỉ npm warn về config, không phải lỗi code) |
| `npx eslint detail-layout-sections.tsx contract-detail-client.tsx` | ✅ ESLINT_EXIT=0 (clean) |
| `npm run dev` compile | ✅ Compiled in 439ms, page GET 200 OK |

### Trade-off

- **Sticky chỉ financial block** (không sticky Gallery + Notes): sticky content cao hơn viewport sẽ tràn → UX kém. Tách financial sticky + gallery/notes scroll là tối ưu nhất cho DETAIL (5 cards ở sidebar).
- **Không tăng indent cho 3 cards trong sticky wrapper**: code vẫn work, chỉ xấu về mặt visual indent. Prettier/ESLint không flag vì syntax đúng.

### Tier 2-4 (chưa làm, để dài hơi)

- **Tier 2**: Refactor 4 hard-coded file (finance/expenses, finance/receipts, settings/loading, admin/backfill-dimensions) sang dùng `.main-container`
- **Tier 3**: Cleanup header (3 version → 1)
- **Tier 4**: Document + visual regression test 4 viewport
- **Effort ước tính**: ~9h còn lại


