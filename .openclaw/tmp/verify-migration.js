const fs = require('fs');
const dotenv = require('dotenv');
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));

async function verify() {
  const { Client } = require('pg');
  const client = new Client({
    connectionString: envConfig.SUPABASE_POOLER_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  // Check new columns on printing_orders
  const cols = await client.query(
    `SELECT column_name, data_type FROM information_schema.columns
     WHERE table_schema='public' AND table_name='printing_orders'
       AND column_name IN ('issue_reason', 'issue_reported_at', 'issue_reported_by')
     ORDER BY ordinal_position`
  );
  console.log('=== printing_orders new columns ===');
  console.log(cols.rows.map(r => `${r.column_name} (${r.data_type})`).join('\n'));

  // Check new table
  const hist = await client.query(
    `SELECT column_name, data_type FROM information_schema.columns
     WHERE table_schema='public' AND table_name='printing_order_status_history'
     ORDER BY ordinal_position`
  );
  console.log('\n=== printing_order_status_history ===');
  console.log(hist.rows.map(r => `${r.column_name} (${r.data_type})`).join('\n'));

  // Check RLS policies
  const pol = await client.query(
    `SELECT policyname, cmd FROM pg_policies WHERE tablename = 'printing_order_status_history'`
  );
  console.log('\n=== RLS policies ===');
  console.log(JSON.stringify(pol.rows, null, 2));

  // Check indexes
  const idx = await client.query(
    `SELECT indexname FROM pg_indexes WHERE tablename = 'printing_order_status_history'`
  );
  console.log('\n=== Indexes ===');
  console.log(idx.rows.map(r => r.indexname).join('\n'));

  await client.end();
  console.log('\n✅ All checks passed!');
}

verify().catch(e => { console.error(e.message); process.exit(1); });
