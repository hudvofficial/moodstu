# Phase 03: Cache Auth + Client Employee Hook
Status: ✅ Complete
Dependencies: Phase 01

## Objective
Loại bỏ redundant employee lookup + chuyển activeEmployees sang client-side SWR.

## Implementation Steps

### 1. Cache `requireContractAccess` employee lookup
- [ ] File: `lib/auth_utils.ts`
- [ ] Hiện tại: `requireContractAccess` query employees table MỖI LẦN gọi
- [ ] Layout đã gọi `getAuthenticatedUserContext()` (cached với React.cache)
- [ ] Nhưng `requireContractAccess` query lại từ đầu → thừa ~100-200ms
- [ ] Fix: dùng `getEmployeeContextByAuthUserId` (đã cached) thay vì query mới

```typescript
// BEFORE: query employees mỗi lần
export async function requireContractAccess(supabase, userId) {
  const { data: employee } = await supabase
    .from("employees")
    .select("id, full_name, role, auth_user_id")
    .eq("auth_user_id", userId)
    .maybeSingle();  // ⛔ redundant query
  ...
}

// AFTER: reuse cached employee context
export async function requireContractAccess(supabase, userId) {
  const employee = await getEmployeeContextByAuthUserId(userId);
  // ↑ React.cache → same request = no extra query
  ...
}
```

### 2. Tạo `useActiveEmployees` SWR hook
- [ ] File: `lib/hooks/use-contracts.ts`
- [ ] Employees hiếm thay đổi → cache 2 phút
- [ ] Bỏ server-side fetch trong page.tsx (đã bỏ ở Phase 01)

```typescript
export function useActiveEmployees() {
  const { data } = useSWR("active-employees", async () => {
    const result = await getActiveEmployees();
    return result.success ? result.data : [];
  }, { 
    dedupingInterval: 120_000,  // 2 phút
    revalidateOnFocus: false,
  });
  return data || [];
}
```

### 3. Update ContractDetailClient dùng `useActiveEmployees`
- [ ] File: `components/contracts/detail/contract-detail-client.tsx`
- [ ] Thay prop `activeEmployees` bằng hook call
- [ ] Bỏ prop khỏi interface

## Files to Create/Modify
- `lib/auth_utils.ts` — Cache requireContractAccess
- `lib/hooks/use-contracts.ts` — Add useActiveEmployees hook
- `components/contracts/detail/contract-detail-client.tsx` — Use hook

## Test Criteria
- [ ] Auth vẫn hoạt động đúng (role check)
- [ ] Employee data available trong event timeline
- [ ] TypeScript: 0 errors

---
✅ All phases complete → Manual test trên browser
