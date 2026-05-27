#!/usr/bin/env node
/**
 * Run vendors migration using pg module
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import pg from "pg";

const { Client } = pg;
const root = process.cwd();

// Load .env.local
function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] ??= value;
  }
}

loadEnvFile(path.join(root, ".env.local"));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const dbPassword = process.env.SUPABASE_DB_PASSWORD;

if (!supabaseUrl || !dbPassword) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_DB_PASSWORD");
  process.exit(1);
}

// Extract project ref from URL
const projectRef = supabaseUrl.replace("https://", "").split(".")[0];

// Encode password for URL (special chars like !@# need encoding)
const encodedPassword = encodeURIComponent(dbPassword);

// Build connection string
const connectionString = `postgresql://postgres:${encodedPassword}@db.${projectRef}.supabase.co:5432/postgres`;

console.log("\n🔧 Running Migration: Add Vendors to Contract Detail RPC");
console.log(`📊 Project: ${projectRef}\n`);

// Read migration SQL
const migrationPath = path.join(root, "supabase/migrations/20260527000000_add_vendors_to_contract_detail_v2.sql");
const migrationSQL = readFileSync(migrationPath, "utf8");

// Connect and execute
const client = new Client({ connectionString });

try {
  console.log("🔌 Connecting to database...");
  await client.connect();

  console.log("⚡ Executing migration...");
  await client.query(migrationSQL);

  console.log("✅ Migration applied successfully!\n");

  // Test the RPC
  console.log("🧪 Testing RPC...");
  const testQuery = `
    SELECT EXISTS (
      SELECT 1 FROM pg_proc
      WHERE proname = 'get_contract_detail_v2'
    ) as exists;
  `;
  const result = await client.query(testQuery);

  if (result.rows[0].exists) {
    console.log("✅ RPC function exists and ready to use\n");
  } else {
    console.log("⚠️  RPC function not found\n");
  }

  console.log("🎉 Done! Now run performance test:");
  console.log("   npm run perf:contract-detail\n");

} catch (error) {
  console.error("\n❌ Migration failed:");
  console.error(error.message);
  console.error("\nStack:", error.stack);
  process.exit(1);
} finally {
  await client.end();
}
