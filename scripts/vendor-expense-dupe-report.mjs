#!/usr/bin/env node
/**
 * READ-ONLY report: quantify duplicate vendor payment-time expenses (Finding #1 Phase 2 scoping).
 * No writes. Connects via pooler + pinned Supabase CA (verification ON).
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

const connectionString = process.env.SUPABASE_POOLER_URL;
if (!connectionString) {
  console.error("❌ Missing SUPABASE_POOLER_URL in .env.local");
  process.exit(1);
}
const caPath = path.join(root, "scripts/supabase-pooler-ca.crt");
const sslConfig = existsSync(caPath) ? { ca: readFileSync(caPath, "utf8"), rejectUnauthorized: true } : true;

// Predicate identifying the DUPLICATE (payment-time) vendor expense rows.
const DUP = `description LIKE '[Auto-Vendor] Thanh toán công nợ%' AND work_task_id IS NULL AND category_id IS NULL`;
const fmt = (n) => Number(n || 0).toLocaleString("vi-VN");

const client = new Client({ connectionString, ssl: sslConfig });
try {
  await client.connect();
  console.log("📊 VENDOR EXPENSE DUPLICATE REPORT (read-only)\n");

  // 1) Grand total of duplicate rows
  const total = (await client.query(
    `SELECT COUNT(*) AS rows, COALESCE(SUM(amount),0) AS sum FROM public.expenses WHERE deleted_at IS NULL AND ${DUP}`
  )).rows[0];
  console.log(`① Tổng phiếu chi TRÙNG (cần xem xét xóa): ${total.rows} dòng, ${fmt(total.sum)}đ\n`);

  if (Number(total.rows) === 0) {
    console.log("✅ Không có dòng trùng nào — Phase 2 KHÔNG cần làm gì. (Có thể do data sạch hoặc chưa từng phát sinh.)");
    await client.end();
    process.exit(0);
  }

  // 2) Split by accrual cutoff (2026-05-28). Before => risky (may be the ONLY expense for that cost).
  const split = (await client.query(
    `SELECT CASE WHEN expense_date < DATE '2026-05-28' THEN 'TRƯỚC 28/05 (RỦI RO - có thể là expense DUY NHẤT)'
                 ELSE 'TỪ 28/05 (an toàn hơn - accrual đã tồn tại)' END AS bucket,
            COUNT(*) AS rows, COALESCE(SUM(amount),0) AS sum
     FROM public.expenses WHERE deleted_at IS NULL AND ${DUP}
     GROUP BY 1 ORDER BY 1`
  )).rows;
  console.log("② Chia theo mốc accrual (28/05):");
  split.forEach((r) => console.log(`   - ${r.bucket}: ${r.rows} dòng, ${fmt(r.sum)}đ`));
  console.log("");

  // 3) By month
  const byMonth = (await client.query(
    `SELECT to_char(date_trunc('month', expense_date),'YYYY-MM') AS thang,
            COUNT(*) AS rows, COALESCE(SUM(amount),0) AS sum
     FROM public.expenses WHERE deleted_at IS NULL AND ${DUP}
     GROUP BY 1 ORDER BY 1`
  )).rows;
  console.log("③ Theo tháng:");
  byMonth.forEach((r) => console.log(`   - ${r.thang}: ${r.rows} dòng, ${fmt(r.sum)}đ`));
  console.log("");

  // 4) Context: legit ACCRUAL vendor expenses (for magnitude comparison)
  const accrual = (await client.query(
    `SELECT COUNT(*) AS rows, COALESCE(SUM(amount),0) AS sum
     FROM public.expenses
     WHERE deleted_at IS NULL AND description LIKE '[Auto-Vendor]%' AND work_task_id IS NOT NULL`
  )).rows[0];
  console.log(`④ (Đối chiếu) Expense ACCRUAL vendor hợp lệ: ${accrual.rows} dòng, ${fmt(accrual.sum)}đ`);
  console.log(`   → Double-count hiện tại làm CHI PHÍ bị phồng thêm ~${fmt(total.sum)}đ trên sổ toàn cục.`);
} catch (e) {
  console.error("❌ Scan failed:", e.message, e.code ? `(code ${e.code})` : "");
  process.exit(1);
} finally {
  await client.end();
}
