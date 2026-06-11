const fs = require('fs');
const dotenv = require('dotenv');
const { Client } = require('pg');

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const sql = fs.readFileSync('supabase/migrations/20260520170000_prepare_gallery_share_rpc.sql', 'utf8');

async function runMigration() {
  const client = new Client({
    connectionString: envConfig.SUPABASE_POOLER_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Connected to Supabase');
    await client.query(sql);
    console.log('Gallery share RPC migration applied successfully');
  } catch (err) {
    console.error('Gallery share RPC migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
