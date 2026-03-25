@[/code] Phase 5 Bước 1 — Consolidate Utilities (P1)

## MỤC TIÊU
Gom `getInitials()`, `formatPhone()` vào `lib/utils.ts` (SSOT). Xóa 3 bản `formatDate()` local. Xóa file `lib/employee-utils.ts`.

## ĐỌC TRƯỚC (BẮT BUỘC)
- tasks/pre-code-checklist.md
- tasks/lessons.md
- tasks/gates/before-edit.md

## GATE: VISUAL VERIFY (BẮT BUỘC)
1. Mở browser `/contracts` → screenshot trước khi sửa
2. Mở browser `/employees` → screenshot trước khi sửa
3. Viết plan ngắn → trình anh duyệt trước khi code

---

## 1a. Thêm `getInitials()` + `formatPhone()` vào `lib/utils.ts`

Mở `lib/utils.ts`, thêm ở cuối file:

```ts
/** Get 2-char initials from full name */
export function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).slice(-2).join("").toUpperCase();
}

/** Format Vietnamese phone: 0901234001 → 0901 234 001 */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10)
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  return phone;
}
```

## 1b. XÓA file `lib/employee-utils.ts`

File này giờ trống (cả 2 functions đã move). XÓA hoàn toàn.

## 1c. Update tất cả imports

Grep tìm tất cả references cũ:
```
grep -r "employee-utils" components/ --include="*.tsx" -l
grep -r "employee-utils" lib/ --include="*.ts" -l
```

Các file cần đổi import (ít nhất 3):
- `components/employees/employee-table.tsx` → `import { formatPhone, getInitials } from "@/lib/utils"`
- `components/employees/employee-card.tsx` → `import { formatPhone, getInitials } from "@/lib/utils"`
- `components/employees/employee-detail-page.tsx` → `import { formatPhone, getInitials } from "@/lib/utils"`

## 1d. Xóa `getInitials()` local ở 2 files khác

Grep tìm:
```
grep -rn "function getInitials" components/ --include="*.tsx"
```

Sửa:
- `components/contracts/contracts-table.tsx` (line ~34) → XÓA local `function getInitials(...)`, thêm `import { getInitials } from "@/lib/utils"` ở đầu file
- `components/ui/avatar.tsx` (line ~25) → XÓA local `function getInitials(...)`, thêm `import { getInitials } from "@/lib/utils"`

## 1e. Xóa 3 `formatDate()` local copies

Grep tìm:
```
grep -rn "function formatDate" components/ --include="*.tsx"
```

Sửa 3 files:
- `components/employees/employee-detail-page.tsx` (line ~22) → XÓA local function, thêm `import { formatDate } from "@/lib/utils"`
- `components/dashboard/upcoming-events.tsx` (line ~26) → XÓA local function, thêm `import { formatDate } from "@/lib/utils"`
- `components/contracts/print/contract-template.tsx` (line ~20) → XÓA local function, thêm `import { formatDate } from "@/lib/utils"`

⚠️ CHÚ Ý: SSOT `formatDate(date: string | Date, style?)` nhận `string | Date`. Local copies nhận `string | null` → cần handle `null` tại call site (VD: check `if (date)` trước khi gọi, hoặc dùng `?? ""`).

---

## VERIFY

```bash
# 1. Không còn employee-utils
ls lib/employee-utils.ts  # phải lỗi "not found"

# 2. getInitials chỉ có 1 bản
grep -rn "function getInitials" lib/ components/ --include="*.ts" --include="*.tsx"
# Kết quả: chỉ lib/utils.ts

# 3. formatPhone chỉ có 1 bản
grep -rn "function formatPhone" lib/ components/ --include="*.ts" --include="*.tsx"
# Kết quả: chỉ lib/utils.ts

# 4. Không còn local formatDate
grep -rn "function formatDate" components/ --include="*.tsx"
# Kết quả: 0

# 5. Dev server 0 errors
npm run dev

# 6. Browser: /contracts + /employees giữ nguyên visual
```
