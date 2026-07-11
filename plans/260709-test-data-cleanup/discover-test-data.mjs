import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { Client } = pg;
const dir = path.dirname(fileURLToPath(import.meta.url));
const envFile = fs.readFileSync(path.join(dir, ".env.cleanup.local"), "utf8");
const roURL = envFile.match(/^MOOD_CLEANUP_RO_DATABASE_URL=(.*)$/m)?.[1]?.trim();
if (!roURL) throw new Error("MOOD_CLEANUP_RO_DATABASE_URL not found");

const client = new Client({ connectionString: roURL, ssl: { rejectUnauthorized: false } });

// Tier 1 (proposal.md §4): DEMO-/DEMO% prefix is the authoritative marker.
// Extended per the live UI screenshot (2026-07-09): "Debug Admin" employees and
// "E2E ..." display names are also confirmed test fixtures, so employees is
// matched on name too, not just a code prefix.
const CHECKS = [
  {
    table: "employees",
    idCol: "id",
    where: `full_name ILIKE 'DEMO%' OR full_name ILIKE 'Debug Admin%' OR full_name ILIKE 'E2E%' OR employee_code ILIKE 'DEMO%' OR employee_code ILIKE 'E2E%'`,
  },
  {
    table: "customers",
    idCol: "id",
    where: `full_name ILIKE 'DEMO%' OR full_name ILIKE 'E2E%' OR customer_code ILIKE 'DEMO%' OR customer_code ILIKE 'E2E%'`,
  },
  {
    table: "contracts",
    idCol: "id",
    where: `contract_code ILIKE 'DEMO-%' OR contract_code ILIKE 'E2E-%'`,
  },
  {
    table: "crm_leads",
    idCol: "id",
    where: `full_name ILIKE 'DEMO%' OR full_name ILIKE 'E2E%'`,
  },
];

async function main() {
  await client.connect();
  const report = { generated_at: new Date().toISOString(), tables: {} };

  for (const check of CHECKS) {
    const exists = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1;`,
      [check.table]
    );
    const cols = new Set(exists.rows.map((r) => r.column_name));
    if (cols.size === 0) {
      report.tables[check.table] = { error: "table not found" };
      continue;
    }
    // Only reference columns that actually exist on this table.
    const clause = check.where
      .split(" OR ")
      .filter((c) => cols.has(c.trim().split(" ")[0]))
      .join(" OR ");
    if (!clause) {
      report.tables[check.table] = { error: "none of the expected columns exist", available: [...cols] };
      continue;
    }
    const rows = await client.query(
      `SELECT ${check.idCol} FROM ${check.table} WHERE (${clause}) ${cols.has("deleted_at") ? "AND deleted_at IS NULL" : ""};`
    );
    const sample = await client.query(
      `SELECT * FROM ${check.table} WHERE (${clause}) ${cols.has("deleted_at") ? "AND deleted_at IS NULL" : ""} LIMIT 5;`
    );
    report.tables[check.table] = {
      count: rows.rowCount,
      ids: rows.rows.map((r) => r[check.idCol]),
      sample: sample.rows,
    };
  }

  const outPath = path.join(dir, "discovery-report.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log("WROTE", outPath);
  for (const [table, info] of Object.entries(report.tables)) {
    console.log(table, "->", info.error || `${info.count} candidate rows`);
  }

  await client.end();
}

main().catch((err) => {
  console.error("FAILED", err.message);
  process.exit(1);
});
