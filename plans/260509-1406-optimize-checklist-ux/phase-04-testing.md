# Phase 04: Testing & Verification
Status: ⬜ Pending

## Objective
Xác nhận sau khi áp dụng Optimistic UI và tắt Realtime list update, hành vi tick checklist nhanh không gây giật lag hoặc request thừa.

## Verification Steps
1. [ ] Mở tab Network và check số lượng request SWR gửi lên khi tick 5 checkbox liên tục. Đảm bảo List API không bị gọi.
2. [ ] Kiểm tra Badge ở trang danh sách có cập nhật ngay lập tức khi bảng Drawer được đóng hoặc SWR tự động đồng bộ ngầm sau thao tác.
