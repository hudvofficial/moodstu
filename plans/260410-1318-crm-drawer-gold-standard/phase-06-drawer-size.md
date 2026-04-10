# Phase 06: Chuẩn Hoá Kích Thước Drawer (Gold Standard Tokenization)
Status: ⬜ Pending
Dependencies: Phase 02

## Objective
Loại bỏ hoàn toàn tình trạng hardcode `width="650px"` trong CRM, chuyển sang dùng hệ thống kích thước chuẩn (Token-based) dựa trên các size quy định trước, đảm bảo UI nhất quán trên toàn hệ thống nhưng vẫn linh hoạt đáp ứng form dài.

## Requirements
Hỗ trợ token `size` linh hoạt, hạn chế inline styles trực tiếp.

## Implementation Steps
1. [x] Cập nhật `components/ui/drawer.tsx`:
   - Thêm tuỳ chọn `size` (`md` = 480px, `lg` = 600px).
   - Resolve width tương ứng với size.
2. [x] Sửa `components/crm/lead-detail-drawer.tsx` thành `size="lg"`.
3. [x] Sửa `components/crm/customer-detail-drawer.tsx` thành `size="lg"`.

## Files to Modify
- `components/ui/drawer.tsx` - Thêm logic map size sang CSS class / width.
- `components/crm/lead-detail-drawer.tsx` - Gắn `size="lg"`
- `components/crm/customer-detail-drawer.tsx` - Gắn `size="lg"`

## Verification
- Kiểm tra hiển thị Drawer bên Contract (480px - md).
- Kiểm tra hiển thị Drawer bên CRM (600px - lg) - gọn gàng hơn bản cũ 650px.

---
Quick Command: `/code phase-06`
