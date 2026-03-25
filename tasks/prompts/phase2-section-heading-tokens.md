/code Phase 2: Tạo Section Heading Token + Apply SSOT tokens

## CONTEXT
Dự án Next.js + Tailwind. Phase 1 đã tạo Breadcrumb FC + CSS tokens. Phase 2 tạo `.section-heading` token mới + apply tất cả SSOT tokens cho Employee module.

## TASK 2.1 — Tạo `.section-heading` CSS token
File `app/styles/typography.css`, thêm sau class `.text-overline` (tìm comment section phù hợp):

```css
/* Section heading — card/form sub-sections */
/* Dùng cho: "Thông tin cá nhân", "Ghi chú", section titles */
.section-heading {
  font-size: var(--font-size-body-sm);
  font-weight: 600;
  line-height: 1.4;
  color: var(--color-text-primary);
}
```

## TASK 2.2 — Apply tokens vào `employee-info-card.tsx`

| Dòng | Hiện tại | Thay bằng |
|------|----------|-----------|
| L21 embedded | `text-xs font-semibold text-text-muted uppercase tracking-wide mb-3` | `text-overline mb-3` |
| L21 normal | `text-sm font-semibold text-text mb-3` | `section-heading mb-3` |
| L27 | `text-xs text-text-muted` | `text-caption` |
| L44 | `bg-bg-card rounded-xl shadow-xs p-4` | `card-base p-4` |

## TASK 2.3 — Apply tokens vào `employee-notes.tsx`

| Dòng | Hiện tại | Thay bằng |
|------|----------|-----------|
| L60 | `bg-bg-card rounded-xl shadow-xs p-4` | `card-base p-4` |
| L64 | `text-sm font-semibold text-text` | `section-heading` |
| L68 | `text-xs text-text-muted` | `text-caption` |

## TASK 2.4 — Apply Breadcrumb + Badge vào `employee-detail-page.tsx`

**Import thêm:**
```tsx
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
```

| Dòng | Hiện tại | Thay bằng |
|------|----------|-----------|
| L83-89 | Inline breadcrumb (nav+Link+›) | `<Breadcrumb items={[{label:"Nhân viên",href:"/employees"},{label:employee.full_name}]} />` |
| L92 | `flex items-start gap-4 py-4 px-5 bg-bg-card rounded-xl shadow-xs` | `card-base flex items-start gap-4 py-4 px-5` |
| L106 | `flex items-center gap-2 mt-1.5 flex-wrap` | `flex items-center gap-1.5 mt-1.5` (bỏ flex-wrap) |
| L108-110 | Inline role badge (`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-${roleBadge.color}/10 text-${roleBadge.color}`) | `<Badge variant={roleBadge.variant}>{roleBadge.label}</Badge>` |
| L112-115 | Inline status badge + dot | `<Badge variant={statusInfo.variant} dot>{statusInfo.label}</Badge>` |
| L159 | `<div className="lg:hidden">` | `<div className="lg:hidden flex flex-col gap-3">` |

**Lưu ý quan trọng cho badges:**
- `roleBadge` và `statusInfo` objects hiện tại dùng `color` property (VD: `"primary"`, `"success"`)
- Badge component dùng `variant` property (VD: `"primary"`, `"success"`)
- Cần map: `roleBadge.color` → Badge `variant`. Nếu values khớp (cùng tên) thì dùng trực tiếp
- Nếu `roleBadge` object chưa có `variant` property → thêm vào hoặc dùng trực tiếp `color` as `variant`

**Xóa import không cần nếu `Link` không còn dùng ở đâu khác trong file.** Kiểm tra trước khi xóa.

## QUY TẮC
- CHỈ sửa 4 files: typography.css + 3 employee components
- KHÔNG sửa file nào NGOÀI danh sách trên
- KHÔNG thay đổi business logic, chỉ swap class names
- Visual PHẢI giữ nguyên (token values = inline values)

## VERIFY
1. `npm run dev` — không lỗi compile
2. Mobile 375px: gap giữa cards OK, badges 1 hàng
3. Desktop: breadcrumb ChevronRight, hover → text-primary
4. Badge có màu đúng theo variant (role + status)
5. Section headings font-size/weight giữ nguyên
