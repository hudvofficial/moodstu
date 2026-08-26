import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
const RANGE = { startDate: "2026-04-01", endDate: "2026-04-30" };

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;

  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] ??= value;
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} returned an invalid object payload`);
  }
  return value;
}

function assertArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} returned an invalid array payload`);
  }
  return value;
}

function assertClose(actual, expected, label) {
  const diff = Math.abs(actual - expected);
  if (diff > 0.01) {
    throw new Error(`${label} mismatch: expected ${expected}, got ${actual}`);
  }
}

async function assertRpc(client, name, args = undefined) {
  const { data, error } = await client.rpc(name, args);
  if (error) throw new Error(`${name} failed: ${error.message}`);
  return data;
}

async function assertAnonDenied(client, name, args = undefined) {
  const { error } = await client.rpc(name, args);
  if (!error) {
    throw new Error(`${name} is callable by anon; expected execute permission to be revoked`);
  }

  const message = error.message.toLowerCase();
  if (!message.includes("permission denied") && !message.includes("not found")) {
    throw new Error(`${name} anon denial returned unexpected error: ${error.message}`);
  }
}

loadEnvFile(path.join(root, ".env.local"));

const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

const serviceClient = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anonClient = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const rpcArgs = {
  finance_reports_snapshot: {
    p_start_date: RANGE.startDate,
    p_end_date: RANGE.endDate,
  },
  finance_ledger_range: {
    p_page: 1,
    p_page_size: 5,
    p_from_date: RANGE.startDate,
    p_to_date: RANGE.endDate,
    p_type: "all",
  },
  finance_debt_stats: undefined,
  finance_contract_profit_report: {
    p_status: "all",
    p_from: RANGE.startDate,
    p_to: RANGE.endDate,
    p_page: 1,
    p_page_size: 5,
  },
  finance_cashflow_timeline: {
    p_start_date: RANGE.startDate,
    p_end_date: RANGE.endDate,
  },
  // ADR-016 M2 — ba số, một bộ sổ
  finance_month_summary: { p_month: 4, p_year: 2026 },
  finance_pnl_by_month: { p_year: 2026 },
  payee_payment_history: { p_payee_type: "lab", p_payee_id: "00000000-0000-0000-0000-000000000000" },
  vendor_cost_report: { p_month: 4, p_year: 2026 },
  // ADR-016 M3
  finance_pending_collections: { p_limit: 5 },
  get_receivable_aging: undefined,
};

console.log("Verifying reports RPC contracts with service role...");

const snapshot = assertObject(
  await assertRpc(serviceClient, "finance_reports_snapshot", rpcArgs.finance_reports_snapshot),
  "finance_reports_snapshot",
);
assertObject(snapshot.summary, "finance_reports_snapshot.summary");
assertObject(snapshot.cashflowSummary, "finance_reports_snapshot.cashflowSummary");
assertArray(snapshot.serviceDistribution, "finance_reports_snapshot.serviceDistribution");
assertArray(snapshot.revenueBreakdown, "finance_reports_snapshot.revenueBreakdown");
console.log("- finance_reports_snapshot: ok");

const ledgerRows = assertArray(
  await assertRpc(serviceClient, "finance_ledger_range", rpcArgs.finance_ledger_range),
  "finance_ledger_range",
);
if (ledgerRows.length > 5) throw new Error("finance_ledger_range ignored page size");
console.log("- finance_ledger_range: ok");

assertArray(await assertRpc(serviceClient, "finance_debt_stats"), "finance_debt_stats");
console.log("- finance_debt_stats: ok");

assertArray(
  await assertRpc(serviceClient, "finance_contract_profit_report", rpcArgs.finance_contract_profit_report),
  "finance_contract_profit_report",
);
console.log("- finance_contract_profit_report: ok");

const timeline = assertArray(
  await assertRpc(serviceClient, "finance_cashflow_timeline", rpcArgs.finance_cashflow_timeline),
  "finance_cashflow_timeline",
);
console.log("- finance_cashflow_timeline: ok");

const timelineInflow = timeline.reduce((sum, row) => sum + asNumber(row.inflow), 0);
const timelineOutflow = timeline.reduce((sum, row) => sum + asNumber(row.outflow), 0);
assertClose(timelineInflow, asNumber(snapshot.cashflowSummary.totalInflow), "cashflow inflow");
assertClose(timelineOutflow, asNumber(snapshot.cashflowSummary.totalOutflow), "cashflow outflow");
console.log("- snapshot cashflow matches timeline totals");

