// Sinh note lược đồ DB theo module vào vault/30-du-lieu/
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
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

const cols = (await client.query(`
  SELECT c.table_name t, c.column_name col, c.data_type dt, c.udt_name udt,
         c.is_nullable nul, c.column_default def
  FROM information_schema.columns c
  JOIN pg_class pc ON pc.relname = c.table_name
  JOIN pg_namespace pn ON pn.oid = pc.relnamespace AND pn.nspname='public'
  WHERE c.table_schema='public' AND pc.relkind='r'
  ORDER BY c.table_name, c.ordinal_position`)).rows;

const fks = (await client.query(`
  SELECT tc.table_name t, kcu.column_name col,
         ccu.table_name ref_t, ccu.column_name ref_col, rc.delete_rule del
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON kcu.constraint_name=tc.constraint_name AND kcu.constraint_schema=tc.constraint_schema
  JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name=tc.constraint_name AND ccu.constraint_schema=tc.constraint_schema
  JOIN information_schema.referential_constraints rc ON rc.constraint_name=tc.constraint_name AND rc.constraint_schema=tc.constraint_schema
  WHERE tc.constraint_type='FOREIGN KEY' AND tc.table_schema='public'`)).rows;

const stats = Object.fromEntries((await client.query(
  `SELECT relname t, n_live_tup n FROM pg_stat_user_tables WHERE schemaname='public'`)).rows.map(r => [r.t, r.n]));

const rls = Object.fromEntries((await client.query(`
  SELECT c.relname t, c.relrowsecurity r,
    (SELECT count(*) FROM pg_policies p WHERE p.tablename=c.relname AND p.schemaname='public') np
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind='r'`)).rows.map(r => [r.t, r]));

const idx = (await client.query(`
  SELECT tablename t, indexname n, indexdef d FROM pg_indexes WHERE schemaname='public'`)).rows;

const trig = (await client.query(`
  SELECT c.relname t, tg.tgname n, p.proname fn
  FROM pg_trigger tg JOIN pg_class c ON c.oid=tg.tgrelid
  JOIN pg_namespace ns ON ns.oid=c.relnamespace AND ns.nspname='public'
  JOIN pg_proc p ON p.oid=tg.tgfoid
  WHERE NOT tg.tgisinternal`)).rows;

const checks = (await client.query(`
  SELECT c.relname t, con.conname n, pg_get_constraintdef(con.oid) d
  FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid
  JOIN pg_namespace ns ON ns.oid=c.relnamespace AND ns.nspname='public'
  WHERE con.contype='c'`)).rows;

const enums = (await client.query(`
  SELECT t.typname n, string_agg(e.enumlabel, ' | ' ORDER BY e.enumsortorder) v
  FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid
  JOIN pg_namespace n ON n.oid=t.typnamespace AND n.nspname='public'
  GROUP BY t.typname ORDER BY 1`)).rows;

const funcs = (await client.query(`
  SELECT p.proname n, pg_get_function_identity_arguments(p.oid) args,
         pg_get_function_result(p.oid) ret, p.prosecdef secdef, l.lanname lang
  FROM pg_proc p JOIN pg_namespace ns ON ns.oid=p.pronamespace AND ns.nspname='public'
  JOIN pg_language l ON l.oid=p.prolang
  WHERE l.lanname IN ('plpgsql','sql')
  ORDER BY p.proname`)).rows;

const views = (await client.query(`
  SELECT c.relname n, c.relkind k FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace
  WHERE ns.nspname='public' AND c.relkind IN ('v','m') ORDER BY 1`)).rows;

await client.end();

