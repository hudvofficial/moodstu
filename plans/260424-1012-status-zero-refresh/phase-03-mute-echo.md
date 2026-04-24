# Phase 03: Mute Realtime Echo + Remove Redundant onSaved
Status: ⬜ Pending
Dependencies: Phase 01, Phase 02

## Objective
Ngăn `onSaved()` gây re-fetch toàn bộ data khi chỉ thay đổi status. `onSaved()` = `refreshContractCaches()` = full SWR re-fetch, xung đột trực tiếp với optimistic update.

## Root Cause
Trong `event-task-modal.tsx`, hàm `handleStatusUpdate` hiện tại:
- ✅ Đã có Optimistic UI (setTasks + onTaskStatusChange)
- ❌ NHƯNG `toggleTaskStatus` server action trả về → Realtime detect DB change → trigger `refreshContractCaches()` lần nữa

`contract-detail-client.tsx` đã có `muteRealtimeEcho()` pattern, nhưng chỉ được gọi trong `applyTaskStatusOptimistic` — CHƯA được gọi khi status update từ costumes/print-orders.

## Files to Modify

### 1. `components/contracts/detail/costumes-block.tsx` (từ Phase 02)
- Sau khi optimistic update → notify parent để `muteRealtimeEcho()`
- Thêm prop `onStatusChange?: (reservationId: string, newStatus: string) => void`
- Parent (detail-layout-sections) gọi `muteRealtimeEcho` khi nhận callback

### 2. `components/contracts/detail/print-orders-block.tsx` (từ Phase 02)
- Tương tự costumes: notify parent để mute echo

### 3. `components/contracts/detail/detail-layout-sections.tsx`
- Truyền `muteRealtimeEcho` callback xuống costumes/print-orders blocks
- Hoặc: truyền `onStatusMutation` prop để parent (contract-detail-client) handle

### 4. `components/contracts/detail/contract-detail-client.tsx`
- Thêm `onCostumeStatusChange` và `onPrintOrderStatusChange` handlers
- Gọi `muteRealtimeEcho()` + `mutateContractDetail()` optimistic cho SWR cache

## Implementation Steps
1. [ ] Thêm `onStatusChange` prop cho costumes-block và print-orders-block
2. [ ] Thread callback qua detail-layout-sections → contract-detail-client
3. [ ] Trong contract-detail-client: gọi `muteRealtimeEcho()` + SWR optimistic mutate
4. [ ] Verify: status change không trigger realtime refresh

## Test Criteria
- [ ] Đổi status costume → Network tab: 0 SWR re-fetch requests
- [ ] Đổi status print order → Network tab: 0 SWR re-fetch requests
- [ ] Đổi status task → Network tab: 0 SWR re-fetch requests
- [ ] Mở 2 tabs: đổi status tab 1 → tab 2 vẫn auto-update (realtime working cho OTHER users)
- [ ] Reload page sau mọi thao tác → data đúng với DB

## Verification Final
- [ ] `npm run build` — zero errors
- [ ] Flow test: Contract detail → đổi status 5 loại khác nhau → không lag, không flicker
- [ ] Performance: FCP/LCP không bị ảnh hưởng

---
End of Plan
