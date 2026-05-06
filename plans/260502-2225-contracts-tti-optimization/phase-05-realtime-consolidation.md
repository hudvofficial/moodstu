# Phase 05: Realtime Channel Consolidation — 6 → 1
Status: ✅ Done
Dependencies: None (có thể song song với Phase 03-04)
Est: 1 giờ

## Objective
Gộp 6 Realtime channels trên contract list page thành 1 channel duy nhất để giảm mount overhead.

## Rationale
Hiện tại `contracts-list-client.tsx` mở 6 `useRealtime()`:
- Mỗi hook → `createClient()` → `getSession()` → `channel.subscribe()`
- 6 channels = 6x WebSocket subscription overhead
- Tất cả 6 đều trigger cùng 1 callback `revalidateContractListCaches()`

Supabase hỗ trợ 1 channel với multiple `.on('postgres_changes', ...)` listeners — hiệu quả hơn.

## Implementation Steps
1. [x] Tạo hook mới `hooks/use-realtime-multi.ts`:
   - Nhận array of `{ table, filter? }` configs
   - Mở 1 channel duy nhất
   - Chain multiple `.on()` calls trên cùng channel
   - Single debounced callback
   - Return connection status
2. [x] Sửa `contracts-list-client.tsx`:
   - Thay 6 `useRealtime()` calls → 1 `useRealtimeMulti()` call
3. [x] Sửa `contract-detail-client.tsx`:
   - Thay 9 `useRealtime()` calls → 1 `useRealtimeMulti()` call
4. [x] Giữ nguyên `hooks/use-realtime.ts` cho các module khác dùng single-table

## Files to Create/Modify
- `hooks/use-realtime-multi.ts` — [NEW] Multi-table single channel hook
- `components/contracts/contracts-list-client.tsx` — [MODIFY] Use useRealtimeMulti
- `components/contracts/detail/contract-detail-client.tsx` — [MODIFY] Use useRealtimeMulti

## Hook Signature (draft)

```typescript
interface RealtimeMultiConfig {
  table: string;
  filter?: string;
  eventTypes?: ("INSERT" | "UPDATE" | "DELETE")[];
}

function useRealtimeMulti(
  configs: RealtimeMultiConfig[],
  options: {
    onChange: (payload: RealtimePayload) => void;
    debounceMs?: number;
    channelName?: string;
  }
): { status: ConnectionStatus }
```

## Test Criteria
- [x] Contract list: dùng một channel multi-table cho contracts/checklists/notes/events/tasks/payment plans
- [x] Contract detail: dùng một channel multi-table cho 9 bảng liên quan
- [x] Verify script nhận diện payments realtime trong hook mới
- [x] Static verify: contract list/detail không còn gọi `useRealtime()` riêng lẻ; mỗi màn dùng 1 `useRealtimeMulti()` channel
- [ ] DevTools Network tab: kiểm chứng runtime browser chỉ 1 channel/list-detail khi có session đăng nhập
- [x] `npm run build` pass

## Impact
- **-100-200ms** mount time
- Giảm 5 WebSocket subscriptions → less server load

---
End of Plan. Summary: 5 phases, 15 tasks, ~5 giờ total.
