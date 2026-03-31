import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase
    .from('services')
    .select('id, name, service_type');

  if (error) {
    console.error("Error fetching services:", error);
    return;
  }

  const typesCount = {};
  data.forEach(s => {
    typesCount[s.service_type] = (typesCount[s.service_type] || 0) + 1;
  });

  console.log("Found service types:", typesCount);

  // Let's also print 5 random items for 'dich_vu' or undefined
  const dichVuItems = data.filter(s => s.service_type === 'dich_vu' || !s.service_type).slice(0, 10);
  console.log("Samples of 'dich_vu':", dichVuItems);
}

main();
