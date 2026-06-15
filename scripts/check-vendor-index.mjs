import { config } from 'dotenv';
import pg from 'pg';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

config({ path: join(rootDir, '.env.local') });

let connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL || process.env.POSTGRES_URL;
if (!connectionString && process.env.NEXT_PUBLIC_SUPABASE_URL) {
  const match = process.env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (match) {
    const pw = encodeURIComponent(process.env.SUPABASE_DB_PASSWORD || process.env.DB_PASSWORD);
    connectionString = `postgresql://postgres:${match[1]}%5B${pw}%5D@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?pgbouncer=true`;
  }
}

async function check() {
  const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const res = await client.query("SELECT indexname FROM pg_indexes WHERE tablename = 'vendors' AND indexname = 'vendors_active_normalized_phone_uidx'");
  console.log('INDEX_FOUND:', res.rows.length > 0);
  await client.end();
}

check().catch(console.error);
