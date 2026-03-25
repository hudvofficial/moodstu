/code Phase 1: Tạo Breadcrumb Shared Component + CSS Tokens

## CONTEXT
Dự án Next.js + Tailwind. Design system tokens nằm trong `app/styles/`. Employee module dùng inline breadcrumb, Contracts module cũng dùng inline khác → cần thống nhất bằng 1 shared FC.

## TASK 1.1 — Tạo CSS tokens
File `app/styles/components.css`, thêm section mới (cuối file, trước closing comment nếu có):

```css
/* ══════════════════════════════════════
   BREADCRUMB
   Shared navigation breadcrumb
   ══════════════════════════════════════ */

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--font-size-body-sm);
  color: var(--color-text-secondary);
}

.breadcrumb-link {
  transition: color 150ms ease-out;
}

.breadcrumb-link:hover {
  color: var(--color-primary);
}

.breadcrumb-separator {
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.breadcrumb-current {
  color: var(--color-text-primary);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}
```

## TASK 1.2 — Tạo FC component
File `components/ui/breadcrumb.tsx` [NEW]:

```tsx
"use client";

import { Fragment } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav className={cn("breadcrumb", className)}>
      {items.map((item, i) => (
        <Fragment key={i}>
          {i > 0 && <ChevronRight size={14} className="breadcrumb-separator" />}
          {item.href ? (
            <Link href={item.href} className="breadcrumb-link">{item.label}</Link>
          ) : (
            <span className="breadcrumb-current">{item.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
```

## QUY TẮC
- CHỈ tạo 2 file: CSS tokens + component
- KHÔNG sửa file nào khác trong phase này
- Component là pure Functional Component, không có state
- Dùng đúng CSS custom properties đã có sẵn (`--font-size-body-sm`, `--color-text-secondary`, v.v.)

## VERIFY
1. Import `<Breadcrumb>` vào bất kỳ page → render không lỗi
2. `npm run build` pass
3. Breadcrumb hiển thị: link hover → text-primary, separator = ChevronRight icon, current item truncated
