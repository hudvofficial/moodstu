#!/usr/bin/env node
/**
 * verify-void-payment — T-20261020-fix-void-payment: huỷ phiếu thu hợp đồng (void_contract_payment_v2) phải chạy được.
 * CHỈ chạy trên Postgres CỤC BỘ; mỗi kịch bản trong transaction rồi ROLLBACK (khung: scripts/lib/local-contract-harness.mjs).
 * Dùng:  LOCAL_PG_URL=... node scripts/verify-void-payment.mjs
 * Trước migration 20261020110000: mọi kịch bản FAIL với `record "new" has no field "updated_by"`. Sau migration: tất cả PASS.
 */
import { createHarness, num } from "./lib/local-contract-harness.mjs";

const { q, check, fixtures, TODAY, client, createContract, pay, plans, invariant, scenario, finish } = await createHarness({
  itemLabel: "Gói test void-payment",
});

const voidPayment = (paymentId, reason = "huy phieu test void-payment") =>
  q("select public.void_contract_payment_v2($1::uuid,$2,$3::uuid) as r", [paymentId, reason, fixtures.actorId]).then((r) => r[0].r);

/** Chạy câu lệnh có thể lỗi, trả message lỗi (hoặc null) mà không làm hỏng transaction của kịch bản. */
async function expectError(fn) {
  await client.query("SAVEPOINT expect_err");
  try {
    await fn();
    await client.query("RELEASE SAVEPOINT expect_err");
    return null;
  } catch (e) {
    await client.query("ROLLBACK TO SAVEPOINT expect_err");
    return e.message;
  }
}

const contractRow = async (id) =>
  (await q("select total_amount::numeric t, paid_amount::numeric p, remaining_amount::numeric r, payment_status s from contracts where id=$1", [id]))[0];
const paymentRow = async (id) =>
  (await q("select deleted_at is not null as deleted, voided_at is not null as voided, void_reason from payments where id=$1", [id]))[0];
const allocCount = async (paymentId) =>
  (await q("select count(*)::int n from payment_plan_allocations where payment_id=$1", [paymentId]))[0].n;
const hasAdr020Trigger = async () =>
  (await q("select count(*)::int n from pg_trigger where tgname='trg_contract_total_resync_plans_v2'"))[0].n > 0;

// V1 — huỷ phiếu thường: tái hiện lỗi prod (HĐ-0075 kiểu: cọc 500k)
await scenario("V1 huỷ phiếu cọc 500k", async () => {
  const id = await createContract({ total: 2000000, initial: 500000, stage: "Cọc" });
  const paymentId = (await q("select id from payments where contract_id=$1 and deleted_at is null", [id]))[0].id;
  const res = await voidPayment(paymentId);
  check("RPC trả kết quả (không lỗi cột)", res && num(res.voided_amount) === 500000, JSON.stringify(res));
  const pay_ = await paymentRow(paymentId);
  check("phiếu deleted_at + voided_at + lý do", pay_.deleted && pay_.voided && pay_.void_reason === "huy phieu test void-payment", JSON.stringify(pay_));
  check("phân bổ của phiếu = 0", (await allocCount(paymentId)) === 0);
  const c = await contractRow(id);
  check("HĐ: paid 0, remaining = total, chua_thanh_toan", num(c.p) === 0 && num(c.r) === 2000000 && c.s === "chua_thanh_toan", JSON.stringify(c));
  const rows = await plans(id);
  const dep = rows.find((p) => p.stage_key === "deposit");
  check("đợt Cọc về pending, alloc 0, số tiền kế hoạch giữ 500k", dep && dep.status === "pending" && num(dep.alloc) === 0 && num(dep.amount) === 500000, JSON.stringify(rows));
});

// V2 — huỷ một phần: phiếu cọc còn nguyên
await scenario("V2 huỷ phiếu tất toán, phiếu cọc còn nguyên", async () => {
  const id = await createContract({ total: 3000000, initial: 500000, stage: "Cọc" });
  const final = await pay(id, 2500000, "Tất toán");
  await voidPayment(final.payment_id);
  const c = await contractRow(id);
  check("HĐ: paid 500k, remaining 2,5tr, thanh_toan_mot_phan", num(c.p) === 500000 && num(c.r) === 2500000 && c.s === "thanh_toan_mot_phan", JSON.stringify(c));
  const rows = await plans(id);
  const dep = rows.find((p) => p.stage_key === "deposit");
  const fin = rows.find((p) => p.stage_key === "final");
  check("Cọc vẫn paid (alloc 500k)", dep && dep.status === "paid" && num(dep.alloc) === 500000, JSON.stringify(dep));
  check("Tất toán về pending, alloc 0", fin && fin.status === "pending" && num(fin.alloc) === 0, JSON.stringify(fin));
});

