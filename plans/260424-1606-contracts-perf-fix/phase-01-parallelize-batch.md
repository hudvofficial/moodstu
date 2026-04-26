# Phase 01: Parallelize & Batch
Status: ✅ Complete
Dependencies: None (standalone fixes)

## Objective
Giảm ~350-750ms cho flow Create/Edit bằng cách:
1. Song song hóa post-save automation (C2)
2. Batch dress validation thay vì N+1 (W3)
3. Batch addon history upsert (W4)

## Issues Fixed
- 🔴 **C2**: Sequential post-save automation (200-400ms saved)
- 🟡 **W3**: N+1 dress validation (100-200ms saved)
- 🟡 **W4**: N+1 addon history upsert (50-150ms saved)

## Implementation Steps

### Step 1: Parallelize post-save automation (C2)
**File:** `app/actions/contract-mutations.ts` (line ~416-422)

**Current** (sequential):
```typescript
await syncDressReservationsForContract(supabase, contractId);
await ensureContractAutomation(contractId, serviceType, workDate);
await upsertAddonHistoryItems(supabase, data.items);
```

**Fix** (parallel — 3 tasks không phụ thuộc nhau):
```typescript
await Promise.all([
  syncDressReservationsForContract(supabase, contractId),
  ensureContractAutomation(contractId, serviceType, workDate),
  upsertAddonHistoryItems(supabase, data.items),
]);
```

> ⚠️ **LƯU Ý:** `ensureContractAutomation` bên trong vẫn giữ sequential (events → tasks) vì tasks phụ thuộc events. Chỉ parallelize 3 top-level calls.

---

### Step 2: Batch dress validation (W3)
**File:** `app/actions/contract-mutations.ts` (line ~54-76, function `validateDressAvailability`)

**Current** (N+1 — loop per dress):
```typescript
for (const dressId of uniqueDressIds) {
  const { data } = await supabase
    .from("dress_reservations")
    .select(...)
    .eq("dress_id", dressId)  // 1 query per dress
}
```

**Fix** (1 batch query + JS filter):
```typescript
// 1 query cho ALL dress IDs
const allDressIds = [...new Set(items.filter(i => i.dress_id).map(i => i.dress_id!))];
if (allDressIds.length === 0) return; // early return

const { data: conflicts } = await supabase
  .from("dress_reservations")
  .select("id, contract_id, dress_id, start_date, end_date, status")
  .in("dress_id", allDressIds)
  .in("status", ACTIVE_RESERVATION_STATUSES)
  .lte("start_date", range.endDate)
  .gte("end_date", range.startDate);

// Filter conflicts per dress trong JS
for (const dressId of allDressIds) {
  const dressConflicts = (conflicts || []).filter(
    c => c.dress_id === dressId && c.contract_id !== existingContractId
  );
  if (dressConflicts.length > 0) {
    throw new Error(`Váy ${dressId} đã được đặt trong khoảng thời gian này`);
  }
}
```

---

### Step 3: Batch addon history upsert (W4)
**File:** `app/actions/contract-mutations.ts` (line ~207-249, function `upsertAddonHistoryItems`)

**Current** (N+1 — loop per addon):
```typescript
for (const item of addonItems) {
  const { data: existing } = await supabase.from("addon_history")...  // SELECT
  if (existing) await supabase.from("addon_history").update(...)       // UPDATE
  else await supabase.from("addon_history").insert(...)                // INSERT
}
```

**Fix** (1 batch upsert):
```typescript
const addonItems = items.filter(i => i.is_addon && i.addon_category);
if (addonItems.length === 0) return;

const rows = addonItems.map(item => ({
  addon_name: item.item_name,
  addon_category: item.addon_category,
  last_price: item.unit_price,
  last_used_at: new Date().toISOString(),
}));

// Batch upsert — ON CONFLICT sẽ update existing
await supabase.from("addon_history").upsert(rows, {
  onConflict: "addon_name,addon_category",
  ignoreDuplicates: false,
});
```

> ⚠️ **LƯU Ý:** Cần verify `addon_history` table có UNIQUE constraint trên `(addon_name, addon_category)`. Nếu chưa có → tạo migration trước.

## Files to Modify
- `app/actions/contract-mutations.ts` — C2 (line ~416), W3 (line ~54-76), W4 (line ~207-249)

## Test Criteria
- [ ] Tạo HĐ mới với 3+ váy → không lỗi dress validation
- [ ] Tạo HĐ mới với addon items → addon_history được tạo đúng
- [ ] Tạo HĐ mới → events, checklists, tasks đều auto-generate đúng
- [ ] Edit HĐ → dress sync + addon update hoạt động
- [ ] So sánh thời gian tạo HĐ trước/sau fix (target: giảm 300ms+)

## Risk Assessment
- **Low risk**: Các thay đổi đều là refactor logic flow, không thay đổi business logic
- **Rollback**: Revert Promise.all → sequential nếu có lỗi race condition

---
Next Phase: phase-02-slim-list-query.md
