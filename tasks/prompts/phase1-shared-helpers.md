/code Phase 1 — Extract shared helpers (DRY)

## MỤC TIÊU
Extract `formatPhone` + `getInitials` ra shared file, xóa duplicate trong 3 files.

## ĐỌC TRƯỚC
- tasks/pre-code-checklist.md
- tasks/lessons.md
- tasks/gates/before-edit.md

## BƯỚC 1: Tạo file mới `lib/employee-utils.ts`

```ts
/**
 * Employee shared helpers
 * Extracted from: employee-table, employee-card, employee-detail-page
 */

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10)
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  return phone;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(-2)
    .join("")
    .toUpperCase();
}
```

## BƯỚC 2: Update `components/employees/employee-table.tsx`

- Xóa local `function formatPhone` (line ~23-27)
- Xóa local `function getInitials` (line ~19-21)
- Thêm import: `import { formatPhone, getInitials } from "@/lib/employee-utils";`
- Giữ nguyên phần còn lại

## BƯỚC 3: Update `components/employees/employee-card.tsx`

- Xóa local `function formatPhone` (line ~23-27)
- Xóa local `function getInitials` (line ~19-21)
- Thêm import: `import { formatPhone, getInitials } from "@/lib/employee-utils";`
- Giữ nguyên phần còn lại

## BƯỚC 4: Update `components/employees/employee-detail-page.tsx`

- Xóa local `function formatPhone` (line ~32-35)
- Thêm import: `import { formatPhone } from "@/lib/employee-utils";`
- Giữ nguyên phần còn lại
- LƯU Ý: file này có thể dùng `getInitials` ở chỗ khác, check trước khi import

## VERIFY

1. Grep `function formatPhone` trong `components/employees/` → phải = 0 kết quả
2. Grep `function getInitials` trong `components/employees/` → phải = 0 kết quả
3. `npx next build` hoặc `npm run dev` → 0 errors
4. Mở browser /employees → table + cards hiện đúng tên + SĐT format
5. Mở /employees/[id] → SĐT format đúng "0901 234 xxx"

## KHÔNG ĐƯỢC LÀM
- Không sửa logic hay style gì khác
- Không refactor thêm bất kỳ file nào ngoài 4 files trên
- Không thêm utility functions mới
