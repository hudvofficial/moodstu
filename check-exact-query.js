import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vmyokikrmqshrvzavxof.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const contractId = 'bd8008c8-ce62-4ab2-a384-07f5ffbe908d';
  const { data, error } = await supabase
        .from("work_tasks")
        .select(
          "id, event_id, work_type, assigned_to, vendor_id, status, deadline, start_date, completion_date, cost, notes, employees:assigned_to(id, full_name), vendors:vendor_id(id, full_name, phone)"
        )
        .eq("contract_id", contractId);
  console.log("EXACT GET_CONTRACT_DRAWER_EXTRA OUTPUT:", JSON.stringify({ data, error }, null, 2));
}

check();
