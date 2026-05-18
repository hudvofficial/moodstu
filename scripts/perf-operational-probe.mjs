import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();

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

async function time(label, action) {
  const startedAt = performance.now();
  const result = await action();
  return {
    label,
    elapsedMs: Math.round(performance.now() - startedAt),
    ...result,
  };
}

loadEnvFile(path.join(root, ".env.local"));

const supabase = createClient(
  requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const { data: contract, error: contractError } = await supabase
  .from("contracts")
  .select("id, contract_code")
  .is("deleted_at", null)
  .order("updated_at", { ascending: false })
  .limit(1)
  .single();

if (contractError || !contract) {
  throw new Error(`Cannot find active contract: ${contractError?.message || "missing row"}`);
}

const detailFallbackQueries = () => Promise.all([
  supabase
    .from("contracts")
    .select("*, customers (*), contract_items (*)")
    .eq("id", contract.id)
    .is("deleted_at", null)
    .single(),
  supabase
    .from("contract_events")
    .select("*")
    .eq("contract_id", contract.id)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true }),
  supabase
    .from("work_tasks")
    .select("*, employees:assigned_to(id, full_name, avatar_url, department)")
    .eq("contract_id", contract.id)
    .order("deadline", { ascending: true }),
  supabase
    .from("contract_checklists")
    .select("*")
    .eq("contract_id", contract.id)
    .order("created_at", { ascending: true }),
  supabase
    .from("payments")
    .select("*")
    .eq("contract_id", contract.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(30),
  supabase
    .from("dress_reservations")
    .select("*, dresses(id, name, item_code, category, size, color, image_url)")
    .eq("contract_id", contract.id)
    .order("created_at", { ascending: false }),
  supabase
    .from("printing_orders")
    .select("id, order_code, status, total_amount, order_date, expected_date, received_date, notes, labs (id, name:lab_name)")
    .eq("contract_id", contract.id)
    .order("created_at", { ascending: false }),
  supabase
    .from("payment_plans")
    .select("id, contract_id, stage_name, stage_key, sort_order, amount, due_date, status, receipt_id, created_at, payment_plan_allocations(id, contract_id, payment_plan_id, payment_id, amount, created_at, created_by)")
    .eq("contract_id", contract.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true }),
]);

const samples = [];

samples.push(await time("contract_detail_rpc", async () => {
  const { data, error } = await supabase.rpc("get_contract_detail_v2", {
    p_contract_id: contract.id,
  });
  if (error) throw error;
  return {
    contractCode: contract.contract_code,
    events: data?.events?.length ?? 0,
    tasks: data?.work_tasks?.length ?? 0,
    printOrders: data?.print_orders?.length ?? 0,
  };
}));

samples.push(await time("contract_detail_fallback_group", async () => {
  const results = await detailFallbackQueries();
  const error = results.find((result) => result.error)?.error;
  if (error) throw error;
  return {
    contractCode: contract.contract_code,
    queries: results.length,
  };
}));

samples.push(await time("contract_list_rpc", async () => {
  const { data, error } = await supabase.rpc("get_contract_list_v2", {
    p_status: "all",
    p_search: "",
    p_service_type: "all",
    p_sort: "newest",
    p_time_filter: "all",
    p_start_date: null,
    p_end_date: null,
    p_page: 1,
    p_page_size: 20,
  });
  if (error) throw error;
  return { rows: data?.contracts?.length ?? 0 };
}));

samples.push(await time("contract_stats_rpc", async () => {
  const { data, error } = await supabase.rpc("contract_stats").maybeSingle();
  if (error) throw error;
  return { hasStats: Boolean(data) };
}));

console.log(JSON.stringify({
  sampledAt: new Date().toISOString(),
  contractId: contract.id,
  contractCode: contract.contract_code,
  samples,
}, null, 2));
