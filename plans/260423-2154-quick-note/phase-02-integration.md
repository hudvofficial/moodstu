# Phase 02: Integration & Status Refresh
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Tích hợp API thêm ghi chú vào CSDL và tự động làm mới giao diện sau khi thêm thành công.

## Requirements
### Functional
- [ ] Gọi Server Action `addContractNote` khi người dùng bấm "Lưu".
- [ ] Hiển thị trạng thái Loading trong lúc lưu.
- [ ] Xử lý lỗi nếu thêm thất bại (hiển thị `toast` báo lỗi).
- [ ] Nếu thành công: hiển thị `toast` thành công, đóng Modal và làm mới cache (`revalidateContractCaches`).

### Non-Functional
- [ ] Trải nghiệm mượt mà, không giật lag.

## Implementation Steps
1. [x] Thêm logic gọi API vào UI Modal (hàm `handleSaveNote` trong `contract-detail-client.tsx`).
2. [x] Import `addContractNote` và `revalidateContractCaches` từ các file hành động hiện có (giống như trong `notes-timeline.tsx`).
3. [x] Bắn `toast` thành công và reset giá trị input.

## Files to Create/Modify
- `components/contracts/detail/contract-detail-client.tsx` - [Thêm API integration]

## Test Criteria
- [x] Ghi chú mới được thêm thành công vào cơ sở dữ liệu.
- [x] Ứng dụng tự làm mới mà không cần F5.
- [x] Ghi chú xuất hiện ở `NotesTimeline` khi mở ra.

---
Next Phase: Hoàn thành
