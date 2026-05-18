# Phase 04: Kiểm thử & Bàn giao
Status: ⬜ Pending
Dependencies: Phase 03

## Objective
Xác minh toàn bộ các thay đổi không làm vỡ chức năng cũ và cải thiện rõ rệt tốc độ theo các thông số đã đo đạc ban đầu.

## Requirements
### Functional
- [ ] Chạy thành công toàn bộ smoke tests & e2e tests của module contracts.
- [ ] Mọi lệnh lint & type check phải pass 100%.

### Non-Functional
- [ ] Thời gian tải trang `/contracts` (chuyển từ dashboard) được kỳ vọng mượt mà hơn (hiển thị skeleton lập tức < 100ms).

## Implementation Steps
1. [ ] Chạy `npm run lint`.
2. [ ] Chạy `npx tsc --noEmit --pretty false`.
3. [ ] Chạy `npm run smoke:contracts`.
4. [ ] Chạy lại `npm run perf:operational`.

## Files to Create/Modify
- N/A

## Test Criteria
- [ ] Lệnh build thành công, không báo warning về kiểu dữ liệu (any/unknown).
- [ ] Lưu hợp đồng hoạt động hoàn chỉnh từ A-Z.
- [ ] Lịch Google, Váy, và Addons vẫn đồng bộ đúng (test thủ công hoặc bằng playwright).

---
Next Phase: N/A
