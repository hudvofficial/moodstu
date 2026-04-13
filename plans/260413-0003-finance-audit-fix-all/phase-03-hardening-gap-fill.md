# Phase 03: 🟡 Hardening Gap-fill (W6-W7)
Status: ⬜ Pending
Dependencies: Phase 02
Priority: P1

## Objective
Đưa `finance-category-actions.ts` lên cùng hardening standard với tất cả finance actions khác: Zod validation + consistent pattern.

## Issues Addressed
- **W6**: `finance-category-actions.ts` — Thiếu Zod validation schema
- **W7**: `finance-category-actions.ts` — Thiếu Period Lock (cần decision)

## Files to Modify

### 1. `lib/validations/finance.schema.ts` (ADD new schemas)

**Task 3.1**: Thêm Zod schema cho finance categories

```typescript
// ─── W6: Category Schema ────────────────── 
export const createCategorySchema = z.object({
  name: z.string().min(1, "Tên danh mục không được để trống").trim(),
  type: z.enum(["Thu", "Chi"]),
  category_code: z.string().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();
```

### 2. `app/actions/finance-category-actions.ts` (UPGRADE pattern)

**Task 3.2**: Thêm Zod validation vào create/update

Hiện tại:
```typescript
const name = input.name.trim();
if (!name) throw new Error("Ten danh muc khong duoc de trong");
```

Sửa thành:
```typescript
import { createCategorySchema, updateCategorySchema } from "@/lib/validations/finance.schema";

// Trong createFinanceCategory:
const parsed = createCategorySchema.safeParse(input);
if (!parsed.success) {
  throw new Error(`Dữ liệu không hợp lệ: ${parsed.error.issues.map((e: { message: string }) => e.message).join(", ")}`);
}
const name = parsed.data.name;
// ...rest stays same
```

```typescript
// Trong updateFinanceCategory:
const parsed = updateCategorySchema.safeParse(input);
if (!parsed.success) {
  throw new Error(`Dữ liệu không hợp lệ: ${parsed.error.issues.map((e: { message: string }) => e.message).join(", ")}`);
}
const name = parsed.data.name!; // partial → need assert
// ...rest stays same
```

**Task 3.3**: W7 Decision — Period Lock cho categories

> **Decision**: KHÔNG thêm `checkPeriodLock` cho categories.
> 
> **Lý do**: Transaction categories là **master data** (dữ liệu tham chiếu), không phải transactional data. Thêm period lock sẽ:
> 1. Block user khỏi sửa category name (typo fix) khi kỳ đã khoá
> 2. Không match business semantic — khoá sổ = khoá transactions, không khoá config
> 
> **Thay vào đó**: Thêm comment document exception:

```typescript
// NOTE: Categories là master data, không áp dụng checkPeriodLock.
// Period lock chỉ áp dụng cho transactional mutations (receipts, expenses, debts, etc.)
```

## Implementation Steps
1. [ ] Thêm `createCategorySchema` + `updateCategorySchema` vào `finance.schema.ts`
2. [ ] Sửa `finance-category-actions.ts` — apply Zod pattern
3. [ ] Thêm comment document W7 exception
4. [ ] Verify: `npm run build` clean

## Test Criteria
- [ ] `createFinanceCategory({name: "", type: "Thu"})` → Zod error "Tên danh mục không được để trống"
- [ ] `createFinanceCategory({name: "Test", type: "invalid"})` → Zod error enum
- [ ] TypeScript build pass
- [ ] Finance module compliance = 100% Zod coverage

---
Next Phase: → Phase 04 (Performance & SSOT)
