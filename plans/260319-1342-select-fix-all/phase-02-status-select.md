# Phase 02: Migrate StatusSelect → Radix-based
Status: ⬜ Pending
Dependencies: Phase 01 done

## Objective
Thay `StatusSelect` (native <select> + color dot) bằng component Radix-based.

## Context
StatusSelect được dùng trong contract detail:
- `costumes-block.tsx` — cập nhật trạng thái thuê trang phục
- `print-orders-block.tsx` — cập nhật trạng thái đơn in

Đây là **inline status editor** (không phải filter pill) → cần design khác với SelectPill.

## Design Decision
Tạo `SelectStatus` mới:
- Base: Radix Select
- Visual: Compact, có color dot indicator giống hiện tại
- API: Giữ nguyên: `{ current, options: StatusOption[], onUpdate, disabled, size }`

## Files to Create/Modify

### 1. `components/ui/select/SelectStatus.tsx` — NEW
```tsx
// Radix Select với color dot indicator
// Async-friendly: loading state khi onUpdate chạy
// API tương thích StatusSelect cũ
```

### 2. `components/ui/status-select.tsx` — MODIFY
- Thêm re-export alias point sang SelectStatus (giống simple-select pattern)

### 3. `components/contracts/detail/costumes-block.tsx` — VERIFY
- Import vẫn là `StatusSelect` → tự động dùng Radix mới

### 4. `components/contracts/detail/print-orders-block.tsx` — VERIFY
- Import vẫn là `StatusSelect` → tự động dùng Radix mới

### 5. Add barrel export vào `components/ui/select/index.ts`
```ts
export { SelectStatus } from "./SelectStatus";
```

## Test Criteria
- [ ] Costumes block: click status → Radix dropdown mở
- [ ] Color dot hiển thị đúng theo status
- [ ] Async update hoạt động (loading state khi gọi API)
- [ ] Disabled state hoạt động

---
Next Phase: phase-03-grouped-select.md
