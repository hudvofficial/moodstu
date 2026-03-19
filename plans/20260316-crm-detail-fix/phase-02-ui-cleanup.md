# Phase 02: Syntax & UI Cleanup

## Objective
Dọn dẹp các lỗi cú pháp làm chết Component và tối ưu hóa hiển thị.

## Implementation Steps
1. [ ] Sửa file `LeadDetail.tsx`:
    - Xóa đuôi `.ts` ở các dòng import.
    - Ép kiểu (Prop types) chuẩn cho dữ liệu.
2. [ ] Điều chỉnh CSS:
    - Đảm bảo Panel có `fixed inset-0` và `z-1000`.
    - Kiểm tra Backdrop màu tối hơn để nổi bật Panel.

## Files to Modify
- `components/crm/leads/LeadDetail.tsx`

## Test Criteria
- [ ] Mở CRM không thấy lỗi màu đỏ trong Console.
- [ ] Panel Detail hiển thị đè lên trên tất cả thành phần khác.
