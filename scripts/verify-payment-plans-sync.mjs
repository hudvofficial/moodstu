#!/usr/bin/env node
/**
 * verify-payment-plans-sync — ADR-020: lịch thu (payment_plans) phải khớp phiếu thu + tổng HĐ.
 * CHỈ chạy trên Postgres CỤC BỘ (127.0.0.1 / localhost). Mỗi kịch bản chạy trong transaction rồi ROLLBACK — không để lại dòng nào.
 * Dựng DB cục bộ: scripts/restore-drill.ps1 (cổng 5433, DB mood_restore). Mặc định: postgres://postgres@127.0.0.1:5433/mood_restore
 * Dùng:  LOCAL_PG_URL=... node scripts/verify-payment-plans-sync.mjs
 * Trước migration 20261020100000: A1/B1/B2 FAIL (tái hiện lỗi). Sau migration: tất cả PASS, exit 0.
 */
import { createHarness, num } from "./lib/local-contract-harness.mjs";

const { q, check, fixtures, createContract, editContract, pay, plans, invariant, scenario, client, finish } = await createHarness({
  itemLabel: "Gói test ADR-020",
});

const openPositive = (rows) => rows.filter((p) => num(p.amount) > 0 && !["paid", "cancelled"].includes(p.status));

// A1 — trả đủ lúc ký, nhãn Cọc (bug nhóm A)
await scenario("A1 trả đủ lúc ký nhãn Cọc", async () => {
  const id = await createContract({ total: 2000000, initial: 2000000, stage: "Cọc" });
  const rows = await plans(id);
  const dep = rows.find((p) => p.stage_key === "deposit");
  check("không còn đợt >0 chưa thu", openPositive(rows).length === 0, JSON.stringify(rows));
  check("phân bổ nằm ở đợt Cọc", dep && num(dep.alloc) === 2000000 && dep.status === "paid", JSON.stringify(dep));
  check("không đợt nào phân bổ vượt số kế hoạch", rows.every((p) => num(p.alloc) <= num(p.amount) + 0.01), JSON.stringify(rows));
  const inv = await invariant(id);
  check("Σ đợt = total", inv.ok, JSON.stringify(inv));
});

// A2 — hồi quy: cọc một phần rồi tất toán
await scenario("A2 cọc một phần rồi tất toán", async () => {
  const id = await createContract({ total: 3000000, initial: 500000, stage: "Cọc" });
  let rows = await plans(id);
  check("Cọc 500k đã thu, Tất toán 2,5tr chưa thu",
    rows.find((p) => p.stage_key === "deposit")?.status === "paid" &&
      num(rows.find((p) => p.stage_key === "final")?.amount) === 2500000, JSON.stringify(rows));
  await pay(id, 2500000, "Tất toán");
  rows = await plans(id);
  check("sau tất toán: không đợt >0 mở", openPositive(rows).length === 0, JSON.stringify(rows));
  check("Σ đợt = total", (await invariant(id)).ok);
});

// A3 — không cọc rồi trả đủ ở Tất toán
await scenario("A3 không cọc, trả đủ ở Tất toán", async () => {
  const id = await createContract({ total: 1500000 });
  await pay(id, 1500000, "Tất toán");
  const rows = await plans(id);
  check("không đợt >0 mở", openPositive(rows).length === 0, JSON.stringify(rows));
  check("Σ đợt = total", (await invariant(id)).ok);
});

// B1 — sửa giảm giá sau khi tạo (bug nhóm B: 0046, 0065)
await scenario("B1 sửa giảm giá sau khi tạo", async () => {
  const id = await createContract({ total: 6900000 });
  await editContract(id, { total: 6000000, discount: 900000 });
  const rows = await plans(id);
  check("đợt Tất toán = 6,0tr", num(rows.find((p) => p.stage_key === "final")?.amount) === 6000000, JSON.stringify(rows));
  await pay(id, 6000000, "Tất toán");
  const after = await plans(id);
  check("thu 6,0tr xong: không đợt >0 mở", openPositive(after).length === 0, JSON.stringify(after));
  check("Σ đợt = total", (await invariant(id)).ok);
});

// B2 — sửa tổng sau khi đã cọc: đợt Cọc không bị đụng
await scenario("B2 sửa tổng sau khi đã cọc", async () => {
  const id = await createContract({ total: 3500000, initial: 500000, stage: "Cọc" });
  await editContract(id, { total: 3000000, discount: 500000 });
  const rows = await plans(id);
  const dep = rows.find((p) => p.stage_key === "deposit");
  const fin = rows.find((p) => p.stage_key === "final");
  check("Cọc giữ 500k đã thu", dep && num(dep.amount) === 500000 && dep.status === "paid", JSON.stringify(dep));
  check("Tất toán = 2,5tr", fin && num(fin.amount) === 2500000, JSON.stringify(fin));
  check("Σ đợt = total", (await invariant(id)).ok);
});

