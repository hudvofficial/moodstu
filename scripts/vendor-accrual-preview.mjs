#!/usr/bin/env node
/** READ-ONLY preview of vendor-task accrual backfill candidates. No writes. */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import pg from "pg";
const { Client } = pg;
const root = process.cwd();
function loadEnv(fp){ if(!existsSync(fp))return; for(const raw of readFileSync(fp,"utf8").split(/\r?\n/)){const l=raw.trim(); if(!l||l.startsWith("#"))continue; const i=l.indexOf("="); if(i===-1)continue; const k=l.slice(0,i).trim(); let v=l.slice(i+1).trim(); if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1); process.env[k]??=v;} }
loadEnv(path.join(root,".env.local"));
const caPath = path.join(root,"scripts/supabase-pooler-ca.crt");
const sslConfig = existsSync(caPath)?{ca:readFileSync(caPath,"utf8"),rejectUnauthorized:true}:true;
const fmt=(n)=>Number(n||0).toLocaleString("vi-VN");
const client = new Client({ connectionString: process.env.SUPABASE_POOLER_URL, ssl: sslConfig });
try {
  await client.connect();
  const { rows } = await client.query(`
    SELECT wt.id::text, COALESCE(v.full_name,'(?)') AS vendor, wt.cost,
           wt.completion_date::date AS completed,
           public.is_period_locked(COALESCE(wt.completion_date::date, CURRENT_DATE)) AS locked,
           EXISTS(SELECT 1 FROM public.expenses e WHERE e.work_task_id=wt.id AND e.deleted_at IS NULL) AS has_expense
    FROM public.work_tasks wt
    LEFT JOIN public.vendors v ON v.id = wt.vendor_id
    WHERE wt.vendor_id IS NOT NULL AND wt.status='hoan_thanh' AND wt.cost > 0
    ORDER BY wt.completion_date`);
  console.log("📋 BACKFILL PREVIEW — vendor tasks cần tạo accrual (read-only)\n");
  let total=0, willCreate=0, lockedCnt=0, already=0;
  for (const r of rows) {
    total += Number(r.cost);
    const flag = r.has_expense ? "⏭️ đã có expense" : r.locked ? "🔒 kỳ KHÓA → sẽ skip" : "✅ sẽ tạo";
    if (r.has_expense) already++; else if (r.locked) lockedCnt++; else willCreate++;
    console.log(`  ${r.id.slice(0,8)}  ${fmt(r.cost).padStart(12)}đ  ${r.completed || "(no date)"}  ${r.vendor}  ${flag}`);
  }
  console.log(`\n→ ${rows.length} task, tổng cost ${fmt(total)}đ | sẽ tạo: ${willCreate}, đã có: ${already}, khóa(skip): ${lockedCnt}`);
} catch(e){ console.error("❌", e.message, e.code||""); process.exit(1);} finally { await client.end(); }
