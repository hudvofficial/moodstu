#!/usr/bin/env node
/**
 * Check if get_contract_detail_v2 RPC includes vendors in work_tasks
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();

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

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

loadEnvFile(path.join(root, ".env.local"));

const supabase = createClient(
  requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false, autoRefreshToken: false } },
);

console.log("\n🔍 Checking RPC get_contract_detail_v2 for vendors...\n");

// Get a contract
const { data: contract, error: contractError } = await supabase
  .from("contracts")
  .select("id, contract_code")
  .is("deleted_at", null)
  .order("updated_at", { ascending: false })
  .limit(1)
  .single();

if (contractError || !contract) {
  console.error("❌ Cannot find contract:", contractError?.message);
  process.exit(1);
}

console.log(`📋 Testing with contract: ${contract.contract_code}`);
console.log(`   ID: ${contract.id}\n`);

// Call RPC
const { data: rpcData, error: rpcError } = await supabase
  .rpc("get_contract_detail_v2", { p_contract_id: contract.id });

if (rpcError) {
  console.error("❌ RPC error:", rpcError.message);
  process.exit(1);
}

if (!rpcData) {
  console.error("❌ RPC returned null");
  process.exit(1);
}

console.log("✅ RPC executed successfully\n");

// Check work_tasks structure
const workTasks = rpcData.work_tasks || [];
console.log(`📊 Found ${workTasks.length} work tasks\n`);

if (workTasks.length === 0) {
  console.log("⚠️  No work tasks to check. Cannot verify vendors field.");
  console.log("   Create a work task with vendor first, then re-run.\n");
  process.exit(0);
}

// Check first task structure
const firstTask = workTasks[0];
const hasVendorField = 'vendors' in firstTask;
const hasVendorIdField = 'vendor_id' in firstTask;

console.log("🔬 Work Task Structure Check:");
console.log("━".repeat(60));

console.log("\n📋 Sample work task fields:");
const fields = Object.keys(firstTask);
fields.forEach(field => {
  const value = firstTask[field];
  const type = value === null ? 'null' : typeof value;
  const preview = value === null ? 'null' :
                  type === 'object' ? JSON.stringify(value).substring(0, 50) :
                  String(value).substring(0, 50);
  console.log(`   ${field.padEnd(20)} = ${preview}`);
});

console.log("\n━".repeat(60));

// Check all tasks for vendor data
const tasksWithVendorId = workTasks.filter(t => t.vendor_id !== null).length;
const tasksWithVendorData = workTasks.filter(t => t.vendors !== null && t.vendors !== undefined).length;

console.log("\n📈 Vendor Data Summary:");
console.log(`   Total tasks:              ${workTasks.length}`);
console.log(`   Tasks with vendor_id:     ${tasksWithVendorId}`);
console.log(`   Tasks with vendors data:  ${tasksWithVendorData}`);

console.log("\n━".repeat(60));
console.log("\n🎯 VERDICT:\n");

if (!hasVendorField && !hasVendorIdField) {
  console.log("❌ VENDORS NOT IN RPC");
  console.log("   • Missing both 'vendor_id' and 'vendors' fields");
  console.log("   • Migration has NOT been applied");
  console.log("\n💡 Action required:");
  console.log("   Paste SQL to Supabase Dashboard → SQL Editor\n");
  process.exit(1);
}

if (hasVendorIdField && !hasVendorField) {
  console.log("⚠️  PARTIAL - vendor_id EXISTS but vendors data MISSING");
  console.log("   • Field 'vendor_id' exists");
  console.log("   • Field 'vendors' (joined data) MISSING");
  console.log("   • OLD migration applied, need NEW migration");
  console.log("\n💡 Action required:");
  console.log("   Apply vendors join migration (May 23 or May 27)\n");
  process.exit(1);
}

if (hasVendorIdField && hasVendorField) {
  console.log("✅ VENDORS FULLY IMPLEMENTED");
  console.log("   • Field 'vendor_id' exists");
  console.log("   • Field 'vendors' (joined data) exists");
  console.log("   • Migration already applied!");

  if (tasksWithVendorData > 0) {
    console.log(`   • ${tasksWithVendorData} tasks have vendor data`);
    console.log("\n📦 Sample vendor data:");
    const taskWithVendor = workTasks.find(t => t.vendors !== null);
    if (taskWithVendor) {
      console.log("   ", JSON.stringify(taskWithVendor.vendors, null, 2).split('\n').join('\n    '));
    }
  }

  console.log("\n🎉 No migration needed - already done!\n");
  process.exit(0);
}

console.log("❓ UNKNOWN STATE");
console.log("   Check the field list above\n");
process.exit(1);
