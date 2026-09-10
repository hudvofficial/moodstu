// Sinh BẢNG KIỂM KÊ TOÀN HỆ THỐNG vào agent/inventory/
// Mỗi phần tử (bảng · hàm DB · trang · API route · file action) đúng MỘT dòng.
// Cơ học 100% — script không bỏ sót được. Cột "vận hành thực tế" phần suy luận
// do người/Claude chú giải riêng ở agent/inventory/00-lech-thiet-ke.md.
//
// CHỈ ĐỌC database. Chạy: node scripts/vault-gen-kiem-ke.mjs
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

const Q = async (sql) => (await client.query(sql)).rows;

const cols = await Q(`
  SELECT c.table_name t, c.column_name col, c.data_type dt, c.is_nullable nul,
         c.column_default def, c.is_generated gen, c.identity_generation ident
  FROM information_schema.columns c
  JOIN pg_class pc ON pc.relname = c.table_name
  JOIN pg_namespace pn ON pn.oid = pc.relnamespace AND pn.nspname = 'public'
  WHERE c.table_schema = 'public' AND pc.relkind = 'r'
  ORDER BY c.table_name, c.ordinal_position`);

const fks = await Q(`
  SELECT c.conrelid::regclass::text tu, a.attname cot, c.confrelid::regclass::text den,
         CASE c.confdeltype WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL' WHEN 'r' THEN 'RESTRICT' ELSE '' END del
  FROM pg_constraint c
  JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
  JOIN pg_namespace n ON n.oid = c.connamespace
  WHERE c.contype = 'f' AND n.nspname = 'public'`);

const trigs = await Q(`
  SELECT c.relname t, tg.tgname n, p.proname fn
  FROM pg_trigger tg
  JOIN pg_class c ON c.oid = tg.tgrelid
  JOIN pg_namespace ns ON ns.oid = c.relnamespace AND ns.nspname = 'public'
  JOIN pg_proc p ON p.oid = tg.tgfoid
  WHERE NOT tg.tgisinternal
  ORDER BY c.relname, tg.tgname`);

const checks = await Q(`
  SELECT c.relname t, con.conname n, pg_get_constraintdef(con.oid) d
  FROM pg_constraint con
  JOIN pg_class c ON c.oid = con.conrelid
  JOIN pg_namespace ns ON ns.oid = c.relnamespace AND ns.nspname = 'public'
  WHERE con.contype = 'c'`);

const rls = await Q(`
  SELECT c.relname t, c.relrowsecurity on_rls,
         (SELECT count(*) FROM pg_policies p WHERE p.schemaname='public' AND p.tablename=c.relname) np,
         (SELECT string_agg(p.policyname || ':' || p.cmd, ', ' ORDER BY p.policyname)
            FROM pg_policies p WHERE p.schemaname='public' AND p.tablename=c.relname) pols
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind='r'`);

const counts = await Q(`SELECT relname t, n_live_tup n FROM pg_stat_user_tables WHERE schemaname='public'`);

const fns = await Q(`
  SELECT p.proname n, pg_get_function_identity_arguments(p.oid) args,
         pg_get_function_result(p.oid) ret, p.prosecdef secdef, p.provolatile vol,
         l.lanname lang, p.prosrc src
  FROM pg_proc p
  JOIN pg_namespace ns ON ns.oid = p.pronamespace AND ns.nspname = 'public'
  JOIN pg_language l ON l.oid = p.prolang
  WHERE NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
  ORDER BY p.proname`);

const enums = await Q(`
  SELECT t.typname n, string_agg(e.enumlabel, ' · ' ORDER BY e.enumsortorder) v
  FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
  JOIN pg_namespace n ON n.oid = t.typnamespace AND n.nspname='public'
  GROUP BY t.typname ORDER BY t.typname`);

await client.end();

// ─── index hoá ────────────────────────────────────────────────────────────
const tables = [...new Set(cols.map(c => c.t))].sort();
const byTable = (arr, key = "t") => arr.reduce((m, r) => ((m[r[key]] ??= []).push(r), m), {});
const colsOf = byTable(cols), trigOf = byTable(trigs), checkOf = byTable(checks);
const rlsOf = Object.fromEntries(rls.map(r => [r.t, r]));
const cntOf = Object.fromEntries(counts.map(r => [r.t, r.n]));
const fkOut = byTable(fks, "tu"), fkIn = byTable(fks, "den");

