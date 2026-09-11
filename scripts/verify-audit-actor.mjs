#!/usr/bin/env node
/**
 * #19 (T-20260911-audit-co-danh-tinh) — đo tỉ lệ dòng nhật ký MỚI có danh tính. CHỈ ĐỌC.
 * Dùng: npm run verify:audit            (cửa sổ mặc định 7 ngày)
 *       npm run verify:audit -- --days 1
 *       npm run verify:audit -- --since "2026-09-11T15:00:00Z"   (neo vào mốc deploy)
 *
 * Ngưỡng cổng G2: >= 95% dòng mới có danh tính (performed_by hoặc employee_id).
 * Loại khỏi mẫu số, có lý do:
 *   - máy gọi máy: source='system' AND table_name='push_notifications' (không có người nào để gắn)
 *   - dòng do e2e sinh: user_agent chứa Headless
 * Không loại gì khác — nếu một đường ghi nào đó không mang nổi danh tính thì đó là việc phải sửa,
 * không phải việc giấu khỏi phép đo.
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
    const i = l.indexOf("=");
    if (i === -1) continue;
    const k = l.slice(0, i).trim();
    let v = l.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[k] ??= v;
  }
}
loadEnv(path.join(root, ".env.local"));

const args = process.argv.slice(2);
const daysArg = args.indexOf("--days");
const sinceArg = args.indexOf("--since");
const days = daysArg !== -1 ? Number(args[daysArg + 1]) : 7;
const since = sinceArg !== -1 ? args[sinceArg + 1] : null;
const THRESHOLD = 95;

const windowSql = since ? `created_at >= '${since}'::timestamptz` : `created_at >= now() - interval '${days} days'`;
const EXCLUDE = `NOT (source = 'system' AND table_name = 'push_notifications') AND coalesce(user_agent, '') NOT ILIKE '%Headless%'`;

const caPath = path.join(root, "scripts/supabase-pooler-ca.crt");
const ssl = existsSync(caPath) ? { ca: readFileSync(caPath, "utf8"), rejectUnauthorized: true } : true;
const client = new Client({ connectionString: process.env.SUPABASE_POOLER_URL, ssl });

try {
  await client.connect();

  const { rows: tong } = await client.query(`
    SELECT count(*)::int AS n,
           count(*) FILTER (WHERE performed_by IS NOT NULL OR employee_id IS NOT NULL)::int AS co
    FROM audit_logs WHERE ${windowSql} AND ${EXCLUDE}`);

  const { rows: theoNguon } = await client.query(`
    SELECT coalesce(source::text, '(null)') AS nguon, count(*)::int AS n,
           count(*) FILTER (WHERE performed_by IS NOT NULL OR employee_id IS NOT NULL)::int AS co
    FROM audit_logs WHERE ${windowSql} AND ${EXCLUDE}
    GROUP BY 1 ORDER BY n DESC`);

  const { rows: loai } = await client.query(`
    SELECT count(*)::int AS n FROM audit_logs WHERE ${windowSql} AND NOT (${EXCLUDE})`);

  const n = tong[0].n;
  const co = tong[0].co;
  const pct = n === 0 ? 100 : (co / n) * 100;

  console.log(`Nhật ký ${since ? `từ ${since}` : `${days} ngày qua`}: ${co}/${n} dòng có danh tính = ${pct.toFixed(1)}%`);
  console.log(`(loại khỏi mẫu số: ${loai[0].n} dòng — máy gọi máy + dấu vết e2e)\n`);
  console.log("Theo nguồn:");
  for (const r of theoNguon) {
    const p = r.n === 0 ? 100 : (r.co / r.n) * 100;
    console.log(`  ${r.nguon.padEnd(14)} ${String(r.co).padStart(5)}/${String(r.n).padEnd(5)} = ${p.toFixed(1)}%`);
  }

  if (n === 0) {
    console.log("\n⚠️  Cửa sổ không có dòng nào — chưa kết luận được, hãy nới cửa sổ.");
    process.exit(0);
  }

  const dat = pct >= THRESHOLD;
  console.log(dat ? `\n✅ Đạt ngưỡng G2 (>= ${THRESHOLD}%)` : `\n❌ Dưới ngưỡng G2 (${THRESHOLD}%) — còn đường ghi chưa mang danh tính`);
  process.exit(dat ? 0 : 1);
} catch (e) {
  console.error("❌", e.message, e.code || "");
  process.exit(1);
} finally {
  await client.end();
}