// ---- gom bảng theo module ----
const GROUPS = {
  "hop-dong": { title: "Hợp đồng", tables: ["contracts", "contract_items", "contract_events", "contract_checklists", "contract_notes", "checklist_templates", "event_templates", "addon_history", "documents", "approval_requests"] },
  "gallery": { title: "Gallery ảnh", tables: ["galleries", "gallery_images", "gallery_reactions", "gallery_comments", "gallery_share_links", "gallery_albums", "gallery_selection_batches", "gallery_selection_batch_items", "gallery_filter_jobs", "gallery_password_attempts"] },
  "tai-chinh": { title: "Tài chính", tables: ["payments", "payment_plans", "payment_plan_allocations", "order_payments", "expenses", "receipts", "debts", "budgets", "financial_goals", "goal_contributions", "fixed_costs", "finance_monthly_closes", "finance_close_tasks", "transaction_categories", "credit_cards", "investments", "investment_maintenance_logs"] },
  "khach-hang-crm": { title: "Khách hàng & CRM", tables: ["customers", "crm_leads"] },
  "dich-vu": { title: "Dịch vụ & báo giá", tables: ["services", "service_categories", "service_bundles", "service_relations", "price_rules", "promotions"] },
  "nhan-su": { title: "Nhân sự & công việc", tables: ["employees", "employee_salaries", "monthly_salaries", "salary_adjustments", "attendance", "work_shifts", "work_tasks", "schedules", "evaluations", "requests"] },
  "in-an-lab": { title: "In ấn & Lab", tables: ["printing_orders", "printing_order_status_history", "labs", "lab_services", "lab_payments", "lab_payment_allocations"] },
  "vat-tu": { title: "Vật tư & thiết bị", tables: ["inventory_items", "inventory_transactions", "inventory_reservations", "equipment"] },
  "vay-cuoi": { title: "Váy cưới", tables: ["dresses", "dress_rentals", "dress_rental_accessories", "dress_reservations"] },
  "nha-cung-cap": { title: "Nhà cung cấp", tables: ["vendors", "vendor_payments", "vendor_payment_allocations"] },
  "moodie-ai": { title: "Moodie (AI trợ lý)", tables: [] }, // fill by prefix
  "he-thong": { title: "Hệ thống & hạ tầng", tables: ["audit_logs", "system_settings", "studio_info", "notifications", "notification_preferences", "notification_queue", "push_subscriptions", "login_attempts", "realtime_signals", "google_sync_queue", "integrity_reports"] },
};
const allTables = [...new Set(cols.map(c => c.t))].sort();
GROUPS["moodie-ai"].tables = allTables.filter(t => t.startsWith("moodie_") || t.startsWith("ai_"));
const assigned = new Set(Object.values(GROUPS).flatMap(g => g.tables));
const orphans = allTables.filter(t => !assigned.has(t));
GROUPS["he-thong"].tables.push(...orphans);

const outDir = path.join(root, "vault/30-du-lieu");
mkdirSync(outDir, { recursive: true });

const shortType = (c) => {
  const u = c.udt;
  const map = { int4: "int", int8: "bigint", int2: "smallint", bool: "bool", timestamptz: "timestamptz", timestamp: "timestamp", numeric: "numeric", text: "text", varchar: "text", uuid: "uuid", jsonb: "jsonb", date: "date", float8: "float" };
  if (u.startsWith("_")) return map[u.slice(1)] ? map[u.slice(1)] + "[]" : u.slice(1) + "[]";
  return map[u] || u;
};

let indexRows = [];
for (const [slug, g] of Object.entries(GROUPS)) {
  const tabs = g.tables.filter(t => allTables.includes(t));
  if (!tabs.length) continue;
  const L = [];
  L.push("---");
  L.push(`title: "Lược đồ DB — ${g.title}"`);
  L.push(`tags: [du-lieu, schema, ${slug}]`);
  L.push(`sinh-tu: "introspect DB thật (pooler) — regenerate bằng scripts/vault-gen-schema.mjs"`);
  L.push(`cap-nhat: 2026-08-07`);
  L.push("---");
  L.push("");
  L.push(`# Lược đồ DB — ${g.title}`);
  L.push("");
  L.push(`> Sinh tự động từ **DB production thật** (không phải từ \`types/database.types.ts\`). Sau mỗi migration nhớ chạy cả \`npm run db:types\` — xem [[canh-bao-schema]].`);
  L.push("");
  L.push(`Module liên quan: [[${slug}]]`);
  L.push("");
  L.push("| Bảng | Số dòng | RLS | Policy |");
  L.push("|---|---:|---|---:|");
  for (const t of tabs) {
    const r = rls[t] || {};
    L.push(`| \`${t}\` | ${stats[t] ?? "?"} | ${r.r ? "✅" : "❌"} | ${r.np ?? "?"} |`);
  }
  L.push("");
  for (const t of tabs) {
    L.push(`## \`${t}\``);
    L.push("");
    const r = rls[t] || {};
    L.push(`${stats[t] ?? "?"} dòng · RLS ${r.r ? "bật" : "**TẮT**"} · ${r.np ?? 0} policy`);
    L.push("");
    L.push("| Cột | Kiểu | Null | Mặc định |");
    L.push("|---|---|---|---|");
    for (const c of cols.filter(x => x.t === t)) {
      let d = c.def || "";
      d = d.replace(/::[a-z_ ]+(\[\])?/g, "").replace(/\|/g, "\\|");
      if (d.length > 40) d = d.slice(0, 37) + "…";
      L.push(`| \`${c.col}\` | ${shortType(c)} | ${c.nul === "YES" ? "" : "NOT NULL"} | ${d ? "`" + d + "`" : ""} |`);
    }
    L.push("");
    const out = fks.filter(f => f.t === t);
    const inb = fks.filter(f => f.ref_t === t);
    if (out.length) {
      L.push("**Trỏ ra:** " + out.map(f => `\`${f.col}\` → \`${f.ref_t}.${f.ref_col}\`${f.del !== "NO ACTION" ? ` (ON DELETE ${f.del})` : ""}`).join(" · "));
      L.push("");
    }
    if (inb.length) {
      L.push("**Bị trỏ tới bởi:** " + [...new Set(inb.map(f => `\`${f.t}.${f.col}\``))].join(" · "));
      L.push("");
    }
    const tg = trig.filter(x => x.t === t);
    if (tg.length) {
      L.push("**Trigger:** " + tg.map(x => `\`${x.n}\` → \`${x.fn}()\``).join(" · "));
      L.push("");
    }
    const ck = checks.filter(x => x.t === t && !x.n.endsWith("_not_null"));
    if (ck.length) {
      L.push("**CHECK:** " + ck.map(x => `\`${x.d.replace(/::[a-z_ ]+(\[\])?/g, "").replace(/\|/g, "\\|")}\``).join(" · "));
      L.push("");
    }
    const ix = idx.filter(x => x.t === t);
    if (ix.length) {
      L.push(`<details><summary>${ix.length} index</summary>`);
      L.push("");
      for (const x of ix) L.push("- `" + x.d.replace(/^CREATE (UNIQUE )?INDEX \S+ ON \S+ USING /, (m, u) => (u ? "UNIQUE " : "")) + "`");
      L.push("");
      L.push("</details>");
      L.push("");
    }
  }
  const file = path.join(outDir, `luoc-do-${slug}.md`);
  writeFileSync(file, L.join("\n"), "utf8");
  indexRows.push({ slug, title: g.title, n: tabs.length, rows: tabs.reduce((a, t) => a + Number(stats[t] || 0), 0) });
}

