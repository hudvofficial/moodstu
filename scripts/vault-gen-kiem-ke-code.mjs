// Kiểm kê CƠ HỌC phần mã nguồn chưa phủ: scripts/ + components/ + lib/ + hooks/ + service worker.
// Sinh: agent/inventory/16-scripts.md và agent/inventory/17-ma-nguon.md
// CHỈ ĐỌC. Chạy: node scripts/vault-gen-kiem-ke-code.mjs
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = "c:/Users/Admin/Desktop/Ai/mood saas/mood-studio";
const rel = (p) => path.relative(root, p).replace(/\\/g, "/");
const esc = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim();

function walk(dir, exts, out = []) {
  let es; try { es = readdirSync(dir); } catch { return out; }
  for (const e of es) {
    if (e === "node_modules" || e === ".next") continue;
    const fp = path.join(dir, e);
    let st; try { st = statSync(fp); } catch { continue; }
    if (st.isDirectory()) walk(fp, exts, out);
    else if (exts.has(path.extname(e))) out.push(fp);
  }
  return out;
}

// ═══ 16 — SCRIPTS ═══
{
  const files = walk(path.join(root, "scripts"), new Set([".mjs", ".js", ".py", ".sql", ".ps1"]));
  const rows = [];
  let chamDB = 0, ghi = 0, coCo = 0;
  for (const fp of files.sort()) {
    let s = ""; try { s = readFileSync(fp, "utf8"); } catch {}
    const db = /SUPABASE_POOLER_URL|SUPABASE_SERVICE|db-q|new Client\(|createClient\(/i.test(s);
    const write = /\.insert\(|\.update\(|\.upsert\(|\.delete\(|\brpc\(|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|DROP\s+|TRUNCATE|ALTER\s+/i.test(s);
    // S3 #10: script ghi phải gọi requireProdWrite() (scripts/lib/prod-guard.mjs) — nhãn 🔒 để sổ này thành sổ kiểm cờ
    const guarded = /^requireProdWrite\(/m.test(s) && !fp.endsWith("prod-guard.mjs"); // gọi ở đầu dòng — không đếm chuỗi regex như trong file này
    if (db) chamDB++;
    if (db && write) ghi++;
    if (guarded) coCo++;
    let desc = "";
    for (const line of s.split(/\r?\n/).slice(0, 12)) {
      const m = line.match(/^\s*(?:\/\/|#|--|\/\*+)\s*(.+)/);
      if (m && m[1].trim() && !/^-\*-|^eslint|^@ts/.test(m[1])) { desc = m[1].replace(/\*+\/?$/, "").trim(); break; }
    }
    const loai = (!db ? "cục bộ" : write ? "**DB: GHI**" : "DB: đọc") + (guarded ? " 🔒 cờ" : "");
    rows.push(`| \`${path.basename(fp)}\` | ${loai} | ${esc(desc).slice(0, 110) || "—"} |`);
  }
  const L = ["---", 'title: "Kiểm kê — Script vận hành"', "lat-cat: 16-scripts", "cap-nhat: 2026-09-01",
    "trang-thai: sinh-tu-dong", "nguon: quét scripts/ + regex", "---", "",
    "> ⚙️ Sinh bởi `scripts/vault-gen-kiem-ke-code.mjs`. ĐỪNG sửa tay.", "",
    "# Script vận hành", "",
    `${files.length} file. **${chamDB}** chạm database (dev = prod!), trong đó **${ghi}** có lệnh GHI (regex, đếm cả \`rpc(\` đọc), **${coCo}** gắn cờ 🔒 \`ALLOW_PROD_WRITE\` (S3 #10 — đo thật 05/09: 22 script ghi).`,
    "Nhãn dựa trên regex — nhãn GHI nghĩa là *có khả năng ghi*, chạy hay không do người gọi. 🔒 = dừng nếu thiếu cờ.", "",
    "| Script | Chạm DB | Mô tả (dòng chú thích đầu) |", "|---|---|---|",
    ...rows, ""];
  writeFileSync(path.join(root, "agent/inventory/16-scripts.md"), L.join("\n"), "utf8");
  console.log(`✓ 16-scripts.md: ${files.length} script · ${chamDB} chạm DB · ${ghi} có lệnh ghi`);
}

// ═══ 17 — MÃ NGUỒN UI/LIB/HOOKS + SW ═══
{
  const groups = [
    ["components", walk(path.join(root, "components"), new Set([".ts", ".tsx"]))],
    ["lib", walk(path.join(root, "lib"), new Set([".ts", ".tsx"]))],
    ["hooks", walk(path.join(root, "hooks"), new Set([".ts", ".tsx"]))],
  ];
  // corpus import để đếm "được import bởi ~"
  const all = [...walk(path.join(root, "app"), new Set([".ts", ".tsx"])),
               ...groups.flatMap(([, f]) => f)];
  let importCorpus = "";
  for (const fp of all) { try { importCorpus += readFileSync(fp, "utf8").split("\n").filter(l => /^\s*(import|export)\b.*from\s+["']/.test(l)).join("\n") + "\n"; } catch {} }

  const L = ["---", 'title: "Kiểm kê — Mã nguồn components · lib · hooks · SW"', "lat-cat: 17-ma-nguon",
    "cap-nhat: 2026-09-01", "trang-thai: sinh-tu-dong", "nguon: quét thư mục + đếm import tĩnh", "---", "",
    "> ⚙️ Sinh bởi `scripts/vault-gen-kiem-ke-code.mjs`. ĐỪNG sửa tay.",
    "> Cột *import~* đếm số dòng import tĩnh trỏ tới tên file (xấp xỉ — trùng tên sẽ đếm gộp; 0 = có thể là entry/dynamic/chết).", "",
    "# Mã nguồn ngoài app/ — kiểm kê mức file", ""];
  let tong = 0;
  for (const [g, files] of groups) {
    L.push(`## ${g}/ — ${files.length} file`, "", "| File | Dòng | import~ |", "|---|---:|---:|");
    for (const fp of files.sort()) {
      tong++;
      let s = ""; try { s = readFileSync(fp, "utf8"); } catch {}
      const base = path.basename(fp).replace(/\.(tsx?|jsx?)$/, "");
      const hits = base.length > 2 ? (importCorpus.split(`/${base}"`).length - 1) + (importCorpus.split(`/${base}'`).length - 1) : -1;
      L.push(`| \`${rel(fp)}\` | ${s.split("\n").length} | ${hits < 0 ? "—" : hits} |`);
    }
    L.push("");
  }
  // service worker
  L.push("## Service worker — 2 file", "", "| File | Dòng | Vai trò |", "|---|---:|---|");
  for (const [f, role] of [["public/sw.js", "PWA cache (Workbox) — luật cache trong next.config.ts"], ["public/push-sw.js", "nhận push notification"]]) {
    let s = ""; try { s = readFileSync(path.join(root, f), "utf8"); } catch {}
    L.push(`| \`${f}\` | ${s.split("\n").length} | ${role} |`);
    tong++;
  }
  L.push("");
  writeFileSync(path.join(root, "agent/inventory/17-ma-nguon.md"), L.join("\n"), "utf8");
  console.log(`✓ 17-ma-nguon.md: ${tong} file (components ${groups[0][1].length} · lib ${groups[1][1].length} · hooks ${groups[2][1].length} · sw 2)`);
}
