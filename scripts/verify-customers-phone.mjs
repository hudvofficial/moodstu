#!/usr/bin/env node
/**
 * #27 — Báo cáo khách trùng / SĐT lệch. CHỈ ĐỌC (gọi public.customer_phone_report() qua pooler + CA ghim).
 * Dùng: npm run verify:customers
 *   khach_trung      → exit 1 (2+ khách sống cùng SĐT chuẩn — phải gộp tay)
 *   lead_trung_khach → thông tin (convert sẽ nối vào khách cũ, không tạo mới)
 *   sdt_khong_hop_le → thông tin (thiếu/thừa số — sửa tay, không backfill tự động)
 *   chua_chuan       → ứng viên backfill (quyết định riêng, #27 không sửa)
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
const caPath = path.join(root, "scripts/supabase-pooler-ca.crt");
const ssl = existsSync(caPath) ? { ca: readFileSync(caPath, "utf8"), rejectUnauthorized: true } : true;
if (!process.env.SUPABASE_POOLER_URL) {
  console.error("❌ thiếu SUPABASE_POOLER_URL trong .env.local");
  process.exit(1);
}

const LABEL = {
  khach_trung: "KHÁCH TRÙNG (phải gộp)",
  lead_trung_khach: "Lead trùng khách cũ (convert sẽ nối)",
  sdt_khong_hop_le: "SĐT sai độ dài (sửa tay)",
  chua_chuan: "Chưa chuẩn (ứng viên backfill)",
};

const client = new Client({ connectionString: process.env.SUPABASE_POOLER_URL, ssl });
try {
  await client.connect();
  const { rows } = await client.query("SELECT loai, sdt_chuan, so_dong, chi_tiet FROM public.customer_phone_report()");
  const byKind = {};
  for (const r of rows) (byKind[r.loai] ??= []).push(r);
  console.log(`customer_phone_report — ${rows.length} dòng`);
  for (const kind of Object.keys(LABEL)) {
    const list = byKind[kind] ?? [];
    console.log(`\n${LABEL[kind]}: ${list.length}`);
    for (const r of list) console.log(`  ${r.sdt_chuan ?? "(null)"}  ×${r.so_dong}  ${r.chi_tiet}`);
  }
  const dup = (byKind.khach_trung ?? []).length;
  console.log(dup ? `\n❌ ${dup} nhóm khách trùng` : "\n✅ 0 khách trùng");
  process.exit(dup ? 1 : 0);
} catch (e) {
  console.error("❌", e.message, e.code || "");
  process.exit(1);
} finally {
  await client.end();
}
