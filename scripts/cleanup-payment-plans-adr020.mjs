#!/usr/bin/env node
/**
 * cleanup-payment-plans-adr020 — dọn lịch thu (payment_plans) của các HĐ ĐÃ THU ĐỦ đang lệch phiếu thu (ADR-020).
 *
 * Quy tắc (1 dòng): với mỗi HĐ còn sống, `remaining_amount = 0`, đang bị 2 check ADR-020 báo
 * (`plan_allocation_exceeds_amount` / `plan_amount_sum_mismatch`):  payment_plans.amount := Σ phân bổ của chính đợt đó,
 * rồi sync_payment_plan_statuses_v2(). Chỉ đụng `payment_plans` (đợt không huỷ, không `outside`).
 * KHÔNG đụng payments, payment_plan_allocations, contracts. HĐ còn nợ KHÔNG bao giờ bị chọn.
 *
 * Mặc định là DRY-RUN (chỉ SELECT, in trước/sau). Dùng:
 *   node scripts/cleanup-payment-plans-adr020.mjs                      # dry-run
 *   ALLOW_PROD_WRITE=1 node scripts/cleanup-payment-plans-adr020.mjs --apply [--backup file.json]
 *   ALLOW_PROD_WRITE=1 node scripts/cleanup-payment-plans-adr020.mjs --restore file.json   # trả đúng dữ liệu cũ
 * DB cục bộ (để thử): CLEANUP_PG_URL=postgres://postgres@127.0.0.1:5433/mood_restore (không cần ALLOW_PROD_WRITE).
 * Chạy lại sau khi dọn → "0 HĐ cần dọn" (idempotent). Một giao dịch duy nhất; sai bất biến sau dọn → ROLLBACK.
 * Thứ tự áp prod: migration 20261020100000 → script này (cùng cửa sổ) → contract_payment_health_checks() toàn 0.
 * Dry-run phải chọn 11 HĐ đã biết (0006, 0008, 0013, 0020, 0043, 0044, 0046, 0050, 0055, 0065, 0067) CỘNG THÊM chỉ những HĐ tạo
 * sau 20/10 trả đủ lúc ký (bug nhóm A còn sống tới khi migration lên) — cột 'tạo <ngày>' để nhận ra. Thấy HĐ lạ khác → dừng, hỏi.
 * `--restore` chỉ dùng NGAY SAU `--apply`; khôi phục sau khi đã có phiếu thu mới sẽ đưa lệch quay lại.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import pg from "pg";
import { requireProdWrite } from "./lib/prod-guard.mjs";

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

const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const restoreIdx = argv.indexOf("--restore");
const RESTORE_FILE = restoreIdx >= 0 ? argv[restoreIdx + 1] : null;
const backupIdx = argv.indexOf("--backup");
const today = new Date().toISOString().slice(0, 10);
const BACKUP_FILE =
  backupIdx >= 0 ? argv[backupIdx + 1] : path.join(root, "docs", "reports", `backup_${today}_payment_plans_adr020.json`);
const MAX_CONTRACTS = 30; // rào an toàn: dự kiến 11; nhiều hơn mức này = điều kiện chọn đang sai

const localUrl = process.env.CLEANUP_PG_URL;
let connectionString;
let ssl;
let isLocal = false;
if (localUrl) {
  const host = new URL(localUrl).hostname;
  isLocal = ["127.0.0.1", "localhost", "::1", "[::1]"].includes(host);
  if (!isLocal) {
    console.error(`❌ CLEANUP_PG_URL trỏ tới ${host} — chỉ chấp nhận DB cục bộ. Dùng SUPABASE_POOLER_URL cho prod.`);
    process.exit(2);
  }
  connectionString = localUrl;
} else {
  loadEnv(path.join(root, ".env.local"));
  connectionString = process.env.SUPABASE_POOLER_URL;
  const caPath = path.join(root, "scripts/supabase-pooler-ca.crt");
  ssl = existsSync(caPath) ? { ca: readFileSync(caPath, "utf8"), rejectUnauthorized: true } : true;
  if (!connectionString) {
    console.error("❌ Thiếu SUPABASE_POOLER_URL (.env.local).");
    process.exit(1);
  }
}

const writing = APPLY || Boolean(RESTORE_FILE);
if (writing && !isLocal) requireProdWrite("cleanup-payment-plans-adr020.mjs", APPLY ? "UPDATE payment_plans (11 HĐ đã thu đủ)" : "RESTORE payment_plans từ backup");

const client = new Client({ connectionString, ssl });
await client.connect();
const q = async (sql, params = []) => (await client.query(sql, params)).rows;
const money = (v) => Number(v).toLocaleString("vi-VN");

/** HĐ cần dọn: còn sống, remaining = 0, bị 1 trong 2 điều kiện ADR-020 (cùng định nghĩa với 2 health check). */
const TARGETS_SQL = `
  SELECT c.id, c.contract_code, c.total_amount, c.paid_amount, c.remaining_amount, c.status, c.payment_status, c.created_at
  FROM public.contracts c
  WHERE c.deleted_at IS NULL
    AND COALESCE(c.status, '') <> 'da_huy'
    AND COALESCE(c.remaining_amount, 0) = 0
    AND COALESCE(c.total_amount, 0) > 0
    AND (
      EXISTS (
        SELECT 1
        FROM public.payment_plans pp
        JOIN (
          SELECT ppa.payment_plan_id, SUM(ppa.amount) AS allocated
          FROM public.payment_plan_allocations ppa
          JOIN public.payments pay ON pay.id = ppa.payment_id AND pay.deleted_at IS NULL
          GROUP BY ppa.payment_plan_id
        ) s ON s.payment_plan_id = pp.id
        WHERE pp.contract_id = c.id
          AND COALESCE(pp.status, 'pending') <> 'cancelled'
          AND COALESCE(pp.stage_key, '') <> 'outside'
          AND s.allocated > COALESCE(pp.amount, 0) + 0.01
      )
      OR (
        EXISTS (SELECT 1 FROM public.payment_plans x WHERE x.contract_id = c.id AND COALESCE(x.status, 'pending') <> 'cancelled')
        AND ABS(
          COALESCE((SELECT SUM(x.amount) FROM public.payment_plans x
                    WHERE x.contract_id = c.id AND COALESCE(x.status, 'pending') <> 'cancelled' AND COALESCE(x.stage_key, '') <> 'outside'), 0)
          + COALESCE((SELECT SUM(pay.amount) FROM public.payments pay
                      WHERE pay.contract_id = c.id AND pay.deleted_at IS NULL AND COALESCE(pay.is_contract_adjustment, false)), 0)
          - COALESCE(c.total_amount, 0)
        ) > 0.01
      )
    )
  ORDER BY c.contract_code`;

