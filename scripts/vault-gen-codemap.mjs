// Sinh bản đồ code: route → component → server action → bảng/RPC.
// Chạy: node scripts/vault-gen-codemap.mjs   → ghi vault/20-ban-do-code/
import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const SRC_DIRS = ["app", "components", "lib", "hooks", "types"];
const files = [];
(function walk(dir) {
  for (const e of readdirSync(dir)) {
    const p = path.join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (e === "node_modules" || e === ".next") continue;
      walk(p);
    } else if (/\.(ts|tsx)$/.test(e) && !/\.d\.ts$/.test(e)) files.push(p);
  }
})(root === "" ? "." : root) === undefined;

const rel = (p) => path.relative(root, p).replace(/\\/g, "/");
const srcFiles = files.map(rel).filter((f) => SRC_DIRS.some((d) => f.startsWith(d + "/")));
const content = new Map();
for (const f of srcFiles) content.set(f, readFileSync(path.join(root, f), "utf8"));

// ---- resolve import specifier -> repo file ----
const exists = (p) => content.has(p);
function resolve(spec, from) {
  let base;
  if (spec.startsWith("@/")) base = spec.slice(2);
  else if (spec.startsWith(".")) base = path.posix.normalize(path.posix.join(path.posix.dirname(from), spec));
  else return null;
  for (const c of [base + ".ts", base + ".tsx", base + "/index.ts", base + "/index.tsx", base]) if (exists(c)) return c;
  return null;
}

