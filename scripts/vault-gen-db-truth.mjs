// Sinh "sự thật DB" vào vault/30-du-lieu/ — phần mà vault-gen-schema.mjs KHÔNG lấy:
//   1. Thân hàm đầy đủ (prosrc)      → vault/30-du-lieu/than-ham/<nhom>.md
//   2. Nội dung RLS policy + grant   → vault/30-du-lieu/rls-va-quyen.md
//   3. Hàm mồ côi (DB có, code không gọi) → vault/30-du-lieu/ham-mo-coi.md
//
// CHỈ ĐỌC database. Chạy: node scripts/vault-gen-db-truth.mjs
import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import pg from "pg";
const { Client } = pg;

const root = "c:/Users/Admin/Desktop/Ai/mood saas/mood-studio";

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
const client = new Client({ connectionString: process.env.SUPABASE_POOLER_URL, ssl });
await client.connect();

// ── 1. hàm + thân ─────────────────────────────────────────────────────────
const fns = (await client.query(`
  SELECT p.proname n,
         pg_get_function_identity_arguments(p.oid) args,
         pg_get_function_result(p.oid) ret,
         p.prosecdef secdef,
         l.lanname lang,
         p.provolatile vol,
         p.prosrc src
  FROM pg_proc p
  JOIN pg_namespace ns ON ns.oid = p.pronamespace AND ns.nspname = 'public'
  JOIN pg_language l ON l.oid = p.prolang
  -- loại hàm do extension cài (pg_trgm, uuid-ossp…): không phải hàm của ứng dụng
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e'
  )
  ORDER BY p.proname`)).rows;

// hàm được gọi từ event trigger (không phải trigger bảng thường)
const evtTrigFns = (await client.query(`
  SELECT p.proname n FROM pg_event_trigger et JOIN pg_proc p ON p.oid = et.evtfoid`)).rows.map(r => r.n);

// ── 2. policy đầy đủ + grant ──────────────────────────────────────────────
const pols = (await client.query(`
  SELECT tablename t, policyname n, cmd, roles::text[] roles,
         COALESCE(qual, '') qual, COALESCE(with_check, '') wcheck
  FROM pg_policies WHERE schemaname = 'public'
  ORDER BY tablename, cmd, policyname`)).rows;

const rls = (await client.query(`
  SELECT c.relname t, c.relrowsecurity on_rls, c.relforcerowsecurity force_rls
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
  ORDER BY c.relname`)).rows;

const grants = (await client.query(`
  SELECT table_name t, grantee g, string_agg(DISTINCT privilege_type, ',' ORDER BY privilege_type) p
  FROM information_schema.role_table_grants
  WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated')
  GROUP BY table_name, grantee
  ORDER BY table_name, grantee`)).rows;

// ── 3. bảng, để phân nhóm hàm theo bảng nó đụng ───────────────────────────
const tables = (await client.query(`
  SELECT c.relname t FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r' ORDER BY length(c.relname) DESC`)).rows.map(r => r.t);

await client.end();

// ── phân nhóm: cùng bảng nhóm với vault-gen-schema.mjs ────────────────────
const GROUPS = {
  "hop-dong": ["contracts", "contract_items", "contract_events", "contract_checklists", "contract_notes", "checklist_templates", "event_templates", "addon_history", "documents", "approval_requests"],
  "gallery": ["galleries", "gallery_images", "gallery_reactions", "gallery_comments", "gallery_share_links", "gallery_albums", "gallery_selection_batches", "gallery_selection_batch_items", "gallery_filter_jobs", "gallery_password_attempts"],
  "tai-chinh": ["payments", "payment_plans", "payment_plan_allocations", "expenses", "expense_allocations", "receipts", "debts", "budgets", "financial_goals", "goal_contributions", "fixed_costs", "finance_monthly_closes", "finance_close_tasks", "transaction_categories", "credit_cards", "investments", "investment_maintenance_logs"],
  "khach-hang-crm": ["customers", "crm_leads"],
  "dich-vu": ["services", "service_categories", "service_bundles", "service_relations", "price_rules", "promotions"],
  "nhan-su": ["employees", "employee_salaries", "monthly_salaries", "salary_adjustments", "attendance", "work_shifts", "work_tasks", "schedules", "evaluations", "requests"],
  "in-an-lab": ["printing_orders", "printing_order_status_history", "labs", "lab_services"],
  "vat-tu": ["inventory_items", "inventory_transactions", "equipment"],
  "vay-cuoi": ["dresses", "dress_rentals", "dress_rental_accessories", "dress_reservations"],
  "nha-cung-cap": ["vendors"],
  "moodie-ai": tables.filter(t => t.startsWith("moodie_") || t.startsWith("ai_")),
  "he-thong": ["audit_logs", "system_settings", "studio_info", "notifications", "notification_preferences", "notification_queue", "push_subscriptions", "login_attempts", "realtime_signals", "google_sync_queue", "integrity_reports"],
};

