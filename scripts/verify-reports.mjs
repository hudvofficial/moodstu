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

console.log("Verifying private reports RPCs are not callable by anon...");
for (const [name, args] of Object.entries(rpcArgs)) {
  await assertAnonDenied(anonClient, name, args);
  console.log(`- ${name}: anon denied`);
}

console.log("Reports verification passed.");
