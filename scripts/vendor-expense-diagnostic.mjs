#!/usr/bin/env node
/** READ-ONLY diagnostic: is the vendor ACCRUAL expense path actually working? No writes. */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import pg from "pg";

const { Client } = pg;
const root = process.cwd();
function loadEnv(fp) {
  if (!existsSync(fp)) return;
  for (const raw of readFileSync(fp, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("="); if (i === -1) continue;
    const k = line.slice(0, i).trim(); let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[k] ??= v;
  }
}
loadEnv(path.join(root, ".env.local"));
const connectionString = process.env.SUPABASE_POOLER_URL;
const caPath = path.join(root, "scripts/supabase-pooler-ca.crt");
const sslConfig = existsSync(caPath) ? { ca: readFileSync(caPath, "utf8"), rejectUnauthorized: true } : true;
const fmt = (n) => Number(n || 0).toLocaleString("vi-VN");

const client = new Client({ connectionString, ssl: sslConfig });
try {
  await client.connect();
  console.log("🔎 VENDOR ACCRUAL DIAGNOSTIC (read-only)\n");

  // A) All [Auto-Vendor] expenses, broken down
  const a = (await client.query(
    `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE work_task_id IS NOT NULL) AS with_task,
       COUNT(*) FILTER (WHERE work_task_id IS NULL) AS without_task,
       COUNT(*) FILTER (WHERE description LIKE '[Auto-Vendor] Thanh toán công nợ%') AS payment_time,
       COALESCE(SUM(amount),0) AS sum
     FROM public.expenses WHERE deleted_at IS NULL AND description LIKE '[Auto-Vendor]%'`
  )).rows[0];
  console.log(`A) Expense [Auto-Vendor] tổng: ${a.total} (có work_task_id: ${a.with_task}, không: ${a.without_task}, kiểu 'Thanh toán công nợ': ${a.payment_time}), ${fmt(a.sum)}đ`);

  // B) Completed vendor tasks that SHOULD have an accrual expense
  const b = (await client.query(
    `SELECT COUNT(*) AS rows, COALESCE(SUM(cost),0) AS sum
     FROM public.work_tasks
     WHERE vendor_id IS NOT NULL AND status='hoan_thanh' AND cost > 0`
  )).rows[0];
  console.log(`B) work_tasks vendor đã hoàn thành (cost>0): ${b.rows} task, tổng cost ${fmt(b.sum)}đ  ← đây là số expense accrual ĐÁNG LẼ phải có`);

  // C) Vendor payments + allocations
  const c = (await client.query(
    `SELECT
       (SELECT COUNT(*) FROM public.vendor_payments WHERE deleted_at IS NULL) AS payments,
       (SELECT COALESCE(SUM(amount),0) FROM public.vendor_payments WHERE deleted_at IS NULL) AS pay_sum,
       (SELECT COUNT(*) FROM public.vendor_payment_allocations) AS allocations`
  )).rows[0];
  console.log(`C) vendor_payments: ${c.payments} (${fmt(c.pay_sum)}đ), allocations: ${c.allocations}`);

  // D) Is the accrual machinery present/configured?
  const d1 = (await client.query(
    `SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname='upsert_vendor_expense') AS has_fn`
  )).rows[0];
  let categoryId = null, catErr = null;
  try { categoryId = (await client.query(`SELECT public.resolve_vendor_expense_category_id() AS id`)).rows[0].id; }
  catch (e) { catErr = e.message; }
  const d2 = (await client.query(
    `SELECT value FROM public.system_settings WHERE key='vendor_expense_category_id'`
  )).rows[0];
  console.log(`D) upsert_vendor_expense tồn tại: ${d1.has_fn}`);
  console.log(`   resolve_vendor_expense_category_id() → ${categoryId ?? "(NULL)"}${catErr ? " ERR: " + catErr : ""}`);
  console.log(`   system_settings.vendor_expense_category_id = ${d2?.value ?? "(không có)"}`);

  // E) Were accrual expenses created then SOFT-DELETED? (created-then-deleted vs never-created)
  const e = (await client.query(
    `SELECT COUNT(*) AS rows, COALESCE(SUM(amount),0) AS sum
     FROM public.expenses
     WHERE deleted_at IS NOT NULL AND description LIKE '[Auto-Vendor]%' AND work_task_id IS NOT NULL`
  )).rows[0];
  console.log(`E) Accrual expense đã bị SOFT-DELETE: ${e.rows} dòng, ${fmt(e.sum)}đ  (>0 ⇒ từng tạo rồi bị xóa)`);

  // F) When were those vendor tasks completed? (vs accrual integration ~2026-05-28)
  const f = (await client.query(
    `SELECT MIN(completion_date) AS min_comp, MAX(completion_date) AS max_comp,
            COUNT(*) FILTER (WHERE completion_date IS NULL) AS null_comp,
            MIN(created_at) AS min_created, MAX(created_at) AS max_created
     FROM public.work_tasks
     WHERE vendor_id IS NOT NULL AND status='hoan_thanh' AND cost>0`
  )).rows[0];
  console.log(`F) 6 task hoàn thành: completion_date ${f.min_comp ?? "?"} → ${f.max_comp ?? "?"} (NULL: ${f.null_comp}); created ${f.min_created} → ${f.max_created}`);

  console.log("\n— KẾT LUẬN —");
  if (Number(b.rows) > 0 && Number(a.with_task) === 0) {
    console.log("🔴 Có task vendor hoàn thành NHƯNG 0 expense accrual → accrual KHÔNG chạy. Phase 1 đang gây UNDER-count.");
  } else if (Number(b.rows) === 0) {
    console.log("ℹ️ DB gần như không có task vendor hoàn thành → không kết luận được; cần data thật để kiểm.");
  } else {
    console.log("🟢 Accrual có tạo expense (with_task > 0).");
  }
} catch (e) {
  console.error("❌ Diagnostic failed:", e.message, e.code ? `(code ${e.code})` : "");
  process.exit(1);
} finally {
  await client.end();
}