// ─── quét code ────────────────────────────────────────────────────────────
const SRC = ["app", "components", "lib", "hooks", "types", "tests"];
const EXT = new Set([".ts", ".tsx", ".mjs", ".js", ".jsx"]);
const files = [];
(function walk(dir) {
  let es; try { es = readdirSync(dir); } catch { return; }
  for (const e of es) {
    if (e === "node_modules" || e === ".next" || e === "dist") continue;
    const fp = path.join(dir, e);
    let st; try { st = statSync(fp); } catch { continue; }
    if (st.isDirectory()) walk(fp);
    else if (EXT.has(path.extname(e)) && e !== "database.types.ts") {
      try { files.push({ p: path.relative(root, fp).replace(/\\/g, "/"), s: readFileSync(fp, "utf8") }); } catch {}
    }
  }
})(path.join(root)) ;

const rel = (f) => f.p;
/** file nào chạm bảng qua PostgREST */
function codeTouch(t) {
  const pat = [`from("${t}")`, `from('${t}')`, `from(\`${t}\`)`];
  return files.filter(f => pat.some(p => f.s.includes(p))).map(rel);
}
/** file nào gọi hàm RPC */
function codeCallsFn(n) {
  return files.filter(f => f.s.includes(n)).map(rel);
}
/** hàm DB nào GHI vào bảng (regex trên thân hàm) */
const writeRe = (t) => new RegExp(`(insert\\s+into|update|delete\\s+from)\\s+(public\\.)?${t}\\b`, "i");
function fnWrite(t) {
  const re = writeRe(t);
  return fns.filter(f => re.test(f.src || "")).map(f => f.n);
}
function fnRead(t) {
  const re = new RegExp(`\\b(from|join)\\s+(public\\.)?${t}\\b`, "i");
  return fns.filter(f => re.test(f.src || "") && !writeRe(t).test(f.src || "")).map(f => f.n);
}
/** bảng nào một hàm chạm tới */
function fnTables(f) {
  const src = (f.src || "").toLowerCase();
  return tables.filter(t => new RegExp(`\\b(public\\.)?${t}\\b`).test(src));
}

// ─── phân vùng (khớp vault-gen-schema) ────────────────────────────────────
const VUNG = {
  "01-hop-dong": { ten: "Hợp đồng", t: ["contracts","contract_items","contract_events","contract_checklists","contract_notes","addon_history","work_tasks","checklist_templates","event_templates"] },
  "02-khach-hang": { ten: "Khách hàng & bán hàng", t: ["crm_leads","customers","price_rules","promotions"] },
  "03-tien-vao": { ten: "Tiền vào", t: ["payments","payment_plans","payment_plan_allocations","receipts"] },
  "04-tien-ra": { ten: "Tiền ra & sổ kỳ", t: ["expenses","expense_allocations","transaction_categories","fixed_costs","debts","finance_monthly_closes","finance_close_tasks","budgets","financial_goals","goal_contributions","investments","investment_maintenance_logs","credit_cards"] },
  "05-nhan-su": { ten: "Nhân sự & lương", t: ["employees","employee_salaries","monthly_salaries","salary_adjustments","attendance","work_shifts","schedules","evaluations","requests","approval_requests"] },
  "06-in-an": { ten: "In ấn & lab", t: ["printing_orders","printing_order_status_history","labs","lab_services"] },
  "07-kho": { ten: "Kho & tài sản", t: ["inventory_items","inventory_transactions","equipment","vendors"] },
  "08-vay-cuoi": { ten: "Váy cưới", t: ["dresses","dress_reservations","dress_rentals","dress_rental_accessories"] },
  "09-dich-vu": { ten: "Dịch vụ", t: ["services","service_categories","service_bundles","service_relations"] },
  "10-gallery": { ten: "Gallery", t: ["galleries","gallery_images","gallery_albums","gallery_comments","gallery_reactions","gallery_share_links","gallery_filter_jobs","gallery_password_attempts","gallery_selection_batches","gallery_selection_batch_items"] },
  "11-moodie": { ten: "Moodie AI", t: tables.filter(t => t.startsWith("moodie_") || t.startsWith("ai_")) },
  "12-nen-tang": { ten: "Nền tảng", t: ["audit_logs","system_settings","studio_info","realtime_signals","notifications","notification_queue","notification_preferences","push_subscriptions","login_attempts","google_sync_queue","documents","integrity_reports"] },
};
const assigned = new Set(Object.values(VUNG).flatMap(v => v.t));
const sot = tables.filter(t => !assigned.has(t));
if (sot.length) VUNG["12-nen-tang"].t.push(...sot);