/** Hàm thuộc nhóm nào = nhóm có nhiều tên bảng xuất hiện trong thân nhất. */
function groupOf(fn) {
  const src = (fn.src || "").toLowerCase();
  let best = "he-thong", bestScore = 0;
  for (const [g, tbls] of Object.entries(GROUPS)) {
    let score = 0;
    for (const t of tbls) {
      const hits = src.split(t).length - 1;
      if (hits > 0) score += hits;
    }
    if (score > bestScore) { bestScore = score; best = g; }
  }
  // hàm không đụng bảng nào → đoán theo tên
  if (bestScore === 0) {
    const n = fn.n.toLowerCase();
    for (const [g, tbls] of Object.entries(GROUPS)) {
      if (tbls.some(t => n.includes(t.replace(/s$/, "")))) return g;
    }
    if (n.startsWith("finance_") || n.includes("payment") || n.includes("expense")) return "tai-chinh";
  }
  return best;
}

// ── quét code để tìm hàm mồ côi ───────────────────────────────────────────
const SRC_DIRS = ["app", "components", "lib", "hooks", "scripts", "types", "tests"];
const SRC_EXT = new Set([".ts", ".tsx", ".mjs", ".js", ".jsx"]);
let corpus = "";
function walk(dir) {
  let entries;
  try { entries = readdirSync(dir); } catch { return; }
  for (const e of entries) {
    if (e === "node_modules" || e === ".next" || e === "dist") continue;
    const fp = path.join(dir, e);
    let st;
    try { st = statSync(fp); } catch { continue; }
    if (st.isDirectory()) walk(fp);
    else if (SRC_EXT.has(path.extname(e))) {
      // database.types.ts do Supabase sinh — nó liệt kê TÊN MỌI HÀM nên sẽ
      // che mất hàm chết. Bỏ qua để phép quét phản ánh code người viết.
      if (e === "database.types.ts") continue;
      try { corpus += readFileSync(fp, "utf8") + "\n"; } catch { /* bỏ qua file đọc lỗi */ }
    }
  }
}
for (const d of SRC_DIRS) walk(path.join(root, d));

const calledByCode = new Set();
const calledByOtherFn = new Set();
// Nơi gọi PHÍA DB không chỉ là thân hàm khác: policy RLS gọi hàm trong
// USING/WITH CHECK, và event trigger gọi hàm mà không qua pg_trigger.
const polExpr = pols.map(p => `${p.qual} ${p.wcheck}`).join("\n");
const evtSet = new Set(evtTrigFns);
for (const f of fns) {
  if (corpus.includes(f.n)) calledByCode.add(f.n);
  const others = fns.filter(x => x.n !== f.n).map(x => x.src || "").join("\n");
  if (others.includes(f.n) || polExpr.includes(f.n) || evtSet.has(f.n)) calledByOtherFn.add(f.n);
}

// ── ghi file ──────────────────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);
const FM = (title, tags) => [
  "---",
  `title: "${title}"`,
  `tags: [${tags}]`,
  `cap-nhat: ${today}`,
  "trang-thai: sinh-tu-dong",
  "nguon: pg_proc · pg_policies · information_schema.role_table_grants",
  "---",
  "",
  "> ⚙️ **File này do `scripts/vault-gen-db-truth.mjs` sinh ra từ database production. ĐỪNG sửa tay** — chạy lại script để cập nhật.",
  "",
].join("\n");

const outDir = path.join(root, "vault/30-du-lieu");
const fnDir = path.join(outDir, "than-ham");
mkdirSync(fnDir, { recursive: true });

// 1. thân hàm theo nhóm
const byGroup = {};
for (const f of fns) (byGroup[groupOf(f)] ??= []).push(f);

for (const [g, list] of Object.entries(byGroup)) {
  list.sort((a, b) => a.n.localeCompare(b.n));
  const L = [FM(`Thân hàm DB — ${g}`, `sinh-tu-dong, db, ham, ${g}`)];
  L.push(`# Thân hàm DB — ${g}`, "", `${list.length} hàm. \`SECURITY DEFINER\` = chạy bằng quyền chủ hàm, **bỏ qua RLS** → hàm loại này phải tự kiểm quyền bên trong.`, "");
  L.push("| Hàm | Tham số | Trả về | Quyền | Ngôn ngữ |", "|---|---|---|---|---|");
  for (const f of list) {
    L.push(`| [\`${f.n}\`](#${f.n.toLowerCase()}) | \`${(f.args || "").replace(/\|/g, "\\|") || "—"}\` | \`${(f.ret || "").replace(/\|/g, "\\|")}\` | ${f.secdef ? "**DEFINER**" : "invoker"} | ${f.lang} |`);
  }
  L.push("");
  for (const f of list) {
    L.push("---", "", `## ${f.n}`, "");
    L.push(`\`${f.n}(${f.args || ""})\` → \`${f.ret}\` · ${f.secdef ? "**SECURITY DEFINER — bỏ qua RLS**" : "SECURITY INVOKER"} · ${f.lang} · ${{ i: "IMMUTABLE", s: "STABLE", v: "VOLATILE" }[f.vol] || f.vol}`, "");
    L.push("```sql", (f.src || "").trim(), "```", "");
  }
  writeFileSync(path.join(fnDir, `${g}.md`), L.join("\n"), "utf8");
}

