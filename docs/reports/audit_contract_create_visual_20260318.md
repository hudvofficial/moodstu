# 🏥 Visual Audit Report — /contracts/create (Stitch vs Code)
**Date:** 2026-03-18 15:10
**Stitch Screens:**
- Desktop: `590edbd1f7b0480d8ed68187d47841cd` — "Mood Studio Create Contract Modal"
- Mobile: `dedc3e9d81d9416d95803e6ed4d56974` — "Mood Studio Mobile Create Contract Sheet"

**Stitch HTML:** `docs/stitch/create-contract-desktop.html`

---

## 📊 Summary

| Aspect | Stitch Design | Code hiện tại | Match? |
|--------|--------------|---------------|--------|
| **Layout** | Modal dialog (max-w-1024px, overlay) | Full page (max-w-3xl, no overlay) | 🔴 KHÁC |
| **Sections** | 4 sections (có Section 4: Giao việc) | 6 sections (tách nhỏ hơn, ko có Giao việc) | 🟡 KHÁC CẤU TRÚC |
| **Section Headers** | Gold accent-bar bên trái (border-l-4 accent-gold) | Không có accent bar | 🔴 KHÁC |
| **Input Style** | White bg, border slate-200, h-44px, rounded-6px | SSOT `.input-base` (bg-input, border-main) | 🟡 CẦN VERIFY |
| **Labels** | 13px, font-medium, #8B7355, mb-1.5 | `.label-base` class | 🟡 CẦN VERIFY |
| **Customer Area** | Pink card (cô dâu) + Blue card (chú rể) side-by-side | Khách hàng search + bridge/groom names inline | 🔴 KHÁC |
| **Service Table** | Full table (thead/tbody) với columns | Card-based items list | 🔴 KHÁC |
| **Financial Summary** | Right-aligned, bg-slate-50, max-w | Card-based `.card-base` | 🟡 KHÁC |
| **Payment Section** | Grid 3 cols, deposit/method/stage | Tương tự, cần verify | 🟡 VERIFY |
| **Footer** | Sticky footer: Huỷ + Lưu nháp + Tạo HĐ | FormActions component | 🟡 VERIFY |
| **Section 4: Giao việc** | Task cards with staff assignment | KHÔNG CÓ trong code | 🔴 THIẾU |
| **Typography** | Inter, sizes 13-18px | SSOT tokens | 🟡 VERIFY |
| **Colors** | primary #8b5e3c, accent-gold #C9A96E, label-text #8B7355 | Globals tokens | ✅ MATCH |

---

## 🔴 Critical Visual Differences (Layout/Structure)

### V1: Form Container — Modal vs Full Page
**Stitch:**
```html
<div class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center">
  <div class="bg-white w-full max-w-[1024px] rounded-modal shadow-2xl flex flex-col max-h-[92vh]">
```
- Modal dialog với overlay backdrop
- max-width 1024px
- rounded-14px modal corners
- shadow-2xl
- Scrollable body + sticky header/footer

**Code hiện tại:**
```tsx
<div className="mx-auto max-w-3xl space-y-6 pb-8">
```
- Full page layout (trong main content area)
- max-w-3xl (~768px)
- Không có modal container, overlay, hay sticky footer

**Impact:** Layout hoàn toàn khác. Code render như 1 trang, Stitch design là modal.
**Decision needed:** Giữ full page hay chuyển sang modal?

### V2: Section Headers — Gold Accent Bar
**Stitch:**
```css
.section-header { @apply flex items-center mb-5 border-l-[4px] border-accent-gold pl-4; }
.section-title { @apply text-[15px] font-semibold text-slate-800; }
```
- Có **viền vàng (gold accent)** bên trái mỗi section heading
- Numbered: "1. Hợp đồng & Khách hàng"

**Code hiện tại:**
- Dùng `.text-label` (plain text, no accent bar)
- Section headings nhỏ, không numbered

### V3: Customer Area — Couple Cards
**Stitch:**
```html
<div class="p-5 border border-pink-100 bg-pink-50/30 rounded-xl"> <!-- Cô dâu -->
<div class="p-5 border border-blue-100 bg-blue-50/30 rounded-xl"> <!-- Chú rể -->
```
- 2 cards song song: **Hồng (cô dâu)** + **Xanh (chú rể)**
- Có icon Male/Female
- Fields: Họ tên, SĐT, Chiều cao, Cân nặng, Size giày

**Code hiện tại:**
- Search customer → select
- Bridge/groom names = simple text inputs
- KHÔNG có pink/blue cards
- KHÔNG có body measurements (chiều cao, cân nặng, size giày)

### V4: Services Table
**Stitch:**
```html
<table class="w-full text-left text-[14px]">
  <thead><tr><th>#</th><th>Loại</th><th>Tên</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr>
```
- Proper HTML table với header
- Inline edit
- Delete button per row

**Code hiện tại:**
- Card-based list (`.card-base` per item)
- Modal for add/edit
- Khác visual hoàn toàn

### V5: Section 4 Missing
**Stitch:** Section "4. Giao việc & Tiến độ" — task assignment cards (staff, time, location, deadline)
**Code:** Không tồn tại section này trong form

---

## 🟡 Warnings (Chi tiết cần verify trên browser)

### W1: Input Styling Mismatch
**Stitch:** `h-[44px] px-4 bg-white border-slate-200 rounded-[6px] text-[14px]`
**Code SSOT:** `.input-base` → cần verify nó map đúng chưa

### W2: Financial Summary Layout
**Stitch:** Right-aligned summary box (`flex-col items-end`)
**Code:** Card-based horizontal layout

### W3: Footer Buttons
**Stitch:** 3 buttons: "Huỷ" (ghost) + "Lưu bản nháp" (text) + "Tạo hợp đồng" (primary)
**Code:** 2 buttons: Cancel + Submit (theo FormActions)
**Missing:** "Lưu bản nháp" button

### W4: Discount Toggle (VNĐ/%)
**Stitch:** Toggle buttons cho giảm giá (VNĐ vs %)
**Code:** Need to verify if exists

---

## 🟢 Matching Elements
1. ✅ Colors: primary #8b5e3c, accent-gold #C9A96E ← đúng
2. ✅ Font: Inter family ← đúng
3. ✅ Payment section structure (deposit, method, stage) ← tương đối giống

---

## 🎯 Kết luận

**Mức độ match: ~35-40%** — Có sự khác biệt CẤU TRÚC LỚN giữa Stitch design và code hiện tại.

Đây KHÔNG phải chỉ lỗi "inline vs SSOT class". Đây là **thiết kế khác nhau**:

| # | Stitch | Code | Severity |
|---|--------|------|----------|
| 1 | Modal dialog | Full page | 🔴 Architecture |
| 2 | Gold accent headers | Plain headers | 🟡 Visual |
| 3 | Pink/Blue couple cards | Simple inputs | 🔴 Missing feature |
| 4 | HTML Table for items | Card list | 🟡 Visual |
| 5 | Section 4: Giao việc | NOT EXISTS | 🔴 Missing feature |
| 6 | 3 footer buttons | 2 footer buttons | 🟡 Missing "Lưu nháp" |
| 7 | VNĐ/% discount toggle | Unknown | 🟡 Verify |

**Next:** Cần anh quyết định — redesign toàn bộ theo Stitch hay giữ layout hiện tại + fix visual details?
