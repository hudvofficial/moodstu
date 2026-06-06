import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  let query = supabase
        .from("approval_requests")
        .select(`
          id,
          module,
          action_type,
          target_id,
          payload,
          reason,
          status,
          requested_by,
          reviewed_by,
          created_at,
          requester:users!approval_requests_requested_by_fkey(full_name),
          reviewer:users!approval_requests_reviewed_by_fkey(full_name)
        `, { count: 'exact' })
        .eq("module", "inventory");
        
    const offset = 0;
    query = query.order("created_at", { ascending: false }).range(offset, offset + 19);

    const { data, count, error } = await query;
    console.log("Error:", error);
    console.log("Count:", count);
    console.log("Data length:", data?.length);
}

main().catch(console.error);
