const fs = require('fs');
const dotenv = require('dotenv');

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));

async function check() {
  const { Client } = require('pg');
  const client = new Client({
    connectionString: envConfig.SUPABASE_POOLER_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  const tables = ['contracts', 'employees', 'printing_orders'];
  for (const t of tables) {
    const res = await client.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`,
      [t]
    );
    console.log(`\n=== ${t} ===`);
    console.log(res.rows.map(r => `${r.column_name} (${r.data_type})`).join('\n'));
  }

  // Check existing RLS policies on printing_orders for reference
  const pol = await client.query(
    `SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'printing_orders'`
  );
  console.log('\n=== printing_orders policies ===');
  console.log(JSON.stringify(pol.rows, null, 2));

  await client.end();
}

check().catch(e => { console.error(e.message); process.exit(1); });
