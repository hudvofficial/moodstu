# Phase 04: 🟢 Performance & SSOT Polish (W3-W5, S3, S5)
Status: ⬜ Pending
Dependencies: Phase 03
Priority: P2 — Nice-to-have

## Objective
Cải thiện performance (pagination, computation) và tăng SSOT compliance cho CSS utilities.

## Issues Addressed
- **W3**: `fetchDebts()` — thiếu pagination
- **W4**: `fetchGoals()` — thiếu pagination + `monthsLeft` sai
- **W5**: `investmentBookValue` — JS-side computation (document, không refactor)  
- **S3**: Finance CSS utility class
- **S5**: SWR client cache invalidation pattern

## Files to Modify

### 1. `app/actions/finance-operations-queries.ts`

**Task 4.1**: Thêm pagination cho `fetchDebts`

```typescript
export async function fetchDebts(params: { page?: number; pageSize?: number } = {}) {
  return withAuth(async (supabase) => {
    const { current, size, from, to } = pageWindow(params.page, params.pageSize || 20);
    const { data, error, count } = await supabase
      .from("debts")
      .select("id, entity_name, entity_type, type, amount, paid_amount, remaining, due_date, status, notes, updated_at", { count: "exact" })
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw new Error(`Lỗi tải công nợ: ${error.message}`);
    const items = (data || []).map(/* ...existing map logic... */);
    return { items, total: count || 0, page: current, pageSize: size };
  });
}
```

> ⚠️ **Breaking change**: Callers phải handle paginated response `{ items, total, page, pageSize }` thay vì array trực tiếp. Cần check UI components tiêu thụ `fetchDebts`.

**Task 4.2**: Thêm pagination cho `fetchGoals` + fix `monthsLeft` precision

```typescript
export async function fetchGoals(params: { page?: number; pageSize?: number } = {}) {
  return withAuth(async (supabase) => {
    const { current, size, from, to } = pageWindow(params.page, params.pageSize || 20);
    const { data, error, count } = await supabase
      .from("financial_goals")
      .select("...", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    // ... existing mapping logic
    
    // FIX W4: Dùng month diff chính xác thay vì hardcode 30 ngày
    if (goal.deadline) {
      const deadlineDate = new Date(goal.deadline);
-     monthsLeft = Math.max(0, Math.ceil((deadlineDate.getTime() - now.getTime()) / (86400000 * 30)));
+     monthsLeft = Math.max(0, 
+       (deadlineDate.getFullYear() - now.getFullYear()) * 12 
+       + deadlineDate.getMonth() - now.getMonth()
+     );
      monthlyNeeded = monthsLeft > 0 ? Math.ceil(remaining / monthsLeft) : remaining;
    }
    
    return { items, total: count || 0, page: current, pageSize: size };
  });
}
```

> ⚠️ Tương tự, callers cần handle paginated response.

### 2. `app/styles/utilities.css` (OPTIONAL)

**Task 4.3**: Thêm finance-specific CSS utility (S3)

```css
/* Finance — Quantitative Visual Language */
.finance-figure {
  font-weight: 900;           /* font-black */
  font-variant-numeric: tabular-nums;
  text-align: right;
}
```

### 3. Documentation (OPTIONAL)

**Task 4.4**: Document W5 decision

`investmentBookValue()` remains JS-side calculation. Rationale:
- Current dataset size ≤ 50 investments per studio
- Creating a DB view/RPC is premature optimization
- If scale exceeds 200 items → revisit in dedicated performance plan

**Task 4.5**: S5 — Document SWR invalidation pattern cho finance mutations

Thêm comment SSOT vào mỗi finance action rằng:
- `revalidatePath()` = server cache (Next.js)  
- Component-level `mutate()` = client cache (SWR)
- Hiện tại finance actions chỉ dùng `revalidatePath` — OK vì SWR `revalidateOnFocus: true` sẽ tự refresh khi user navigate back.
- Nếu cần instant update (realtime dashboard) → thêm SWR `mutate()` calls trong component `onSuccess` callbacks.

## Implementation Steps
1. [ ] Sửa `fetchDebts` — thêm pagination
2. [ ] Sửa `fetchGoals` — thêm pagination + fix monthsLeft
3. [ ] Check UI callers — xem có cần update component interface
4. [ ] (Optional) Thêm `.finance-figure` CSS utility
5. [ ] (Optional) Document SWR invalidation decision

## Test Criteria
- [ ] `fetchDebts({page: 1, pageSize: 5})` → trả đúng 5 items + total count
- [ ] `fetchGoals({page: 1, pageSize: 5})` → trả đúng 5 items + total count  
- [ ] `monthsLeft` calculation: deadline 2026-07-15 from 2026-04-13 → 3 months (không phải 3.06)
- [ ] TypeScript build pass
- [ ] Backward compatible — old callers `fetchDebts()` vẫn work (default pagination)

---
✅ End of Plan
