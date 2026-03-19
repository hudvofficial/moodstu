# Phase 02: Server Actions + SWR Hooks
Status: ✅ Complete
Dependencies: Phase 01 (UI Shell ✅), Phase 00 (Types ✅)

## Objective
Tạo data layer cho Contract module: Server Actions (backend) + SWR hooks (client cache).
Port V1 logic (contract.service.ts) → V2 Next.js Server Actions pattern.

## V1 Source (LOGIC ONLY):
- `0Moodstudio/webapp/lib/services/contract.service.ts` (322 lines)
- `0Moodstudio/webapp/lib/query/hooks/useContracts.ts`
- `0Moodstudio/webapp/lib/validations/contract.schema.ts`

## V2 Pattern (from crm.ts — proven):
```typescript
"use server";
import { withAuth } from "@/lib/auth";
import { ContractFilters } from "@/types/contract";

export async function getContracts(filters: ContractFilters) {
  return withAuth(async (supabase) => {
    // query with service_role (bypass RLS)
  });
}
```

---

## Implementation Steps

### Task 1: Server Action — `getContracts(filters)` 
**V1 logic giữ nguyên:** Query contracts table + joins + filter + pagination
- [x] Filter by status (ContractStatus enum — strict)
- [x] Filter by service_type (ServiceType enum — strict)
- [x] Filter by date range (time filter)
- [x] Search by contract_code, customer_name (ILIKE)
- [x] Pagination (page, pageSize = 20)
- [x] Order by created_at DESC
- [x] Join: checklists + work_progress (for badges)
- [x] Returns: `{ data: Contract[], count: number }`

### Task 2: Server Action — `getContractStats()`
**V1 logic giữ nguyên:** Count by status + aggregate financials
- [x] Count: total, active (Đang thực hiện), pending (Chờ xử lý), completed
- [x] Sum: total_amount (revenue), remaining_amount (outstanding)
- [x] Growth: compare vs last month (same queries with date filter)
- [x] Returns: `ContractStats`

### Task 3: Server Action — `getContractById(id)`
**V1 logic giữ nguyên:** Full detail with all joins
- [x] Contract base data
- [x] Join: customers (full profile)
- [x] Join: contract_details (line items)
- [x] Join: contract_events (timeline)
- [x] Join: work_progress + employees (tasks)
- [x] Join: receipts (payment history)
- [x] Join: contract_checklists
- [x] Returns: `ContractWithRelations`

### Task 4: Server Action — `getNextContractCode()`
**V1 logic COPY NGUYÊN:** HĐ-YYYY-XXXX format + retry loop
- [x] Format: `HĐ-${year}-${padStart(4, '0')}`
- [x] Query last code, increment
- [x] ⚠️ GIỮ retry loop 5 lần (race condition prevention)

### Task 5: Server Action — `submitContract(data)`
**V1 logic COPY NGUYÊN:** Atomic via RPC submit_contract_v4
- [x] Zod validate ContractSubmissionData TRƯỚC khi gọi RPC
- [x] findOrCreateCustomer (giữ dedup by phone logic)
- [x] Call RPC submit_contract_v4 (atomic)
- [x] ⚠️ Log orphan customer warning on RPC failure
- [x] revalidatePath("/contracts") after success
- [x] Returns: `{ id, contract_code }`

### Task 6: Server Action — `updateContractStatus(id, status)`
- [x] Validate status transition (không skip bước)
- [x] Update contracts table
- [x] revalidatePath after success

### Task 7: Server Action — `cancelContract(id, reason)`
- [x] Set status = "Đã hủy"
- [x] Add note with reason
- [x] revalidatePath after success

### Task 8: SWR Hook — `useContracts(filters)`
- [x] Calls getContracts server action
- [x] SWR key: `["contracts", filters]`
- [x] Returns: `{ contracts, count, isLoading, error, mutate }`

### Task 9: SWR Hook — `useContractStats()`
- [x] Calls getContractStats server action
- [x] SWR key: `["contract-stats"]`
- [x] Returns: `{ stats, isLoading }`

### Task 10: SWR Hook — `useContractDetail(id)`
- [x] Calls getContractById server action
- [x] SWR key: `["contract", id]`
- [x] Returns: `{ contract, isLoading, error, mutate }`

### Task 11: Zod Schema — `contractSchema`
- [x] Validate ContractFormData (strict enums)
- [x] Validate FormLineItem[] (quantity > 0, price >= 0)
- [x] Validate FormPaymentInfo (amount >= 0)
- [x] Custom: remaining = total - paid (consistency check)

---

## Files to Create

| File | Lines (max) | Purpose |
|------|-------------|---------|
| `app/actions/contracts.ts` | ≤ 250 | Server Actions (getContracts, getStats, getById) |
| `app/actions/contract-mutations.ts` | ≤ 200 | Server Actions (submit, updateStatus, cancel) |
| `lib/hooks/use-contracts.ts` | ≤ 120 | SWR hooks (useContracts, useStats, useDetail) |
| `lib/validations/contract.schema.ts` | ≤ 100 | Zod schemas |

## Test Criteria
- [ ] getContracts returns real data from Supabase ← Phase 03
- [ ] Filters work: status, service_type, search, date ← Phase 03
- [ ] Pagination returns correct count ← Phase 03
- [ ] getContractStats matches actual DB counts ← Phase 03
- [ ] getContractById returns full relations ← Phase 04
- [ ] submitContract atomic — all or nothing ← Phase 05
- [x] Zod rejects invalid data (missing fields, wrong enum)
- [x] SWR hooks revalidate after mutations
- [x] Build pass, 0 TypeScript errors ✅
- [x] NO client-side financial calculations

## ⚠️ Bug Prevention Checklist
- [x] ✅ Ghost Payment: Zod validates payment fields
- [x] ✅ F5 Bug: SWR mutate() + revalidatePath() built-in
- [x] ✅ Orphan Customer: dedup by phone + warning log
- [x] ✅ Race condition: retry loop 5x on customer_code
- [x] ✅ Type mismatch: strict Zod enums, NO `| string`
- [x] ✅ Financial drift: NO JS calc, RPC submit_contract_v4 only

---
Next Phase: → Phase 03 (Wire List UI → Real Data)
