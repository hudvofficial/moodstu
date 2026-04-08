# Phase 02: DatePicker & Logic Split
Status: ✅ Complete
Dependencies: Phase 01

## Objective
Nâng cấp `datetime-local` input lên Standard Components là `DatePicker` kết hợp cùng `Input type="time"`, tuân thủ rule ❌ KHÔNG <input type="date">.

## Implementation Steps
1. [x] Cập nhật State `formData.event_date` và `formData.end_date` tách riêng String YYYY-MM-DD và Time HH:mm .
2. [x] Import `DatePicker`.
3. [x] Xây dựng Grid Form kề nhau giữa DatePicker và Input Time.
4. [x] Gom chuỗi ISO T-format tại hàm HandleSubmit.

## Files to Modify
- `components/calendar/drawers/event-form-drawer.tsx`
