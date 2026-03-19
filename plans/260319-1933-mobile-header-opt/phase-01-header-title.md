# Phase 01: Header + Title Merge (Mobile Only)
Status: ⬜ Pending
Dependencies: None

## Objective
Mobile: gộp title "Tạo hợp đồng" vào header bar (cùng hàng với ←).
Xóa title area riêng trên mobile → tiết kiệm ~60px chiều cao.
Desktop: giữ nguyên 100%.

## Changes

### File 1: `components/contracts/form/index.tsx`

#### A. breadcrumb — thêm title cho mobile (dòng ~78-101)

**Before:**
```tsx
const breadcrumb = (
  <>
    {/* Desktop: full breadcrumb */}
    <nav className="max-lg:hidden ...">
      ...
    </nav>

    {/* Mobile: icon-only back */}
    <div className="lg:hidden">
      <Link href="/contracts" className="btn-icon shrink-0 -ml-2">
        <ArrowLeft size={20} />
      </Link>
    </div>
  </>
);
```

**After:**
```tsx
const breadcrumb = (
  <>
    {/* Desktop: full breadcrumb — giữ nguyên */}
    <nav className="max-lg:hidden ...">
      ...
    </nav>

    {/* Mobile: ← + title inline */}
    <div className="lg:hidden flex items-center gap-2">
      <Link href="/contracts" className="btn-icon shrink-0 -ml-2">
        <ArrowLeft size={20} />
      </Link>
      <span className="text-body font-semibold text-text-primary truncate">
        {mode === "create" ? "Tạo hợp đồng mới" : "Sửa hợp đồng"}
      </span>
    </div>
  </>
);
```

#### B. headerRight — mobile ẩn badge (dòng ~103-111)

**Before:**
```tsx
const headerRight = badgeCode ? (
  <div className="flex items-center gap-2 ...">
    ...
  </div>
) : undefined;
```

**After:**
```tsx
const headerRight = badgeCode ? (
  <div className="max-lg:hidden flex items-center gap-2 ...">
    ...
  </div>
) : undefined;
```

Thêm `max-lg:hidden` → badge ẩn trên mobile, hiện trên desktop.

#### C. Title area — mobile ẩn (dòng ~148-158)

**Before:**
```tsx
{/* Title */}
<div className="space-y-1">
  <h2 className="text-h2">
    {mode === "create" ? "Tạo hợp đồng" : "Sửa hợp đồng"}
  </h2>
  <p className="text-body-sm text-text-secondary">
    ...
  </p>
</div>
```

**After:**
```tsx
{/* Title — desktop only (mobile shows in header) */}
<div className="max-lg:hidden space-y-1">
  <h2 className="text-h2">
    {mode === "create" ? "Tạo hợp đồng" : "Sửa hợp đồng"}
  </h2>
  <p className="text-body-sm text-text-secondary">
    ...
  </p>
</div>
```

## Impact
- ✅ Desktop: breadcrumb + badge + title area — GIỮ NGUYÊN
- ✅ Mobile: ← "Tạo hợp đồng mới" (compact) — tiết kiệm 60px
- ✅ FullpageFormShell: KHÔNG SỬA (shared component)

## Test Criteria
- [ ] Mobile: header shows ← + "Tạo hợp đồng mới"
- [ ] Mobile: no title area below header
- [ ] Mobile: no badge in header
- [ ] Desktop: breadcrumb + badge + title area all visible

---
Next Phase: phase-02-badge-to-s1.md
