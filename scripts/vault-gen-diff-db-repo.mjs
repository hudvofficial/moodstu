// Diff catalog DB (sự thật) ↔ repo (migrations) — trọng tài khi repo ≠ DB.
// Đầu vào DB: vault/30-du-lieu/than-ham/*.md (149 hàm), rls-va-quyen.md (217 policy), agent/inventory/01-12 (93 bảng).
// Đầu vào repo: supabase/migrations/*.sql.
// Đầu ra: agent/inventory/18-diff-db-repo.md. CHỈ ĐỌC file. Chạy: node scripts/vault-gen-diff-db-repo.mjs
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";

const root = "c:/Users/Admin/Desktop/Ai/mood saas/mood-studio";
const rd = (p) => readFileSync(path.join(root, p), "utf8");

// ── DB side ──
const dbFns = new Map(); // name -> {secdef}
for (const f of readdirSync(path.join(root, "vault/30-du-lieu/than-ham"))) {
  const s = rd("vault/30-du-lieu/than-ham/" + f);
  for (const m of s.matchAll(/^## ([a-z0-9_]+)\s*$/gm)) {
    const name = m[1];
    const after = s.slice(m.index, m.index + 600);
    dbFns.set(name, { secdef: /SECURITY DEFINER/.test(after), group: f.replace(/\.md$/, "") });
  }
}
const rlsMd = rd("vault/30-du-lieu/rls-va-quyen.md");
const dbPols = new Map(); // "table.policy" -> cmd
let curT = null;
for (const line of rlsMd.split(/\r?\n/)) {
  const t = line.match(/^### `([a-z0-9_]+)`/); if (t) { curT = t[1]; continue; }
  const p = line.match(/^\*\*(.+?)\*\* · `([A-Z]+)`/);
  if (p && curT) dbPols.set(`${curT}.${p[1]}`, p[2]);
}
const dbTables = new Set();
for (const f of readdirSync(path.join(root, "agent/inventory"))) {
  if (!/^\d\d-.*\.md$/.test(f) || /13-|15-|16-|17-|18-/.test(f)) continue;
  for (const m of rd("agent/inventory/" + f).matchAll(/^### `([a-z0-9_]+)`/gm)) dbTables.add(m[1]);
}

// ── repo side ──
const migDir = path.join(root, "supabase/migrations");
const migs = readdirSync(migDir).filter(f => f.endsWith(".sql")).sort();
const repoFn = new Map(), repoPol = new Map(), repoTbl = new Map();
const dropFn = new Map(), dropPol = new Map(), dropTbl = new Map();
for (const f of migs) {
  const s = readFileSync(path.join(migDir, f), "utf8");
  for (const m of s.matchAll(/create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?"?([a-z0-9_]+)"?/gi)) repoFn.set(m[1].toLowerCase(), f);
  for (const m of s.matchAll(/drop\s+function\s+(?:if\s+exists\s+)?(?:public\.)?"?([a-z0-9_]+)"?/gi)) dropFn.set(m[1].toLowerCase(), f);
  for (const m of s.matchAll(/create\s+policy\s+"?([^"\n]+?)"?\s+on\s+(?:public\.)?"?([a-z0-9_]+)"?/gi)) repoPol.set(`${m[2].toLowerCase()}.${m[1].trim()}`, f);
  for (const m of s.matchAll(/drop\s+policy\s+(?:if\s+exists\s+)?"?([^"\n]+?)"?\s+on\s+(?:public\.)?"?([a-z0-9_]+)"?/gi)) dropPol.set(`${m[2].toLowerCase()}.${m[1].trim()}`, f);
  for (const m of s.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?([a-z0-9_]+)"?/gi)) repoTbl.set(m[1].toLowerCase(), f);
  for (const m of s.matchAll(/drop\s+table\s+(?:if\s+exists\s+)?(?:public\.)?"?([a-z0-9_]+)"?/gi)) dropTbl.set(m[1].toLowerCase(), f);
}

// ── so sánh ──
const fnDbOnly = [...dbFns.keys()].filter(n => !repoFn.has(n)).sort();
const fnRepoOnly = [...repoFn.keys()].filter(n => !dbFns.has(n)).sort();
const fnRepoOnlyDropped = fnRepoOnly.filter(n => dropFn.has(n));
const fnRepoOnlyGhost = fnRepoOnly.filter(n => !dropFn.has(n));
const polDbOnly = [...dbPols.keys()].filter(k => !repoPol.has(k)).sort();
const polRepoOnly = [...repoPol.keys()].filter(k => !dbPols.has(k)).sort();
const polRepoOnlyDropped = polRepoOnly.filter(k => dropPol.has(k));
const polRepoOnlyGhost = polRepoOnly.filter(k => !dropPol.has(k));
const tblDbOnly = [...dbTables].filter(t => !repoTbl.has(t)).sort();
const tblRepoOnly = [...repoTbl.keys()].filter(t => !dbTables.has(t)).sort();
const tblRepoOnlyDropped = tblRepoOnly.filter(t => dropTbl.has(t));
const tblRepoOnlyGhost = tblRepoOnly.filter(t => !dropTbl.has(t));

const L = ["---", 'title: "Diff catalog DB ↔ repo"', "lat-cat: 18-diff-db-repo", "cap-nhat: 2026-09-02",
  "trang-thai: sinh-tu-dong", "nguon: than-ham · rls-va-quyen · inventory 01-12 ↔ supabase/migrations", "---", "",
  "> ⚙️ Sinh bởi `scripts/vault-gen-diff-db-repo.mjs`. ĐỪNG sửa tay. Đây là **baseline S2** (chuẩn sự-thật-lược-đồ) — chạy lại ở mỗi cổng giai đoạn để bắt drift mới.", "",
  "# Diff catalog DB ↔ repo", "",
  `| | DB | repo (CREATE) | **DB có, repo không** | repo có, DB không (đã DROP) | repo có, DB không (**không thấy DROP** = ma) |`,
  `|---|---:|---:|---:|---:|---:|`,
  `| Hàm | ${dbFns.size} | ${repoFn.size} | **${fnDbOnly.length}** | ${fnRepoOnlyDropped.length} | **${fnRepoOnlyGhost.length}** |`,
  `| Policy | ${dbPols.size} | ${repoPol.size} | **${polDbOnly.length}** | ${polRepoOnlyDropped.length} | **${polRepoOnlyGhost.length}** |`,
  `| Bảng | ${dbTables.size} | ${repoTbl.size} | **${tblDbOnly.length}** | ${tblRepoOnlyDropped.length} | **${tblRepoOnlyGhost.length}** |`, "",
  "Cách đọc: cột **DB có, repo không** = tồn tại trên production mà không migration nào tạo (áp tay / ngoài repo) — mọi lần sửa phải dump bản sống, không được tin file. Cột **ma** = repo có CREATE, DB không có, và không thấy DROP — hoặc migration chưa áp, hoặc bị drop ngoài repo.", "",
];
const sec = (title, arr, fmt) => { L.push(`## ${title} — ${arr.length}`, ""); if (!arr.length) { L.push("_(không có)_", ""); return; } L.push(...arr.map(fmt), ""); };
sec("Hàm: DB có, repo không có CREATE", fnDbOnly, n => `- \`${n}\`${dbFns.get(n).secdef ? " **DEFINER**" : ""} · nhóm ${dbFns.get(n).group}`);
sec("Hàm: repo có CREATE, DB không — và KHÔNG thấy DROP (ma)", fnRepoOnlyGhost, n => `- \`${n}\` · ${repoFn.get(n)}`);
sec("Hàm: repo có, DB không — đã DROP (bình thường)", fnRepoOnlyDropped, n => `- \`${n}\` · tạo ${repoFn.get(n)} · drop ${dropFn.get(n)}`);
sec("Policy: DB có, repo không có CREATE", polDbOnly, k => `- \`${k}\` · ${dbPols.get(k)}`);
sec("Policy: repo có, DB không — KHÔNG thấy DROP (ma)", polRepoOnlyGhost, k => `- \`${k}\` · ${repoPol.get(k)}`);
sec("Policy: repo có, DB không — đã DROP", polRepoOnlyDropped, k => `- \`${k}\` · drop ${dropPol.get(k)}`);
sec("Bảng: DB có, repo không có CREATE TABLE", tblDbOnly, t => `- \`${t}\``);
sec("Bảng: repo có, DB không — KHÔNG thấy DROP (ma)", tblRepoOnlyGhost, t => `- \`${t}\` · ${repoTbl.get(t)}`);
sec("Bảng: repo có, DB không — đã DROP", tblRepoOnlyDropped, t => `- \`${t}\` · drop ${dropTbl.get(t)}`);
L.push("> Giới hạn: so theo TÊN, không so THÂN — hàm cùng tên nhưng thân khác (ca `process_contract_payment_v2`) không hiện ở đây; cái đó cần diff prosrc vs file, làm khi đụng từng hàm.", "");
writeFileSync(path.join(root, "agent/inventory/18-diff-db-repo.md"), L.join("\n"), "utf8");
console.log(`hàm: DB ${dbFns.size} · repo ${repoFn.size} · DB-only ${fnDbOnly.length} · ma ${fnRepoOnlyGhost.length} · dropped ${fnRepoOnlyDropped.length}`);
console.log(`policy: DB ${dbPols.size} · repo ${repoPol.size} · DB-only ${polDbOnly.length} · ma ${polRepoOnlyGhost.length} · dropped ${polRepoOnlyDropped.length}`);
console.log(`bảng: DB ${dbTables.size} · repo ${repoTbl.size} · DB-only ${tblDbOnly.length} · ma ${tblRepoOnlyGhost.length} · dropped ${tblRepoOnlyDropped.length}`);
