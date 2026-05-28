import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(".env.local" };

// Import the function directly, but since it's a Next.js Server Action, it might fail outside of Next.js context because of `import "server-only"` or similar.
// Let's test the Supabase query directly.
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
;

async function test( {
  const txnId = "d7d1d5de-0000-0000-0000-000000000000"; // Fake UUID
  console.log("Fetching...";
  const { data, error } = await supabase
    .from("inventory_transactions"
    .select(`
      *,
      inventory_items (
        name,
        item_code
      ,
      
        
      
    `
    .or(`id.eq.${txnId},parent_transaction_id.eq.${txnId}`
    .order("created_at", { ascending: true };
    
  console.log("Result:", { data, error };
}

test(;
