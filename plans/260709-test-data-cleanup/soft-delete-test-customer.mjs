import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { Client } = pg;
const dir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dir, "..", "..");
const envLocal = fs.readFileSync(path.join(repoRoot, ".env.local"), "utf8");
const dbPassword = envLocal.match(/^SUPABASE_DB_PASSWORD=(.*)$/m)?.[1]?.trim();

const client = new Client({
  host: "db.mnoqeluywookswpcykha.supabase.co",
  port: 5432,
  user: "postgres",
  password: dbPassword,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});

const TEST_CUSTOMER_ID = "06a86352-fb7e-4d3b-8fd0-163ab7e73a81";

async function main() {
  await client.connect();
  await client.query("BEGIN");
  try {
    const result = await client.query(
      `UPDATE customers SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id, customer_code, full_name;`,
      [TEST_CUSTOMER_ID]
    );
    if (result.rowCount !== 1) throw new Error(`Expected 1 row, got ${result.rowCount}`);
    console.log("Soft-deleted customer:", JSON.stringify(result.rows[0]));
    await client.query("COMMIT");
    console.log("COMMITTED");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("ROLLED BACK:", e.message);
    process.exit(1);
  }
  await client.end();
}

main().catch((err) => {
  console.error("FAILED", err.message);
  process.exit(1);
});
