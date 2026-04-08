# Phase 01: Chế tác Grid Percentages & Loại bỏ Margin
Status: ✅ Complete

## Objective
Áp dụng cấu trúc layout của `month-grid.tsx` (Desktop) sang `mobile-month-grid.tsx` (Mobile) để triệt tiêu hoàn toàn khoảng trắng thừa (margin-bottom và fractional scaling pixels).

## Implementation Steps
1. [x] **Mở file**: `components/calendar/views/mobile-month-grid.tsx`.
2. [x] **Loại bỏ Margin**: Xóa class `mb-8` ở Root wrapper (Line 34).
3. [x] **Chống sụp hầm Flexbox**: Bọc Body content bằng `<div className="flex-1 relative min-h-0">` và gắn `absolute inset-0` cho grid container để cấm Flex Engine tự ý co giãn height theo Auto.
4. [x] **Percentage Bounds**: Đổi toàn bộ hệ thống `grid-rows-X` sang các template theo chuẩn tỷ lệ tuyệt đối (%):
   - `grid-rows-4` → `grid-rows-[repeat(4,25%)]`
   - `grid-rows-5` → `grid-rows-[repeat(5,20%)]`
   - `grid-rows-6` → `grid-rows-[repeat(6,16.666667%)]`

## Files to Create/Modify
- `components/calendar/views/mobile-month-grid.tsx` - Áp dụng các thay đổi nói trên.

## Note
Đảm bảo thẻ lồng (wrapper layer) không có tác dụng phụ vỡ layout Mobile.
---
Next Phase: Phase 02 (V-GATE: Chụp Mobile View Audit)
