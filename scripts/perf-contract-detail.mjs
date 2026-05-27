#!/usr/bin/env node
/**
 * Performance Measurement: Contract Detail Page
 *
 * Measures:
 * - RPC get_contract_detail_v2 performance
 * - Extra vendor query overhead
 * - Total SSR time
 * - Data transfer size
 *
 * Usage: node scripts/perf-contract-detail.mjs [contract-id]
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();

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

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

loadEnvFile(path.join(root, ".env.local"));

// ─── SUPABASE CLIENT ─────────────────────────────────────

const supabase = createClient(
  requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false, autoRefreshToken: false } },
);

// ─── MEASUREMENT HELPERS ─────────────────────────────────

async function measureQuery(label, fn) {
  const start = performance.now();
  const result = await fn();
  const elapsed = performance.now() - start;

  return {
    label,
    elapsed: Math.round(elapsed),
    success: !result.error,
    error: result.error?.message,
    dataSize: result.data ? JSON.stringify(result.data).length : 0,
  };
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ─── TEST SCENARIOS ──────────────────────────────────────

async function testRpcDetailV2(contractId) {
  return measureQuery("RPC get_contract_detail_v2", () =>
    supabase.rpc("get_contract_detail_v2", { p_contract_id: contractId })
  );
}

async function testExtraVendorQuery(contractId) {
  return measureQuery("Extra vendor query (current)", () =>
    supabase
      .from("work_tasks")
      .select("id, event_id, contract_id, work_type, assigned_to, vendor_id, status, deadline, start_date, start_time, end_time, completion_date, cost, notes, employees:assigned_to(id, full_name, avatar_url, department), vendors:vendor_id(id, full_name, phone)")
      .eq("contract_id", contractId)
      .order("deadline", { ascending: true })
  );
}

async function testGallerySummaries(contractId) {
  return measureQuery("Gallery summaries", () =>
    supabase
      .from("drive_galleries")
      .select("id, gallery_name, gallery_type, gallery_slug, file_count, created_at")
      .eq("contract_id", contractId)
      .eq("deleted", false)
      .order("created_at", { ascending: false })
  );
}

// ─── MAIN BENCHMARK ──────────────────────────────────────

async function runBenchmark(contractId) {
  console.log("\n🔍 Contract Detail Performance Benchmark");
  console.log("━".repeat(60));
  console.log(`Contract ID: ${contractId}`);
  console.log("");

  // Test 1: RPC
  const rpcResult = await testRpcDetailV2(contractId);

  // Test 2: Extra vendor query (simulating current overhead)
  const vendorResult = await testExtraVendorQuery(contractId);

  // Test 3: Gallery summaries
  const galleryResult = await testGallerySummaries(contractId);

  // Calculate totals
  const currentTotal = rpcResult.elapsed + vendorResult.elapsed + galleryResult.elapsed;
  const optimizedTotal = rpcResult.elapsed + galleryResult.elapsed; // Without vendor query
  const dataTransferred = rpcResult.dataSize + vendorResult.dataSize + galleryResult.dataSize;

  // ─── REPORT ─────────────────────────────────────────────

  console.log("📊 Query Breakdown:");
  console.log("");
  console.log(`  ${rpcResult.success ? "✅" : "❌"} ${rpcResult.label.padEnd(35)} ${String(rpcResult.elapsed).padStart(5)}ms  ${formatBytes(rpcResult.dataSize).padStart(10)}`);
  console.log(`  ${vendorResult.success ? "⚠️ " : "❌"} ${vendorResult.label.padEnd(35)} ${String(vendorResult.elapsed).padStart(5)}ms  ${formatBytes(vendorResult.dataSize).padStart(10)}`);
  console.log(`  ${galleryResult.success ? "✅" : "❌"} ${galleryResult.label.padEnd(35)} ${String(galleryResult.elapsed).padStart(5)}ms  ${formatBytes(galleryResult.dataSize).padStart(10)}`);
  console.log("");
  console.log("━".repeat(60));
  console.log("");
  console.log("📈 Performance Summary:");
  console.log("");
  console.log(`  Current SSR Time (with vendor gap):    ${currentTotal}ms`);
  console.log(`  Optimized SSR Time (vendors in RPC):   ${optimizedTotal}ms`);
  console.log(`  Improvement:                            -${vendorResult.elapsed}ms (${Math.round((vendorResult.elapsed / currentTotal) * 100)}%)`);
  console.log("");
  console.log(`  Total Data Transferred:                 ${formatBytes(dataTransferred)}`);
  console.log(`  Network Transfer (estimate):            ~${Math.round(dataTransferred / 1024 / 100)}ms @ 100Mbps`);
  console.log("");

  // Client-side estimation
  const estimatedClientHydration = 200; // Base React hydration
  const estimatedRealtimeSetup = 200; // 9 channels
  const estimatedLayoutRender = 150; // Desktop + Mobile
  const estimatedModalsImport = 100; // 5 dynamic imports

  const totalCurrentTTI = currentTotal + estimatedClientHydration + estimatedRealtimeSetup + estimatedLayoutRender + estimatedModalsImport;

  console.log("⏱️  Estimated Time to Interactive (Current):");
  console.log("");
  console.log(`  SSR (queries):                          ${currentTotal}ms`);
  console.log(`  Network transfer:                       ~${Math.round(dataTransferred / 1024 / 100)}ms`);
  console.log(`  Client hydration:                       ~${estimatedClientHydration}ms`);
  console.log(`  Realtime setup (9 channels):            ~${estimatedRealtimeSetup}ms`);
  console.log(`  Layout render (dual):                   ~${estimatedLayoutRender}ms`);
  console.log(`  Modal imports (5):                      ~${estimatedModalsImport}ms`);
  console.log("  " + "─".repeat(56));
  console.log(`  TOTAL TTI:                              ~${totalCurrentTTI}ms`);
  console.log("");

  // Optimized estimation
  const optimizedRealtimeSetup = 0; // Deferred
  const optimizedLayoutRender = 75; // Conditional
  const optimizedModalsImport = 0; // Lazy on-demand
  const optimizedClientHydration = 150; // LazyLoad sections

  const totalOptimizedTTI = optimizedTotal + optimizedClientHydration + optimizedRealtimeSetup + optimizedLayoutRender + optimizedModalsImport;

  console.log("🚀 Estimated Time to Interactive (After Optimization):");
  console.log("");
  console.log(`  SSR (optimized):                        ${optimizedTotal}ms`);
  console.log(`  Network transfer:                       ~${Math.round(dataTransferred / 1024 / 100)}ms`);
  console.log(`  Client hydration (lazy sections):       ~${optimizedClientHydration}ms`);
  console.log(`  Realtime setup (deferred):              ~${optimizedRealtimeSetup}ms`);
  console.log(`  Layout render (conditional):            ~${optimizedLayoutRender}ms`);
  console.log(`  Modal imports (on-demand):              ~${optimizedModalsImport}ms`);
  console.log("  " + "─".repeat(56));
  console.log(`  TOTAL TTI:                              ~${totalOptimizedTTI}ms`);
  console.log("");
  console.log(`  🎯 Improvement: -${totalCurrentTTI - totalOptimizedTTI}ms (${Math.round((1 - totalOptimizedTTI / totalCurrentTTI) * 100)}% faster)`);
  console.log("");
  console.log("━".repeat(60));
  console.log("");

  return {
    current: {
      ssr: currentTotal,
      tti: totalCurrentTTI,
    },
    optimized: {
      ssr: optimizedTotal,
      tti: totalOptimizedTTI,
    },
    improvement: {
      ssr: currentTotal - optimizedTotal,
      tti: totalCurrentTTI - totalOptimizedTTI,
      percentage: Math.round((1 - totalOptimizedTTI / totalCurrentTTI) * 100),
    },
  };
}

// ─── CLI EXECUTION ───────────────────────────────────────

const contractId = process.argv[2];

if (!contractId) {
  // Find latest contract
  const { data: contract, error } = await supabase
    .from("contracts")
    .select("id, contract_code")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !contract) {
    console.error("❌ Error: Cannot find active contract");
    process.exit(1);
  }

  console.log(`ℹ️  No contract ID provided, using latest: ${contract.contract_code}`);
  await runBenchmark(contract.id);
} else {
  await runBenchmark(contractId);
}

process.exit(0);
