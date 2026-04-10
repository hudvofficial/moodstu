# Phase 04: Chuẩn hóa Safe Date Parsing
Status: ✅ Complete
Dependencies: Phase 03

## Objective
Ngăn chặn rủi ro Crash/Bug Parse khi hiển thị Ngày/Tháng từ chuỗi trả về từ DB trên UI, chuyển sang chuẩn phân tích an toàn.

## Requirements
### Functional
- [x] Không còn hiển thị "NaN" hay lỗi ngày nếu DB vô tình chứa date invalid hoặc Safari không parse được ISO String truyền vào dạng `new Date("2026-04-09").`
- [x] Phải sử dụng Date parser an toàn (ví dụ if check hợp lệ, parseISO bằng date-fns).

### Non-Functional
- [x] Tuân thủ Defensive Programming.

## Implementation Steps
1. [x] Tạo `safeFormatDate` func tại `lib/utils.ts` bổ sung check if null/invalid. Sử dụng `parseISO` và fallback sang `new Date()`, có catch `isValid`.
2. [x] Tìm các file có xài trực tiếp `format(new Date(customer.wedding_date)...)` như trong `customer-table.tsx` và `customer-card.tsx` để đổi qua xài `safeFormatDate`.

## Files to Create/Modify
- `lib/utils.ts` - [Review utility date & added safeFormatDate]
- `components/crm/customer-table.tsx` - [Bọc Format Date thay format thường]
- `components/crm/customer-card.tsx` - [Bọc Format Date thay format thường]

## Test Criteria
- [x] Lướt danh sách CRM Customer 100 dòng hoàn toàn mượt không có console error đỏ rực nào về "Date Parsing".
- [x] Ngày trên Card/Table format đúng chuẩn dd/MM hoặc dd/MM/yyyy.

---
**END OF PLAN**
