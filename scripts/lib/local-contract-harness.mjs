/**
 * local-contract-harness — khung dùng chung cho các script thử DB trên Postgres CỤC BỘ (verify-payment-plans-sync, verify-void-payment…).
 * - Từ chối mọi host không phải localhost (không bao giờ chạm prod).
 * - Mỗi kịch bản chạy trong transaction rồi ROLLBACK — không để lại dòng nào.
 * - Dùng RPC thật (save_contract_atomic, process_contract_payment_v2) để dựng HĐ/phiếu thu như app.
 * Dựng DB cục bộ: scripts/restore-drill.ps1 (cổng 5433, DB mood_restore).
 */
import pg from "pg";

export const num = (v) => Number(v);

export async function createHarness({ urlEnv = "LOCAL_PG_URL", itemLabel = "Gói test" } = {}) {
  const url = process.env[urlEnv] || "postgres://postgres@127.0.0.1:5433/mood_restore";
  const host = new URL(url).hostname;
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) {
    console.error(`❌ Từ chối: ${host} không phải DB cục bộ. Script này chỉ chạy trên Postgres cục bộ.`);
    process.exit(2);
  }

  const client = new pg.Client({ connectionString: url });
  await client.connect();

  const results = [];
  let currentScenario = "";
  const check = (name, ok, detail = "") => results.push({ scenario: currentScenario, name, ok: Boolean(ok), detail });
  const q = async (sql, params = []) => (await client.query(sql, params)).rows;

  const fixtures = {
    customerId: (await q("select id from customers limit 1"))[0].id,
    actorId: (await q("select id from auth.users limit 1"))[0].id,
    serviceType: (await q("select service_type from contracts where deleted_at is null limit 1"))[0].service_type,
  };
  const TODAY = new Date().toISOString().slice(0, 10);
  let seq = 0;

  const itemsFor = (gross) => [{
    type: "dich_vu", item_name: itemLabel, quantity: 1,
    unit_price: gross, original_price: gross, discount_amount: 0, total_amount: gross, is_addon: false,
  }];

  async function createContract({ total, discount = 0, initial = 0, stage = null }) {
    seq += 1;
    const code = `HĐ-2099-${String(seq).padStart(4, "0")}`;
    const p_contract = {
      contract_code: code, customer_id: fixtures.customerId, service_type: fixtures.serviceType,
      transaction_type: "hop_dong", contract_date: TODAY, work_date: TODAY, status: "cho_xu_ly",
      total_amount: total, discount_amount: discount,
    };
    const p_initial_payment = initial > 0
      ? { amount: initial, payment_method: "tien_mat", payment_stage: stage, payment_date: TODAY }
      : null;
    const r = (await q("select public.save_contract_atomic($1::jsonb,$2::jsonb,$3::jsonb,$4::uuid,null,null,$5::jsonb) as r", [
      JSON.stringify(p_contract), JSON.stringify({ customer_id: fixtures.customerId }), JSON.stringify(itemsFor(total + discount)),
      fixtures.actorId, p_initial_payment ? JSON.stringify(p_initial_payment) : null,
    ]))[0].r;
    return r.id;
  }

  async function editContract(contractId, { total, discount }) {
    const contract = (await q("select * from contracts where id=$1", [contractId]))[0];
    const p_contract = {
      contract_code: contract.contract_code, customer_id: contract.customer_id, service_type: contract.service_type,
      transaction_type: "hop_dong", contract_date: TODAY, work_date: TODAY, status: contract.status,
      total_amount: total, discount_amount: discount,
    };
    await q("select public.save_contract_atomic($1::jsonb,$2::jsonb,$3::jsonb,$4::uuid,$5::uuid,null,null)", [
      JSON.stringify(p_contract), JSON.stringify({ customer_id: contract.customer_id }), JSON.stringify(itemsFor(total + discount)),
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

  /** In kết quả, đóng kết nối, thoát với mã 0/1. */
  async function finish() {
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
  }

  return { client, q, check, fixtures, TODAY, createContract, editContract, pay, plans, invariant, scenario, finish };
}
