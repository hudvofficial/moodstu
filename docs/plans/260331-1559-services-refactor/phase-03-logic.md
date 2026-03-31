# Phase 03: Logic Hook Extraction & Safe State
Status: ⬜ Pending
Dependencies: phase-02-components.md

## Objective
Mổ bóc tách toàn bộ Business Logic và Data Fetching ra khỏi tầng UI (UI chỉ nên gánh việc hiển thị). Vá các lỗ hổng React Anti-pattern liên quan đến State.

## Requirements
### Functional
- [ ] Tạo Custom Hook để handle việc Search Bundle Service.
- [ ] Chống dội/hỏng giao diện Array khi Delete bằng cách bắt buộc chạy theo `id` (stable key) thay vì `index`.
- [ ] Kiểm soát số lượng chặt chẽ để chống lỗi nhập liệu từ người dùng.

### Non-Functional
- [ ] Security/Stability: Bắt buộc Input Value (Quantity) phải luôn `>= 1` theo thời gian thực.
- [ ] Production Error: Chặn việc in lỗi thô bạo (`console.error`) ra trình duyệt, phải bọc bằng `toast.error()`.

## Implementation Steps
1. [ ] Code hook mới `useServiceSearch.ts` với logic fetch, loading, debouncing.
2. [ ] Sửa lại Logic `removeBundleItem` và `updateBundleItem` truyền tham số `id`.
3. [ ] Cập nhật onChange input `Quantity`: `Math.max(1, parseInt(...) || 1)`.
4. [ ] Thay `console.error` bằng `toast.error`.

## Files to Create/Modify
- `components/services/form/hooks/useServiceSearch.ts` (New)
- `components/services/form/ServiceBundleSection.tsx`
