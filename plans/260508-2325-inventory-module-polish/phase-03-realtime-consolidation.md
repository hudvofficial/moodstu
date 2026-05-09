# Phase 03: Realtime Channel Consolidation
Status: ⬜ Pending
Dependencies: None (có thể chạy song song Phase 01-02)

## Objective
Gộp 2 `useRealtime()` channels riêng lẻ thành 1 `useRealtimeMulti()` — giảm 50% WebSocket overhead.

## Vấn đề hiện tại
```tsx
// inventory-list-client.tsx line 80-81
useRealtime("inventory_items", { onChange: refreshInventoryCaches });
useRealtime("inventory_transactions", { onChange: refreshInventoryCaches });
```
- 2 separate WebSocket subscriptions
- Cùng handler (`refreshInventoryCaches`)
- Contracts module đã tối ưu thành 1 `useRealtimeMulti()` channel

## Implementation Steps

1. [ ] **inventory-list-client.tsx** — Replace 2x `useRealtime()` bằng 1x `useRealtimeMulti()`:
   ```tsx
   // SAU:
   useRealtimeMulti([
     { table: "inventory_items", onChange: refreshInventoryCaches },
     { table: "inventory_transactions", onChange: refreshInventoryCaches },
   ]);
   ```

2. [ ] Verify import: `useRealtimeMulti` từ `@/hooks/use-realtime` (check nó đã tồn tại từ contracts optimization)

3. [ ] Xóa import `useRealtime` nếu không còn dùng trong file

## Files to Modify
- `components/inventory/inventory-list-client.tsx` — Replace realtime hooks

## Test Criteria
- [ ] Mở 2 tab inventory → thêm vật tư ở tab 1 → tab 2 tự cập nhật
- [ ] Mở inventory → nhập kho → list tự refresh
- [ ] Mở inventory → xuất kho → list + stats tự refresh
- [ ] Chrome DevTools → WS connections: chỉ 1 channel cho inventory (không phải 2)

---
Next Phase: phase-04-detail-rpc-skeleton.md
