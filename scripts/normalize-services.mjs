import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function determineNewType(name, currentType) {
  const lc = name.toLowerCase();
  
  if (lc.includes('baby') || lc.includes('newborn')) return 'baby';
  if (lc.includes('gia đình') || lc.includes('gia_dinh')) return 'gia_dinh';
  if (lc.includes('bầu') || lc.includes('maternity')) return 'bau';
  if (lc.includes('sinh nhật')) return 'sinh_nhat';
  if (lc.includes('kỷ yếu')) return 'ky_yeu';
  if (lc.includes('phóng sự') || lc.includes('video') || lc.includes('quay')) return 'media';
  if (lc.includes('studio indoor')) return 'studio';
  if (lc.includes('pre-wedding') || lc.includes('couple')) return 'couple';
  if (lc.includes('combo') || lc.includes('trọn vẹn') || lc.includes('trọn gói')) return 'combo';
  if (lc.includes('cưới')) return 'ngay_cuoi';
  if (lc.includes('concept')) return 'concept';
  
  return 'khac';
}

async function main() {
  console.log("Fetching services...");
  const { data, error } = await supabase.from('services').select('id, name, service_type');

  if (error) {
    console.error("Error fetching services:", error);
    return;
  }

  const updates = data.map(service => {
    // Only map if it's one of the legacy types or not standard
    const validTypes = ["studio", "ngay_cuoi", "combo", "baby", "gia_dinh", "sinh_nhat", "bau", "concept", "couple", "ky_yeu", "media", "khac"];
    
    if (!validTypes.includes(service.service_type)) {
      const newType = determineNewType(service.name, service.service_type);
      return {
        id: service.id,
        name: service.name,
        old_type: service.service_type,
        new_type: newType
      };
    }
    return null;
  }).filter(Boolean);

  if (updates.length === 0) {
    console.log("All services already normalized.");
    return;
  }

  console.log(`Found ${updates.length} records to normalize:`);
  console.table(updates);

  console.log("Updating database...");
  for (const update of updates) {
    const { error: updError } = await supabase
      .from('services')
      .update({ service_type: update.new_type })
      .eq('id', update.id);
      
    if (updError) {
      console.error(`Failed to update ${update.id}:`, updError);
    }
  }

  console.log("Normalization complete! ✓");
}

main();