/** hàm thuộc vùng có nhiều tên bảng của vùng đó nhất trong thân */
function vungOfFn(f) {
  const src = (f.src || "").toLowerCase();
  let best = "12-nen-tang", score = 0;
  for (const [k, v] of Object.entries(VUNG)) {
    let s = 0;
    for (const t of v.t) s += src.split(t).length - 1;
    if (s > score) { score = s; best = k; }
  }
  return best;
}
const fnByVung = {};
for (const f of fns) (fnByVung[vungOfFn(f)] ??= []).push(f);

// ─── ghi file ─────────────────────────────────────────────────────────────
const outDir = path.join(root, "agent/inventory");
mkdirSync(outDir, { recursive: true });
const esc = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
const VOL = { i: "IMMUTABLE", s: "STABLE", v: "VOLATILE" };
let tongBang = 0, tongHam = 0;

for (const [key, v] of Object.entries(VUNG)) {
  const L = [
    "---",
    `title: "Kiểm kê — ${v.ten}"`,
    `lat-cat: ${key}`,
    "cap-nhat: 2026-09-01",
    "trang-thai: sinh-tu-dong",
    "nguon: pg_class · pg_proc · pg_policies · pg_trigger · pg_constraint · quét mã nguồn",
    "---",
    "",
    "> ⚙️ **Sinh bởi `scripts/vault-gen-kiem-ke.mjs` từ database production. ĐỪNG sửa tay.**",
    "> Cột *vận hành thực tế* ở đây là dữ kiện đo được (ai ghi, ai đọc, còn sống hay không).",
    "> Phần diễn giải *thiết kế ban đầu ↔ thực tế lệch nhau chỗ nào* nằm ở [[00-lech-thiet-ke]].",
    "",
    `# Kiểm kê — ${v.ten}`,
    "",
    `${v.t.length} bảng · ${(fnByVung[key] || []).length} hàm DB`,
    "",
    "## Bảng dữ liệu",
    "",
  ];

  for (const t of v.t.slice().sort()) {
    const cs = colsOf[t] || [];
    if (!cs.length) { L.push(`### \`${t}\`\n\n> ⚠️ Không đọc được cột — bảng có tồn tại không?\n`); continue; }
    tongBang++;
    const derived = cs.filter(c => c.gen === "ALWAYS" || (c.def && /nextval|gen_random|now\(\)/i.test(c.def)));
    const out = (fkOut[t] || []).map(f => `\`${f.cot}\`→\`${f.den}\`${f.del ? ` (${f.del})` : ""}`);
    const inb = [...new Set((fkIn[t] || []).map(f => `\`${f.tu}\``))];
    const tg = (trigOf[t] || []).map(x => `\`${x.n}\`→${x.fn}()`);
    const ck = (checkOf[t] || []).map(x => `\`${x.d.replace(/::[a-z_ \[\]]+/g, "")}\``);
    const r = rlsOf[t] || {};
    const wFn = fnWrite(t), rFn = fnRead(t), cT = codeTouch(t);

    L.push(`### \`${t}\``, "");
    L.push(`**Số dòng (ước):** ${cntOf[t] ?? "?"} · **RLS:** ${r.on_rls ? "bật" : "**TẮT**"} · **Policy:** ${r.np ?? 0}${r.on_rls && Number(r.np) === 0 ? " ⚠️ bật RLS nhưng 0 policy ⇒ anon key bị chặn hoàn toàn" : ""}`, "");
    if (r.pols) L.push(`**Policy:** ${esc(r.pols)}`, "");
    L.push("| Cột | Kiểu | Null | Mặc định / dẫn xuất |", "|---|---|---|---|");
    for (const c of cs) {
      const d = c.gen === "ALWAYS" ? "**GENERATED**" : (c.def ? `\`${esc(c.def).slice(0, 60)}\`` : "—");
      L.push(`| \`${c.col}\` | ${c.dt} | ${c.nul === "YES" ? "có" : "không"} | ${d} |`);
    }
    L.push("");
    if (out.length) L.push(`**Trỏ ra:** ${out.join(" · ")}`, "");
    if (inb.length) L.push(`**Bị trỏ tới bởi (${inb.length}):** ${inb.join(" · ")}`, "");
    if (tg.length) L.push(`**Trigger:** ${tg.join(" · ")}`, "");
    if (ck.length) L.push(`**CHECK:** ${ck.map(esc).join(" · ")}`, "");
    L.push(`**GHI qua RPC (${wFn.length}):** ${wFn.length ? wFn.map(x => `\`${x}\``).join(" · ") : "— không hàm DB nào ghi"}`, "");
    L.push(`**ĐỌC qua RPC (${rFn.length}):** ${rFn.length ? rFn.slice(0, 12).map(x => `\`${x}\``).join(" · ") + (rFn.length > 12 ? ` … +${rFn.length - 12}` : "") : "—"}`, "");
    L.push(`**Chạm từ mã nguồn (${cT.length}):** ${cT.length ? cT.slice(0, 10).map(x => `\`${x}\``).join(" · ") + (cT.length > 10 ? ` … +${cT.length - 10}` : "") : "— **không file nào truy vấn trực tiếp**"}`, "");
    if (!wFn.length && !cT.length) L.push("> 🔴 **Không đường ghi nào tìm thấy** — bảng này có thể đã chết hoặc chỉ nhận dữ liệu từ ngoài hệ thống.", "");
    L.push("");
  }

  const fl = (fnByVung[key] || []).slice().sort((a, b) => a.n.localeCompare(b.n));
  L.push("## Hàm DB", "");
  if (!fl.length) L.push("_(không có hàm nào phân vào vùng này)_", "");
  else {
    L.push("| Hàm | Trả về | Quyền | Tính chất | Bảng chạm | Gọi từ mã nguồn |", "|---|---|---|---|---|---|");
    for (const f of fl) {
      tongHam++;
      const callers = codeCallsFn(f.n);
      const tb = fnTables(f);
      L.push(`| \`${f.n}(${esc(f.args).slice(0, 70)})\` | \`${esc(f.ret)}\` | ${f.secdef ? "**DEFINER**" : "invoker"} | ${VOL[f.vol] || f.vol} | ${tb.length ? tb.slice(0, 6).join(", ") + (tb.length > 6 ? ` +${tb.length - 6}` : "") : "—"} | ${callers.length ? `${callers.length} file` : "**0 — không ai gọi**"} |`);
    }
    L.push("", "Thân đầy đủ từng hàm: `vault/30-du-lieu/than-ham/`.", "");
  }

  writeFileSync(path.join(outDir, `${key}.md`), L.join("\n"), "utf8");
}

