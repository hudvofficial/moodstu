@[/code] Phase 4: Contract Module Breadcrumb Migration

## CONTEXT
Phase 1-3 Employee module done (100% SSOT). Shared `<Breadcrumb>` FC đã tạo ở Phase 1.
Contract module có 2 chỗ dùng inline breadcrumb → migrate sang shared FC.

## TASK 4.1 — `top-action-bar.tsx` (Contract Detail)
File `components/contracts/detail/top-action-bar.tsx`

### Thêm import:
```tsx
import { Breadcrumb } from "@/components/ui/breadcrumb";
```

### Replace L55-65:
```tsx
// TRƯỚC (inline breadcrumb):
{/* Breadcrumb */}
<nav className="flex items-center gap-2 text-body-sm text-text-secondary">
  <Link href="/contracts" className="hover:text-primary transition-colors">
    Hợp đồng
  </Link>
  <ChevronRight size={14} className="text-text-muted" />
  <span className="text-text-primary font-medium">{contractCode}</span>
</nav>

// SAU:
<Breadcrumb items={[
  { label: "Hợp đồng", href: "/contracts" },
  { label: contractCode },
]} />
```

### Cleanup imports:
- Kiểm tra `ChevronRight` còn dùng ở đâu khác trong file
- Nếu KHÔNG → xóa khỏi import `lucide-react`
- Kiểm tra `Link` còn dùng ở đâu khác
- Nếu KHÔNG → xóa khỏi import `next/link`

---

## TASK 4.2 — `form/index.tsx` (Contract Form)
File `components/contracts/form/index.tsx`

### Thêm import:
```tsx
import { Breadcrumb } from "@/components/ui/breadcrumb";
```

### Replace L125-137:
```tsx
// TRƯỚC (inline breadcrumb):
{/* Desktop breadcrumb — inline above form (not in header) */}
<nav className="max-lg:hidden flex items-center gap-2 text-body-sm text-text-secondary mb-4">
  <Link href="/contracts" className="hover:text-primary transition-colors">
    Hợp đồng
  </Link>
  <ChevronRight size={14} className="text-text-muted" />
  <span className="text-text-primary font-medium">
    {mode === "create" ? "Tạo mới" : "Chỉnh sửa"}
  </span>
</nav>

// SAU:
<Breadcrumb
  items={[
    { label: "Hợp đồng", href: "/contracts" },
    { label: mode === "create" ? "Tạo mới" : "Chỉnh sửa" },
  ]}
  className="max-lg:hidden mb-4"
/>
```

### Cleanup imports:
- `ChevronRight` — kiểm tra có dùng ở OTHER places trong file (KHÔNG chỉ breadcrumb)
- Nếu KHÔNG dùng nữa → xóa từ import
- `Link` — CÒN dùng ở L48 (ArrowLeft mobile back link) → GIỮ import

---

## QUY TẮC
- CHỈ sửa 2 files: `top-action-bar.tsx` + `form/index.tsx`
- KHÔNG thay đổi business logic hoặc layout khác
- GIỮ `max-lg:hidden` ở form breadcrumb (chỉ hiện desktop)
- GIỮ `max-lg:hidden` ở top-action-bar breadcrumb (nếu có)
- Breadcrumb FC tự handle CSS tokens → KHÔNG cần thêm class nào

## VERIFY
1. `npm run dev` — no compile errors
2. Desktop: Contract detail page → breadcrumb hiển thị "Hợp đồng > HĐ-XXXX"
3. Desktop: Contract form (tạo mới) → breadcrumb "Hợp đồng > Tạo mới"
4. Desktop: Contract form (sửa) → breadcrumb "Hợp đồng > Chỉnh sửa"
5. Mobile: breadcrumb ẨN ở form (max-lg:hidden), kiểm tra detail page
6. Hover breadcrumb link → text-primary
