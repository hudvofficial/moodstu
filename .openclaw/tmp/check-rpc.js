const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkRpc() {
  const { error } = await supabase.rpc('prepare_gallery_share', {
    p_gallery_id: '00000000-0000-0000-0000-000000000000',
    p_user_id: '00000000-0000-0000-0000-000000000000'
  });
  console.log('RPC check:', error ? error.message : 'Existed/Ran');

  const { error: dbErr } = await supabase.from('gallery_share_links').select('id').limit(1);
  console.log('Table check:', dbErr ? dbErr.message : 'Existed');
}
checkRpc().catch((err) => { console.error(err); process.exit(1); });
