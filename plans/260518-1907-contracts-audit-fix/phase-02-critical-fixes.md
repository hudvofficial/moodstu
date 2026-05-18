# Phase 02: Sửa lỗi Critical - OOM & Main Thread Block
Status: ✅ Complete
Dependencies: Phase 01

## Objective
Ngăn chặn rủi ro sập Server do tải toàn bộ Database vào RAM (Memory Bomb) và giải phóng luồng chính (Main Thread) khi lưu hợp đồng.

## Requirements
### Functional
- [ ] Cập nhật fallback của hàm `getContractStats` trong `app/actions/contract-queries.ts` để sử dụng Aggregate Query (`select('...', { count: 'exact' })`) thay vì lấy array và dùng vòng lặp `forEach`.
- [ ] Trong `app/actions/contract-mutations.ts`, đưa logic `syncDressReservationsForContract` và `upsertAddonHistoryItems` vào `after()` của Next.js (Background Task).

### Non-Functional
- [ ] Performance: `getContractStats` fallback phải duy trì mức bộ nhớ O(1) bất kể DB có bao nhiêu bản ghi.
- [ ] Performance: `createContract` phải trả về response ngay lập tức (dưới 500ms) mà không đợi đồng bộ váy/addon.

## Implementation Steps
1. [ ] Mở `app/actions/contract-queries.ts`.
2. [ ] Tìm hàm `getContractStats` và thay thế đoạn `.select("status, total_amount, remaining_amount")` bằng các truy vấn `count` hoặc RPC an toàn, hoặc ít nhất là không dùng JavaScript `.forEach` trên toàn bộ tập dữ liệu (có thể phải viết lại logic đếm an toàn hơn nếu Supabase RPC lỗi).
3. [ ] Mở `app/actions/contract-mutations.ts`.
4. [ ] Di chuyển các block gọi hàm đồng bộ không bắt buộc (`syncDressReservationsForContract`, `upsertAddonHistoryItems`) vào bên trong callback `after(() => { ... })` để chúng chạy ngầm.

## Files to Create/Modify
- `app/actions/contract-queries.ts` - [MODIFY]
- `app/actions/contract-mutations.ts` - [MODIFY]

## Test Criteria
- [ ] Hành động tạo/sửa hợp đồng phản hồi ngay lập tức, các tác vụ phụ (váy, addon) cập nhật thành công ở background.
- [ ] API lấy thông kê chạy ổn định, không gọi quá nhiều data.

---
Next Phase: phase-03-refactoring.md