// 2. RLS + grant
{
  const L = [FM("RLS & quyền bảng — chi tiết", "sinh-tu-dong, db, bao-mat, rls")];
  L.push("# RLS & quyền bảng", "",
    "Đọc cùng [[bao-mat-du-lieu-rls]]. Nhớ: **server action luôn dùng service-role nên RLS KHÔNG áp dụng cho đường đó** — RLS chỉ là cổng cho anon key (client-direct + realtime).", "");

  const grantMap = {};
  for (const g of grants) (grantMap[g.t] ??= []).push(`${g.g}=${g.p}`);
  const polMap = {};
  for (const p of pols) (polMap[p.t] ??= []).push(p);

  L.push("## Tổng quan", "", "| Bảng | RLS | Force | Policy | Quyền anon/authenticated |", "|---|---|---|---:|---|");
  for (const r of rls) {
    const np = (polMap[r.t] || []).length;
    const gr = (grantMap[r.t] || []).join(" · ") || "—";
    const flag = r.on_rls && np === 0 ? " ⚠️" : "";
    L.push(`| \`${r.t}\` | ${r.on_rls ? "bật" : "**TẮT**"} | ${r.force_rls ? "có" : "—"} | ${np}${flag} | ${gr.replace(/\|/g, "\\|")} |`);
  }
  L.push("", "⚠️ = RLS bật nhưng **0 policy** ⇒ anon key không đọc/ghi được gì (chặn hoàn toàn).", "");

  L.push("## Nội dung từng policy", "");
  for (const t of Object.keys(polMap).sort()) {
    L.push(`### \`${t}\``, "");
    for (const p of polMap[t]) {
      L.push(`**${p.n}** · \`${p.cmd}\` · roles: \`${(p.roles || []).join(", ")}\``);
      if (p.qual) L.push("", "```sql", `USING ${p.qual}`, "```");
      if (p.wcheck) L.push("", "```sql", `WITH CHECK ${p.wcheck}`, "```");
      L.push("");
    }
  }
  writeFileSync(path.join(outDir, "rls-va-quyen.md"), L.join("\n"), "utf8");
}

// 3. hàm mồ côi
{
  const orphans = fns.filter(f => !calledByCode.has(f.n));
  const trulyDead = orphans.filter(f => !calledByOtherFn.has(f.n) && f.ret !== "trigger");
  const triggerOnly = orphans.filter(f => f.ret === "trigger");
  const calledBySql = orphans.filter(f => calledByOtherFn.has(f.n) && f.ret !== "trigger");

  const L = [FM("Hàm DB không được code gọi", "sinh-tu-dong, db, ham, no-ky-thuat")];
  L.push("# Hàm DB không được code gọi", "",
    `Tổng ${fns.length} hàm trên DB · **${calledByCode.size}** được nhắc tới trong code ứng dụng · **${orphans.length}** không.`, "",
    "Quét theo tên hàm xuất hiện dạng chuỗi trong `app/ components/ lib/ hooks/ scripts/ types/ tests/`. Trùng tên có thể gây dương tính giả — dùng file này để **khoanh vùng cần kiểm**, không dùng để xoá thẳng.", "");

  const sec = (title, list, note) => {
    L.push(`## ${title} — ${list.length}`, "", note, "");
    if (!list.length) { L.push("_(không có)_", ""); return; }
    L.push("| Hàm | Trả về | Quyền |", "|---|---|---|");
    for (const f of list.sort((a, b) => a.n.localeCompare(b.n)))
      L.push(`| \`${f.n}\` | \`${(f.ret || "").replace(/\|/g, "\\|")}\` | ${f.secdef ? "**DEFINER**" : "invoker"} |`);
    L.push("");
  };
  sec("Hàm trigger", triggerOnly, "Không code nào gọi là **đúng** — chúng chạy bằng trigger. Đối chiếu với danh sách trigger trong `luoc-do-*.md`.");
  sec("Được hàm SQL khác gọi", calledBySql, "Không lộ ra ứng dụng nhưng vẫn sống — là hàm phụ trợ bên trong DB.");
  sec("KHÔNG ai gọi — cần kiểm", trulyDead, "Không code gọi, không hàm SQL nào gọi, không phải trigger. Đây là danh sách **ứng viên chết** — mỗi cái cần xác nhận trước khi kết luận.");

  writeFileSync(path.join(outDir, "ham-mo-coi.md"), L.join("\n"), "utf8");

  console.log(`✓ than-ham/: ${Object.keys(byGroup).length} nhóm, ${fns.length} hàm (${fns.filter(f => f.secdef).length} SECURITY DEFINER)`);
  console.log(`✓ rls-va-quyen.md: ${rls.length} bảng, ${pols.length} policy`);
  console.log(`✓ ham-mo-coi.md: ${orphans.length} không được code gọi → ${triggerOnly.length} trigger, ${calledBySql.length} gọi bởi SQL, ${trulyDead.length} cần kiểm`);
}
