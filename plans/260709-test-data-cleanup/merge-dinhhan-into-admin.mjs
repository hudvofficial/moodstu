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

const DINH_HAN = "d762033f-2c74-4963-b309-56d632226123";

async function main() {
  await client.connect();
  await client.query("BEGIN");
  try {
    // Both employee_salaries rows are all-zero (never had real figures) and
    // duplicate months Admin already has real salary rows for -- delete
    // rather than repoint, nothing of value to preserve.
    const salaries = await client.query(
      `DELETE FROM employee_salaries WHERE employee_id = $1 RETURNING id, month, year;`,
      [DINH_HAN]
    );
    console.log(`Deleted ${salaries.rowCount} employee_salaries rows:`, JSON.stringify(salaries.rows));

    // Admin already has their own notification_preferences row -- Dinh Han's
    // is a duplicate, delete rather than repoint (would violate unique constraint).
    const prefs = await client.query(
      `DELETE FROM notification_preferences WHERE employee_id = $1 RETURNING employee_id;`,
      [DINH_HAN]
    );
    console.log(`Deleted ${prefs.rowCount} notification_preferences rows`);

    // Soft-delete the duplicate employee profile (reversible via deleted_at = NULL).
    const emp = await client.query(
      `UPDATE employees SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id, full_name;`,
      [DINH_HAN]
    );
    if (emp.rowCount !== 1) throw new Error(`Expected to soft-delete 1 employee row, got ${emp.rowCount}`);
    console.log("Soft-deleted employee:", JSON.stringify(emp.rows[0]));

    // Disable her separate login per user's choice -- ban far into the future
    // (Supabase Auth's own mechanism; reversible by setting banned_until back to NULL).
    const ban = await client.query(
      `UPDATE auth.users SET banned_until = '2099-12-31T00:00:00Z' WHERE id = $1 RETURNING id, email, banned_until;`,
      [DINH_HAN]
    );
    if (ban.rowCount !== 1) throw new Error(`Expected to ban 1 auth.users row, got ${ban.rowCount}`);
    console.log("Banned login:", JSON.stringify(ban.rows[0]));

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
