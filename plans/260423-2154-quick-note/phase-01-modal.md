# Phase 01: Setup Quick Note Modal
Status: ⬜ Pending
Dependencies: None

## Objective
Xây dựng giao diện Modal cho tính năng Ghi chú nhanh (Quick Note) và nhúng vào `ContractDetailClient`.

## Requirements
### Functional
- [ ] Bấm nút "Ghi chú" trên Quick Actions Grid sẽ mở Modal thay vì báo "Đang phát triển".
- [ ] Modal có ô nhập liệu (Textarea/Input) để gõ nội dung.
- [ ] Nút "Lưu" (Lưu ghi chú) và "Hủy" (Đóng Modal).

### Non-Functional
- [ ] Áp dụng Design System V2 (góc bo rounded-xl, shadow-sm).
- [ ] Auto-focus vào ô nhập liệu khi Modal mở ra.
- [ ] Phản hồi bằng phím Enter (nhấn Enter để Lưu).

## Implementation Steps
1. [x] Cập nhật state `showNoteModal` trong `contract-detail-client.tsx`.
2. [x] Sửa `handleQuickAction("note")` để `setShowNoteModal(true)`.
3. [x] Xây dựng block JSX cho Quick Note Modal ngay trong `contract-detail-client.tsx` (hoặc tách file nếu cần, nhưng do đơn giản nên có thể để chung hoặc tái sử dụng Modal component).

## Files to Create/Modify
- `components/contracts/detail/contract-detail-client.tsx` - [Thêm state và UI Modal]

## Test Criteria
- [x] Mở Modal thành công khi bấm "Ghi chú".
- [x] Đóng Modal khi bấm "Hủy" hoặc click ra ngoài.
- [x] Nút "Lưu" bị disabled khi chưa nhập gì.

---
Next Phase: Phase 02 Integration
