# Phase 03: Tái cấu trúc - Tách file & Chống Type Mù
Status: ✅ Complete
Dependencies: Phase 02

## Objective
Áp dụng BMAD Refactoring để giải quyết code smell (God Object) và định danh lại TypeScript cho an toàn (Type Safety).

## Requirements
### Functional
- [ ] Tách hàm liên quan đến "Trang phục" (`syncDressReservationsForContract`, `validateDressAvailability`, v.v.) từ `contract-mutations.ts` sang một file Service mới: `lib/services/dress-sync-service.ts`.
- [ ] Tách hàm liên quan đến "Addon" (`upsertAddonHistoryItems`) sang `lib/services/addon-sync-service.ts`.
- [ ] Xóa bỏ tình trạng lạm dụng `Record<string, unknown>` và `unknown[]` ở những hàm cốt lõi trong `contract-queries.ts` (như `getContractDetail`, `getContractListFromRpc`), thay bằng Interfaces chuẩn.

### Non-Functional
- [ ] Maintainability: `contract-mutations.ts` phải giảm độ dài đáng kể.
- [ ] Type Safety: Quá trình build `npx tsc --noEmit` không được báo lỗi ở những file vừa sửa.

## Implementation Steps
1. [ ] Tạo file `lib/services/dress-sync-service.ts` và chuyển logic liên quan đến `dress_reservations` qua.
2. [ ] Tạo file `lib/services/addon-sync-service.ts` và chuyển logic liên quan đến `addon_history` qua.
3. [ ] Cập nhật `contract-mutations.ts` để import và gọi 2 file Service này.
4. [ ] Cập nhật type cho `ContractDetailRpcPayload` và các `map` functions trong `contract-queries.ts` với Type chặt chẽ hơn thay vì ép thành `unknown`.

## Files to Create/Modify
- `lib/services/dress-sync-service.ts` - [NEW]
- `lib/services/addon-sync-service.ts` - [NEW]
- `app/actions/contract-mutations.ts` - [MODIFY]
- `app/actions/contract-queries.ts` - [MODIFY]

## Test Criteria
- [ ] Việc tách logic không phá vỡ tính năng lưu hợp đồng.
- [ ] Không có lỗi type khi compile (`npx tsc --noEmit --pretty false`).

---
Next Phase: phase-04-testing.md