// B3 — phát sinh rồi huỷ phát sinh không làm phồng Tất toán
await scenario("B3 phát sinh + huỷ phát sinh", async () => {
  const id = await createContract({ total: 1000000, initial: 1000000, stage: "Cọc" });
  const adj = await pay(id, 200000, "phat_sinh", { adjustment: true, notes: "phat sinh test ADR-020" });
  let rows = await plans(id);
  check("sau phát sinh: không đợt >0 mở", openPositive(rows).length === 0, JSON.stringify(rows));
  check("sau phát sinh: Σ đợt + phát sinh = total", (await invariant(id)).ok, JSON.stringify(await invariant(id)));
  // Lỗi riêng (T-20261020-fix-void-payment): trước khi migration sửa trigger lên, huỷ phiếu thu luôn văng
  // `record "new" has no field "updated_by"`. Chỉ khi hàm sống còn đọc NEW.updated_by mới tắt trigger TRONG transaction thử.
  const voidTriggerBroken = (await q("select prosrc ilike '%new.updated_by%' as bad from pg_proc where proname='restore_inventory_on_contract_payment_void'"))[0]?.bad;
  if (voidTriggerBroken) await client.query("ALTER TABLE public.payments DISABLE TRIGGER trg_restore_inventory_on_contract_payment_void");
  await q("select public.void_contract_payment_v2($1::uuid,$2,$3::uuid)", [adj.payment_id, "huy phat sinh test ADR-020", fixtures.actorId]);
  rows = await plans(id);
  check("sau huỷ phát sinh: không đợt >0 mở", openPositive(rows).length === 0, JSON.stringify(rows));
  check("sau huỷ phát sinh: Σ đợt = total", (await invariant(id)).ok, JSON.stringify(await invariant(id)));
});

// B4 — total không đổi thì không đụng lịch thu
await scenario("B4 total không đổi", async () => {
  const id = await createContract({ total: 2000000, initial: 500000, stage: "Cọc" });
  const before = JSON.stringify(await plans(id));
  await q("update contracts set total_amount = total_amount, notes = 'x' where id=$1", [id]);
  check("lịch thu y nguyên", JSON.stringify(await plans(id)) === before);
});

// B5 — bất kỳ người ghi total_amount nào (trigger phủ cả 8 đường ghi). Dùng UPDATE trực tiếp đại diện cho đường trang phục / bán kèm / kho.
// LỖI RIÊNG (ngoài ADR-020, đã đo 20/10): recalc_contract_totals khai biến kiểu payment_status_enum — kiểu này KHÔNG tồn tại trên prod
// -> hàm văng lỗi mọi lần gọi; dress-mutations.ts:437,553 không kiểm lỗi rpc nên total không bao giờ được tính lại ở đường trang phục.
await scenario("B5 UPDATE total_amount trực tiếp (đại diện đường ghi khác)", async () => {
  const id = await createContract({ total: 1000000, initial: 200000, stage: "Cọc" });
  await q("update contracts set total_amount = 1300000 where id=$1", [id]);
  const fin = (await plans(id)).find((p) => p.stage_key === "final");
  check("Tất toán đi theo total (1,1tr)", fin && num(fin.amount) === 1100000, JSON.stringify(fin));
  const inv = await invariant(id);
  check("Σ đợt = total", inv.ok, JSON.stringify(inv));
});

// C — hiệu chuẩn 2 health check trên dữ liệu thật đã restore
await scenario("C health check hiệu chuẩn trên dữ liệu restore", async () => {
  const rows = await q("select check_name, issue_count::int as n from contract_payment_health_checks()");
  const get = (name) => rows.find((r) => r.check_name === name)?.n;
  if (get("plan_allocation_exceeds_amount") === undefined) {
    check("có check plan_allocation_exceeds_amount (cần migration)", false);
    return;
  }
  // Trước khi dọn dữ liệu: đúng 9 + 2 HĐ đã biết. Sau cleanup-payment-plans-adr020.mjs: 0 + 0.
  const a = get("plan_allocation_exceeds_amount");
  const b = get("plan_amount_sum_mismatch");
  check("plan_allocation_exceeds_amount ≥ 9 (trước dọn; HĐ mới lệch do bug A làm tăng) hoặc 0 (sau dọn)", a >= 9 || a === 0, String(a));
  check("plan_amount_sum_mismatch ≥ 2 (trước dọn) hoặc 0 (sau dọn)", b >= 2 || b === 0, String(b));
  check("hai check cùng trạng thái (cùng trước dọn hoặc cùng sau dọn)", (a >= 9 && b >= 2) || (a === 0 && b === 0), `${a}/${b}`);
  const others = rows.filter((r) => !["plan_allocation_exceeds_amount", "plan_amount_sum_mismatch"].includes(r.check_name) && r.n > 0);
  check("check cũ không báo thêm", others.length === 0, JSON.stringify(others));
});

await finish();
