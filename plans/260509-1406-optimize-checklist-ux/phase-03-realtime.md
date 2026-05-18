# Phase 03: Realtime Event Filtering
Status: ⬜ Pending

## Objective
Hiện tại, kênh Realtime channel lắng nghe mọi sự thay đổi từ DB và có thể gọi `revalidateContractListCaches()`. Cần kiểm tra xem file cấu hình Realtime (`contracts-list-client.tsx` hoặc hook `use-contracts.ts`) có đang trigger việc làm mới danh sách khi `contract_checklists` thay đổi không. Nếu có, cần filter (lọc) nó ra.

## Implementation Steps
1. [ ] Kiểm tra cơ chế Realtime listener cho `contract_checklists`.
2. [ ] Loại bỏ hoặc làm cho nó im lặng (debounce) nếu cập nhật checklist là từ chính người dùng hiện tại (bằng cách dựa vào local mutation).
