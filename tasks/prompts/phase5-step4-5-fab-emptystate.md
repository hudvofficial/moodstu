@[/code] Phase 5 Bước 4+5 — Extract FAB + EmptyState → shared (P2)

## MỤC TIÊU
1. Tạo `components/ui/fab.tsx` (shared mobile floating action button)
2. Employees dùng `EmptyState` từ `ux-states.tsx` (đã có sẵn!) thay vì inline
3. Contracts dùng `EmptyState` từ `ux-states.tsx` thay vì local function

## ĐỌC TRƯỚC (BẮT BUỘC)
- tasks/pre-code-checklist.md
- tasks/lessons.md
- tasks/gates/before-edit.md

## GATE: VISUAL VERIFY (BẮT BUỘC)
1. Mở browser `/employees` mobile (375px) → screenshot FAB button
2. Mở browser `/contracts` mobile (375px) → screenshot FAB button
3. So sánh → ghi ra giống/khác
4. Viết plan ngắn → trình anh duyệt trước khi code

---

## BƯỚC 4a: Tạo `components/ui/fab.tsx`

HIỆN TẠI: 2 inline copies y hệt:
- `employee-list-page.tsx` (line 62-70)
- `contracts-list-client.tsx` (line 165-170)

Cả 2 đều:
```html
<div className="lg:hidden fixed bottom-24 right-4 z-40">
  <button onClick={...} className="flex items-center justify-center size-12 rounded-full bg-primary text-text-inverse shadow-lg hover:opacity-90 active:scale-95 transition-all">
    <Plus className="w-5 h-5" />
  </button>
</div>
```

TẠO file mới:

```tsx
import { Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FABProps {
  icon?: LucideIcon;
  onClick: () => void;
  label?: string;
  className?: string;
}

export function FAB({ icon: Icon = Plus, onClick, label = "Tạo mới", className }: FABProps) {
  return (
    <div className="lg:hidden fixed bottom-24 right-4 z-40">
      <button
        onClick={onClick}
        aria-label={label}
        className={cn(
          "flex items-center justify-center size-12 rounded-full bg-primary text-text-inverse shadow-lg hover:opacity-90 active:scale-95 transition-all",
          className
        )}
      >
        <Icon className="w-5 h-5" />
      </button>
    </div>
  );
}
```

## BƯỚC 4b: Update `employee-list-page.tsx`

XÓA inline FAB (line 62-70):
```tsx
{/* ── Mobile FAB ── */}
<div className="lg:hidden fixed bottom-24 right-4 z-40">
  <button onClick={() => setShowForm(true)} className="...">
    <Plus className="w-5 h-5" />
  </button>
</div>
```

THAY BẰNG:
```tsx
import { FAB } from "@/components/ui/fab";

<FAB onClick={() => setShowForm(true)} label="Thêm nhân viên" />
```

## BƯỚC 4c: Update `contracts-list-client.tsx`

XÓA inline FAB (line 165-170):
```tsx
{/* ── Mobile FAB ── */}
<div className="lg:hidden fixed bottom-24 right-4 z-40">
  <button onClick={...} className="...">
    <Plus className="w-5 h-5" />
  </button>
</div>
```

THAY BẰNG:
```tsx
import { FAB } from "@/components/ui/fab";

<FAB onClick={() => router.push('/contracts/create')} label="Tạo hợp đồng" />
```

⚠️ Kiểm tra xem `Plus` import có còn dùng ở chỗ khác trong file đó không. Nếu không dùng nữa → xóa import.

---

## BƯỚC 5a: Employees dùng `EmptyState` shared

HIỆN TẠI: `employee-list-page.tsx` (line 76-96) — inline JSX empty state
ĐÃ CÓ SẴN: `components/ui/ux-states.tsx` export `EmptyState` component

⚠️ CHÚ Ý: Employees có 2 trạng thái empty (hasFilters vs not). Shared `EmptyState` hỗ trợ `actionLabel` + `onAction`. Nhưng employees cần 2 buttons khác nhau → dùng 2 `<EmptyState>` riêng.

SỬA `employee-list-page.tsx`:
```tsx
import { EmptyState } from "@/components/ui/ux-states";

{employees.length === 0 ? (
  hasFilters ? (
    <EmptyState
      icon={FilterX}
      title="Không tìm thấy"
      description="Không tìm thấy nhân viên phù hợp bộ lọc"
      actionLabel="Xóa bộ lọc"
      onAction={clearFilters}
    />
  ) : (
    <EmptyState
      icon={Users}
      title="Chưa có nhân viên"
      description="Chưa có nhân viên nào trong hệ thống"
      actionLabel="Thêm nhân viên đầu tiên"
      onAction={() => setShowForm(true)}
    />
  )
) : ( ... )}
```

## BƯỚC 5b: Contracts dùng `EmptyState` shared

HIỆN TẠI: `contracts-table.tsx` (line 249-261) — local `function EmptyState()`
ĐÃ CÓ SẴN: `components/ui/ux-states.tsx`

SỬA `contracts-table.tsx`:
1. Thêm import: `import { EmptyState } from "@/components/ui/ux-states";`
2. XÓA local `function EmptyState()` (line 249-261)
3. Update call site (line ~266):
```tsx
if (props.contracts.length === 0) return (
  <EmptyState
    icon={FileText}
    title="Chưa có hợp đồng"
    description="Chưa ghi nhận hợp đồng nào phù hợp với bộ lọc hiện tại."
  />
);
```

---

## VERIFY

```bash
# 1. FAB chỉ defined 1 chỗ
grep -rn "fixed bottom-24 right-4 z-40" components/ --include="*.tsx"
# Kết quả: chỉ components/ui/fab.tsx

# 2. Không còn local EmptyState
grep -rn "function EmptyState" components/ --include="*.tsx"
# Kết quả: chỉ components/ui/ux-states.tsx (NHƯNG contracts-table có thể vẫn có nếu ContractItemsSection có local EmptyState riêng — đó là OK vì nó khác context)

# 3. Dev server 0 errors
npm run dev

# 4. Browser mobile 375px:
# /contracts → FAB button góc phải dưới ✅
# /employees → FAB button góc phải dưới ✅
# /employees (0 results) → EmptyState "Chưa có nhân viên" ✅
# /contracts (filter "Đã hủy") → EmptyState "Chưa có hợp đồng" ✅
```