const PLANS_SQL = `
  SELECT pp.id, pp.contract_id, pp.stage_name, pp.stage_key, pp.amount, pp.due_date, pp.status, pp.receipt_id, pp.sort_order, pp.created_at,
         COALESCE((SELECT SUM(a.amount) FROM public.payment_plan_allocations a
                   JOIN public.payments pay ON pay.id = a.payment_id AND pay.deleted_at IS NULL
                   WHERE a.payment_plan_id = pp.id), 0) AS allocated
  FROM public.payment_plans pp
  WHERE pp.contract_id = $1
  ORDER BY pp.sort_order, pp.created_at`;

const ADJ_SQL = `
  SELECT COALESCE(SUM(amount), 0) AS adj FROM public.payments
  WHERE contract_id = $1 AND deleted_at IS NULL AND COALESCE(is_contract_adjustment, false)`;

const isManaged = (p) => (p.status ?? "pending") !== "cancelled" && (p.stage_key ?? "") !== "outside";

/** Dữ liệu bất biến phải y nguyên sau khi dọn. */
async function fingerprint() {
  const r = (await q(`
    SELECT
      (SELECT md5(string_agg(id::text || ':' || amount::text, ',' ORDER BY id) ) FROM public.payments WHERE deleted_at IS NULL) AS payments,
      (SELECT md5(string_agg(id::text || ':' || payment_plan_id::text || ':' || payment_id::text || ':' || amount::text, ',' ORDER BY id)) FROM public.payment_plan_allocations) AS allocations,
      (SELECT md5(string_agg(id::text || ':' || total_amount::text || ':' || paid_amount::text || ':' || remaining_amount::text || ':' || payment_status, ',' ORDER BY id)) FROM public.contracts) AS contracts`))[0];
  return r;
}

async function plan() {
  const targets = await q(TARGETS_SQL);
  const items = [];
  for (const t of targets) {
    const plans = await q(PLANS_SQL, [t.id]);
    const adj = Number((await q(ADJ_SQL, [t.id]))[0].adj);
    const managed = plans.filter(isManaged);
    const expectedSum = managed.reduce((s, p) => s + Number(p.allocated), 0) + adj;
    const reconcilable = Math.abs(expectedSum - Number(t.total_amount)) <= 0.01;
    const changes = managed
      .filter((p) => Math.abs(Number(p.amount) - Number(p.allocated)) > 0.005)
      .map((p) => ({ id: p.id, stage_key: p.stage_key, stage_name: p.stage_name, from: Number(p.amount), to: Number(p.allocated), status: p.status }));
    items.push({ contract: t, plans, adj, reconcilable, expectedSum, changes });
  }
  return items;
}

