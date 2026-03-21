# Plan: Tối ưu Card "Trang phục" (v2 — Root-cause fix)
Created: 2026-03-21 18:03
Updated: 2026-03-21 18:16
Status: 🟡 In Progress

## Bối cảnh
Card "Trang phục" trên Contract Detail bị vỡ layout vì StatusSelect
dùng class `input-base` (width:100%, min-height:44px) — thiết kế cho FORM,
không phù hợp cho inline status trong list compact.

## Root Cause
```css
/* forms.css L29 */
.input-base { width: 100%; min-height: 44px; padding: 10px 16px; }
```
→ StatusSelect trigger luôn stretch 100% width → đè lên text tên váy.

## Giải pháp: `variant="compact"`
Thêm variant mới cho SelectStatus — pill nhỏ gọn, KHÔNG dùng `input-base`.

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | SelectStatus compact variant | ✅ Complete | 100% |
| 02 | CostumesBlock layout fix | ✅ Complete | 100% |
| 03 | Responsive 2-column grid | ✅ Complete | 100% |
| 04 | Di chuyển In ấn xuống dưới Trang phục | ✅ Complete | 100% |
| 05 | Fix inline trong modal Chọn trang phục | ⬜ Pending | 0% |

---

## Phase 01: SelectStatus compact variant ✅

### File: `components/ui/select/SelectStatus.tsx`

### Tasks:
- [x] Task 1: Thêm prop `variant?: "default" | "compact"` vào interface
- [x] Task 2: Khi `variant="compact"`:
  - Trigger class: BỎ `input-base`, dùng pill style riêng
  - Size nhỏ: `text-xs px-2 py-0.5 h-7` (28px cao thay vì 44px)
  - Width auto (không 100%)
  - Border + bg nhẹ: `border border-border rounded-full bg-bg-card`
  - Giữ nguyên dot color + chevron + dropdown behavior

---

## Phase 02: CostumesBlock layout fix ✅

### File: `components/contracts/detail/costumes-block.tsx`

### Tasks:
- [x] Task 1: Bỏ absolute positioning + CSS hack `[&_button]:w-auto`
- [x] Task 2: Layout flex inline: tên + status compact cùng dòng
- [x] Task 3: Truyền `variant="compact"` cho StatusSelect
- [x] Task 4: Verify trên browser

---

## Phase 03: Responsive 2-column grid

### File: `components/contracts/detail/costumes-block.tsx`

### Tasks:
- [ ] Task 1: Đổi container `space-y-2.5` → `grid grid-cols-1 lg:grid-cols-2 gap-2.5`
- [ ] Task 2: Verify responsive: mobile 1 cột, desktop 2 cột

### Layout mong muốn:
```
Mobile (< 1024px):          Desktop (≥ 1024px):
┌───────────────────┐       ┌──────────────┐ ┌──────────────┐
│ Vest xám 3 mảnh   │       │ Vest xám...  │ │ Váy cưới...  │
│ #VE-001 · Size L   │       │ #VE-001 · L  │ │ #VC-001 · S  │
│ 📅 10/04 → 16/05   │       │ 📅 10/04→... │ │ 📅 15/05→... │
├───────────────────┤       └──────────────┘ └──────────────┘
│ Váy cưới đuôi cá  │
│ #VC-001 · Size S   │
│ 📅 15/05 → 16/05   │
└───────────────────┘
```

## Phase 04: Di chuyển "In ấn" xuống dưới "Trang phục"

### File: `components/contracts/detail/contract-detail-client.tsx`

### Tasks:
- [ ] Task 1: **Desktop** — cắt `PrintOrdersBlock` (L277-278) từ cột phải → paste sau `CostumesBlock` (L261) ở cột trái
- [ ] Task 2: **Mobile** — cắt `PrintOrdersBlock` (L352-355) → paste sau `CostumesBlock` (L385)
- [ ] Task 3: Verify layout desktop + mobile

### Layout Desktop sau fix:
```
CỘT TRÁI (67%):             CỘT PHẢI (33%):
├── Events                   ├── Financial Dashboard
├── Quick Actions             ├── Files/Drive        ← In ấn bị xóa
├── Service Details           ├── Checklist
├── 👗 Trang phục             ├── Chuẩn bị
├── 🖨️ In ấn ← MỚI          ├── Activity Log
                              └── Ghi chú
```

## Quick Commands
- Code Phase 5: `/code`

---

## Phase 05: Fix inline trong modal "Chọn trang phục"

### File: `components/contracts/detail/inventory-reservation-form.tsx`

### Tasks:
- [ ] Task 1: Đổi 4x `text-xs` → `text-caption` (L212, L222)
- [ ] Task 2: Đổi 4x `text-sm` → bỏ (vì `input-base` đã có font-size) (L218, L227, L233, L251)
- [ ] Task 3: Verify modal vẫn hiển thị đúng

### Chi tiết thay đổi:
```diff
# Labels (L212, L222)
- label-base mb-1 block text-xs
+ label-base mb-1 block

# Inputs (L218, L227, L251) — input-base đã có font-size
- input-base w-full text-sm
+ input-base w-full

# Checkbox label (L233)
- text-sm cursor-pointer
+ text-body-sm cursor-pointer
```
