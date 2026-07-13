import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const contractId = process.argv[2];
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(contractId || '')) {
  console.error('Usage: node scripts/test/check-exact-query.js <contract-uuid>');
  process.exit(1);
}

async function check() {
  const { data, error } = await supabase
        .from("work_tasks")
        .select(
          "id, event_id, work_type, assigned_to, vendor_id, status, deadline, start_date, completion_date, cost, notes, employees:assigned_to(id, full_name), vendors:vendor_id(id, full_name, phone)"
        )
        .eq("contract_id", contractId);
  console.log("EXACT GET_CONTRACT_DRAWER_EXTRA OUTPUT:", JSON.stringify({ data, error }, null, 2));
}

check();