const importsOf = new Map();
for (const f of srcFiles) {
  const s = content.get(f);
  const specs = [...s.matchAll(/(?:from\s+|import\s*\(\s*)["']([^"']+)["']/g)].map((m) => m[1]);
  importsOf.set(f, [...new Set(specs.map((x) => resolve(x, f)).filter(Boolean))]);
}

// ---- data access per file ----
const dataOf = new Map();
for (const f of srcFiles) {
  const s = content.get(f);
  const tables = new Set([...s.matchAll(/\.from\(\s*["'`]([a-z_0-9]+)["'`]/g)].map((m) => m[1]));
  const rpcs = new Set([...s.matchAll(/\.rpc\(\s*["'`]([a-z_0-9]+)["'`]/g)].map((m) => m[1]));
  const storage = new Set([...s.matchAll(/storage\s*\.\s*from\(\s*["'`]([^"'`]+)["'`]/g)].map((m) => m[1]));
  if (tables.size || rpcs.size || storage.size) dataOf.set(f, { tables: [...tables], rpcs: [...rpcs], storage: [...storage] });
}
// .from() của storage bị lẫn vào tables — gỡ ra
for (const [f, d] of dataOf) d.tables = d.tables.filter((t) => !d.storage.includes(t));

const isAction = (f) => f.startsWith("app/actions/") || content.get(f).startsWith('"use server"') || content.get(f).startsWith("'use server'");
const actionFiles = srcFiles.filter(isAction);

// ---- reachability từ 1 entry ----
function reach(entry, maxDepth = 12) {
  const seen = new Set([entry]);
  const q = [[entry, 0]];
  while (q.length) {
    const [f, d] = q.shift();
    if (d >= maxDepth) continue;
    for (const n of importsOf.get(f) || []) if (!seen.has(n)) { seen.add(n); q.push([n, d + 1]); }
  }
  return seen;
}

const routes = srcFiles.filter((f) => /^app\/.*\/page\.tsx$/.test(f) || f === "app/page.tsx");
const apis = srcFiles.filter((f) => /^app\/api\/.*\/route\.ts$/.test(f));

function routeUrl(f) {
  return "/" + f.replace(/^app\//, "").replace(/\/(page\.tsx|route\.ts)$/, "").replace(/\([^)]*\)\//g, "").replace(/^\/*/, "") || "/";
}

const entries = [...routes, ...apis].map((f) => {
  const r = reach(f);
  const acts = [...r].filter(isAction).sort();
  const tables = new Set(), rpcs = new Set(), storage = new Set();
  for (const g of r) {
    const d = dataOf.get(g);
    if (!d) continue;
    d.tables.forEach((x) => tables.add(x));
    d.rpcs.forEach((x) => rpcs.add(x));
    d.storage.forEach((x) => storage.add(x));
  }
  const comps = [...r].filter((x) => x.startsWith("components/")).sort();
  return { file: f, url: routeUrl(f), kind: f.endsWith("route.ts") ? "api" : "page", acts, comps, tables: [...tables].sort(), rpcs: [...rpcs].sort(), storage: [...storage].sort() };
});

// ---- nhóm route theo module ----
const MOD = (url) => {
  const seg = url.split("/").filter(Boolean);
  if (!seg.length) return "khac";
  if (seg[0] === "api") return "api-" + (seg[1] || "khac");
  return seg[0];
};

const outDir = path.join(root, "vault/20-ban-do-code");
mkdirSync(outDir, { recursive: true });

// ---- FILE 1: route map ----
{
  const L = ["---", 'title: "Bản đồ route → action → bảng"', "tags: [ban-do-code, route]", 'sinh-tu: "scripts/vault-gen-codemap.mjs (đi theo import graph)"', "cap-nhat: 2026-08-07", "---", "",
    `# Bản đồ route → action → bảng`, "",
    `${routes.length} trang · ${apis.length} API route · ${actionFiles.length} file server action`, "",
    "> Cột **Bảng/RPC** là *tất cả* bảng chạm được qua đồ thị import (kể cả gián tiếp qua component con), nên rộng hơn cái route thật sự dùng. Dùng để **khoanh vùng ảnh hưởng**, không phải để kết luận \"route này chỉ đọc bảng X\".", ""];
  const byMod = {};
  for (const e of entries) (byMod[MOD(e.url)] ??= []).push(e);
  for (const m of Object.keys(byMod).sort()) {
    L.push(`## \`/${m.replace(/^api-/, "api/")}\``, "");
    for (const e of byMod[m].sort((a, b) => a.url.localeCompare(b.url))) {
      L.push(`### ${e.kind === "api" ? "🔌" : "📄"} \`${e.url}\``);
      L.push(`\`${e.file}\``);
      L.push("");
      if (e.acts.length) L.push("- **Action:** " + e.acts.map((a) => "`" + a.replace("app/actions/", "") + "`").join(" · "));
      if (e.tables.length) L.push("- **Bảng:** " + e.tables.map((t) => "`" + t + "`").join(" · "));
      if (e.rpcs.length) L.push("- **RPC:** " + e.rpcs.map((t) => "`" + t + "`").join(" · "));
      if (e.storage.length) L.push("- **Storage bucket:** " + e.storage.map((t) => "`" + t + "`").join(" · "));
      L.push(`- **Component:** ${e.comps.length}`);
      L.push("");
    }
  }
  writeFileSync(path.join(outDir, "ban-do-route.md"), L.join("\n"), "utf8");
}

// ---- FILE 2: action → data ----
{
  const L = ["---", 'title: "Server action → bảng/RPC"', "tags: [ban-do-code, server-action]", 'sinh-tu: "scripts/vault-gen-codemap.mjs"', "cap-nhat: 2026-08-07", "---", "",
    `# Server action → bảng/RPC`, "",
    `${actionFiles.length} file. Chỉ liệt kê truy cập DB **viết trực tiếp trong file đó** (không đi theo import).`, "",
    "| File | Bảng | RPC |", "|---|---|---|"];
  for (const f of actionFiles.sort()) {
    const d = dataOf.get(f);
    L.push(`| \`${f.replace("app/actions/", "")}\` | ${d ? d.tables.map((t) => "`" + t + "`").join(" ") : "—"} | ${d ? d.rpcs.map((t) => "`" + t + "`").join(" ") : "—"} |`);
  }
  writeFileSync(path.join(outDir, "ban-do-server-action.md"), L.join("\n"), "utf8");
}

// ---- FILE 3: bảng → ai ghi/đọc ----
{
  const writers = new Map(), readers = new Map();
  for (const f of srcFiles) {
    const s = content.get(f);
    for (const m of s.matchAll(/\.from\(\s*["'`]([a-z_0-9]+)["'`]\s*\)\s*\.\s*(insert|update|upsert|delete|select)/g)) {
      const [, t, op] = m;
      const map = op === "select" ? readers : writers;
      if (!map.has(t)) map.set(t, new Set());
      map.get(t).add(f + (op === "select" ? "" : ` (${op})`));
    }
  }
  const all = [...new Set([...writers.keys(), ...readers.keys()])].sort();
  const L = ["---", 'title: "Bảng → nơi đọc/ghi trong code"', "tags: [ban-do-code, du-lieu]", 'sinh-tu: "scripts/vault-gen-codemap.mjs"', "cap-nhat: 2026-08-07", "---", "",
    "# Bảng → nơi đọc/ghi trong code", "",
    "> Chỉ bắt được truy cập **qua supabase-js** (`.from(...).insert/update/delete`). Ghi qua **RPC** không hiện ở đây — tra thêm [[rpc-va-enum]].", "",
    "**Dùng khi nào:** trước khi viết rủi ro đồng thời hoặc đổi schema, tra bảng này xem *ai thật sự ghi được*.", ""];
  for (const t of all) {
    const w = [...(writers.get(t) || [])].sort();
    const r = [...(readers.get(t) || [])].sort();
    L.push(`## \`${t}\``);
    L.push(`**Ghi (${w.length}):** ` + (w.length ? w.map((x) => "`" + x + "`").join(" · ") : "— *không có nơi nào ghi trực tiếp*"));
    L.push(`**Đọc (${r.length}):** ` + (r.length ? r.slice(0, 20).map((x) => "`" + x + "`").join(" · ") + (r.length > 20 ? ` … +${r.length - 20}` : "") : "—"));
    L.push("");
  }
  writeFileSync(path.join(outDir, "bang-doc-ghi.md"), L.join("\n"), "utf8");
}

console.log(JSON.stringify({
  srcFiles: srcFiles.length, routes: routes.length, apis: apis.length, actionFiles: actionFiles.length,
  filesTouchingDb: dataOf.size,
}, null, 1));
