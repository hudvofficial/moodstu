// Benchmark contract search RPC: dashboard_revenue_chart isn't relevant here;
// we want to know how slow `get_contract_list_v2` is with a search term.
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function run(label, params) {
  const t0 = performance.now();
  const { data, error } = await supabase.rpc("get_contract_list_v2", params);
  const ms = Math.round(performance.now() - t0);
  if (error) {
    console.log(`[${label}] ${ms}ms  ERROR:`, error.message);
    return;
  }
  const count = Array.isArray(data?.contracts) ? data.contracts.length : 0;
  console.log(`[${label}] ${ms}ms  rows=${count}  total=${data?.total}`);
}

const base = {
  p_status: "all",
  p_service_type: "all",
  p_sort: "newest",
  p_time_filter: "all",
  p_start_date: null,
  p_end_date: null,
  p_page: 1,
  p_page_size: 20,
};

await run("no_search", { ...base, p_search: "" });
await run("search_hinh", { ...base, p_search: "hình" });
await run("search_a", { ...base, p_search: "a" });
await run("search_long", { ...base, p_search: "nguyen van" });
// Repeat to measure warm cache vs cold.
await run("search_hinh_warm", { ...base, p_search: "hình" });