// ─── enum ─────────────────────────────────────────────────────────────────
{
  const L = ["---", 'title: "Kiểm kê — Enum"', "lat-cat: 15-enum", "cap-nhat: 2026-09-01", "trang-thai: sinh-tu-dong", "---", "",
    "> ⚙️ Sinh tự động từ `pg_type`. ĐỪNG sửa tay.", "", "# Enum", "",
    `${enums.length} enum trong schema public.`, "", "| Enum | Giá trị |", "|---|---|"];
  for (const e of enums) L.push(`| \`${e.n}\` | ${esc(e.v)} |`);
  L.push("", "> ⚠️ Cột trạng thái KHÔNG dùng enum thì DB không chặn giá trị lạ. Đã biết: `work_tasks.status` và `contract_events.status` là `text` tự do.", "");
  writeFileSync(path.join(outDir, "15-enum.md"), L.join("\n"), "utf8");
}

// ─── trang · API · action ─────────────────────────────────────────────────
{
  const pages = files.filter(f => /^app\/.*\/page\.tsx$/.test(f.p) || f.p === "app/page.tsx");
  const apis = files.filter(f => /^app\/api\/.*\/route\.ts$/.test(f.p));
  const actions = files.filter(f => /^app\/actions\/[^/]+\.ts$/.test(f.p));
  const guardOf = (s) => {
    const g = [...new Set((s.match(/\b(withAuth|withAdmin|require[A-Za-z]*Access|canAccess)\b/g) || []))];
    return g.length ? g.join(", ") : "—";
  };
  const rpcOf = (s) => [...new Set((s.match(/\.rpc\(\s*["'`]([a-z0-9_]+)["'`]/gi) || []).map(m => m.replace(/.*["'`]([a-z0-9_]+)["'`]/i, "$1")))];
  const tblOf = (s) => [...new Set((s.match(/\.from\(\s*["'`]([a-z0-9_]+)["'`]/gi) || []).map(m => m.replace(/.*["'`]([a-z0-9_]+)["'`]/i, "$1")))];

  const L = ["---", 'title: "Kiểm kê — Trang · API · Server Action"', "lat-cat: 13-14-giao-dien", "cap-nhat: 2026-09-01", "trang-thai: sinh-tu-dong", "---", "",
    "> ⚙️ Sinh tự động bằng quét thư mục + regex. ĐỪNG sửa tay.", "",
    "# Trang · API route · Server action", "",
    `${pages.length} trang · ${apis.length} API route · ${actions.length} file server action`, "",
    "> Edge middleware = `proxy.ts` (chuẩn Next 16): chặn chưa-đăng-nhập + bơm role header; KHÔNG chặn vai trò theo route. Cột *Guard* dưới đây là lớp enforce vai trò.", "",
    "## Trang", "", "| Đường dẫn | Guard tìm thấy | Gọi RPC | Chạm bảng trực tiếp |", "|---|---|---|---|"];
  for (const f of pages.sort((a, b) => a.p.localeCompare(b.p))) {
    const route = f.p.replace(/^app/, "").replace(/\/page\.tsx$/, "") || "/";
    L.push(`| \`${route}\` | ${guardOf(f.s)} | ${rpcOf(f.s).slice(0, 4).join(", ") || "—"} | ${tblOf(f.s).slice(0, 4).join(", ") || "—"} |`);
  }
  L.push("", "## API route", "", "| Đường dẫn | Guard tìm thấy | Gọi RPC | Chạm bảng |", "|---|---|---|---|");
  for (const f of apis.sort((a, b) => a.p.localeCompare(b.p))) {
    L.push(`| \`${f.p.replace(/^app/, "").replace(/\/route\.ts$/, "")}\` | ${guardOf(f.s)} | ${rpcOf(f.s).slice(0, 4).join(", ") || "—"} | ${tblOf(f.s).slice(0, 5).join(", ") || "—"} |`);
  }
  L.push("", "## Server action", "", "| File | Guard | RPC gọi xuống | Bảng chạm trực tiếp |", "|---|---|---|---|");
  for (const f of actions.sort((a, b) => a.p.localeCompare(b.p))) {
    const r = rpcOf(f.s), t = tblOf(f.s);
    L.push(`| \`${path.basename(f.p)}\` | ${guardOf(f.s)} | ${r.length ? r.slice(0, 5).join(", ") + (r.length > 5 ? ` +${r.length - 5}` : "") : "—"} | ${t.length ? t.slice(0, 5).join(", ") + (t.length > 5 ? ` +${t.length - 5}` : "") : "—"} |`);
  }
  writeFileSync(path.join(outDir, "13-giao-dien.md"), L.join("\n"), "utf8");

  console.log(`✓ 12 file vùng: ${tongBang}/${tables.length} bảng · ${tongHam}/${fns.length} hàm`);
  console.log(`✓ 15-enum.md: ${enums.length} enum`);
  console.log(`✓ 13-giao-dien.md: ${pages.length} trang · ${apis.length} API · ${actions.length} action`);
  if (tongBang !== tables.length) console.log(`⚠️ THIẾU ${tables.length - tongBang} bảng!`);
  if (tongHam !== fns.length) console.log(`⚠️ THIẾU ${fns.length - tongHam} hàm!`);
}
