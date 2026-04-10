# Phase 03: Refactor Layout CSS (Customers)
Status: ✅ Complete
Dependencies: None

## Objective
Refactor layout `components/crm/customer-list-page.tsx` từ việc lạm dụng `min-h-[calc(100vh-64px)]` thành Flexbox chuẩn (`h-full flex flex-col`) để UI có khả năng chống chịu vỡ khung hình (resiliency) khi dùng ở các module khác hoặc viewport khác nhau.

## Requirements
### Functional
- [x] Đổi cấu trúc layout root của Component này thành Flex (`flex-1 flex flex-col h-full`).

### Non-Functional
- [x] Không làm vỡ scroll của danh sách (vẫn giữ nguyên `overflow-hidden` ở container ngoài, và `overflow-auto` ở container con).

## Implementation Steps
1. [x] Update `customer-list-page.tsx` - xóa `calc(100vh...)`.
2. [x] Áp dụng Standard CSS classes `flex-1 flex flex-col h-full overflow-hidden`.

## Files to Create/Modify
- `components/crm/customer-list-page.tsx` - [Update container layout]

## Test Criteria
- [x] Resize màn hình vẫn không bị thò scroll bar dạng double (có cuộn trong nhưng không cuộn ngoài).
- [x] Đã sử dụng `flex-1 flex flex-col h-full` thay vì `h-[calc(...)]`.

---
Next Phase: [Phase 04](phase-04-safe-date-parsing.md)
