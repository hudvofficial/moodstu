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
  const remaining = await client.query(
    `SELECT full_name, employee_code, department, role FROM employees WHERE deleted_at IS NULL ORDER BY full_name;`
  );
  console.log(`${remaining.rowCount} employees remain active:`);
  console.log(JSON.stringify(remaining.rows, null, 2));
  await client.end();
}

main().catch((err) => {
  console.error("FAILED", err.message);
  process.exit(1);
});