// V3 — huỷ phiếu phát sinh: hạng mục phát sinh bị xoá mềm, tổng về số cũ
await scenario("V3 huỷ phiếu phát sinh", async () => {
  const id = await createContract({ total: 1000000, initial: 1000000, stage: "Cọc" });
  const adj = await pay(id, 200000, "phat_sinh", { adjustment: true, notes: "phat sinh test void-payment" });
  check("sau phát sinh: total 1,2tr", num((await contractRow(id)).t) === 1200000);
  await voidPayment(adj.payment_id);
  const c = await contractRow(id);
  check("sau huỷ: total về 1,0tr, remaining 0", num(c.t) === 1000000 && num(c.r) === 0, JSON.stringify(c));
  const items = await q("select deleted_at is not null as del from contract_items where id=(select contract_adjustment_item_id from payments where id=$1)", [adj.payment_id]);
  check("hạng mục phát sinh bị xoá mềm", items[0]?.del === true, JSON.stringify(items));
  if (await hasAdr020Trigger()) {
    const inv = await invariant(id);
    check("(ADR-020) Σ đợt + Σ phát sinh = total", inv.ok, JSON.stringify(inv));
  }
});

// V4 — huỷ lại phiếu đã huỷ: lỗi nghiệp vụ, không phải lỗi cột
await scenario("V4 huỷ lại phiếu đã huỷ", async () => {
  const id = await createContract({ total: 1500000, initial: 500000, stage: "Cọc" });
  const paymentId = (await q("select id from payments where contract_id=$1 and deleted_at is null", [id]))[0].id;
  await voidPayment(paymentId);
  const err = await expectError(() => voidPayment(paymentId));
  check("lần 2 báo 'da bi huy'", typeof err === "string" && /da bi huy/i.test(err), String(err));
  check("không phải lỗi cột updated_by", !/updated_by/.test(String(err)), String(err));
});

// V5 — kỳ đã chốt sổ chặn huỷ
await scenario("V5 kỳ đã chốt sổ", async () => {
  const id = await createContract({ total: 1500000, initial: 500000, stage: "Cọc" });
  const paymentId = (await q("select id from payments where contract_id=$1 and deleted_at is null", [id]))[0].id;
  await q("insert into finance_monthly_closes (period, status) values (to_char($1::date,'YYYY-MM'), 'locked')", [TODAY]);
  const err = await expectError(() => voidPayment(paymentId));
  check("báo 'chot so'", typeof err === "string" && /chot so/i.test(err), String(err));
  check("phiếu vẫn nguyên (chưa huỷ)", !(await paymentRow(paymentId)).deleted);
});

// V6 — sổ kỳ (finance_cash_entries) giảm đúng số phiếu huỷ
await scenario("V6 sổ kỳ giảm đúng số phiếu huỷ", async () => {
  const month = TODAY.slice(0, 7);
  const sumCashIn = async () => num((await q(
    "select coalesce(sum(cash_in_contract),0) s from finance_cash_entries(($1||'-01')::date, (($1||'-01')::date + interval '1 month' - interval '1 day')::date)",
    [month],
  ))[0].s);
  const id = await createContract({ total: 2000000, initial: 500000, stage: "Cọc" });
  const paymentId = (await q("select id from payments where contract_id=$1 and deleted_at is null", [id]))[0].id;
  const before = await sumCashIn();
  await voidPayment(paymentId);
  const after = await sumCashIn();
  check("cash_in_contract kỳ giảm 500k", before - after === 500000, `${before} → ${after}`);
});

// V7 — nhánh hoàn kho (contract_addon_sale): chưa từng chạy thật trên prod, thử ở đây
await scenario("V7 huỷ phiếu bán kèm có xuất kho → hoàn kho", async () => {
  const id = await createContract({ total: 1000000, initial: 500000, stage: "Cọc" });
  const paymentId = (await q("select id from payments where contract_id=$1 and deleted_at is null", [id]))[0].id;
  const item = (await q("insert into inventory_items (item_code, name, current_stock) values ('TEST-VOID-01','Vật tư test void',10) returning id"))[0].id;
  await q(
    "insert into inventory_transactions (item_id, transaction_type, quantity, unit_cost, contract_id, source_type, source_id) values ($1,'stock_out',2,1000,$2,'contract_addon_sale',$3)",
    [item, id, paymentId],
  );
  await q("update inventory_items set current_stock = 8 where id=$1", [item]);
  await voidPayment(paymentId);
  const back = await q("select quantity, transaction_type, source_type from inventory_transactions where item_id=$1 and transaction_type='stock_in' and source_type='return' and source_id=$2", [item, paymentId]);
  check("sinh 1 dòng stock_in / return, số lượng 2", back.length === 1 && num(back[0].quantity) === 2, JSON.stringify(back));
  const stock = num((await q("select current_stock from inventory_items where id=$1", [item]))[0].current_stock);
  check("tồn kho 8 → 10", stock === 10, String(stock));
});

await finish();
