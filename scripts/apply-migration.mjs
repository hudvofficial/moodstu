#!/usr/bin/env node
/**
 * Generic migration applier — runs ONE migration file (whole file, atomic) via pooler + pinned CA.
 * Usage: node scripts/apply-migration.mjs supabase/migrations/<file>.sql
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import pg from "pg";

const { Client } = pg;
const root = process.cwd();
function loadEnv(fp) {
  if (!existsSync(fp)) return;
  for (const raw of readFileSync(fp, "utf8").split(/\r?\n/)) {
    const l = raw.trim();
    if (!l || l.startsWith("#")) continue;
    const i = l.indexOf("="); if (i === -1) continue;
    const k = l.slice(0, i).trim(); let v = l.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[k] ??= v;
  }
}
loadEnv(path.join(root, ".env.local"));

const rel = process.argv[2];
if (!rel) { console.error("usage: node scripts/apply-migration.mjs <migration-file.sql>"); process.exit(1); }
const connectionString = process.env.SUPABASE_POOLER_URL;
if (!connectionString) { console.error("❌ Missing SUPABASE_POOLER_URL"); process.exit(1); }
const caPath = path.join(root, "scripts/supabase-pooler-ca.crt");
const sslConfig = existsSync(caPath) ? { ca: readFileSync(caPath, "utf8"), rejectUnauthorized: true } : true;

const sql = readFileSync(path.join(root, rel), "utf8");
const client = new Client({ connectionString, ssl: sslConfig });
try {
  await client.connect();
  console.log(`⚡ Applying ${rel} (whole file, atomic) ...`);
  const res = await client.query(sql);
  // pg returns notices via the 'notice' event; surface count of statements ok
  console.log(`✅ Applied OK.`);
  if (Array.isArray(res)) console.log(`   ${res.length} statements executed.`);
} catch (e) {
  console.error("❌ Apply failed:", e.message, e.code ? `(code ${e.code})` : "");
  process.exit(1);
} finally {
  await client.end();
}
