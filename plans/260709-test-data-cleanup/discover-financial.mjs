import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { Client } = pg;
const dir = path.dirname(fileURLToPath(import.meta.url));
const envFile = fs.readFileSync(path.join(dir, ".env.cleanup.local"), "utf8");
const roURL = envFile.match(/^MOOD_CLEANUP_RO_DATABASE_URL=(.*)$/m)?.[1]?.trim();

const client = new Client({ connectionString: roURL, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();

  console.log("=== receipts (4 rows) ===");
  const receipts = await client.query(`SELECT id, receipt_type, contract_code, receipt_amount, customer_name, customer_phone, notes FROM receipts WHERE deleted_at IS NULL;`);
  console.log(JSON.stringify(receipts.rows, null, 2));

  console.log("=== payments: any notes/patterns worth flagging (30 rows) ===");
  const payments = await client.query(`SELECT id, contract_id, customer_id, amount, payment_method, notes FROM payments WHERE deleted_at IS NULL ORDER BY created_at;`);
  console.log(JSON.stringify(payments.rows, null, 2));

  console.log("=== printing_orders (21 rows) ===");
  const printing = await client.query(`SELECT id, order_code, contract_id, total_amount, status, notes FROM printing_orders WHERE deleted_at IS NULL;`);
  console.log(JSON.stringify(printing.rows, null, 2));

  await client.end();
}

main().catch((err) => {
  console.error("FAILED", err.message);
  process.exit(1);
});
