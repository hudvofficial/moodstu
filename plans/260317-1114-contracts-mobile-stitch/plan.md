# Plan: Contracts Mobile — Match Stitch Design
Created: 2026-03-17 11:14
Updated: 2026-03-17 14:06
Status: 🟡 In Progress

## Overview
Refactor mobile card list trong `/contracts` để match 100% Stitch design.
Desktop KHÔNG ĐƯỢC thay đổi. Ưu tiên kế thừa shared components + SSOT tokens.

## Nguyên tắc
- **Chỉ sửa phần `lg:hidden`** — desktop (`hidden lg:block`) giữ nguyên
- **Dùng SSOT** — `constants/service-colors.ts`, `constants/work-statuses.ts`, design tokens
- **Không hardcode** — mọi color/shadow/spacing phải từ design system
- **Kế thừa** — tái sử dụng `<Badge>`, `getServiceColor()`, `formatCurrency()` có sẵn
- **Lesson #57** — CSS class có `display` → dùng wrapper `<div>` cho visibility

## Phases

| Phase | Name | Status | Files |
|-------|------|--------|-------|
| 01 | Mobile Card Redesign | ✅ Done | `contracts-table.tsx` |
| 02 | FAB Button + Page Layout | ✅ Done | `contracts-list-client.tsx` |
| 03 | Build + Quick Verify | ✅ Done | Build pass, screenshots OK |
| 04 | Mobile Filter Bar Fix | ✅ Done | `contracts-list-client.tsx`, `tabs-filter.tsx` |
| 05 | Port V1 Mobile Filter | ✅ Done | `contracts-list-client.tsx` |
| 06 | Final Verify & Polish | ⬜ Pending | Build + visual check |

## Phase 04 Detail — Mobile Filter Bar Fix (✅ Done)

### Tasks
- [x] **F1:** Thêm `max-lg:overflow-x-auto max-lg:scrollbar-hide` cho TabsFilter wrapper
- [x] **F2+F3:** Bọc `ContractsDropdownFilters` trong `<div className="max-lg:hidden">`
- [x] **Bonus:** Bọc CTA button trong `<div className="max-lg:hidden">` (lesson #57)

## Phase 05 Detail — Port V1 Mobile Filter (✅ Done)

### Source
- **V1 file:** `C:\Users\Admin\Desktop\Ai\0Moodstudio\webapp\components\contracts\ContractsFilters.tsx`
- **V1 lines:** 84-157 (mobile section)

### What V1 Does (Proven, copy exact)
```
┌── 1 hàng scroll (overflow-x-auto no-scrollbar) ─────────────┐
│ [Tất cả] [Chờ xử lý] [Đang làm] [Hoàn thành] [Đã hủy]     │
│ ←── status pills (rounded-full) ──→  [Dịch vụ ▼] [Sắp xếp ▼]│
└──────────────────────────────────────────────────────────────┘
```

### V1 → V2 Mapping (chỉ thay đổi tối thiểu)

| V1 | V2 thay đổi |
|----|-------------|
| `material-symbols-outlined` arrows | → Lucide `ChevronDown` |
| `no-scrollbar` class | → `scrollbar-hide` (đã có design-system.css) |
| `useRouter + searchParams` (server filter) | → Giữ V2 local state (`filters.status`, `setStatus`) |
| `bg-primary text-white` (active pill) | ✅ Giữ nguyên — V2 token tương thích |
| `bg-surface`, `bg-elevated`, `border-border` | ✅ Giữ nguyên — V2 token tương thích |
| Service options hardcoded | → Import từ `constants/service-colors.ts` nếu có |

### Tasks
- [x] **T1:** Xóa `<TabsFilter>` section trên mobile (thay bằng V1 pills)
- [x] **T2:** Xóa `max-lg:hidden` wrapper của `ContractsDropdownFilters` (không cần nữa, V1 đã có inline selects)
- [x] **T3:** Thêm mobile filter block `lg:hidden` — copy V1 layout:
  - Status pills (rounded-full, bg-primary active)
  - Dịch vụ native `<select>` pill
  - Sắp xếp native `<select>` pill
- [x] **T4:** Kết nối V2 state: `filters.status` → pills, `filters.service` → select, `filters.sort` → select
- [x] **T5:** Icon: `material-symbols-outlined expand_more` → Lucide `ChevronDown`

### Guard Rails
- Desktop `TabsFilter` + `ContractsDropdownFilters`: **KHÔNG thay đổi**
- V1 layout proven → copy gần nguyên, chỉ adapt icons + state
- Service options: dùng chung constant nếu đã có, không duplicate

### Files Modified
- `~ contracts-list-client.tsx` — thêm mobile filter block, xóa wrapper cũ

## Quick Commands
- Continue: `/code phase-06`
- Check: `/next`
