#!/usr/bin/env node
/**
 * #23 (T-20260911-close-timeline-ve-ledger) — lưới đối chiếu "một sổ kỳ duy nhất", phần TIỀN.
 *
 * Kiểm 4 điều, chỉ ĐỌC (service role, không ghi 1 dòng nào):
 *   1. Σ finance_cashflow_timeline == finance_period_ledger (tiền vào / tiền ra), từng tháng + cả dải.
 *   2. finance_cashflow_timeline == finance_cashflow_timeline_legacy, từng ngày, từng đồng.
 *   3. Công thức chốt sổ MỚI (đọc sổ kỳ) vs CŨ (tự cộng bảng) — lệch duy nhất được phép là
 *      `fixedCost`, và phải giải thích được bằng (kế hoạch fixed_costs − phiếu chi [Auto-Fixed]).
 *   4. anon không gọi được finance_cash_entries / finance_cashflow_timeline_legacy.
 *
 * Chạy: npm run verify:cashflow-ledger
 * Hạt giống của lưới verify-numbers ở bước #28 — không phải chính nó.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const sep = line.indexOf("=");
    if (sep === -1) continue;
    const key = line.slice(0, sep).trim();
    let value = line.slice(sep + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] ??= value;
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Thieu bien moi truong: ${name}`);
  return value;
}

const num = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};
const vnd = (n) => new Intl.NumberFormat("vi-VN").format(n);

loadEnvFile(path.join(root, ".env.local"));
loadEnvFile(path.join(root, ".env"));

const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const db = createClient(url, requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const anon = anonKey ? createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } }) : null;

const loi = [];
const fail = (msg) => loi.push(msg);

async function rpc(name, args) {
  const { data, error } = await db.rpc(name, args);
  if (error) throw new Error(`${name}: ${error.message}`);
  return data;
}

// Các tháng từ 2026-01 tới tháng hiện tại
function cacKy() {
  const now = new Date();
  const ky = [];
  for (let m = 0; m <= now.getUTCFullYear() * 12 + now.getUTCMonth() - (2026 * 12 + 0); m += 1) {
    const d = new Date(Date.UTC(2026, m, 1));
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth() + 1;
    ky.push({
      nhan: `${year}-${String(month).padStart(2, "0")}`,
      start: `${year}-${String(month).padStart(2, "0")}-01`,
      end: new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10),
    });
  }
  return ky;
}

// Công thức chốt sổ MỚI — phải khớp app/actions/finance-close-actions.ts buildCloseSnapshot
function chotSoMoi(ledger) {
  const paymentRevenue = num(ledger.cash_in_contract);
  const standaloneReceiptRevenue = num(ledger.cash_in_retail);
  const cashOut = num(ledger.cash_out);
  const fixedCost = num(ledger.cash_out_fixed);
  const operatingOutflow = cashOut - fixedCost;
  const totalInflow = paymentRevenue + standaloneReceiptRevenue;
  const totalOutflow = operatingOutflow + fixedCost;
  return {
    totalInflow,
    totalOutflow,
    paymentRevenue,
    standaloneReceiptRevenue,
    operatingOutflow,
    salaryCost: num(ledger.cash_out_salary),
    fixedCost,
    netCashflow: totalInflow - totalOutflow,
  };
}

// Công thức chốt sổ CŨ — tự cộng bảng, fixedCost lấy từ bảng KẾ HOẠCH fixed_costs
async function chotSoCu(ky) {
  const endExclusive = new Date(Date.UTC(Number(ky.end.slice(0, 4)), Number(ky.end.slice(5, 7)), 1))
    .toISOString()
    .slice(0, 10);

  const [pay, rec, exp, fix] = await Promise.all([
    db.from("payments").select("amount").is("deleted_at", null).gte("payment_date", ky.start).lt("payment_date", endExclusive),
    db
      .from("receipts")
      .select("receipt_amount")
      .is("deleted_at", null)
      .is("contract_id", null)
      .gte("receipt_date", ky.start)
      .lt("receipt_date", endExclusive),
    db
      .from("expenses")
      .select("amount, description, payee_type")
      .is("deleted_at", null)
      .gte("expense_date", ky.start)
      .lt("expense_date", endExclusive),
    db.from("fixed_costs").select("monthly_amount, start_date, end_date").is("deleted_at", null),
  ]);

  const err = pay.error || rec.error || exp.error || fix.error;
  if (err) throw new Error(`chot so cu ${ky.nhan}: ${err.message}`);

  const paymentRevenue = (pay.data || []).reduce((s, r) => s + num(r.amount), 0);
  const standaloneReceiptRevenue = (rec.data || []).reduce((s, r) => s + num(r.receipt_amount), 0);
  const operatingOutflow = (exp.data || []).reduce(
    (s, r) => (r.description?.startsWith("[Auto-Fixed]") ? s : s + num(r.amount)),
    0,
  );
  const salaryCost = (exp.data || []).reduce((s, r) => (r.payee_type === "employee" ? s + num(r.amount) : s), 0);
  const fixedCost = (fix.data || []).reduce((s, r) => {
    const amount = num(r.monthly_amount);
    if (!amount) return s;
    if (r.start_date && r.start_date >= endExclusive) return s;
    if (r.end_date && r.end_date < ky.start) return s;
    return s + amount;
  }, 0);
  const totalInflow = paymentRevenue + standaloneReceiptRevenue;
  const totalOutflow = operatingOutflow + fixedCost;
  return {
    totalInflow,
    totalOutflow,
    paymentRevenue,
    standaloneReceiptRevenue,
    operatingOutflow,
    salaryCost,
    fixedCost,
    netCashflow: totalInflow - totalOutflow,
  };
}

const ky = cacKy();
console.log(`Doi chieu mot so ky — ${ky.length} thang (${ky[0].nhan} → ${ky[ky.length - 1].nhan})\n`);

let tongLedgerIn = 0;
let tongLedgerOut = 0;
let tongTimelineIn = 0;
let tongTimelineOut = 0;
const bang = [];
let coLegacy = true;

for (const k of ky) {
  const ledger = (await rpc("finance_period_ledger", { p_start: k.start, p_end: k.end }))?.[0];
  if (!ledger) {
    fail(`${k.nhan}: finance_period_ledger khong tra dong nao`);
    continue;
  }
  const timeline = (await rpc("finance_cashflow_timeline", { p_start_date: k.start, p_end_date: k.end })) || [];

  const ledIn = num(ledger.cash_in_contract) + num(ledger.cash_in_retail);
  const ledOut = num(ledger.cash_out);
  const tlIn = timeline.reduce((s, r) => s + num(r.inflow), 0);
  const tlOut = timeline.reduce((s, r) => s + num(r.outflow), 0);

  // (1) biểu đồ tiền == sổ kỳ
  if (tlIn !== ledIn) fail(`${k.nhan}: tien VAO biểu đồ ${vnd(tlIn)} != sổ kỳ ${vnd(ledIn)}`);
  if (tlOut !== ledOut) fail(`${k.nhan}: tien RA biểu đồ ${vnd(tlOut)} != sổ kỳ ${vnd(ledOut)}`);

  // (2) biểu đồ mới == bản _legacy, từng ngày
  let legacyRows = null;
  if (coLegacy) {
    const { data, error } = await db.rpc("finance_cashflow_timeline_legacy", { p_start_date: k.start, p_end_date: k.end });
    if (error) {
      // Hàm _legacy đã gỡ (migration 20260911170000) → bỏ qua nhánh này, không báo lỗi.
      coLegacy = false;
      console.log("  (ban _legacy da go — bo qua doi chieu (2))\n");
    } else {
      legacyRows = data || [];
    }
  }
  if (legacyRows) {
    if (legacyRows.length !== timeline.length) {
      fail(`${k.nhan}: biểu đồ ${timeline.length} ngày != _legacy ${legacyRows.length} ngày`);
    }
    const theoNgay = new Map(legacyRows.map((r) => [String(r.date), r]));
    for (const r of timeline) {
      const cu = theoNgay.get(String(r.date));
      if (!cu) {
        fail(`${k.nhan}: ngày ${r.date} có ở bản mới, không có ở _legacy`);
        continue;
      }
      if (num(r.inflow) !== num(cu.inflow) || num(r.outflow) !== num(cu.outflow)) {
        fail(`${k.nhan} ${r.date}: mới ${vnd(num(r.inflow))}/${vnd(num(r.outflow))} != cũ ${vnd(num(cu.inflow))}/${vnd(num(cu.outflow))}`);
      }
    }
  }

  // (3) chốt sổ mới vs cũ
  const moi = chotSoMoi(ledger);
  const cu = await chotSoCu(k);
  const lech = {};
  for (const key of Object.keys(moi)) {
    if (moi[key] !== cu[key]) lech[key] = moi[key] - cu[key];
  }
  const lechNgoaiFixed = Object.keys(lech).filter(
    (key) => !["fixedCost", "operatingOutflow", "totalOutflow", "netCashflow"].includes(key),
  );
  if (lechNgoaiFixed.length) {
    fail(`${k.nhan}: chốt sổ lệch ngoài chi phí cố định — ${lechNgoaiFixed.map((x) => `${x} ${vnd(lech[x])}`).join(", ")}`);
  }
  if (lech.fixedCost !== undefined && lech.totalOutflow !== undefined && lech.totalOutflow !== lech.fixedCost) {
    fail(`${k.nhan}: lệch totalOutflow ${vnd(lech.totalOutflow)} không giải thích được bằng lệch fixedCost ${vnd(lech.fixedCost)}`);
  }

  tongLedgerIn += ledIn;
  tongLedgerOut += ledOut;
  tongTimelineIn += tlIn;
  tongTimelineOut += tlOut;
  bang.push({
    ky: k.nhan,
    vao: vnd(ledIn),
    ra: vnd(ledOut),
    ngay: timeline.length,
    chot_ra: vnd(moi.totalOutflow),
    lech_chot_so: Object.keys(lech).length ? Object.entries(lech).map(([a, b]) => `${a} ${vnd(b)}`).join(" · ") : "0",
  });
}

console.table(bang);

if (tongTimelineIn !== tongLedgerIn) fail(`cả dải: tiền VÀO biểu đồ ${vnd(tongTimelineIn)} != sổ kỳ ${vnd(tongLedgerIn)}`);
if (tongTimelineOut !== tongLedgerOut) fail(`cả dải: tiền RA biểu đồ ${vnd(tongTimelineOut)} != sổ kỳ ${vnd(tongLedgerOut)}`);

// (4) anon không gọi được 2 hàm mới
if (anon) {
  for (const [name, args] of [
    ["finance_cash_entries", { p_start: "2026-08-01", p_end: "2026-08-31" }],
    ["finance_cashflow_timeline_legacy", { p_start_date: "2026-08-01", p_end_date: "2026-08-31" }],
  ]) {
    const { error } = await anon.rpc(name, args);
    if (!error) fail(`vai anon vẫn gọi được ${name} — phải bị chặn`);
  }
} else {
  console.log("(khong co NEXT_PUBLIC_SUPABASE_ANON_KEY — bo qua kiem anon)");
}

if (loi.length) {
  console.error(`\n❌ verify:cashflow-ledger — ${loi.length} lỗi:`);
  for (const m of loi) console.error(`  - ${m}`);
  process.exit(1);
}

console.log(
  `\n✅ verify:cashflow-ledger — ${ky.length} tháng: biểu đồ == sổ kỳ${coLegacy ? " == _legacy" : ""}; chốt sổ chỉ lệch ở chi phí cố định (kế hoạch vs phiếu chi thật); anon bị chặn.`,
);
