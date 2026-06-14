#!/usr/bin/env node
/**
 * Apply migration 20260615000001_vendor_payment_overpay_guard.sql via direct pg connection.
 * Mirrors scripts/migrate-vendors-pg.mjs. Runs the whole file in ONE query (implicitly atomic),
 * then verifies the overpay guard is present in the live function definition.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import pg from "pg";

const { Client } = pg;
const root = process.cwd();

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    let value = line.slice(i + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] ??= value;
  }
}

loadEnvFile(path.join(root, ".env.local"));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const dbPassword = process.env.SUPABASE_DB_PASSWORD;
if (!supabaseUrl || !dbPassword) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_DB_PASSWORD in .env.local");
  process.exit(1);
}

const projectRef = supabaseUrl.replace("https://", "").split(".")[0];
const encodedPassword = encodeURIComponent(dbPassword);
// Prefer the configured pooler URL (direct db.<ref>.supabase.co host is deprecated / IPv6-only).
const directUrl = `postgresql://postgres:${encodedPassword}@db.${projectRef}.supabase.co:5432/postgres`;
const connectionString = process.env.SUPABASE_POOLER_URL || directUrl;
console.log(`🔗 Using ${process.env.SUPABASE_POOLER_URL ? "pooler" : "direct"} connection`);

const migrationPath = path.join(root, "supabase/migrations/20260615000001_vendor_payment_overpay_guard.sql");
const migrationSQL = readFileSync(migrationPath, "utf8");

// Verify TLS against the pinned Supabase Root CA (verification stays ON — no MITM exposure).
const caPath = path.join(root, "scripts/supabase-pooler-ca.crt");
const sslConfig = existsSync(caPath)
  ? { ca: readFileSync(caPath, "utf8"), rejectUnauthorized: true }
  : true;
const client = new Client({ connectionString, ssl: sslConfig });

try {
  console.log(`🔌 Connecting to project ${projectRef} ...`);
  await client.connect();

  console.log("⚡ Applying overpay guard migration (whole file, atomic) ...");
  await client.query(migrationSQL);
  console.log("✅ Migration executed without error.");

  // Verify: the guard must be present in the live function definition
  const { rows } = await client.query(`
    SELECT pg_get_functiondef(p.oid) AS def, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'record_vendor_payment_atomic'
  `);
  console.log(`🧪 Overloads named record_vendor_payment_atomic: ${rows.length}`);
  rows.forEach((r, i) => console.log(`   [${i}] args: ${r.args}`));

  const guarded = rows.some(
    (r) => r.def.includes("v_total_remaining") && r.def.includes("vượt quá công nợ còn lại")
  );

  if (rows.length === 1 && guarded) {
    console.log("🎉 VERIFIED: single function, overpay guard is LIVE.");
  } else if (guarded) {
    console.log("🎉 VERIFIED: overpay guard present, but >1 overload exists (check args above for ambiguity).");
  } else {
    console.log("⚠️  VERIFICATION FAILED: guard NOT found in function body.");
    process.exit(2);
  }
} catch (e) {
  console.error("❌ Migration failed:", e.message, e.code ? `(code ${e.code})` : "");
  process.exit(1);
} finally {
  await client.end();
}
