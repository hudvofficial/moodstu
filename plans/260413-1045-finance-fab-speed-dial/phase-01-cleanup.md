# Phase 01: Cleanup Legacy Actions
Status: ✅ Complete
Dependencies: None

## Objective
Gỡ bỏ hoàn toàn kiến trúc Drawer cũ ra khỏi module Finance để trả lại sự trong sạch cho DOM tree, chuẩn bị môi trường cho Native Speed Dial.

## Requirements
### Functional
- [x] Gỡ bỏ `FinanceActionDrawer` khỏi `finance-fab.tsx`.
- [x] Đảm bảo ứng dụng không báo lỗi `missing component` hoặc reference lỗi sau khi xóa.

### Non-Functional
- [x] Giảm bundle size cho phần chunk của Finance Dashboard.

## Implementation Steps
1. [x] Cắt phần import và usage của `FinanceActionDrawer` trong `finance-fab.tsx`.
2. [x] Xóa hẳn file `components/finance/finance-action-drawer.tsx`.

## Files to Modify
- `components/finance/finance-action-drawer.tsx` (DELETE)
- `components/finance/finance-fab.tsx` (MODIFY)

---
Next Phase: `phase-02-speed-dial-ui.md`