// ADR-016 M2: một bộ sổ — month_summary, pnl_by_month và reports_snapshot cùng đọc finance_period_ledger
if (typeof snapshot.summary.signedRevenue !== "number") {
  throw new Error("finance_reports_snapshot.summary.signedRevenue missing (ADR-016 M2)");
}
const monthSummary = assertArray(
  await assertRpc(serviceClient, "finance_month_summary", rpcArgs.finance_month_summary),
  "finance_month_summary",
);
if (monthSummary.length !== 1) throw new Error("finance_month_summary must return exactly 1 row");
for (const key of ["cash_in", "cash_out", "cash_out_settlement", "cash_net", "revenue", "cost_total", "profit", "receivable", "payable"]) {
  if (!(key in monthSummary[0])) throw new Error(`finance_month_summary missing column ${key}`);
}
console.log("- finance_month_summary: ok");

const pnl = assertArray(await assertRpc(serviceClient, "finance_pnl_by_month", rpcArgs.finance_pnl_by_month), "finance_pnl_by_month");
if (pnl.length !== 12) throw new Error("finance_pnl_by_month must return 12 rows");
const pnlApril = pnl.find((row) => Number(row.raw_month) === 4);
assertClose(asNumber(pnlApril?.profit), asNumber(monthSummary[0].profit), "pnl_by_month vs month_summary profit");
assertClose(asNumber(pnlApril?.cash_out), asNumber(monthSummary[0].cash_out), "pnl_by_month vs month_summary cash_out");
assertClose(asNumber(snapshot.summary.netProfit), asNumber(monthSummary[0].profit), "snapshot netProfit vs month_summary profit");
assertClose(asNumber(snapshot.cashflowSummary.totalOutflow), asNumber(monthSummary[0].cash_out), "snapshot outflow vs month_summary cash_out");
console.log("- finance_pnl_by_month: ok (khớp month_summary + snapshot)");

assertArray(await assertRpc(serviceClient, "payee_payment_history", rpcArgs.payee_payment_history), "payee_payment_history");
console.log("- payee_payment_history: ok");

// ADR-016 M3: cần thu theo mốc giao — debt_stats đọc contracts (không phải bảng debts rỗng), month_summary có 3 cột mới
for (const key of ["receivable_due", "receivable_waiting", "payable_employee"]) {
  if (!(key in monthSummary[0])) throw new Error(`finance_month_summary missing column ${key} (M3)`);
}
assertClose(
  asNumber(monthSummary[0].receivable_due) + asNumber(monthSummary[0].receivable_waiting),
  asNumber(monthSummary[0].receivable),
  "receivable_due + receivable_waiting = receivable",
);
const debtStats = assertArray(await assertRpc(serviceClient, "finance_debt_stats"), "finance_debt_stats");
if (debtStats.length !== 1) throw new Error("finance_debt_stats must return exactly 1 row");
const { data: contractRecv, error: contractRecvErr } = await serviceClient
  .from("contracts").select("remaining_amount").is("deleted_at", null).neq("status", "da_huy").gt("remaining_amount", 0);
if (contractRecvErr) throw new Error(`contracts receivable probe failed: ${contractRecvErr.message}`);
const contractReceivable = (contractRecv || []).reduce((sum, row) => sum + asNumber(row.remaining_amount), 0);
if (asNumber(debtStats[0].receivable) + 0.01 < contractReceivable) {
  throw new Error(`finance_debt_stats.receivable (${debtStats[0].receivable}) < Σ contracts.remaining_amount (${contractReceivable}) — vẫn đọc bảng debts?`);
}
assertClose(asNumber(debtStats[0].overdue), asNumber(monthSummary[0].receivable_due), "debt_stats.overdue vs month_summary.receivable_due");
console.log("- finance_debt_stats: ok (phải thu = hợp đồng, quá hạn = đã giao chưa thu)");
const pending = assertArray(await assertRpc(serviceClient, "finance_pending_collections", { p_limit: 5 }), "finance_pending_collections");
if (pending.length > 5) throw new Error("finance_pending_collections ignored p_limit");
console.log("- finance_pending_collections: ok");
assertArray(await assertRpc(serviceClient, "vendor_cost_report", rpcArgs.vendor_cost_report), "vendor_cost_report");
console.log("- vendor_cost_report: ok");

for (const [name, args] of [
  ["finance_dashboard_metrics", { p_month: 4, p_year: 2026 }],
  ["finance_revenue_by_month", { p_year: 2026 }],
]) {
  const { error } = await serviceClient.rpc(name, args);
  if (!error) throw new Error(`${name} still exists; expected DROPPED (ADR-016 M2 — một sự thật)`);
  console.log(`- ${name}: dropped`);
}

console.log("Verifying private reports RPCs are not callable by anon...");
for (const [name, args] of Object.entries(rpcArgs)) {
  await assertAnonDenied(anonClient, name, args);
  console.log(`- ${name}: anon denied`);
}

console.log("Reports verification passed.");
