# Audit Report — Finance Investments
**Date:** 2026-04-16 | **Scope:** Full Audit | **Module:** `/finance/investments`

## Summary
- 🔴 Critical Issues: 4
- 🟡 Warnings: 3
- 🟢 Suggestions: 2

---

## 🔴 Critical Issues (Phải sửa ngay)

### C1. Thiếu `main-container` wrapper
- **File:** `investments-client.tsx:68`
- **Hiện tại:** Root element là `<>` (Fragment) — không có container chuẩn
- **Hậu quả:** Padding, margin, spacing không đồng bộ với các module khác (Receipts, Debts, Categories đều dùng `main-container gap-4!`)
- **Fix:** Đổi `<>` thành `<div className="main-container gap-4!">`

### C2. Thiếu Breadcrumb
- **File:** `investments-client.tsx`
- **Hiện tại:** Không có `<Breadcrumb>` component
- **SSOT Blueprint:** Mọi module phải có breadcrumb `Tài chính > [Module Name]`
- **Fix:** Thêm `<Breadcrumb items={[{ label: "Tài chính", href: "/finance" }, { label: "Tài sản đầu tư" }]} />`

### C3. Không có Mobile Card Layout
- **File:** `investments-client.tsx:96-149`
- **Hiện tại:** Chỉ có 1 layout Table cho cả Desktop & Mobile → mobile bị tràn ngang
- **SSOT Blueprint:** Bắt buộc tách `Desktop Table` (hidden trên mobile) và `Mobile Card List` (hidden trên desktop)
- **Bằng chứng:** Screenshot mobile cho thấy bảng bị cắt cột "Giá trị còn lại", "Bảo trì", "Thao tác"
- **Fix:** Tạo component `InvestmentMobileList` riêng, hiển thị dạng card

### C4. Thiếu FAB (Floating Action Button) cho Mobile
- **File:** `investments-client.tsx:79-82`
- **Hiện tại:** Nút "Thêm tài sản" là `btn-cta` full-width, hiển thị cả Desktop lẫn Mobile
- **SSOT Blueprint:** Mobile phải dùng `<FAB>` tròn cố định góc dưới phải; Desktop dùng Button inline trong header card
- **Fix:** Ẩn Button trên mobile (`hidden lg:flex`), thêm `<FAB onClick={handleOpenCreate} label="Thêm tài sản" />`

---

## 🟡 Warnings (Nên sửa)

### W1. Badge dùng inline class thay vì `<Badge>` component
- **File:** `investments-client.tsx:124-126`
- **Hiện tại:** `<span className="badge badge-warning">` — viết tay
- **SSOT:** Phải dùng `<Badge variant="warning">Đến hạn</Badge>` từ `@/components/ui/badge`
- **Fix:** Import `Badge` và thay thế inline span

### W2. Header + CTA Button layout sai pattern
- **File:** `investments-client.tsx:69-83`
- **Hiện tại:** Header (icon + title) và CTA nằm ngoài `card-base`, không có wrapper
- **SSOT Pattern (Debts/Receipts):** Header + Stats + CTA nằm trong `<section className="card-base">` chung
- **Fix:** Gộp header info + CTA vào 1 section `card-base` giống module Debts

### W3. Stats Cards không dùng StatsBar component
- **File:** `investments-client.tsx:85-94`
- **Hiện tại:** Tự render 2 div `stats-card` riêng lẻ
- **SSOT:** Nên dùng `<StatsBar items={[...]} />` hoặc ít nhất gộp vào cùng `card-base` với header
- **Fix:** Chuyển sang dùng shared `StatsBar` component

---

## 🟢 Suggestions (Tùy chọn)

### S1. Thiếu Empty State UX
- **File:** `investments-client.tsx:140-146`
- **Hiện tại:** Khi không có data chỉ hiện text "Chưa có tài sản đầu tư." trong table row
- **Đề xuất:** Dùng `<EmptyState>` component với icon, mô tả, và nút CTA

### S2. Không có Pagination
- **Hiện tại:** Fetch toàn bộ list không có giới hạn
- **Khi nào cần:** Nếu danh sách tài sản > 50 items sẽ ảnh hưởng performance
- **Đề xuất:** Thêm pagination hoặc virtual scroll khi cần

---

## Implementation Plan (Đề xuất fix)

### Phase 1: Layout & Structure
1. Wrap toàn bộ trong `main-container gap-4!`
2. Thêm `<Breadcrumb>`
3. Gộp Header info + Stats vào `card-base` chung
4. Di chuyển CTA Button vào header card, ẩn trên mobile

### Phase 2: Mobile Responsive
5. Tạo `InvestmentMobileList` component (card layout)
6. Tách hiển thị: Desktop = Table, Mobile = Card List
7. Thêm `<FAB>` cho mobile

### Phase 3: SSOT Token Compliance
8. Thay inline badge → `<Badge>` component
9. Cải thiện Empty State

---

## Checklist tham chiếu
| Item | Status |
|------|--------|
| `main-container` wrapper | ❌ |
| Breadcrumb | ❌ |
| `card-base` header | ❌ |
| StatsBar component | ❌ |
| Desktop Table (lg:block) | ✅ |
| Mobile Card List (lg:hidden) | ❌ |
| FAB mobile | ❌ |
| Badge SSOT | ❌ |
| Empty State | ❌ |
| Form Modal (UnifiedModal) | ✅ |
| SWR + cache | ✅ |
| Server Actions hardened | ✅ |
| Zod validation | ✅ |
| Audit log | ✅ |
| Period lock | ✅ |
