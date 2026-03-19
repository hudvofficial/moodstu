# Phase 03: Footer Actions — Mobile CTA

**Status:** ⬜ Pending
**Dependencies:** Phase 01
**Files:** `FormActions.tsx`

## Objective

Cập nhật Footer Actions theo Stitch Mobile Premium:
- Mobile: Nút "Tạo hợp đồng" full-width + row Hủy/Lưu nháp bên dưới
- Desktop: giữ nguyên layout hiện tại (Hủy trái | Lưu nháp + Tạo HĐ phải)

## Current State

```tsx
<div className="flex items-center justify-between pt-2">
  <button>Hủy</button>
  <div className="flex items-center gap-3">
    <button>Lưu bản nháp</button>
    <button>Tạo hợp đồng</button>
  </div>
</div>
```
→ Mobile: 3 nút trên 1 hàng, chật chội.

## Proposed Layout

```tsx
{/* Desktop: giữ nguyên */}
<div className="hidden sm:flex items-center justify-between pt-2">
  <button>Hủy</button>
  <div className="flex items-center gap-3">
    <button>Lưu bản nháp</button>
    <button>Tạo hợp đồng</button>
  </div>
</div>

{/* Mobile: CTA full-width stack */}
<div className="flex flex-col gap-3 sm:hidden pt-2">
  <button className="btn btn-interactive w-full h-12 text-body font-semibold">
    Tạo hợp đồng
  </button>
  <div className="flex items-center justify-center gap-4">
    <button>Hủy</button>
    <span className="text-text-muted">·</span>
    <button>Lưu bản nháp</button>
  </div>
</div>
```

## Key Differences

| Aspect | Desktop | Mobile |
|--------|---------|--------|
| CTA button | Inline right | Full-width h-12 |
| Hủy + Lưu nháp | Left/Right | Centered row below CTA |
| Separator | None | Dot "·" between |

## Test Criteria
- [ ] Mobile: "Tạo hợp đồng" full-width, prominent
- [ ] Mobile: "Hủy · Lưu bản nháp" centered below
- [ ] Desktop: layout không thay đổi
- [ ] Submit/Cancel/Draft vẫn gọi đúng handlers
- [ ] isSubmitting → loading spinner vẫn OK
- [ ] Edit mode: "Cập nhật hợp đồng" thay vì "Tạo hợp đồng"

## Risk: THẤP
- Chỉ thay đổi JSX layout
- Logic handlers giữ nguyên 100%
