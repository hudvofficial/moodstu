// V0 — thước đo tuần của chương trình tối ưu (bước #5, chuẩn S4).
// CHỈ ĐỌC. Chạy mỗi thứ Hai: node scripts/v0-snapshot.mjs  → nối 1 dòng vào agent/V0-LOG.md
//
// Nguồn số (chuẩn "một số một nguồn" — SYSTEM_MAP §4):
//   phải thu · phải trả      → finance_debt_stats()          (RPC canonical)
//   phải trả lab             → finance_payable_summary()     (RPC canonical, lọc payee_type='lab')
//   tuổi HĐ / quá ngưỡng     → SQL chỉ đọc trên contracts    (chưa có RPC — ngưỡng C0: vàng >26, đỏ >43)
//   thu-đủ-chưa-đóng         → SQL chỉ đọc (remaining=0 & status<>hoan_thanh)
import { readFileSync, existsSync, appendFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";
const { Client } = pg;

const root = "c:/Users/Admin/Desktop/Ai/mood saas/mood-studio";
function loadEnv(fp) {
  if (!existsSync(fp)) return;
  for (const raw of readFileSync(fp, "utf8").split(/\r?\n/)) {
    const l = raw.trim(); if (!l || l.startsWith("#")) continue;
    const i = l.indexOf("="); if (i === -1) continue;
    let v = l.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[l.slice(0, i).trim()] ??= v;
  }
}
loadEnv(path.join(root, ".env.local"));
const caPath = path.join(root, "scripts/supabase-pooler-ca.crt");
const ssl = existsSync(caPath) ? { ca: readFileSync(caPath, "utf8"), rejectUnauthorized: true } : true;
const client = new Client({ connectionString: process.env.SUPABASE_POOLER_URL, ssl });
await client.connect();
const q = async (sql) => (await client.query(sql)).rows[0];

const debt = await q(`SELECT receivable::bigint AS receivable, payable::bigint AS payable FROM finance_debt_stats()`);
const lab = await q(`SELECT COALESCE(sum(remaining),0)::bigint AS lab FROM finance_payable_summary() WHERE payee_type='lab'`);
const age = await q(`
  WITH r AS (
    SELECT (CURRENT_DATE - work_date::date) AS d, remaining_amount, status
    FROM contracts
    WHERE deleted_at IS NULL AND status IN ('dang_thuc_hien','cho_xu_ly'))
  SELECT count(*) AS dang_chay,
         count(*) FILTER (WHERE d IS NULL) AS thieu_ngay_chup,
         count(*) FILTER (WHERE d > 26) AS vang,
         count(*) FILTER (WHERE d > 43) AS do,
         max(d) AS gia_nhat,
         COALESCE(sum(remaining_amount),0)::bigint AS tien_ket,
         (SELECT count(*) FROM contracts WHERE deleted_at IS NULL AND status <> 'hoan_thanh' AND status <> 'da_huy' AND remaining_amount <= 0 AND paid_amount > 0) AS thu_du_chua_dong
  FROM r`);
const kept = await q(`SELECT count(*) AS n FROM contracts c WHERE c.deleted_at IS NULL AND c.status<>'da_huy'
  AND EXISTS (SELECT 1 FROM printing_orders o WHERE o.contract_id=c.id AND o.deleted_at IS NULL AND COALESCE(o.status,'') NOT IN ('hoan_thanh','da_huy','huy_don'))`);
await client.end();

// Ngày theo giờ VN (luật vault): toISOString() là UTC → 23:00–07:00 VN sẽ ghi lùi 1 ngày (lỗi lần chạy 06/09 ghi 05/09)
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
const row = `| ${today} | ${age.dang_chay} | ${age.thieu_ngay_chup} | ${Number(age.tien_ket).toLocaleString("vi-VN")} | ${age.vang} | ${age.do} | ${age.gia_nhat} | ${age.thu_du_chua_dong} | ${Number(debt.receivable).toLocaleString("vi-VN")} | ${Number(lab.lab).toLocaleString("vi-VN")} | ${kept.n} |`;

const logPath = path.join(root, "agent/V0-LOG.md");
if (!existsSync(logPath)) {
  writeFileSync(logPath, [
    "# V0-LOG — thước đo tuần (chuẩn S4)",
    "",
    "Sinh bởi `node scripts/v0-snapshot.mjs` mỗi thứ Hai. Chỉ đọc. Ngưỡng theo C0: vàng >26 ngày, đỏ >43 ngày kể từ ngày chụp.",
    "Đích 90 ngày (G3): tiền kẹt ≤46tr · đỏ ≤5 · thu-đủ-chưa-đóng = 0 · nợ lab khớp thực tế.",
    "",
    "| Ngày | HĐ đang chạy | …thiếu ngày chụp | Tiền kẹt (đ) | Vàng >26d | Đỏ >43d | Già nhất (ngày) | Thu đủ chưa đóng | Phải thu (RPC) | Nợ lab (RPC) | HĐ có đơn in đang mở |",
    "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
    "",
  ].join("\n"), "utf8");
}
appendFileSync(logPath, row + "\n", "utf8");
console.log("V0", today, "→", row);
