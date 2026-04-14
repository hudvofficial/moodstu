# Phase 07: Demo Seed Pipeline
Status: ⬜ Pending
Dependencies: Phase 01 (RPC), Phase 02 (pipeline logic)

## Objective
Refactor seed script để contract payments đi qua `payments` table (giống production pipeline), không bypass vào `receipts`. Thêm soft-deleted receipt để verify exclusion.

## Root Cause
Seed hiện tại insert contract receipts trực tiếp vào `receipts` table:
```typescript
receipts.push({
  contract_id: contract.id,      // ← GẮN hợp đồng
  receipt_type: "contract_deposit", // ← loại thu HĐ
  ...
});
await supabase.from("receipts").insert(receipts); // ← BYPASS pipeline!
```

Dashboard revenue = `payments + receipts WHERE contract_id IS NULL`
→ Seed data contract receipts bị MISS trong dashboard revenue.

## Requirements
### Functional
- [ ] Contract payments → insert `payments` + update `contracts.paid_amount/remaining_amount`
- [ ] Standalone receipt (other_income) → insert `receipts` (contract_id = null)
- [ ] 1 soft-deleted standalone receipt → verify excluded from metrics
- [ ] Cleanup xóa: `payments`, `receipts`, `inventory_transactions`, `contracts`, `customers` WHERE DEMO
- [ ] Prefix `DEMO-*` nhất quán

## Implementation Steps

### Step 1: Refactor seed function

**File:** `scripts/seed-finance-demo.ts`

```typescript
async function seed() {
  console.log("🌱 Seeding finance demo data...\n");

  // ── 1. CLEANUP OLD DEMO DATA ──
  await supabase.from("payments").delete().like("notes", "DEMO%");
  await supabase.from("receipts").delete().like("notes", "DEMO%");
  await supabase.from("contracts").delete().like("contract_code", "DEMO-%");
  await supabase.from("customers").delete().like("full_name", "DEMO%");
  console.log("🧹 Cleaned up old DEMO data");

  // ── 2. SEED CUSTOMERS ──
  // (giữ nguyên)

  // ── 3. SEED CONTRACTS ──
  // Fix status: "hoan_thanh" thay vì "Đã hoàn thành" (snake_case enum)

  // ── 4. CONTRACT PAYMENTS (qua payments table) ──
  for (const [i, contract] of insertedContracts.entries()) {
    // Deposit payment
    const deposit = 2_000_000;
    await supabase.from("payments").insert({
      contract_id: contract.id,
      amount: deposit,
      payment_method: "chuyen_khoan",
      payment_date: MONTH_AGO,
      payment_stage: "coc",
      notes: "DEMO cọc hợp đồng",
      created_by: null, // seed = no user context
    });

    // Second payment
    const second = 3_000_000;
    await supabase.from("payments").insert({
      contract_id: contract.id,
      amount: second,
      payment_method: "tien_mat",
      payment_date: TODAY,
      payment_stage: "thanh_toan",
      notes: "DEMO thanh toán đợt 2",
    });

    // Update contract financials
    const totalPaid = deposit + second;
    const remaining = Math.max(0, contract.total_amount - totalPaid);
    await supabase.from("contracts").update({
      paid_amount: totalPaid,
      remaining_amount: remaining,
      payment_status: remaining <= 0 ? "da_thanh_toan" : "thanh_toan_mot_phan",
    }).eq("id", contract.id);
  }

  // ── 5. STANDALONE RECEIPTS ──
  const receipts = [
    {
      receipt_date: TODAY,
      receipt_type: "other_income",
      payment_type: "tien_mat",
      contract_id: null,
      customer_name: "Khách vãng lai",
      receipt_amount: 500_000,
      status: "confirmed",
      notes: "DEMO thu khác — bán frame ảnh lẻ",
    },
    // Soft-deleted receipt (verify excluded from metrics)
    {
      receipt_date: TODAY,
      receipt_type: "other_income",
      payment_type: "chuyen_khoan",
      contract_id: null,
      customer_name: "DEMO Khách đã xóa",
      receipt_amount: 999_000,
      status: "confirmed",
      notes: "DEMO thu khác — ĐÃ XÓA (test soft-delete)",
      deleted_at: new Date().toISOString(),
    },
  ];

  await supabase.from("receipts").insert(receipts);

  // ── 6. SUMMARY ──
  console.log("\n🎉 Finance demo seed complete!");
  console.log("📊 Verify: 500k standalone visible, 999k soft-deleted hidden");
}
```

### Key Changes từ Original
1. Contract payments → `payments` table (KHÔNG `receipts`)
2. Update `contracts.paid_amount/remaining_amount` trực tiếp (seed = service_role)
3. Status enum: `hoan_thanh` thay vì `Đã hoàn thành`
4. Thêm 1 soft-deleted receipt
5. Cleanup mở rộng cho `payments` table

## Files to Create/Modify
- `scripts/seed-finance-demo.ts` — [MODIFY] major rewrite

## Test Criteria
- [ ] `npx tsx scripts/seed-finance-demo.ts` chạy thành công
- [ ] `SELECT COUNT(*) FROM payments WHERE notes LIKE 'DEMO%'` → 6 (3 contracts × 2 payments)
- [ ] `SELECT COUNT(*) FROM receipts WHERE notes LIKE 'DEMO%' AND deleted_at IS NULL` → 1
- [ ] `SELECT COUNT(*) FROM receipts WHERE notes LIKE 'DEMO%' AND deleted_at IS NOT NULL` → 1
- [ ] Dashboard KPI includes the 6 payments + 1 standalone receipt in revenue
- [ ] Dashboard KPI excludes soft-deleted receipt

---
Next Phase: [Phase 08 — Lint & Verify](phase-08-lint-verify.md)
