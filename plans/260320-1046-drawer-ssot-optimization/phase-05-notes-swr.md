# Phase 05: Drawer Notes — SWR Upgrade
Status: ⬜ Pending
Dependencies: None

## Objective
Chuyển drawer-notes từ raw `useEffect` fetch → SWR hook. Đồng bộ với pattern `useContractDetail`.

## Hiện trạng
```typescript
// ❌ Raw useEffect — không cache, không dedup, fetch lại mỗi lần mở
useEffect(() => {
  getContractNotes(contractId)
    .then(result => { if (result.success) setNotes(result.data); })
    .catch(() => {})
    .finally(() => setLoading(false));
}, [contractId]);
```

## Fix: Custom SWR Hook
```typescript
// lib/hooks/use-contract-notes.ts (NEW)
import useSWR from "swr";
import { getContractNotes } from "@/app/actions/note-actions";

export function useContractNotes(contractId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    contractId ? ["contract-notes", contractId] : null,
    () => getContractNotes(contractId!),
    { revalidateOnFocus: false }
  );

  return {
    notes: (data?.success ? data.data : []) as Note[],
    isLoading,
    error,
    mutate,  // For optimistic update after add
  };
}
```

## Implementation Steps
1. [ ] Tạo `lib/hooks/use-contract-notes.ts` với SWR hook
2. [ ] Trong `drawer-notes.tsx`: xóa useEffect fetch + loading state
3. [ ] Import + sử dụng `useContractNotes(contractId)`
4. [ ] Optimistic add: dùng `mutate()` sau addContractNote thành công
5. [ ] Giữ nguyên UI + input logic

## Files to Create
- `lib/hooks/use-contract-notes.ts`

## Files to Modify
- `components/contracts/drawer-notes.tsx`

## Test Criteria
- [ ] Notes load khi mở drawer
- [ ] Đóng/mở lại → dùng cache, không flash loading
- [ ] Add note → optimistic update + SWR mutate
- [ ] Error handling giữ nguyên

---
Next Phase: phase-06 (Detail page sync)
