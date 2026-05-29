#!/usr/bin/env node
import fetch from 'node-fetch';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

config({ path: join(rootDir, '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🧪 Testing RPC Migration\n');

if (!SUPABASE_URL || !ANON_KEY) {
  console.log('❌ Missing Supabase credentials');
  process.exit(1);
}

async function testRPC() {
  try {
    // Test RPC with new parameters
    console.log('📡 Calling get_gallery_data_v2 with p_limit=50, p_offset=0...\n');

    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_gallery_data_v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify({
        p_gallery_id: 'debb307f-1bb3-4d59-8994-7de2bcea3b8d',
        p_limit: 50,
        p_offset: 0
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.log('❌ RPC call failed:');
      console.log('   Status:', response.status);
      console.log('   Error:', data);
      console.log('\n💡 Migration may not be applied yet. Run SQL in Supabase Dashboard.\n');
      process.exit(1);
    }

    console.log('✅ RPC call successful!\n');
    console.log('📊 Response structure:');
    console.log('   - images:', Array.isArray(data.images) ? `${data.images.length} items` : 'N/A');
    console.log('   - totalCount:', data.totalCount ?? 'N/A');
    console.log('   - hasMore:', data.hasMore ?? 'N/A');
    console.log('   - page:', data.page ?? 'N/A');
    console.log('   - pageSize:', data.pageSize ?? 'N/A');
    console.log('   - loadedCount:', data.loadedCount ?? 'N/A');
    console.log('   - reactionCounts:', typeof data.reactionCounts === 'object' ? 'Object' : 'N/A');
    console.log('   - albums:', Array.isArray(data.albums) ? `${data.albums.length} items` : 'N/A');

    if (data.page !== undefined && data.pageSize !== undefined && data.loadedCount !== undefined) {
      console.log('\n✅ Migration successful! RPC accepts new parameters.');
    } else {
      console.log('\n⚠️  Migration may be incomplete. Missing new fields (page, pageSize, loadedCount)');
    }

  } catch (err) {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  }
}

testRPC();