function printPlan(items) {
  for (const it of items) {
    const c = it.contract;
    console.log(`\n${c.contract_code}  total ${money(c.total_amount)}  paid ${money(c.paid_amount)}  [${c.status}/${c.payment_status}]  tạo ${new Date(c.created_at).toISOString().slice(0, 10)}${it.reconcilable ? "" : "  ⚠️ KHÔNG khớp: Σ phân bổ + phát sinh = " + money(it.expectedSum) + " ≠ total → SẼ BỎ QUA"}`);
    for (const p of it.plans) {
      const ch = it.changes.find((x) => x.id === p.id);
      const tag = !isManaged(p) ? "(không đụng)" : ch ? `→ ${money(ch.to)}` : "(giữ)";
      console.log(`   ${String(p.stage_key ?? p.stage_name).padEnd(14)} amount ${money(p.amount).padStart(12)}  alloc ${money(p.allocated).padStart(12)}  ${String(p.status).padEnd(8)} ${tag}`);
    }
  }
}

async function restoreFromBackup(file) {
  const backup = JSON.parse(readFileSync(file, "utf8"));
  if (!Array.isArray(backup.plans) || backup.plans.length === 0) throw new Error("backup rỗng/sai định dạng");
  await client.query("BEGIN");
  try {
    for (const p of backup.plans) {
      const r = await client.query(
        "UPDATE public.payment_plans SET amount = $2, status = $3, receipt_id = $4 WHERE id = $1",
        [p.id, p.amount, p.status, p.receipt_id],
      );
      if (r.rowCount !== 1) throw new Error(`không thấy đợt ${p.id}`);
    }
    await client.query("COMMIT");
    console.log(`✅ Đã khôi phục ${backup.plans.length} đợt thuộc ${backup.contracts.length} HĐ từ ${file}`);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  }
}

try {
  if (RESTORE_FILE) {
    await restoreFromBackup(RESTORE_FILE);
  } else {
    const items = await plan();
    console.log(`Chọn ${items.length} HĐ đã thu đủ có lịch thu lệch (${APPLY ? "APPLY" : "DRY-RUN"}${isLocal ? ", DB cục bộ" : ", PROD"}).`);
    if (items.length > MAX_CONTRACTS) throw new Error(`Chọn ${items.length} HĐ > ${MAX_CONTRACTS}: điều kiện chọn có vấn đề, dừng.`);
    printPlan(items);

    const doable = items.filter((it) => it.reconcilable);
    const skipped = items.filter((it) => !it.reconcilable);
    console.log(`\nSẽ dọn ${doable.length} HĐ (${doable.reduce((s, it) => s + it.changes.length, 0)} đợt đổi số tiền)${skipped.length ? `; BỎ QUA ${skipped.length} HĐ không khớp bất biến — xử lý tay` : ""}.`);

    if (items.length === 0) {
      console.log("✅ 0 HĐ cần dọn.");
    } else if (!APPLY) {
      console.log("\n(Dry-run — chưa ghi gì. Thêm --apply để ghi.)");
    } else {
      // Backup TRƯỚC khi ghi
      const backup = {
        created_at: new Date().toISOString(),
        note: "Backup payment_plans của các HĐ bị cleanup-payment-plans-adr020 đụng tới. Khôi phục: --restore <file>.",
        contracts: doable.map((it) => ({ id: it.contract.id, contract_code: it.contract.contract_code })),
        plans: doable.flatMap((it) => it.plans.map((p) => ({
          id: p.id, contract_id: p.contract_id, stage_name: p.stage_name, stage_key: p.stage_key,
          amount: Number(p.amount), status: p.status, receipt_id: p.receipt_id, sort_order: p.sort_order,
        }))),
      };
      mkdirSync(path.dirname(BACKUP_FILE), { recursive: true });
      writeFileSync(BACKUP_FILE, JSON.stringify(backup, null, 2), "utf8");
      console.log(`Backup: ${BACKUP_FILE} (${backup.plans.length} đợt)`);

      const before = await fingerprint();
      await client.query("BEGIN");
      try {
        // khoá HĐ để không đua với sửa HĐ / thu tiền đồng thời
        await client.query("SELECT id FROM public.contracts WHERE id = ANY($1::uuid[]) FOR UPDATE", [doable.map((it) => it.contract.id)]);
        for (const it of doable) {
          for (const ch of it.changes) {
            await client.query("UPDATE public.payment_plans SET amount = $2 WHERE id = $1", [ch.id, ch.to]);
          }
          await client.query("SELECT public.sync_payment_plan_statuses_v2($1::uuid)", [it.contract.id]);
        }
        // Kiểm sau dọn (trong giao dịch)
        const after = await fingerprint();
        for (const k of ["payments", "allocations", "contracts"]) {
          if (before[k] !== after[k]) throw new Error(`Bất biến sai: ${k} bị đổi — ROLLBACK`);
        }
        const left = (await q(TARGETS_SQL)).filter((t) => doable.some((it) => it.contract.id === t.id));
        if (left.length > 0) throw new Error(`Còn ${left.length} HĐ vẫn lệch sau dọn (${left.map((t) => t.contract_code).join(", ")}) — ROLLBACK`);
        await client.query("COMMIT");
        console.log(`✅ Đã dọn ${doable.length} HĐ. payments / phân bổ / contracts: không đổi (so băm md5 trước-sau).`);
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      }
    }
  }
} catch (e) {
  console.error("❌", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
