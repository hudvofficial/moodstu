#!/usr/bin/env node
/** Đối chiếu số dòng từng bảng: bản restore cục bộ (restore-drill.ps1) ↔ prod (CHỈ ĐỌC). Bước #7.
 *  Usage: node scripts/restore-drill-compare.mjs   → PASS khi 93 bảng khớp tên và lệch ≤1% (hoặc ≤2 dòng cho bảng nhỏ).
 *  Lệch nhỏ là hoạt động sau giờ dump (02:00), không phải lỗi restore. */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import pg from "pg";
const { Client } = pg;
const root = process.cwd();
function loadEnv(fp){ if(!existsSync(fp))return; for(const raw of readFileSync(fp,"utf8").split(/\r?\n/)){const l=raw.trim(); if(!l||l.startsWith("#"))continue; const i=l.indexOf("="); if(i===-1)continue; const k=l.slice(0,i).trim(); let v=l.slice(i+1).trim(); if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1); process.env[k]??=v;} }
loadEnv(path.join(root,".env.local"));
const caPath = path.join(root,"scripts/supabase-pooler-ca.crt");
const sslConfig = existsSync(caPath)?{ca:readFileSync(caPath,"utf8"),rejectUnauthorized:true}:true;

const localFile = "H:/backups/mood-studio/restore-test/counts-local.json";
if(!existsSync(localFile)){ console.error("❌ chưa có", localFile, "— chạy scripts/restore-drill.ps1 trước"); process.exit(1); }
const local = JSON.parse(readFileSync(localFile,"utf8"));

const q = `SELECT relname, (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I', c.relname), false, true, '')))[1]::text::bigint AS n
           FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace WHERE ns.nspname='public' AND c.relkind='r' ORDER BY relname`;
const client = new Client({ connectionString: process.env.SUPABASE_POOLER_URL, ssl: sslConfig });
try {
  await client.connect();
  const { rows } = await client.query(q);
  const prod = Object.fromEntries(rows.map(r => [r.relname, Number(r.n)]));
  const names = new Set([...Object.keys(prod), ...Object.keys(local.dong)]);
  let bad = 0, drift = [], totalLocal = 0, totalProd = 0;
  for (const t of [...names].sort()) {
    const a = local.dong[t], b = prod[t];
    if (a === undefined || b === undefined) { bad++; console.log(`✗ ${t}: ${a===undefined?"THIẾU ở bản restore":"THIẾU ở prod"}`); continue; }
    totalLocal += a; totalProd += b;
    const d = Math.abs(a - b);
    if (d === 0) continue;
    // restore < prod = prod ghi thêm sau giờ dump (bình thường); restore > prod = prod xoá cứng sau dump (hiếm, xem lại)
    drift.push(`${a <= b ? "~" : "!"} ${t}: restore ${a} · prod ${b} (${a <= b ? "+" : "-"}${d}${t === "realtime_signals" ? ", bảng tín hiệu tạm" : ""})`);
  }
  const totalPct = totalProd ? Math.abs(totalLocal - totalProd) / totalProd * 100 : 0;
  console.log(`bảng: restore ${Object.keys(local.dong).length} · prod ${rows.length} · dòng tổng: restore ${totalLocal} · prod ${totalProd} · lệch ${totalPct.toFixed(2)}%`);
  console.log(drift.length ? drift.join("\n") : "mọi bảng khớp 100%");
  const pass = bad === 0 && rows.length === 93 && Object.keys(local.dong).length === 93 && totalPct <= 1;
  console.log(pass ? `PASS — 93 bảng khớp tên, tổng dòng lệch ${totalPct.toFixed(2)}% ≤ 1%` : `FAIL — ${bad} bảng thiếu hoặc tổng lệch ${totalPct.toFixed(2)}% > 1%`);
  process.exit(pass ? 0 : 2);
} catch(e){ console.error("❌", e.message, e.code||""); process.exit(1); } finally { await client.end(); }
