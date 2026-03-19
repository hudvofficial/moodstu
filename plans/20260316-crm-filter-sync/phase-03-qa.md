# Phase 03: Final Cleanup & QA
Status: ✅ Complete

## Objective
Kiểm tra chéo lại toàn bộ hệ thống Search của CRM để đảm bảo không còn lỗi vặt.

## Requirements
### Functional
- [ ] Mở `/crm/leads` trên điện thoại (kiểm tra Responsive) và gõ tìm kiếm, sau đó bấm `X` trên FilterChip. Đảm bảo Input bị Clear và URL biến mất query `q`.
- [ ] Chuyển Tab qua lại giữa Customers và Leads để dảm bảo State FilterChip không bị rò rỉ hoặc Render sai nơi sai chỗ.

## Implementation Steps
1. Yêu cầu user tự dùng `/run` hoặc manual testing thao tác click.
2. Kiểm tra nếu có lỗi nào liên quan thay thế bằng Shallow Routing.

---
Done!
