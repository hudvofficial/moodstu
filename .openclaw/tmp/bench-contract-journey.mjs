import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function checkContracts() {
  const t0 = performance.now();
  const { data, error } = await supabase.rpc("get_contract_list_v2", {
    p_status: "all",
    p_service_type: "all",
    p_sort: "newest",
    p_time_filter: "all",
    p_page: 1,
    p_page_size: 20
  });
  const t1 = performance.now();
  console.log("Contracts:", Math.round(t1 - t0) + "ms", "error:", error?.message, "rows:", data?.contracts?.length);
}

async function checkStats() {
  const t0 = performance.now();
  const { data, error } = await supabase.rpc("get_contract_stats_v2");
  const t1 = performance.now();
  console.log("Stats:", Math.round(t1 - t0) + "ms", "error:", error?.message, "data:", data);
}

Promise.all([checkContracts(), checkStats()]).then(() => console.log("Done"));
