import { config } from 'dotenv';
import pg from 'pg';

config({ path: '.env.local' });
const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL || process.env.SUPABASE_POOLER_URL;
if (!connectionString) throw new Error('No DB connection string');

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
await client.connect();

const column = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'printing_orders' AND column_name = 'print_file_url'");
console.log('print_file_url column:', column.rows);

const contractResult = await client.query("SELECT contract_id FROM printing_orders WHERE lab_id IS NOT NULL LIMIT 1");
const fallbackContractResult = contractResult.rows[0] ? null : await client.query("SELECT id AS contract_id FROM contracts WHERE deleted_at IS NULL LIMIT 1");
const contractId = contractResult.rows[0]?.contract_id || fallbackContractResult?.rows[0]?.contract_id;
console.log('contract:', contractId);

if (contractId) {
  const rpc = await client.query("SELECT (get_contract_detail_v2($1)::jsonb #> '{print_orders,0,labs,name}') AS lab_name", [contractId]);
  console.log('v2 first print order lab name:', rpc.rows);
}

const def = await client.query("SELECT pg_get_functiondef('get_contract_detail_v2'::regproc) AS def");
console.log('v2 uses name/lab_name:', def.rows[0].def.includes("'name', l.lab_name"));
console.log('v2 still uses bad lab_name/l.name:', def.rows[0].def.includes("'lab_name', l.name"));

await client.end();
