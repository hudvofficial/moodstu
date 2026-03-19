# Plan V2: Contract Create — 100% Stitch Alignment

Created: 2026-03-19 09:58
Status: 🟡 Chờ duyệt
Source: [Full Gap Analysis](file:///C:/Users/Admin/.gemini/antigravity/brain/d090de3e-95ef-4d96-b857-c0cc8ab7b026/contract_create_full_gap.md)
Stitch HTML: `tmp/stitch_desktop.html` (302 lines)

## Quy tắc

- ✅ **100% shared classes** — không inline styles
- ✅ **UI-only** — 0% logic changes
- ✅ **Kill chỉ port 3000** — KHÔNG kill toàn bộ node.exe
- ✅ **Verify visual** sau mỗi phase

---

## Phases

| Phase | Tên | Files | Gaps Fix |
|-------|-----|-------|----------|
| 01 | Sticky Header Bar | `index.tsx` | #1 #2 |
| 02 | Section Structure | All 6 section files | #3 #4 #5 |
| 03 | Section-Specific | `CustomerSection`, `FinancialSummary`, `ItemsSection` | #6 #7 #8 |
| 04 | Sticky Footer | `FormActions.tsx`, `index.tsx` | #9 |

---

## Phase 01: Sticky Header Bar

**File:** `index.tsx`
**Gaps:** #1 (sticky header), #2 (badge màu cam)

### Thay đổi:
1. Tách breadcrumb + badge ra khỏi form body
2. Tạo sticky header bar: `sticky top-0 z-40 bg-bg-card/80 backdrop-blur-md border-b border-border-light`
3. Badge đổi: `bg-bg-secondary` → `bg-interactive/10 text-interactive border border-interactive/20 rounded-radius-md`
4. Title + subtitle vẫn nằm trong main content (không sticky)
5. Main container thêm padding-top nếu cần

### Không đụng:
- Sections 1-6, FormActions, Modals
- Tất cả logic (form hooks, loadContractForEdit, etc.)

---

## Phase 02: Section Structure Pattern

**Files:** `ContractInfoSection.tsx`, `ContractCustomerSection.tsx`, `ContractItemsSection.tsx`, `ContractFinancialSummary.tsx`, `ContractPaymentSection.tsx`, `index.tsx` (S6 Notes)

**Gaps:** #3 (H3 trong card), #4 (section-header-gold chỉ S1), #5 (padding/gap)

### Pattern chung cho ALL sections:

**Stitch pattern:**
```
<section class="card-base p-6 space-y-4">
  <h3>Title</h3>
  ...content...
</section>
```

### Thay đổi cho từng file:

**S1 — ContractInfoSection.tsx:**
- Gộp `section-header-gold` + `card-base` thành 1 card
- H3 vào TRONG card, giữ `border-l-4 border-gold` trên card
- `p-4` → `p-6`, `gap-3` → `gap-4`

**S2 — ContractCustomerSection.tsx:**
- Bỏ `section-header-gold` → h3 plain (KHÔNG có vạch vàng)
- Search area vẫn ngoài card (S2 không wrap trong card theo Stitch)

**S3 — ContractItemsSection.tsx:**
- Wrap toàn bộ (h3 + table + subtotal) vào 1 card
- Bỏ `section-header-gold` → h3 plain trong card
- `space-y-4` → `space-y-6`, card `p-6`

**S4 — ContractFinancialSummary.tsx:**
- Bỏ `section-header-gold` → h3 plain trong card
- `p-5` → `p-6`
- H3 vào trong card (đã trong card nhưng header tách)

**S5 — ContractPaymentSection.tsx:**
- Bỏ `section-header-gold` → h3 + status badge cùng row TRONG card
- `p-4` → `p-6`, `gap-3` → `gap-6`

**S6 — index.tsx Notes:**
- Bỏ `section-header-gold` → wrap h3 + textarea trong 1 card
- `rows={3}` → `rows={4}`

### Không đụng:
- Logic form fields, validators, hooks
- Component structure (Props, functions)

---

## Phase 03: Section-Specific Fixes

**Gaps:** #6 (S2 layout), #7 (S4 financial), #8 (couple cards)

### S2 Customer — `ContractCustomerSection.tsx`

**Search layout:**
- Hiện tại: h3 riêng, search bar full-width dưới
- Stitch: h3 + search + "Tạo mới" CÙNG 1 HÀNG
- Fix: `flex items-center justify-between` → h3 trái, search + button phải

**Couple cards:**
- Hiện tại: `accent-card accent-card-rose` (full border)
- Stitch: `card-base border-l-4 border-accent-rose p-6 space-y-4` (left-only border + shadow)
- Fix: Đổi class couple cards

### S4 Financial — `ContractFinancialSummary.tsx`

**Financial rows:**
- Hiện tại: full-width tất cả rows
- Stitch: `max-w-sm ml-auto` — financial rows canh PHẢI, compact
- Fix: Wrap financial rows trong div `max-w-sm ml-auto`

**Total text:**
- Hiện tại: `text-body font-bold text-interactive`
- Stitch: `text-h3 font-black text-interactive` (2xl, rất đậm)
- Fix: Tăng font size total

**Label "Tổng thanh toán":**
- Hiện tại: normal case
- Stitch: `uppercase tracking-wide`

### S3 Items — `ContractItemsSection.tsx`

**Count badge:**
- Hiện tại: `(2)` inline text
- Stitch: `rounded-full bg-bg-secondary px-2 py-0.5` pill badge riêng

**"Phụ thu" button:**
- Hiện tại: có icon Plus
- Stitch: không có icon, chỉ text

**Subtotal:**
- Hiện tại: `justify-between` (tên trái, số phải)
- Stitch: `justify-end` (chỉ số bên phải, text "Tổng cộng:" inline)

### Không đụng:
- Logic CRUD items, customer search, financial calculations
- Modal triggers, confirm dialogs

---

## Phase 04: Sticky Footer

**Files:** `FormActions.tsx`, `index.tsx`
**Gap:** #9

### FormActions.tsx — Desktop:
- `hidden sm:flex` → `fixed bottom-0 left-0 right-0 z-40 bg-bg-card border-t border-border-light py-4 px-6 hidden sm:block`
- Inner: `max-w-4xl mx-auto flex items-center justify-between`
- "Lưu bản nháp": thêm `border border-interactive/20` (outlined)
- "Tạo hợp đồng": thêm `shadow-lg`

### index.tsx:
- `pb-8` → `pb-24` (space cho sticky footer)

### Mobile footer:
- Giữ mobile layout hiện tại (sm:hidden) — CTA full width
- Mobile footer CŨNG fixed bottom-0

### Không đụng:
- Submit/cancel/draft logic
- isSubmitting, isEditMode conditions

---

## Tóm tắt Progress

| Phase | Status | Gaps |
|-------|--------|------|
| 01 Sticky Header | ⬜ | #1 #2 |
| 02 Section Structure | ⬜ | #3 #4 #5 |
| 03 Section-Specific | ⬜ | #6 #7 #8 |
| 04 Sticky Footer | ⬜ | #9 |

**Tổng:** 4 phases | ~6 files | 9 gaps
**Ước tính:** ~30 phút code
