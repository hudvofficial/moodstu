# Phase 03: State Wiring & Integration

Status: ✅ Complete
Dependencies: Phase 02

## Objective

Gắn `PrintingGroupDrawer` vào `PrintingListPage` và truyền thông tin trạng thái khi người dùng nhấn vào các Hợp Đồng.

## Requirements

### Functional

- [x] Thêm state `selectedContractGroup` vào `PrintingListPage`.
- [x] Truyền hàm `onViewGroup` xuống cho `PrintingTable` (Desktop) và `PrintingMobileGrouped` (Mobile).
- [x] Đặt `PrintingGroupDrawer` ở root của component `PrintingListPage`. Đẩy state `selectedContractGroup` vào để hiển thị.
- [x] Setup hàm `onClose` để clear Drawer.

## Implementation Steps

1. [x] Cập nhật `printing-list-page.tsx`: khai báo state.
2. [x] Inject `<PrintingGroupDrawer ... />` vào ngay dưới giao diện.
3. [x] Hoàn thành kết nối.

## Test Criteria

- [x] Click Row Hợp đồng ở Desktop -> Mở Drawer.
- [x] Click Card Hợp đồng ở Mobile -> Mở Drawer.
- [x] Drawer render đủ thông tin con.

---

Next Phase: Hoàn thành 🎉