// ---- note RPC ----
{
  const L = ["---", 'title: "Danh mục RPC (hàm Postgres)"', "tags: [du-lieu, rpc]", "cap-nhat: 2026-08-07", "---", "",
    "# Danh mục RPC — " + funcs.length + " hàm", "",
    "> Sinh từ `pg_proc` trên DB thật. `SECURITY DEFINER` = chạy bằng quyền chủ hàm, **bỏ qua RLS** → mọi hàm loại này phải tự kiểm quyền bên trong.", ""];
  const PREF = [["moodie_|match_moodie|finalize_moodie|maintain_moodie|claim_moodie|heartbeat_moodie|retry_moodie|finish_moodie", "Moodie AI"],
  ["contract|payment|receipt|addon|checklist|cancel_contract|delete_contract|save_contract|recalc", "Hợp đồng & thanh toán"],
  ["finance|expense|budget|cashflow|goal|contribut|ledger|debt|close|revenue|receivable", "Tài chính"],
  ["gallery|share|password", "Gallery"],
  ["dress|rental|reservation", "Váy cưới"],
  ["inventory|stock", "Vật tư"],
  ["printing|lab", "In ấn & Lab"],
  ["employee|salary|productivity|attendance", "Nhân sự"],
  ["dashboard|stats|report|intelligence|integrity", "Báo cáo & dashboard"],
  ["crm|lead|customer", "CRM"],
  ["service|price", "Dịch vụ"],
  ["calendar|event", "Lịch"]];
  const seen = new Set();
  for (const [re, title] of PREF) {
    const m = funcs.filter(f => !seen.has(f.n) && new RegExp(re).test(f.n));
    if (!m.length) continue;
    m.forEach(f => seen.add(f.n));
    L.push(`## ${title}`, "");
    L.push("| Hàm | Tham số | Trả về | SECURITY DEFINER |");
    L.push("|---|---|---|---|");
    for (const f of m) L.push(`| \`${f.n}\` | ${(f.args || "").replace(/\|/g, "\\|").slice(0, 110) || "—"} | ${f.ret.replace(/\|/g, "\\|").slice(0, 60)} | ${f.secdef ? "⚠️ có" : ""} |`);
    L.push("");
  }
  const rest = funcs.filter(f => !seen.has(f.n));
  if (rest.length) {
    L.push("## Khác", "", "| Hàm | Tham số | Trả về | SECURITY DEFINER |", "|---|---|---|---|");
    for (const f of rest) L.push(`| \`${f.n}\` | ${(f.args || "").replace(/\|/g, "\\|").slice(0, 110) || "—"} | ${f.ret.replace(/\|/g, "\\|").slice(0, 60)} | ${f.secdef ? "⚠️ có" : ""} |`);
    L.push("");
  }
  L.push("## View", "");
  for (const v of views) L.push(`- \`${v.n}\` (${v.k === "m" ? "materialized view" : "view"})`);
  L.push("");
  L.push("## Enum", "");
  L.push("| Enum | Giá trị |", "|---|---|");
  for (const e of enums) L.push(`| \`${e.n}\` | ${e.v.replace(/\|/g, " · ")} |`);
  writeFileSync(path.join(outDir, "rpc-va-enum.md"), L.join("\n"), "utf8");
}

console.log(JSON.stringify({ tables: allTables.length, funcs: funcs.length, groups: indexRows, orphans }, null, 1));
