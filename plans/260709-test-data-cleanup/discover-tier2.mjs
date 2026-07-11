import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { Client } = pg;
const dir = path.dirname(fileURLToPath(import.meta.url));
const envFile = fs.readFileSync(path.join(dir, ".env.cleanup.local"), "utf8");
const roURL = envFile.match(/^MOOD_CLEANUP_RO_DATABASE_URL=(.*)$/m)?.[1]?.trim();

const client = new Client({ connectionString: roURL, ssl: { rejectUnauthorized: false } });

// Tier 2 heuristics from proposal.md §4 -- candidates only, human review required.
const TIER2_NAME = `(full_name ILIKE 'test%' OR full_name ILIKE 'demo%' OR full_name ILIKE 'aaa%' OR full_name ILIKE 'abc%' OR full_name ILIKE 'xxx%' OR full_name ILIKE 'zzz%' OR full_name ILIKE 'qa%' OR full_name ILIKE 'sample%' OR full_name ILIKE '%thử%' OR full_name ILIKE 'e2e%')`;
const TIER2_EMAIL = `(email ILIKE '%@test.%' OR email ILIKE '%@example.%' OR email ILIKE '%+test@%' OR email ILIKE '%mailinator%')`;
const TIER2_PHONE = `(phone IN ('0000000000','1234567890','1111111111','9999999999') OR phone ~ '^(\\d)\\1{9}$')`;

async function main() {
  await client.connect();

  console.log("=== customers: all 42 rows (small enough to eyeball) ===");
  const customers = await client.query(
    `SELECT id, customer_code, full_name, phone, email, created_at FROM customers WHERE deleted_at IS NULL ORDER BY created_at;`
  );
  console.log(JSON.stringify(customers.rows, null, 2));

  console.log("=== customers: Tier-2 pattern matches ===");
  const custTier2 = await client.query(
    `SELECT id, customer_code, full_name, phone, email FROM customers WHERE deleted_at IS NULL AND (${TIER2_NAME} OR ${TIER2_EMAIL} OR ${TIER2_PHONE});`
  );
  console.log(JSON.stringify(custTier2.rows, null, 2));

  console.log("=== contracts: all 38 rows ===");
  const contracts = await client.query(
    `SELECT id, contract_code, customer_id, total_amount, status, created_at FROM contracts WHERE deleted_at IS NULL ORDER BY created_at;`
  );
  console.log(JSON.stringify(contracts.rows, null, 2));

  console.log("=== crm_leads: all 3 rows ===");
  const leads = await client.query(
    `SELECT id, contact_name, phone, email, source FROM crm_leads WHERE deleted_at IS NULL;`
  );
  console.log(JSON.stringify(leads.rows, null, 2));

  await client.end();
}

main().catch((err) => {
  console.error("FAILED", err.message);
  process.exit(1);
});
