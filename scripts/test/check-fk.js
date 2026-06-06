require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.rpc('get_contract_list_v2', { p_page: 1, p_page_size: 1 });
  console.log("Data:", JSON.stringify(data, null, 2));
  if (error) console.error("Error:", error);
}

check();
