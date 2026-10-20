#!/usr/bin/env node
/**
 * verify-payment-plans-sync — ADR-020: lịch thu (payment_plans) phải khớp phiếu thu + tổng HĐ.
 * CHỈ chạy trên Postgres CỤC BỘ (127.0.0.1 / localhost). Mỗi kịch bản chạy trong transaction rồi ROLLBACK — không để lại dòng nào.
 * Dựng DB cục bộ: scripts/restore-drill.ps1 (cổng 5433, DB mood_restore). Mặc định: postgres://postgres@127.0.0.1:5433/mood_restore
 * Dùng:  LOCAL_PG_URL=... node scripts/verify-payment-plans-sync.mjs
 * Trước migration 20261020100000: A1/B1/B2 FAIL (tái hiện lỗi). Sau migration: tất cả PASS, exit 0.
 */
import pg from "pg";

const url = process.env.LOCAL_PG_URL || "postgres://postgres@127.0.0.1:5433/mood_restore";
const host = new URL(url).hostname;
if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) {
  console.error(`❌ Từ chối: ${host} không phải DB cục bộ. Script này chỉ chạy trên Postgres cục bộ.`);
  process.exit(2);
}

const client = new pg.Client({ connectionString: url });
await client.connect();

const results = [];
let currentScenario = "";
function check(name, ok, detail = "") {
  results.push({ scenario: currentScenario, name, ok: Boolean(ok), detail });
}

async function q(sql, params = []) {
  return (await client.query(sql, params)).rows;
}

const fixtures = {
  customerId: (await q("select id from customers limit 1"))[0].id,
  actorId: (await q("select id from auth.users limit 1"))[0].id,
  serviceType: (await q("select service_type from contracts where deleted_at is null limit 1"))[0].service_type,
};
const TODAY = new Date().toISOString().slice(0, 10);
let seq = 0;

async function createContract({ total, discount = 0, initial = 0, stage = null }) {
  seq += 1;
  const code = `HĐ-2099-${String(seq).padStart(4, "0")}`;
  const gross = total + discount;
  const payload = {
    p_contract: {
      contract_code: code,
      customer_id: fixtures.customerId,
      service_type: fixtures.serviceType,
      transaction_type: "hop_dong",
      contract_date: TODAY,
      work_date: TODAY,
      status: "cho_xu_ly",
      total_amount: total,
      discount_amount: discount,
    },
    p_customer: { customer_id: fixtures.customerId },
    p_items: [
      {
        type: "dich_vu", item_name: "Gói test ADR-020", quantity: 1,
        unit_price: gross, original_price: gross, discount_amount: 0, total_amount: gross, is_addon: false,
      },
    ],
    p_actor_id: fixtures.actorId,
    p_initial_payment:
      initial > 0
        ? { amount: initial, payment_method: "tien_mat", payment_stage: stage, payment_date: TODAY }
        : null,
  };
  const r = (await q("select public.save_contract_atomic($1::jsonb,$2::jsonb,$3::jsonb,$4::uuid,null,null,$5::jsonb) as r", [
    JSON.stringify(payload.p_contract), JSON.stringify(payload.p_customer), JSON.stringify(payload.p_items),
    payload.p_actor_id, payload.p_initial_payment ? JSON.stringify(payload.p_initial_payment) : null,
  ]))[0].r;
  return r.id;
}

async function editContract(contractId, { total, discount }) {
  const gross = total + discount;
  const contract = (await q("select * from contracts where id=$1", [contractId]))[0];
  const p_contract = {
    contract_code: contract.contract_code, customer_id: contract.customer_id, service_type: contract.service_type,
    transaction_type: "hop_dong", contract_date: TODAY, work_date: TODAY, status: contract.status,
    total_amount: total, discount_amount: discount,
  };
  const items = [{
    type: "dich_vu", item_name: "Gói test ADR-020", quantity: 1,
    unit_price: gross, original_price: gross, discount_amount: 0, total_amount: gross, is_addon: false,
  }];
  await q("select public.save_contract_atomic($1::jsonb,$2::jsonb,$3::jsonb,$4::uuid,$5::uuid,null,null)", [
    JSON.stringify(p_contract), JSON.stringify({ customer_id: contract.customer_id }), JSON.stringify(items),
    fixtures.actorId, contractId,
  ]);
}

async function pay(contractId, amount, stage, { adjustment = false, notes = null } = {}) {
  return (await q(
    "select public.process_contract_payment_v2($1,$2,'tien_mat'::payment_method_enum,$3::date,$4,null,$5,null,$6,$7::uuid) as r",
    [contractId, amount, TODAY, stage, notes, adjustment, fixtures.actorId],
  ))[0].r;
}

async function plans(contractId) {
  return q(
    `select pp.stage_key, pp.amount::numeric as amount, pp.status,
            coalesce((select sum(a.amount) from payment_plan_allocations a join payments p on p.id=a.payment_id and p.deleted_at is null where a.payment_plan_id=pp.id),0)::numeric as alloc
       from payment_plans pp where pp.contract_id=$1 and coalesce(pp.status,'pending')<>'cancelled' order by pp.sort_order, pp.created_at`,
    [contractId],
  );
}

async function invariant(contractId) {
  const r = (await q(
    `select c.total_amount::numeric as total,
       coalesce((select sum(x.amount) from payment_plans x where x.contract_id=c.id and coalesce(x.status,'pending')<>'cancelled' and coalesce(x.stage_key,'')<>'outside'),0)::numeric as plan_sum,
       coalesce((select sum(p.amount) from payments p where p.contract_id=c.id and p.deleted_at is null and coalesce(p.is_contract_adjustment,false)),0)::numeric as adj
     from contracts c where c.id=$1`,
    [contractId],
  ))[0];
  return { ...r, ok: Math.abs(Number(r.plan_sum) + Number(r.adj) - Number(r.total)) < 0.01 };
}

async function scenario(name, fn) {
  currentScenario = name;
  await client.query("BEGIN");
  try {
    await fn();
  } catch (e) {
    check("không lỗi RPC", false, e.message);
  } finally {
    await client.query("ROLLBACK");
  }
}

const num = (v) => Number(v);
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
  // LỖI RIÊNG (ngoài ADR-020, đã đo 20/10): trigger trg_restore_inventory_on_contract_payment_void đọc NEW.updated_by nhưng bảng
  // payments không có cột này -> mọi lần huỷ phiếu thu (void_contract_payment_v2) văng "record new has no field updated_by".
  // Tắt trigger đó TRONG transaction thử (ROLLBACK sau cùng) để kiểm riêng phần lịch thu.
  await client.query("ALTER TABLE public.payments DISABLE TRIGGER trg_restore_inventory_on_contract_payment_void");
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

await client.end();

let failed = 0;
let last = "";
for (const r of results) {
  if (r.scenario !== last) { console.log(`\n▶ ${r.scenario}`); last = r.scenario; }
  console.log(`  ${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.ok || !r.detail ? "" : `\n        ${r.detail}`}`);
  if (!r.ok) failed += 1;
}
console.log(`\n${failed === 0 ? "✅" : "❌"} ${results.length - failed}/${results.length} PASS`);
process.exit(failed === 0 ? 0 : 1);
