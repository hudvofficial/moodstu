# Phase 07: Auto-Generate Debug + Backfill
Status: ⬜ Pending
Dependencies: None

## Objective
1. Fix silent error swallowing trong auto-generate flow
2. Tìm root cause tại sao 8 HĐ có 0 checklists
3. Backfill data cho 8 HĐ hiện tại

## Hiện trạng
```typescript
// contract-mutations.ts:228-229
// ❌ .catch(() => {}) = nuốt lỗi im lặng!
if (!data.existingContractId && contractId && data.formData.service_type) {
  generateChecklists(contractId, data.formData.service_type).catch(() => {});
}
```

## Investigation Steps
1. [ ] Check: 8 HĐ hiện tại có `service_type` nào?
2. [ ] Check: `checklist_templates` có template cho những service_type đó không?
3. [ ] Check: `generateChecklists()` matching logic có đúng không?
4. [ ] Test: gọi thủ công `generateChecklists(contractId, serviceType)` cho 1 HĐ

## Fix: contract-mutations.ts
```typescript
// ✅ Log error thay vì nuốt
if (!data.existingContractId && contractId && data.formData.service_type) {
  generateChecklists(contractId, data.formData.service_type).catch((err) => {
    console.error("[submitContract] Auto-generate checklists failed:", err);
  });
}
```

## Backfill SQL (sau khi debug xong)
```sql
-- Chạy 1 lần: generate checklists cho tất cả HĐ chưa có
-- Sẽ viết chính xác sau khi biết root cause
```

## Files to Modify
- `app/actions/contract-mutations.ts` — line 229: thay `.catch(() => {})` → `.catch(console.error)`

## Test Criteria
- [ ] Tạo HĐ mới → checklists auto-generate thành công
- [ ] Lỗi generate → log error ra console (không im lặng)
- [ ] 8 HĐ cũ có checklists sau backfill

---
Next Phase: phase-08 (Typing)
