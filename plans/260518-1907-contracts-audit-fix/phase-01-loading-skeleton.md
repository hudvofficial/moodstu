# Phase 01: Quick Win - Thêm Loading Skeleton
Status: ✅ Complete
Dependencies: None

## Objective
Xóa bỏ tình trạng giao diện bị "đứng hình" (block UI) khi chuyển từ Dashboard sang trang Hợp đồng bằng cách sử dụng Next.js Loading Skeleton.

## Requirements
### Functional
- [ ] Thêm file `loading.tsx` vào `app/(protected)/contracts/`.
- [ ] Tái sử dụng component `ContractsListSkeleton` hiện có (`components/contracts/contracts-list-skeleton.tsx`) để làm fallback cho trang.

### Non-Functional
- [ ] Performance: Thời gian chuyển trang (client-side navigation) phải dưới 100ms.

## Implementation Steps
1. [ ] Tạo file `app/(protected)/contracts/loading.tsx`.
2. [ ] Export default component gọi trực tiếp `<ContractsListSkeleton />`.

## Files to Create/Modify
- `app/(protected)/contracts/loading.tsx` - [NEW]

## Test Criteria
- [ ] Click từ Dashboard sang Menu "/contracts" chuyển ngay lập tức và hiển thị Skeleton.
- [ ] Không xuất hiện lỗi nháy giao diện (flickering).

---
Next Phase: phase-02-critical-fixes.md
