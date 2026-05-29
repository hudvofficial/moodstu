#!/usr/bin/env node
/**
 * Test Script: Validate get_contract_detail_v3 vs v2
 *
 * Purpose:
 * - Compare v3 output with v2 to ensure backward compatibility
 * - Benchmark performance improvement
 * - Detect any data structure mismatches
 *
 * Usage:
 *   node scripts/test-rpc-v3.mjs [contract-id]
 *
 * Expected:
 *   ✅ v3 output matches v2 structure
 *   ✅ v3 is 70-80% faster than v2
 */

import { existsSync, readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { createClient } from "@supabase/supabase-js";

// ─── ENV LOADING ─────────────────────────────────────────

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

const root = process.cwd();
loadEnvFile(`${root}/.env.local`);
loadEnvFile(`${root}/.env`);

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

// ─── SUPABASE CLIENT ─────────────────────────────────────

const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

// ─── UTILITIES ───────────────────────────────────────────

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 10) / 10 + " " + sizes[i];
}

function deepCompare(obj1, obj2, path = "root") {
  const issues = [];

  // Type check
  if (typeof obj1 !== typeof obj2) {
    issues.push(`${path}: type mismatch (${typeof obj1} vs ${typeof obj2})`);
    return issues;
  }

  // Null check
  if (obj1 === null || obj2 === null) {
    if (obj1 !== obj2) {
      issues.push(`${path}: null mismatch`);
    }
    return issues;
  }

  // Array check
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) {
      issues.push(`${path}: array length mismatch (${obj1.length} vs ${obj2.length})`);
    }
    const minLength = Math.min(obj1.length, obj2.length);
    for (let i = 0; i < minLength; i++) {
      issues.push(...deepCompare(obj1[i], obj2[i], `${path}[${i}]`));
    }
    return issues;
  }

  // Object check
  if (typeof obj1 === "object") {
    const keys1 = Object.keys(obj1).sort();
    const keys2 = Object.keys(obj2).sort();

    // Check for missing keys
    const missingInV3 = keys1.filter(k => !keys2.includes(k));
    const extraInV3 = keys2.filter(k => !keys1.includes(k));

    if (missingInV3.length > 0) {
      issues.push(`${path}: v3 missing keys: ${missingInV3.join(", ")}`);
    }
    if (extraInV3.length > 0) {
      issues.push(`${path}: v3 has extra keys: ${extraInV3.join(", ")}`);
    }

    // Recurse into common keys
    const commonKeys = keys1.filter(k => keys2.includes(k));
    for (const key of commonKeys) {
      issues.push(...deepCompare(obj1[key], obj2[key], `${path}.${key}`));
    }

    return issues;
  }

  // Primitive value check
  if (obj1 !== obj2) {
    // Allow minor numeric differences (floating point precision)
    if (typeof obj1 === "number" && typeof obj2 === "number") {
      if (Math.abs(obj1 - obj2) > 0.01) {
        issues.push(`${path}: value mismatch (${obj1} vs ${obj2})`);
      }
    } else {
      issues.push(`${path}: value mismatch (${obj1} vs ${obj2})`);
    }
  }

  return issues;
}

// ─── MAIN TEST ───────────────────────────────────────────

async function testRpcVersions(contractId) {
  console.log("\n🧪 RPC Version Comparison Test");
  console.log("━".repeat(70));
  console.log(`Contract ID: ${contractId}\n`);

  // Test v2
  console.log("📊 Testing v2 (sequential)...");
  const v2Start = performance.now();
  const { data: v2Data, error: v2Error } = await supabase.rpc(
    "get_contract_detail_v2",
    { p_contract_id: contractId }
  );
  const v2Time = Math.round(performance.now() - v2Start);

  if (v2Error) {
    console.error("❌ v2 error:", v2Error.message);
    return;
  }

  const v2Size = JSON.stringify(v2Data).length;
  console.log(`  ✅ v2: ${v2Time}ms (${formatBytes(v2Size)})`);

  // Test v3
  console.log("\n📊 Testing v3 (single-query LATERAL)...");
  const v3Start = performance.now();
  const { data: v3Data, error: v3Error } = await supabase.rpc(
    "get_contract_detail_v3",
    { p_contract_id: contractId }
  );
  const v3Time = Math.round(performance.now() - v3Start);

  if (v3Error) {
    console.error("❌ v3 error:", v3Error.message);
    return;
  }

  const v3Size = JSON.stringify(v3Data).length;
  console.log(`  ✅ v3: ${v3Time}ms (${formatBytes(v3Size)})`);

  // Performance comparison
  console.log("\n📈 Performance Comparison:");
  console.log("━".repeat(70));
  const improvement = v2Time - v3Time;
  const improvementPct = Math.round((improvement / v2Time) * 100);

  console.log(`  v2 time:        ${v2Time}ms`);
  console.log(`  v3 time:        ${v3Time}ms`);
  console.log(`  Improvement:    -${improvement}ms (${improvementPct}% faster)`);
  console.log(`  Size diff:      ${formatBytes(Math.abs(v2Size - v3Size))}`);

  if (improvementPct >= 70) {
    console.log(`  ✅ Target met: ${improvementPct}% >= 70%`);
  } else {
    console.log(`  ⚠️  Below target: ${improvementPct}% < 70%`);
  }

  // Data structure validation
  console.log("\n🔍 Data Structure Validation:");
  console.log("━".repeat(70));

  const issues = deepCompare(v2Data, v3Data);

  if (issues.length === 0) {
    console.log("  ✅ Output structures match perfectly!");
  } else {
    console.log(`  ⚠️  Found ${issues.length} differences:\n`);
    issues.slice(0, 10).forEach(issue => {
      console.log(`     • ${issue}`);
    });
    if (issues.length > 10) {
      console.log(`     ... and ${issues.length - 10} more`);
    }
  }

  // Summary
  console.log("\n📋 Test Summary:");
  console.log("━".repeat(70));

  const passed = issues.length === 0 && improvementPct >= 50;

  if (passed) {
    console.log("  ✅ ALL TESTS PASSED");
    console.log("  ✅ v3 is ready for production rollout");
  } else {
    console.log("  ⚠️  TESTS NEED ATTENTION");
    if (issues.length > 0) {
      console.log("  • Fix data structure mismatches");
    }
    if (improvementPct < 50) {
      console.log("  • Performance improvement below expectation");
    }
  }

  console.log("");
}

// ─── RUN ─────────────────────────────────────────────────

async function main() {
  let contractId = process.argv[2];

  // If no ID provided, get latest contract
  if (!contractId) {
    console.log("ℹ️  No contract ID provided, fetching latest...");
    const { data } = await supabase
      .from("contracts")
      .select("id, contract_code")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!data) {
      console.error("❌ No contracts found in database");
      process.exit(1);
    }

    contractId = data.id;
    console.log(`ℹ️  Using latest contract: ${data.contract_code}\n`);
  }

  await testRpcVersions(contractId);
}

main().catch(err => {
  console.error("\n❌ Test failed:", err.message);
  process.exit(1);
});
