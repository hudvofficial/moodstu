# Phase 01: Batch-safe Realtime Multi
Status: Done

## Objective
Sua `useRealtimeMulti` de debounce khong lam mat payload. Hien tai neu nhieu event den trong mot debounce window, handler chi giu payload cuoi. Tick nhanh nhieu checklist hoac multi-user update co the khong cap nhat du.

## Design
Dung queue payload trong hook:
- Moi realtime payload push vao `payloadQueueRef`.
- Debounce timer flush ca queue.
- Khi flush, goi callback theo batch hoac goi tung payload theo thu tu nhan.
- Giu backward compatibility voi `onChange(payload)`.

## Proposed API
Option an toan:
```ts
export type RealtimeMultiOptions = {
  channelName?: string;
  debounceMs?: number;
  onChange: (payload: RealtimePayload) => void | Promise<void>;
  onBatchChange?: (payloads: RealtimePayload[]) => void | Promise<void>;
};
```

Behavior:
- Neu co `onBatchChange`, flush goi mot lan voi tat ca payload.
- Neu khong co, flush loop qua tung payload va goi `onChange`.
- Deduplicate optional chi ap dung cho refetch event, khong dedupe checklist update theo id neu payload khac state.

## Tasks
1. [ ] Sua `hooks/use-realtime-multi.ts` them queue ref va flush function.
2. [ ] Dam bao cleanup clear timer va empty queue khi unmount.
3. [ ] Update `contracts-list-client.tsx` neu can dung `onBatchChange` de batch patch checklist truoc, revalidate sau.
4. [ ] Update `contract-detail-client.tsx` neu can dung batch tuong tu.
5. [ ] Them hoac update test/script neu repo co pattern test hook phu hop; neu khong, them manual verification checklist vao phase 05.

## Acceptance Criteria
- Tick nhanh nhieu checklist khong mat event.
- Non-checklist events van debounce/refetch nhu cu.
- TypeScript khong can `any` moi.
- Hook van compatible voi call sites hien tai.

## Risk
- Batch refetch co the goi nhieu lan neu khong gom logic. Can tach checklist patch va `needsRevalidate` flag.
