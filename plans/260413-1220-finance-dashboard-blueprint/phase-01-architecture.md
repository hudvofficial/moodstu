# Phase 01: Cấu trúc Layout (Architecture)
Status: ✅ Complete
Dependencies: None

## Objective
Bo bọc lại toàn bộ màn hình Dashboard theo chuẩn CSS Grid của V2 (`main-container`), loại bỏ các thẻ `div` bọc lỏng lẻo và hardcode padding.

## Requirements
### Functional
- [x] Bọc Page Content bằng `<div className="main-container gap-3!">`
- [x] Xóa các margin `mt-6`, `mb-X` hardcode rải rác trên các block hiện tại.
- [x] Đảm bảo FAB duy trì đúng vị trí và không bị giấu dưới container overflow.

## Implementation Steps
1. [x] Mở file `app/(protected)/finance/page.tsx` (hoặc `finance-dashboard-client.tsx`).
2. [x] Thay div root hiện tại bằng div class `main-container gap-3!`.
3. [x] Chỉnh dòng gọi Component thành 1 luồng dọc từ trên xuống dưới.

## Files to Create/Modify
- `components/finance/dashboard/finance-dashboard-client.tsx` - Áp dụng `main-container`.

## Test Criteria
- [ ] Khoảng cách không gian giữa các block đều tăm tắp đúng chuẩn gap-3 (12px).

---
Next Phase: `phase-02-filters.md`
