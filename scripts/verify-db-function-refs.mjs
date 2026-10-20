#!/usr/bin/env node
/**
 * verify-db-function-refs — kiểm TĨNH (chỉ SELECT, chạy được trên prod) hai lớp lỗi "hàm tham chiếu thứ không tồn tại":
 *   (a) hàm trigger đọc/ghi NEW.<cột> / OLD.<cột> mà bảng gắn trigger KHÔNG có cột đó
 *       → PL/pgSQL văng `record "new" has no field "<cột>"` ở lần chạy đầu (vd. payments.updated_by, T-20261020-fix-void-payment);
 *   (b) hàm trong schema public nhắc tới kiểu `<tên>_enum` không có trong pg_type
 *       → văng `type "<tên>_enum" does not exist` ở lần gọi đầu (vd. recalc_contract_totals, T-20261020-fix-recalc-totals).
 * KHÔNG bắt: tên cột sai trong INSERT/UPDATE của hàm thường, kiểu không đuôi _enum, SQL động (EXECUTE).
 * Dùng:  node scripts/verify-db-function-refs.mjs            (prod, qua SUPABASE_POOLER_URL trong .env.local — chỉ đọc)
 *        DB_REFS_PG_URL=postgres://postgres@127.0.0.1:5433/mood_restore node scripts/verify-db-function-refs.mjs   (DB cục bộ)
 * Thoát 0 = sạch; 1 = có vi phạm (in danh sách). Chạy sau mỗi lần áp migration có đụng hàm/trigger.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import pg from "pg";

const { Client } = pg;
const root = process.cwd();

/** Ngoại lệ có lý do (mặc định rỗng). Khoá: "<bảng>.<trigger> -> <hàm>: NEW.<cột>" hoặc "<hàm>: <kiểu>". */
const ALLOW = new Set([]);

function loadEnv(fp) {
  if (!existsSync(fp)) return;
  for (const raw of readFileSync(fp, "utf8").split(/\r?\n/)) {
    const l = raw.trim();
    if (!l || l.startsWith("#")) continue;
    const i = l.indexOf("=");
    if (i === -1) continue;
    const k = l.slice(0, i).trim();
    let v = l.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[k] ??= v;
  }
}

let connectionString = process.env.DB_REFS_PG_URL;
let ssl;
let target = "DB cục bộ";
if (!connectionString) {
  loadEnv(path.join(root, ".env.local"));
  connectionString = process.env.SUPABASE_POOLER_URL;
  const caPath = path.join(root, "scripts/supabase-pooler-ca.crt");
  ssl = existsSync(caPath) ? { ca: readFileSync(caPath, "utf8"), rejectUnauthorized: true } : true;
  target = "PROD (chỉ đọc)";
}
if (!connectionString) {
  console.error("❌ Thiếu SUPABASE_POOLER_URL (.env.local) hoặc DB_REFS_PG_URL.");
  process.exit(1);
}

// Bỏ chú thích dòng (--) và chú thích khối để không báo nhầm theo lời chú thích.
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ");
}

const client = new Client({ connectionString, ssl });
await client.connect();
try {
  const triggers = (
    await client.query(`
      SELECT t.tgname, rel.relname AS tbl, p.proname AS fn, p.prosrc AS src
      FROM pg_trigger t
      JOIN pg_class rel ON rel.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = rel.relnamespace
      JOIN pg_proc p ON p.oid = t.tgfoid
      WHERE NOT t.tgisinternal AND n.nspname = 'public'`)
  ).rows;

  const columns = {};
  for (const r of (await client.query(`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'`)).rows) {
    (columns[r.table_name] ??= new Set()).add(r.column_name);
  }

  const violations = [];

  // (a) NEW./OLD. trỏ cột không có
  for (const t of triggers) {
    const src = stripComments(t.src);
    for (const m of src.matchAll(/\b(NEW|OLD)\.([a-z_][a-z0-9_]*)/gi)) {
      const col = m[2].toLowerCase();
      if (!columns[t.tbl]?.has(col)) {
        const key = `${t.tbl}.${t.tgname} -> ${t.fn}: ${m[1].toUpperCase()}.${col}`;
        if (!ALLOW.has(key)) violations.push({ kind: "trigger-field", key });
      }
    }
  }

  // (b) kiểu *_enum không tồn tại
  const types = new Set((await client.query(`SELECT typname FROM pg_type`)).rows.map((r) => r.typname.toLowerCase()));
  const fns = (
    await client.query(`SELECT proname, prosrc FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND prolang IN (SELECT oid FROM pg_language WHERE lanname IN ('plpgsql', 'sql'))`)
  ).rows;
  for (const f of fns) {
    const src = stripComments(f.prosrc);
    for (const m of src.matchAll(/\b([a-z][a-z0-9_]*_enum)\b/gi)) {
      const typ = m[1].toLowerCase();
      if (!types.has(typ)) {
        const key = `${f.proname}: ${typ}`;
        if (!ALLOW.has(key) && !violations.some((v) => v.key === key)) violations.push({ kind: "missing-enum", key });
      }
    }
  }

  console.log(`[verify-db-function-refs] ${target}: ${triggers.length} trigger, ${fns.length} hàm plpgsql/sql public.`);
  if (violations.length === 0) {
    console.log("✅ 0 vi phạm.");
  } else {
    console.log(`❌ ${violations.length} vi phạm:`);
    for (const v of violations) console.log(`  - [${v.kind}] ${v.key}`);
    process.exitCode = 1;
  }
} finally {
  await client.end();
}
