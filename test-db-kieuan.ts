import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function findKieuAn() {
  const { data: schedules } = await supabase
    .from("schedules")
    .select("*")
    .ilike("event_type", "%Kiều AN%");
  
  console.log("Schedules:", schedules);

  const { data: contractEvents } = await supabase
    .from("contract_events")
    .select("*")
    .ilike("title", "%Kiều AN%");

  console.log("Contract Events:", contractEvents);
}

findKieuAn();
