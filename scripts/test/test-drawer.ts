import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  // Let's get the work_tasks for the specific contract ID.
  // Wait, I don't know the contract ID! Let's get the latest one.
  const { data: latestTasks } = await supabase
    .from("work_tasks")
    .select("id, event_id, contract_id, work_type, assigned_to, vendor_id, employees:assigned_to(id, full_name), vendors:vendor_id(id, full_name)")
    .order("created_at", { ascending: false })
    .limit(10);
  
  console.log(JSON.stringify(latestTasks, null, 2));
}

main();
