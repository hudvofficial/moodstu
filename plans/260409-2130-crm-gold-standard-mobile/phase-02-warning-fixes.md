# Phase 02: Warning Fixes
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Fix 5 warning-level deviations so Gold Standard. Không ảnh hưởng UX trực tiếp nhưng cần đồng bộ architecture + convention.

---

## F4: Customer card `group-hover` broken

**Vấn đề:** `customer-card.tsx` line 51 dùng `group-hover:text-primary` nhưng parent div (class `card-interactive`) KHÔNG có `group` class → hover effect KHÔNG BAO GIỜ trigger.

**Gold Standard:** Lead card dùng `text-text-muted` plain (không group-hover). Printing card không dùng group-hover.

### File to Modify
- `components/crm/customer-card.tsx`

### Implementation
```tsx
// TRƯỚC (BROKEN):
<ChevronRight className="w-5 h-5 text-text-muted group-hover:text-primary transition-colors shrink-0 mt-1" />

// SAU (match lead-card pattern):
<ChevronRight className="w-5 h-5 text-text-muted shrink-0 mt-1" />
```

### Test Criteria
- [ ] Không còn dead CSS class trên ChevronRight
- [ ] Card hover vẫn hoạt động (từ card-interactive CSS)

---

## F5: Drawers outside main-container

**Vấn đề:** CRM đặt Modal/Drawer TRONG `<div className="main-container">`. Printing đặt NGOÀI (dùng fragment wrapper `<>`).

**Gold Standard (Printing):**
```tsx
<>
  <div className="main-container gap-3!">
    {/* content */}
  </div>
  <PrintingDetailDrawer />   {/* Ngoài container */}
</>
```

### Files to Modify
- `components/crm/lead-list-page.tsx`
- `components/crm/customer-list-page.tsx`

### Implementation (cả 2 files)
1. [ ] Wrap return trong `<>...</>`
2. [ ] Move modal/drawer components ra sau `</div>` (main-container), trước `</>`
3. [ ] Không thay đổi props / logic

### Test Criteria
- [ ] Modal/Drawer vẫn mở/đóng bình thường
- [ ] Layout không thay đổi visual

---

## F6: Separator style sync

**Vấn đề:** Lead filters dùng `h-5 w-px bg-text-muted/20 shrink-0 mx-1`, Printing dùng `h-5 border-l border-border shrink-0`.

### File to Modify
- `components/crm/lead-filters.tsx`

### Implementation
```tsx
// TRƯỚC:
<div className="h-5 w-px bg-text-muted/20 shrink-0 mx-1" />

// SAU (match Printing):
<div className="h-5 border-l border-border shrink-0" />
```

### Test Criteria
- [ ] Separator vẫn hiển thị giữa TabsFilter và SelectPill
- [ ] Style consistent với Printing

---

## F7: Dead empty state cleanup

**Vấn đề:** `customer-table.tsx` line 15-24 có empty state check riêng, nhưng parent `customer-list-page.tsx` đã check `customers.length === 0` → show `<EmptyState>` TRƯỚC khi render table. Table KHÔNG BAO GIỜ nhận empty array → dead code.

Thêm: empty state dùng `bg-surface` (sai token, phải `bg-bg-card`).

### File to Modify
- `components/crm/customer-table.tsx`

### Implementation
1. [ ] Xóa block `if (customers.length === 0) { return (...) }` (line 15-24)
2. [ ] Xóa `User` import (chỉ dùng cho empty state đã xóa)

### Test Criteria
- [ ] Build không lỗi
- [ ] Table vẫn render đúng khi có data
- [ ] Empty state vẫn hoạt động (từ parent component)

---

## F8: Add `"use client"` directive

**Vấn đề:** `printing-stats-bar.tsx` có `"use client"`, nhưng `lead-stats-bar.tsx` và `customer-stats-bar.tsx` thiếu. Hoạt động vì parent là client component, nhưng sai convention.

### Files to Modify
- `components/crm/lead-stats-bar.tsx`
- `components/crm/customer-stats-bar.tsx`

### Implementation
Thêm `"use client";` dòng đầu tiên mỗi file.

### Test Criteria
- [ ] Build không lỗi
- [ ] StatsBar render đúng trên cả mobile + desktop

---

## Verification (sau khi xong Phase 02)
```bash
npx tsc --noEmit  # Zero errors
```
- [ ] Browser: Modal/Drawer mở đóng bình thường
- [ ] Filter separator hiển thị đúng
- [ ] Không có dead code / unused imports

---
Previous Phase: phase-01-critical-fixes.md
