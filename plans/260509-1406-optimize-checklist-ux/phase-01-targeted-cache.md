# Phase 01: Targeted Cache Invalidation
Status: ⬜ Pending

## Objective
Thay vì gọi `revalidateContractCaches` làm mới toàn bộ danh sách, chúng ta chỉ gọi `revalidateContractDetailCaches` khi tick checklist trong component `DrawerChecklist`. Điều này ngăn SWR tải lại danh sách 20 hợp đồng mỗi khi tick 1 ô.

## Implementation Steps
1. [ ] Sửa file `components/contracts/drawer-checklist.tsx`.
2. [ ] Sửa `revalidateContractCaches` thành `revalidateContractDetailCaches` ở hàm `onSuccess` của mutation.
