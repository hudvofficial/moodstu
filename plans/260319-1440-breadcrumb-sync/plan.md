# Plan: Đồng bộ Breadcrumb Navigation V2
Created: 2026-03-19T14:40
Status: 🟡 In Progress

## Objective
V2 = hệ thống đồng bộ tuyệt đối.
Toàn bộ các trang form/create/edit phải dùng cùng 1 breadcrumb pattern
như trang detail — không có pattern khác lẫn lộn.

## SSOT Pattern (Source of Truth)

Lấy từ `top-action-bar.tsx` (detail page) — đã đúng chuẩn:

| Device  | Pattern | Ví dụ |
|---------|---------|-------|
| Desktop | `Link › ChevronRight › span` | `Hợp đồng › Tạo mới` |
| Mobile  | icon-only `ArrowLeft` trong fixed header | `[←]` |

## Files cần sửa

| File | Vấn đề | Fix |
|------|--------|-----|
| `components/contracts/form/index.tsx` | `<button>← Quay lại danh sách</button>` | breadcrumb `Hợp đồng › Tạo mới / Sửa hợp đồng` |
| `components/contracts/form/index.tsx` | Mobile không có back button | Thêm mobile fixed header với `[←]` |

## KHÔNG cần sửa

- `fullpage-form-shell.tsx` → prop `breadcrumb` đủ flexible ✅
- `top-action-bar.tsx` → detail đã đúng chuẩn ✅

## Phases

| Phase | Task | Status |
|-------|------|--------|
| P01 | Sửa breadcrumb desktop create/edit → dùng Link + ChevronRight | ✅ Done |
| P02 | Thêm mobile back header cho create/edit (giống detail) | ✅ Done |
| P03 | Verify visual trên browser (desktop + mobile) | ⬜ Pending |

## Implementation Detail

### Desktop Breadcrumb (P01)
```tsx
// BEFORE (contracts/form/index.tsx line 78-86)
<button onClick={handleCancel} className="...← Quay lại...">

// AFTER — clone pattern từ top-action-bar.tsx line 121-130
<nav className="flex items-center gap-2 text-body-sm text-text-secondary">
  <Link href="/contracts" className="hover:text-primary hover:underline transition-colors">
    Hợp đồng
  </Link>
  <ChevronRight size={14} className="text-text-muted" />
  <span className="text-text-primary font-medium">
    {mode === "create" ? "Tạo mới" : "Chỉnh sửa"}
  </span>
</nav>
```

### Mobile Back Header (P02)
```tsx
// Thêm mobile fixed header giống top-action-bar.tsx line 62-116
// Chỉ cần: ArrowLeft back + title (không cần tabs vì form không có tabs)
<div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white shadow-xs">
  <div className="flex items-center px-4 h-(--header-mobile-h)">
    <Link href="/contracts" className="btn-icon shrink-0">
      <ArrowLeft size={20} />
    </Link>
    <span className="flex-1 text-center text-[15px] font-semibold">
      {mode === "create" ? "Tạo hợp đồng" : "Sửa hợp đồng"}
    </span>
  </div>
</div>
```

## Quick Commands
- Code P01: `/code p1`
- Code P02: `/code p2`
