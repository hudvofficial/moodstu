# Phase 02: UI Components Standardization
Status: ⬜ Pending
Dependencies: phase-01-layout.md

## Objective
Chuyển đổi 100% các thành phần UI đang viết tay (thẻ HTML thuần) sang sử dụng Shared Component của thư viện UI Mood Studio. 

## Requirements
### Functional
- [ ] Thay các thẻ `<button>` bằng `<Button>` chuẩn để đồng hóa style, hiệu ứng focus/active.
- [ ] Áp dụng Card Wrapper với `rounded-soft-2xl` cho các section lớn (Info, Price, Bundle).
- [ ] Tích hợp SearchInput/Input chuẩn (nếu có chỗ nào sót).

## Implementation Steps
1. [ ] Rà soát file `ServiceInfoSection.tsx`, dọn thẻ dư và viền bo góc.
2. [ ] Rà soát file `ServicePriceSection.tsx`, update class.
3. [ ] Rà soát file `ServiceBundleSection.tsx`, thay đổi các block custom thành cấu trúc của Shared UI.

## Files to Create/Modify
- `components/services/form/ServiceInfoSection.tsx`
- `components/services/form/ServicePriceSection.tsx`
- `components/services/form/ServiceBundleSection.tsx`
