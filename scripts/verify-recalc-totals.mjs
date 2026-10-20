#!/usr/bin/env node
/**
 * verify-recalc-totals — T-20261020-fix-recalc-totals: recalc_contract_totals phải chạy được và tính ĐÚNG.
 * CHỈ chạy trên Postgres CỤC BỘ; mỗi kịch bản trong transaction rồi ROLLBACK (khung: scripts/lib/local-contract-harness.mjs).
 * Dùng:  LOCAL_PG_URL=... node scripts/verify-recalc-totals.mjs
 * Trước migration 20261020120000: mọi kịch bản FAIL với `type "payment_status_enum" does not exist`. Sau migration: tất cả PASS.
 */
import { createHarness, num } from "./lib/local-contract-harness.mjs";

const { q, check, createContract, editContract, plans, invariant, scenario, finish, client } = await createHarness({
  itemLabel: "Gói test recalc",
});

const recalc = (id) => q("select public.recalc_contract_totals($1::uuid)", [id]);
const row = async (id) =>
  (await q("select total_amount::numeric t, paid_amount::numeric p, remaining_amount::numeric r, payment_status s, discount_amount::numeric d from contracts where id=$1", [id]))[0];
const hasAdr020Trigger = async () =>
  (await q("select count(*)::int n from pg_trigger where tgname='trg_contract_total_resync_plans_v2'"))[0].n > 0;
const addItem = (id, amount, name = "Phụ kiện test recalc") =>
  q("insert into contract_items (contract_id, type, item_name, quantity, unit_price, original_price, discount_amount, total_amount, is_addon) values ($1,'dich_vu',$2,1,$3,$3,0,$3,false) returning id", [id, name, amount]).then((r) => r[0].id);

// R1 — HĐ đã sửa (có hạng mục xoá mềm) + giảm giá: tổng không đổi
await scenario("R1 HĐ có giảm giá + hạng mục xoá mềm (kiểu HĐ-0046)", async () => {
  const id = await createContract({ total: 6900000 });
  await editContract(id, { total: 6000000, discount: 900000 }); // sửa = xoá mềm hạng mục cũ, chèn lại
  const soft = (await q("select count(*)::int n from contract_items where contract_id=$1 and deleted_at is not null", [id]))[0].n;
  check("có hạng mục xoá mềm (điều kiện thử)", soft >= 1, String(soft));
  const before = await row(id);
  await recalc(id);
  const after = await row(id);
  check("total vẫn 6,0tr (không cộng xoá mềm, có trừ giảm giá)", num(after.t) === 6000000, JSON.stringify({ before, after }));
  check("paid/remaining không đổi", num(after.p) === num(before.p) && num(after.r) === num(before.r), JSON.stringify({ before, after }));
});

// R2 — gọi trên MỌI HĐ: HĐ sống không đổi, HĐ xoá mềm không bị đụng
await scenario("R2 gọi trên toàn bộ HĐ (no-op)", async () => {
  const snap = async () => q("select id, deleted_at is not null del, total_amount::numeric t, paid_amount::numeric p, remaining_amount::numeric r, payment_status s from contracts order by id");
  const before = await snap();
  for (const c of before) await recalc(c.id);
  const after = await snap();
  const changedLive = before.filter((b, i) => !b.del && JSON.stringify(b) !== JSON.stringify(after[i]));
  const changedDeleted = before.filter((b, i) => b.del && JSON.stringify(b) !== JSON.stringify(after[i]));
  check(`HĐ sống đổi = 0 (trên ${before.filter((b) => !b.del).length} HĐ)`, changedLive.length === 0, JSON.stringify(changedLive.map((c) => c.id)));
  check(`HĐ xoá mềm đổi = 0 (trên ${before.filter((b) => b.del).length} HĐ)`, changedDeleted.length === 0, JSON.stringify(changedDeleted.map((c) => c.id)));
});

// R3 — thêm phụ kiện: tổng tăng; (nếu có ADR-020) đợt Tất toán đi theo
await scenario("R3 thêm phụ kiện 300k", async () => {
  const id = await createContract({ total: 1000000, initial: 200000, stage: "Cọc" });
  await addItem(id, 300000);
  await recalc(id);
  const c = await row(id);
  check("total 1,3tr, paid 200k, remaining 1,1tr", num(c.t) === 1300000 && num(c.p) === 200000 && num(c.r) === 1100000, JSON.stringify(c));
  if (await hasAdr020Trigger()) {
    const fin = (await plans(id)).find((p) => p.stage_key === "final");
    check("(ADR-020) đợt Tất toán 1,1tr", fin && num(fin.amount) === 1100000, JSON.stringify(fin));
    check("(ADR-020) Σ đợt = total", (await invariant(id)).ok);
  }
});

// R4 — bỏ phụ kiện (xoá mềm): tổng trở lại
await scenario("R4 bỏ phụ kiện (xoá mềm)", async () => {
  const id = await createContract({ total: 1000000 });
  const item = await addItem(id, 300000);
  await recalc(id);
  check("sau thêm: 1,3tr", num((await row(id)).t) === 1300000);
  await q("update contract_items set deleted_at = now() where id=$1", [item]);
  await recalc(id);
  check("sau bỏ: về 1,0tr", num((await row(id)).t) === 1000000);
});

// R5 — giảm giá lớn hơn tổng hạng mục: không âm
await scenario("R5 giảm giá ≥ tổng hạng mục", async () => {
  const id = await createContract({ total: 500000 });
  await q("update contracts set discount_amount = 900000 where id=$1", [id]);
  await recalc(id);
  const c = await row(id);
  check("total = 0 (không âm), remaining 0", num(c.t) === 0 && num(c.r) === 0, JSON.stringify(c));
});

// R6 — đã thu nhiều hơn tổng mới: remaining 0, đã thanh toán
await scenario("R6 tổng mới nhỏ hơn số đã thu", async () => {
  const id = await createContract({ total: 1000000, initial: 1000000, stage: "Cọc" });
  await q("update contract_items set deleted_at = now() where contract_id=$1", [id]);
  await recalc(id);
  const c = await row(id);
  check("total 0, paid 1tr giữ nguyên, remaining 0, da_thanh_toan", num(c.t) === 0 && num(c.p) === 1000000 && num(c.r) === 0 && c.s === "da_thanh_toan", JSON.stringify(c));
});

// R7 — HĐ xoá mềm: không bị tính về 0
await scenario("R7 HĐ đã xoá mềm", async () => {
  const id = await createContract({ total: 1000000 });
  await q("update contract_items set deleted_at = now() where contract_id=$1", [id]);
  await q("update contracts set deleted_at = now() where id=$1", [id]);
  await recalc(id);
  check("total vẫn 1,0tr", num((await row(id)).t) === 1000000);
});

// R8 — lệnh gọi lặp lại không đổi gì
await scenario("R8 gọi 2 lần liên tiếp", async () => {
  const id = await createContract({ total: 2000000, initial: 500000, stage: "Cọc" });
  await recalc(id);
  const a = await row(id);
  await recalc(id);
  const b = await row(id);
  check("kết quả y nguyên", JSON.stringify(a) === JSON.stringify(b), JSON.stringify({ a, b }));
  check("= trạng thái ban đầu (2tr, paid 500k)", num(b.t) === 2000000 && num(b.p) === 500000, JSON.stringify(b));
});

void client;
await finish();
