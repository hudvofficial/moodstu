# Phase 01: Layout & Cross-Platform UX (Shell & Mobile)
Status: ⬜ Pending
Dependencies: None

## Objective
Thay máu bộ khung layout thủ công, đưa form về chuẩn FullpageFormShell của dự án. Đồng thời sửa triệt để lỗi UX trên Mobile (Nút Save bị đúp 3 lần, QuotePreview bị giấu mất).

## Requirements
### Functional
- [ ] Áp dụng đúng giao diện `8:4` cho Desktop và `Vertical Stack` cho Mobile.
- [ ] Gộp toàn bộ Action Buttons (Nút Save) thành 1 component duy nhất.
- [ ] Đem QuotePreview trở lại cho Mobile (hiển thị dạng Accordion ngay trên Action Bar).

### Non-Functional
- [ ] Đảm bảo nút Save dưới đáy phải tôn trọng `safe-area` trên Mobile (không đè lấn giao diện OS).
- [ ] Không còn cấu trúc rác DOM (Render trùng HTML chỉ để che giấu bằng `hidden`).

## Implementation Steps
1. [ ] Tạo Component `<SaveActionButtons>` chứa logic Submit.
2. [ ] Xóa bỏ Grid tự chế (`lg:col-span-12`, v.v) trong `index.tsx` và dùng `<FullpageFormShell>`.
3. [ ] Bố trí lại Sidebar (chứa QuotePreview và <SaveActionButtons>) cho khớp với cơ chế truyền dữ liệu của Shell.
4. [ ] Bổ sung mã `e.stopPropagation()` ở root `onFormSubmit`.

## Files to Create/Modify
- `components/services/form/index.tsx` - Áp dụng FullpageFormShell
- `components/services/form/SaveActionButtons.tsx` (New) - Component tái sử dụng nút
