# Full Audit Report — Productivity Module

**Date:** 2026-04-04 | **Scope:** 13 component files + 2 type files + SSOT constants  
**Focus:** Raw data display, token compliance, code duplication, UX correctness

---

## Summary

- 🔴 Critical: 4
- 🟡 Warning: 4
- 🟢 Info: 2

---

## 🔴 Critical Issues

### C1. Raw `service_type` hiển thị trực tiếp

**Files:** `detail-content.tsx:169`, `self-view.tsx` (qua detail-content)

```tsx
// ❌ Hiện tại
<p className="text-body-sm text-text-secondary">
  {group.client_name} · {group.service_type || "Chưa phân loại"}
</p>
// → Hiển thị: "Nguyễn Thị Mỹ Hào · ngay_cuoi"

// ✅ Cần
import { getServiceLabel } from "@/types/contract-constants";
// ...
{group.client_name} · {getServiceLabel(group.service_type as ServiceType) || "Chưa phân loại"}
// → Hiển thị: "Nguyễn Thị Mỹ Hào · Ngày Cưới"
```

---

### C2. Raw `work_type` hiển thị trực tiếp trong task items

**Files:** `detail-content.tsx:196`, `detail-helpers.tsx:66`

```tsx
// ❌ Hiện tại (detail-content.tsx:196)
<p className="font-medium text-text-main">{task.work_type}</p>;
// → Hiển thị: "chup_anh", "dung_phim"

// ✅ Cần
import { getWorkTypeLabel } from "@/types/contract-constants";
// ...
<p className="font-medium text-text-main">
  {getWorkTypeLabel(task.work_type as WorkType)}
</p>;
// → Hiển thị: "Chụp ảnh", "Dựng phim"
```

```tsx
// ❌ detail-helpers.tsx:66 (overdue section)
<p className="text-body-sm text-text-secondary">{task.work_type}</p>
// → Hiển thị raw: "chup_anh"
```

---

### C3. Duplicate `TASK_STATUS_LABELS` — sai value so với SSOT

**File:** `components/productivity/utils.ts:11-16`

```tsx
// ❌ utils.ts — LOCAL copy (non-SSOT)
const TASK_STATUS_LABELS: Record<string, string> = {
  chua_lam: "Chưa làm", // ← khác SSOT
  dang_lam: "Đang làm",
  hoan_thanh: "Hoàn thành", // ← khác SSOT
  da_huy: "Đã hủy", // ← khác SSOT
};

// ✅ SSOT tại contract-constants.ts:99-107
TASK_STATUS_MAP = {
  chua_lam: { label: "Chờ", variant: "muted" }, // "Chờ" vs "Chưa làm"
  dang_lam: { label: "Đang làm", variant: "warning" },
  hoan_thanh: { label: "Xong", variant: "success" }, // "Xong" vs "Hoàn thành"
  da_huy: { label: "Hủy", variant: "error" }, // "Hủy" vs "Đã hủy"
};
```

> **Quyết định cần user:** Productivity context dùng label dài ("Chưa làm", "Hoàn thành") có ý đồ UX hay là bug duplicate? Nếu cần giữ label dài, nên tạo PRODUCTIVITY_TASK_STATUS_LABELS trong `productivity-constants.ts` thay vì local const.

---

### C4. Duplicate `TASK_STATUS_VARIANTS` — sai variant so với SSOT

**File:** `components/productivity/utils.ts:18-23`

```tsx
// ❌ utils.ts — LOCAL
const TASK_STATUS_VARIANTS = {
  chua_lam: "neutral", // SSOT = "muted"
  dang_lam: "info", // SSOT = "warning"
};
```

> Variant không khớp SSOT → badge màu khác giữa contract module vs productivity module.

---

## 🟡 Warnings

### W1. `text-dark` còn sót ở team-table + mobile-cards + self-view

| File               | Line | Code                                           |
| ------------------ | ---- | ---------------------------------------------- |
| `team-table.tsx`   | 145  | `className="truncate font-semibold text-dark"` |
| `mobile-cards.tsx` | 40   | `className="truncate font-semibold text-dark"` |
| `self-view.tsx`    | 32   | `className="font-semibold text-dark"`          |

> Đã fix trong drawer, nhưng **3 file khác** vẫn dùng `text-dark` thay vì `text-text-main`.

---

### W2. `text-sm` còn sót ở team-table + self-view

| File             | Line | Code                                               |
| ---------------- | ---- | -------------------------------------------------- |
| `team-table.tsx` | 141  | `text-sm font-bold text-text-secondary` (avatar)   |
| `team-table.tsx` | 157  | `text-sm font-medium text-text-secondary` (on-set) |
| `self-view.tsx`  | 36   | `text-sm text-text-secondary`                      |

> Nên là `text-body-sm` theo SSOT.

---

### W3. `text-xs` dùng thay vì `text-caption` hoặc `text-tiny`

| File               | Line | Nên dùng                          |
| ------------------ | ---- | --------------------------------- |
| `team-table.tsx`   | 148  | `text-xs` → `text-caption` (12px) |
| `team-table.tsx`   | 185  | `text-xs` → `text-tiny` (10px)    |
| `mobile-cards.tsx` | 43   | `text-xs` → `text-caption`        |

---

### W4. `formatEventDate` hiển thị "Chưa có lịch" cho null — đúng nhưng overdue section vẫn show raw date

`utils.ts:48-50` format date chuẩn, không phải lỗi. Nhưng **overdue badge** ở `detail-helpers.tsx:70` hiển thị `Hạn 31/03/2026` — date format đúng rồi.

---

## 🟢 Info (Đề xuất cải thiện)

### I1. Types dùng `string` thay vì strict enum

```tsx
// productivity.ts
export interface EmployeeJobTask {
  work_type: string; // Nên là WorkType
  status: string; // Nên là TaskStatus
}
```

> Không ảnh hưởng runtime, nhưng TypeScript không bắt lỗi nếu DB trả value sai.

### I2. `formatRole()` wrapper không cần thiết

```tsx
// utils.ts:36-38
export function formatRole(role: EmployeeRole): string {
  return getRoleLabel(role);
}
```

> Chỉ wrap hàm SSOT, không thêm logic → có thể import trực tiếp `getRoleLabel`.

---

## Fix Priority Matrix

| #   | Issue                          | Files                                      | Type       | Priority  |
| --- | ------------------------------ | ------------------------------------------ | ---------- | --------- |
| C1  | Raw service_type               | `detail-content.tsx`                       | Display    | 🔴 Urgent |
| C2  | Raw work_type                  | `detail-content.tsx`, `detail-helpers.tsx` | Display    | 🔴 Urgent |
| C3  | Duplicate TASK_STATUS_LABELS   | `utils.ts`                                 | SSOT       | 🔴 High   |
| C4  | Duplicate TASK_STATUS_VARIANTS | `utils.ts`                                 | SSOT       | 🔴 High   |
| W1  | text-dark residual             | 3 files                                    | Token      | 🟡 Medium |
| W2  | text-sm residual               | 2 files                                    | Token      | 🟡 Medium |
| W3  | text-xs → caption/tiny         | 3 files                                    | Token      | 🟡 Low    |
| I1  | Loose types                    | `productivity.ts`                          | TypeSafety | 🟢 Low    |
| I2  | Wrapper fn                     | `utils.ts`                                 | Cleanup    | 🟢 Low    |
