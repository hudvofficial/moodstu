# Phase 08: Contract Drawer Typing
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Thay `Record<string, unknown>` bằng proper TypeScript interface trong contract-drawer.tsx.

## Hiện trạng
```typescript
// ❌ Loose typing — no compile-time safety
function DrawerContent({
  contract: c,
  ...
}: {
  contract: Record<string, unknown>;  // ← Nhắm mắt cast
  paymentPlans: Record<string, unknown>[];
}) {
  const status = (c.status as ContractStatus) || "cho_xu_ly";  // ← Manual cast
  const customer = c.customers as { ... } | null;              // ← Manual cast
}
```

## Fix: Sử dụng types từ contract.ts
```typescript
import type { Contract, ContractEvent, WorkTask, ChecklistItem, PaymentPlan } from "@/types/contract";

// Drawer chỉ cần subset của Contract
interface DrawerContractData {
  contract_code: string;
  status: ContractStatus;
  service_type: ServiceType;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  work_date: string | null;
  dress_return_date?: string | null;
  customers: { full_name?: string; phone?: string; address?: string } | null;
  contract_events: ContractEvent[];
  work_tasks: WorkTask[];
  contract_checklists: ChecklistItem[];
}
```

## Implementation Steps
1. [ ] Check `types/contract.ts` có đủ types chưa (Contract, ContractEvent, WorkTask, etc.)
2. [ ] Tạo `DrawerContractData` interface trong `contract-drawer.tsx`
3. [ ] Thay `Record<string, unknown>` → `DrawerContractData`
4. [ ] Xóa tất cả manual cast (`c.status as ContractStatus`, etc.)
5. [ ] Thay `paymentPlans: Record<string, unknown>[]` → proper type

## Files to Modify
- `components/contracts/contract-drawer.tsx`

## Test Criteria
- [ ] TypeScript compile clean
- [ ] Không còn `as unknown`, `as string`, `as Record<>` cast
- [ ] IDE shows proper autocomplete cho contract fields

---
END OF PLAN
