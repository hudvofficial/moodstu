# Phase 03: Auth Dedup & Polish
Status: ✅ Complete
Dependencies: Phase 01 (cùng file contract-mutations.ts)

## Objective
Giảm ~150-250ms cho flow Create bằng cách:
1. Loại bỏ duplicate auth trong create flow (C3)
2. Bỏ double-fetch contract code (W2)
3. Tune SWR deduping interval (S1)

## Issues Fixed
- 🔴 **C3**: 4x auth overhead trong create flow (120-200ms saved)
- 🟡 **W2**: Double-fetch contract code (30-50ms saved)
- 🟢 **S1**: SWR dedupingInterval chưa tối ưu

## Implementation Steps

### Step 1: Tạo internal versions cho automation functions (C3)
**Logic:** Create flow gọi `createContract()` (đã auth) → rồi gọi `generateContractEvents()`, `generateChecklists()`, `generateWorkTasksForContract()` (mỗi cái auth lại). Tạo internal versions nhận `supabase` client đã authenticated.

**File:** `app/actions/contract-event-actions.ts`
```typescript
// THÊM internal function (không auth lại):
export async function _generateContractEventsInternal(
  supabase: SupabaseClient, 
  contractId: string, 
  serviceType: ServiceType, 
  workDate?: string | null
) {
  // Move toàn bộ logic từ generateContractEvents vào đây
  // BỎ withAuth wrapper + requireContractAccess
}

// Public API vẫn giữ nguyên:
export async function generateContractEvents(...) {
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);
    return _generateContractEventsInternal(supabase, ...);
  });
}
```

**File:** `app/actions/checklist-actions.ts`
```typescript
// Tương tự: thêm _generateChecklistsInternal(supabase, ...)
```

**File:** `app/actions/work-task-actions.ts`
```typescript
// Tương tự: thêm _generateWorkTasksInternal(supabase, ...)
```

**File:** `app/actions/contract-mutations.ts`
```typescript
// Trong ensureContractAutomation, gọi internal versions:
import { _generateContractEventsInternal } from "./contract-event-actions";
import { _generateChecklistsInternal } from "./checklist-actions";  
import { _generateWorkTasksInternal } from "./work-task-actions";

async function ensureContractAutomation(supabase, contractId, serviceType, workDate) {
  // Dùng internal versions → skip auth lặp lại
  await _generateContractEventsInternal(supabase, contractId, serviceType, workDate);
  await Promise.all([
    _generateChecklistsInternal(supabase, contractId, serviceType),
    _generateWorkTasksInternal(supabase, contractId),
  ]);
}
```

> ⚠️ Naming convention: prefix `_` + suffix `Internal` = internal-only, không export cho client components gọi trực tiếp.

---

### Step 2: Loại bỏ double-fetch contract code (W2)
**File:** `components/contracts/form/hooks/useContractForm.ts`

**Current** — gọi `getNextContractCode()` 2 lần:
```typescript
// Lần 1: preview (line 70-76)
useEffect(() => {
  if (mode === "create") {
    getNextContractCode().then(r => { if (r.success) setPreviewCode(r.data) });
  }
}, [mode]);

// Lần 2: submit (line 171-175)
if (mode === "create") {
  const codeResult = await getNextContractCode();  // fetch LẠI
  if (!codeResult.success) throw new Error(codeResult.error);
  contractCode = codeResult.data;
}
```

**Fix** — reuse preview code, chỉ re-fetch nếu stale:
```typescript
// Submit: dùng lại previewCode, chỉ fetch mới nếu chưa có
if (mode === "create") {
  let contractCode = previewCode;
  if (!contractCode) {
    const codeResult = await getNextContractCode();
    if (!codeResult.success) throw new Error(codeResult.error);
    contractCode = codeResult.data;
  }
  // ...
}
```

> ⚠️ **Trade-off:** Nếu 2 user tạo HĐ cùng lúc, có thể trùng code. Nhưng RPC `save_contract_atomic` đã xử lý uniqueness constraint → sẽ retry nếu trùng. Risk = thấp.

---

### Step 3: Tune SWR dedupingInterval (S1)
**File:** `lib/hooks/use-contracts.ts`

**Current:**
```typescript
// useContracts: không set dedupingInterval (default 2s)
// useContractStats: dedupingInterval = 60_000
```

**Fix:**
```typescript
const { data, error, isLoading } = useSWR(
  key,
  fetcher,
  {
    ...SWR_STANDARD_CONFIG,
    dedupingInterval: 10_000,  // 10s — tránh re-fetch khi chuyển tab nhanh
    fallbackData: initialData,
  }
);
```

## Files to Modify
- `app/actions/contract-event-actions.ts` — Add `_generateContractEventsInternal`
- `app/actions/checklist-actions.ts` — Add `_generateChecklistsInternal`
- `app/actions/work-task-actions.ts` — Add `_generateWorkTasksInternal`
- `app/actions/contract-mutations.ts` — Use internal versions in ensureContractAutomation
- `components/contracts/form/hooks/useContractForm.ts` — Reuse preview code
- `lib/hooks/use-contracts.ts` — Add dedupingInterval

## Test Criteria
- [ ] Tạo HĐ mới → events, checklists, tasks vẫn auto-generate đúng
- [ ] Tạo HĐ khi gọi trực tiếp (không qua createContract) → auth vẫn hoạt động
- [ ] Contract code trên form preview = contract code sau submit
- [ ] Navigate nhanh giữa list tabs → không thấy loading flash
- [ ] 2 tab cùng mở `/contracts` → không duplicate requests

## Risk Assessment
- **Medium risk**: Thay đổi auth flow cần test kỹ cả public + internal paths
- **Rollback**: Revert internal functions → gọi lại public versions nếu có lỗi auth

---
End of Plan.
