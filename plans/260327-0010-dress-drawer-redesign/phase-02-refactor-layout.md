# Phase 02: Refactor InfoSection Layout + Action Buttons
Status: ✅ Complete
Dependencies: Phase 01 (V-GATE done)

## Objective
Refactor InfoSection layout (stack → flex row) + Action buttons (stack → 1 hàng ngang). Map SSOT tokens theo Stitch HTML + user feedback.

## Files to Modify
- `components/dresses/dress-drawer-content.tsx` — InfoSection (line 36-100)

## Implementation Steps

### 1. [ ] Thêm helper `MetaItem` component
- Hiển thị label:value theo cột dọc (Stitch pattern)
- Dùng `.text-caption .text-text-muted` cho label, `.text-body-sm .font-medium` cho value
- ~10 lines, pure presentational

### 2. [ ] Refactor InfoSection layout → flex row
- Wrap image + info trong `<div className="flex gap-4">`
- Image: `w-1/3 shrink-0 aspect-3/4 rounded-xl overflow-hidden shadow-xs`
- Info: `flex-1 min-w-0 flex flex-col justify-between`
- Reduce `sizes="200px"` → `sizes="120px"` (performance)

### 3. [ ] Badges row (Mã + Tình trạng)
- `<span className="tag-badge">{dress.item_code}</span>` (SSOT)
- `<Badge variant="neutral">{conditionLabel}</Badge>` (shared component)
- Stitch: `flex items-center gap-2 mb-3`

### 4. [ ] Detail grid → `grid grid-cols-2 gap-y-2.5 gap-x-2`
- MetaItem × 3: Danh mục, Size, Màu
- Stitch confirmed: grid-cols-2 cho metadata

### 5. [ ] Price section — separated, prominent
- Shadow separator thay `border-t` (Lesson #64)
- Giá thuê: `text-lg font-bold text-primary tracking-tight` (Stitch: nổi bật)
- Giá bán: `text-body-sm font-semibold`
- Layout: `flex items-baseline justify-between`

### 6. [ ] Notes card → bg tonal
- Stitch: `bg-surface-container-low p-4 rounded-xl`
- Map: `bg-bg-hover p-4 rounded-xl`

### 7. [ ] Action buttons → 1 hàng ngang (user feedback)
- Stitch: `flex flex-col gap-3` (dọc) → Override: `flex gap-3` (ngang)
- "Đặt thuê" (primary, `flex-1`) + "Đặt cho hợp đồng" (ghost, `flex-1`)
- Giữ nguyên `.btn .btn-primary` / `.btn .btn-ghost` classes
- Áp dụng cho TẤT CẢ status-based buttons (available, reserved, rented, cleaning)
- Khi chỉ có 1 button → `w-full` (full width)

## SSOT Compliance Checklist
- [ ] Mọi class dùng SSOT token (`.tag-badge`, `.section-title`, `.text-body-sm`...)
- [ ] Không inline styles (trừ shadow separator)
- [ ] Không hardcode hex colors
- [ ] Không `border-*` (Lesson #64)
- [ ] Dùng `<Badge>` component, không hardcode badge
- [ ] Image `sizes` optimized cho width thực tế

## Notes
- KHÔNG đổi logic data fetching, SWR, server actions
- KHÔNG đổi Sections 2-4 (Actions, Standalone, Reservations)
- MetaItem là tiny helper (~10 lines), không cần tách file riêng

---
Next Phase: [phase-03-verify.md](./phase-03-verify.md)
