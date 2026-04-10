# Plan: Dashboard SSOT Remediation

Created: 2026-04-11T00:14
Updated: 2026-04-11T00:23
Status: ⬜ Pending

## Overview

Audit Dashboard phát hiện 1 bug critical + 3 warnings. 
Sửa toàn bộ trong 1 phase duy nhất (3 files, scope nhỏ).

## Audit Reference
📋 Xem: `dashboard_audit_report.md`

## Phases

| Phase | Name | Status | Files |
|-------|------|--------|-------|
| 01 | Fix Critical + Warnings | ⬜ Pending | 3 files |
| 02 | Visual Verify | ⬜ Pending | — |

---

## Phase 01: Fix Critical + Warnings

### 1.1. 🔴 [C1] Fix revenue chart bars — `revenue-chart.tsx`

**Change A — dòng 34:** Bỏ `items-end`
```diff
-<div className="flex items-end gap-3 h-45">
+<div className="flex gap-3 h-45">
```

**Change B — dòng 44-53:** Bọc bar trong wrapper + đơn giản hóa bar structure
```diff
+<div className="flex-1 w-full flex items-end">
   <div
-    className="w-full rounded-t-lg bg-primary/15 group-hover:bg-primary/30 transition-colors relative"
+    className="w-full rounded-t-lg bg-primary/20 group-hover:bg-primary/30 transition-colors"
     style={{ height: `${height}%` }}
-  >
-    <div
-      className="absolute bottom-0 w-full rounded-t-lg bg-primary/80 transition-all"
-      style={{ height: `${Math.min(height, 100)}%` }}
-    />
-  </div>
+  />
+</div>
```

_Lý do: Bỏ inner bar thừa (2 div lồng nhau vô nghĩa). Giữ 1 div duy nhất, tăng opacity nhẹ (15→20) để bar nhìn rõ hơn._

**Change C — dòng 14-16:** Xóa `formatCurrency` nội bộ, import từ shared utils
```diff
-function formatCurrency(value: number) {
-  return new Intl.NumberFormat("vi-VN").format(value);
-}
+import { formatCurrency } from "@/lib/utils";
```

_Lưu ý: Kiểm tra format output có match — `lib/utils.ts` có thể format khác (thêm "₫")._

### 1.2. 🟡 [W1] Fix arbitrary value — `service-pie-chart.tsx`

**Change D — dòng 45:** Đổi `inset-[30px]` thành token chuẩn
```diff
-<div className="absolute inset-[30px] rounded-full bg-bg-card ...">
+<div className="absolute inset-7.5 rounded-full bg-bg-card ...">
```

_`inset-7.5` = 30px trong Tailwind v4 (7.5 * 4 = 30)._

### 1.3. 🟡 [W2] Fix duplicate formatCurrency — `payment-reminders.tsx`

**Change E — dòng 17-19:** Xóa local, import shared
```diff
-function formatCurrency(value: number) {
-  return new Intl.NumberFormat("vi-VN").format(value) + " ₫";
-}
+import { formatCurrency } from "@/lib/utils";
```

_Lưu ý: File này append "₫" thủ công. Cần verify `lib/utils.ts` đã có "₫" chưa — nếu chưa, giữ append tại nơi gọi._

### SSOT Compliance Checklist
- [x] Zero arbitrary CSS values (`[XXpx]`)
- [x] Zero duplicated utility functions
- [x] All inline styles are dynamic (data-driven) — hợp lệ
- [x] No new inline styles added

---

## Phase 02: Visual Verify

- [ ] Mở `localhost:3000/dashboard` → revenue bars hiển thị đúng
- [ ] Hover bar → tooltip giá trị đúng format
- [ ] Pie chart donut → inner circle vẫn render đúng size
- [ ] Payment reminders → số tiền format đúng
- [ ] Mobile 375px → responsive OK
- [ ] So sánh visual với production

---

## Files Modified (Total: 3)

| File | Changes | Issues Fixed |
|------|---------|-------------|
| `revenue-chart.tsx` | A, B, C | C1, W2, W3 |
| `service-pie-chart.tsx` | D | W1 |
| `payment-reminders.tsx` | E | W2 |

## Not Touching (Suggestions — defer)
- S1, S2: `"use client"` — giữ nguyên (sẽ cần khi kết nối real data)
- S3: `getDaysUntil()` hydration — chưa ảnh hưởng với MOCK_DATA
