import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { Client } = pg;
const dir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dir, "..", "..");
const envLocal = fs.readFileSync(path.join(repoRoot, ".env.local"), "utf8");
const dbPassword = envLocal.match(/^SUPABASE_DB_PASSWORD=(.*)$/m)?.[1]?.trim();

const report = JSON.parse(fs.readFileSync(path.join(dir, "discovery-report.json"), "utf8"));
const ids = report.tables.employees.ids;

const client = new Client({
  host: "db.mnoqeluywookswpcykha.supabase.co",
  port: 5432,
  user: "postgres",
  password: dbPassword,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();
  await client.query("BEGIN");
  try {
    const result = await client.query(
      `UPDATE employees SET deleted_at = NOW() WHERE id = ANY($1) AND deleted_at IS NULL RETURNING id, full_name, employee_code;`,
      [ids]
    );
    console.log(`Updated ${result.rowCount} rows (expected ${ids.length}):`);
    console.log(JSON.stringify(result.rows, null, 2));
    if (result.rowCount !== ids.length) {
      throw new Error(`Row count mismatch: updated ${result.rowCount}, expected ${ids.length} -- rolling back`);
    }
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
