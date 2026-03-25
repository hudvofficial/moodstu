@[/code] Phase 5 Bước 2 — Extract VARIANT_COLORS → shared (P1)

## MỤC TIÊU
Gom `VARIANT_COLORS` + `VARIANT_DOT` (copy-paste y hệt ở 2 files) vào `lib/variant-colors.ts` (SSOT).

## ĐỌC TRƯỚC (BẮT BUỘC)
- tasks/pre-code-checklist.md
- tasks/lessons.md
- tasks/gates/before-edit.md

## GATE: VISUAL VERIFY (BẮT BUỘC)
1. Mở browser `/employees` → screenshot badges (Đang làm, Media) trước khi sửa
2. Viết plan ngắn → trình anh duyệt trước khi code

---

## BƯỚC 2a: Tạo `lib/variant-colors.ts`

```ts
// ═══════════════════════════════════════════
// Variant Colors — SSOT for badge/status styling
// Used by: employee-table, employee-card, + future modules
// ═══════════════════════════════════════════

/** Background + text classes for semantic badge variants */
export const VARIANT_COLORS: Record<string, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  error:   "bg-error/10 text-error",
  info:    "bg-info/10 text-info",
  neutral: "bg-surface text-text-muted",
  primary: "bg-primary/10 text-primary",
};

/** Dot color classes for status indicators */
export const VARIANT_DOT: Record<string, string> = {
  success: "bg-success",
  warning: "bg-warning",
  error:   "bg-error",
  info:    "bg-info",
  neutral: "bg-text-muted",
  primary: "bg-primary",
};
```

## BƯỚC 2b: Update `employee-table.tsx`

Grep xác nhận vị trí:
```
grep -n "VARIANT_COLORS" components/employees/employee-table.tsx
```

SỬA:
1. Thêm import ở đầu file: `import { VARIANT_COLORS, VARIANT_DOT } from "@/lib/variant-colors";`
2. XÓA block local `const VARIANT_COLORS` (khoảng line 16-23)
3. XÓA block local `const VARIANT_DOT` (khoảng line 24-31)

## BƯỚC 2c: Update `employee-card.tsx`

Grep xác nhận vị trí:
```
grep -n "VARIANT_COLORS" components/employees/employee-card.tsx
```

SỬA:
1. Thêm import ở đầu file: `import { VARIANT_COLORS, VARIANT_DOT } from "@/lib/variant-colors";`
2. XÓA block local `const VARIANT_COLORS` (khoảng line 16-23)
3. XÓA block local `const VARIANT_DOT` (khoảng line 24-31)

---

## VERIFY

```bash
# 1. VARIANT_COLORS chỉ defined 1 chỗ
grep -rn "const VARIANT_COLORS" lib/ components/ --include="*.ts" --include="*.tsx"
# Kết quả: chỉ lib/variant-colors.ts

# 2. Imports đúng
grep -rn "variant-colors" components/ --include="*.tsx"
# Kết quả: employee-table.tsx + employee-card.tsx

# 3. Dev server 0 errors
npm run dev

# 4. Browser: /employees → badges "Đang làm" (xanh) + "Media" vẫn đúng màu
```
