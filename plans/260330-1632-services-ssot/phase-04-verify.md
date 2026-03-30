# Phase 04: Verify & Test
Status: ⬜ Pending
Dependencies: Phase 03

## Objective
Kiểm thử tính năng tạo mới / chỉnh sửa Dịch vụ để đảm bảo dữ liệu (đặc biệt là các cột mới thêm) được chèn thành công vào Database mà không gặp lỗi.

## Requirements
### Functional
- [ ] Mở form Tạo Dịch vụ trên UI (http://localhost:3000/services/create)
- [ ] Nhập thông tin và Submit.
- [ ] Xác minh kết quả trả về `200` và dữ liệu có trong DB.

## Implementation Steps
1. [ ] Yêu cầu User hoặc Subagent thao tác trên trình duyệt tạo thủ công.
2. [ ] Kiểm tra Database coi dữ liệu xuống đúng format của `unit`, `fulfillment_type`, `created_by`.

## Test Criteria
- [ ] 1 Record Dịch vụ mới được tạo đầy đủ properties mà không bị sụp trang.

---
End of Plan.
