# Phase 04: Testing & Verification
Status: ✅ Done
Dependencies: Phase 03

## Objective
Xác nhận app vẫn vận hành đúng logic: data realtime không bị mất, UI xem contract detail không bị sập hay sai lệch dữ liệu.

## Requirements
- [ ] Test trường hợp Cold Start (copy paste URL `[id]`).
- [ ] Test trường hợp Hover Prefetch trên danh sách (`getContractDetail`).
- [ ] Test Drawer Prefetch (`getContractDrawerExtra`).
- [ ] Xác minh lỗi nếu RPC không tồn tại thì 8 queries cũ vẫn fallback an toàn.

## Implementation Steps
1. [ ] Mở Browser, truy cập `/contracts`. Hover một row, xem tab Network xem thời gian load `getContractDetail`.
2. [ ] F5 lại trang `/contracts/[id]` và kiểm tra xem có Skeleton không (hay là load thẳng SSR).
3. [ ] Hoàn thành báo cáo nghiệm thu.

## Notes
Nếu bước này Ok thì đánh dấu hoàn tất toàn bộ quy trình tối ưu.
