#!/usr/bin/env node
/**
 * build-code-index.mjs
 *
 * Script offline: build repo-map, schema-map, docs-map rồi persist ra
 * data/code-index/ để moodie có thể load khi cần.
 *
 * Usage:
 *   node scripts/build-code-index.mjs          # full build
 *   node scripts/build-code-index.mjs --status # chỉ in trạng thái cache
 *
 * Dùng dynamic import để load TS modules đã compile qua Next.js transpiler.
 * Chạy sau khi next build, hoặc dùng tsx/ts-node nếu cần dev mode.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "data", "code-index");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function log(msg) {
  console.log(`[moodie:index] ${msg}`);
}

function logSection(title) {
  console.log(`\n${"─".repeat(50)}`);
  console.log(`  ${title}`);
  console.log("─".repeat(50));
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function writeJson(filePath, data) {
  const json = JSON.stringify(data, null, 2);
  fs.writeFileSync(filePath, json, "utf-8");
  return json.length;
}

// ---------------------------------------------------------------------------
// Status check
// ---------------------------------------------------------------------------

function printStatus() {
  logSection("Moodie Code Index — Status");
  ensureDir(OUTPUT_DIR);

  const files = {
    "repo-map.json": "Repo map (symbols, imports)",
    "schema-map.json": "Schema map (tables, RPCs)",
    "docs-map.json": "Docs map (markdown sections)",
  };

  let anyFound = false;
  for (const [fname, desc] of Object.entries(files)) {
    const fpath = path.join(OUTPUT_DIR, fname);
    if (fs.existsSync(fpath)) {
      anyFound = true;
      const stat = fs.statSync(fpath);
      try {
        const data = JSON.parse(fs.readFileSync(fpath, "utf-8"));
        const builtAt = data.builtAt ? new Date(data.builtAt).toLocaleString("vi-VN") : "unknown";
        log(`✅ ${fname} — ${formatBytes(stat.size)} — built ${builtAt}`);
        // Extra stats
        if (data.totalFiles !== undefined) log(`   Files: ${data.totalFiles}, Symbols: ${data.totalSymbols}`);
        if (data.totalMigrations !== undefined) log(`   Tables: ${data.tables?.length}, RPCs: ${data.rpcs?.length}, Migrations: ${data.totalMigrations}`);
        if (data.totalSections !== undefined) log(`   Docs: ${data.files?.length} files, ${data.totalSections} sections`);
      } catch {
        log(`⚠️  ${fname} — ${formatBytes(stat.size)} — unreadable JSON`);
      }
      log(`   ${desc}`);
    } else {
      log(`❌ ${fname} — not found`);
    }
  }

  if (!anyFound) {
    log("No index found. Run: npm run moodie:map");
  }
}

// ---------------------------------------------------------------------------
// Inline indexer (pure Node.js, không cần TS compile)
// Implement lại logic cốt lõi của lib/moodie/code-index/ để script chạy độc lập
// ---------------------------------------------------------------------------

const SCAN_DIRS = ["app", "lib", "components", "hooks", "types", "constants", "contexts"];
const EXCLUDE = ["node_modules", ".next", ".git", "dist", "build", ".turbo", "playwright-report", "test-results"];
const TS_EXTS = new Set([".ts", ".tsx", ".js", ".jsx"]);

// --- Repo map ---

const PATTERNS = {
  useServer: /^\s*["']use server["']/m,
  routeHandler: /^export\s+(?:async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s*\(/gm,
  component: /^export\s+(?:default\s+)?(?:async\s+)?function\s+([A-Z][a-zA-Z0-9]*)\s*[(<]/gm,
  hook: /^export\s+(?:const\s+)?(use[A-Z][a-zA-Z0-9]*)\s*=/gm,
  namedFunction: /^export\s+(?:async\s+)?function\s+([a-z][a-zA-Z0-9]*)\s*[(<]/gm,
  arrowExport: /^export\s+const\s+([a-zA-Z][a-zA-Z0-9]*)\s*=\s*(?:async\s*)?\(/gm,
  exportType: /^export\s+(?:type|interface)\s+([a-zA-Z][a-zA-Z0-9]*)/gm,
  rpcCall: /\.rpc\(\s*["']([a-zA-Z_][a-zA-Z0-9_]*)["']/g,
  importLine: /^import\s+(?:type\s+)?(?:.+?\s+from\s+)?["']([^"']+)["']/gm,
};

function getLine(content, index) {
  return content.slice(0, index).split("\n").length;
}

function extractSymbols(content, filePath, isServerAction) {
  const symbols = [];
  const seen = new Set();
  const add = (name, kind, index, exported = true) => {
    const key = `${kind}:${name}`;
    if (seen.has(key)) return;
    seen.add(key);
    symbols.push({ name, kind, line: getLine(content, index), exported });
  };

  for (const m of content.matchAll(PATTERNS.routeHandler)) add(m[1], "route_handler", m.index ?? 0);
  for (const m of content.matchAll(PATTERNS.component)) {
    const isTsx = filePath.endsWith(".tsx") || filePath.endsWith(".jsx");
    add(m[1], isTsx ? "component" : "function", m.index ?? 0);
  }
  for (const m of content.matchAll(PATTERNS.hook)) add(m[1], "hook", m.index ?? 0);
  for (const m of content.matchAll(PATTERNS.namedFunction)) {
    if (!seen.has(`function:${m[1]}`) && !seen.has(`component:${m[1]}`))
      add(m[1], isServerAction ? "server_action" : "function", m.index ?? 0);
  }
  for (const m of content.matchAll(PATTERNS.arrowExport)) {
    const n = m[1];
    if (![...seen].some((k) => k.endsWith(`:${n}`))) add(n, "arrow_function", m.index ?? 0);
  }
  for (const m of content.matchAll(PATTERNS.exportType)) {
    add(m[1], m[0].includes("interface") ? "interface" : "type", m.index ?? 0);
  }
  for (const m of content.matchAll(PATTERNS.rpcCall)) {
    symbols.push({ name: m[1], kind: "rpc_call", line: getLine(content, m.index ?? 0), exported: false });
  }
  return symbols.sort((a, b) => a.line - b.line);
}

function scanDir(dirPath, projectRoot, results) {
  if (!fs.existsSync(dirPath)) return;
  let entries;
  try { entries = fs.readdirSync(dirPath, { withFileTypes: true }); } catch { return; }

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const rel = fullPath.replace(/\\/g, "/");
    if (EXCLUDE.some((p) => rel.includes(p))) continue;

    if (entry.isDirectory()) {
      scanDir(fullPath, projectRoot, results);
    } else if (entry.isFile() && TS_EXTS.has(path.extname(entry.name).toLowerCase())) {
      try {
        const stat = fs.statSync(fullPath);
        if (stat.size > 500_000) continue;
        const content = fs.readFileSync(fullPath, "utf-8");
        const relativePath = path.relative(projectRoot, fullPath).replace(/\\/g, "/");
        const isServerAction = PATTERNS.useServer.test(content);
        const routeMatches = [...content.matchAll(PATTERNS.routeHandler)];
        const imports = [];
        for (const m of content.matchAll(PATTERNS.importLine)) imports.push(m[1]);

        results.push({
          path: relativePath,
          language: path.extname(entry.name).slice(1),
          lines: content.split("\n").length,
          symbols: extractSymbols(content, relativePath, isServerAction),
          imports: [...new Set(imports)],
          isServerAction,
          isRouteHandler: routeMatches.length > 0,
        });
      } catch { /* skip */ }
    }
  }
}

function buildRepoMapInline(projectRoot) {
  const allFiles = [];
  for (const dir of SCAN_DIRS) {
    scanDir(path.join(projectRoot, dir), projectRoot, allFiles);
  }

  // Group by module (top 2 levels)
  const moduleMap = new Map();
  for (const file of allFiles) {
    const parts = file.path.split("/");
    const key = parts.length >= 2 ? `${parts[0]}/${parts[1]}` : parts[0];
    if (!moduleMap.has(key)) moduleMap.set(key, []);
    moduleMap.get(key).push(file);
  }

  const modules = [...moduleMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, files]) => ({ name, files: files.sort((a, b) => a.path.localeCompare(b.path)), submodules: [] }));

  return {
    root: projectRoot,
    builtAt: new Date().toISOString(),
    totalFiles: allFiles.length,
    totalSymbols: allFiles.reduce((s, f) => s + f.symbols.length, 0),
    modules,
  };
}

// --- Schema map ---

function normSql(sql) {
  return sql.replace(/--[^\n]*/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\s+/g, " ").trim();
}

function parseColumnsInline(bodyStr) {
  const cols = [];
  let depth = 0, cur = "";
  const parts = [];
  for (const ch of bodyStr) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) { parts.push(cur.trim()); cur = ""; }
    else cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());

  for (const part of parts) {
    const t = part.trim();
    if (!t || /^(CONSTRAINT|PRIMARY\s+KEY|UNIQUE|CHECK|FOREIGN\s+KEY)/i.test(t)) continue;
    const m = t.match(/^"?(\w+)"?\s+([\w\s(),']+?)(\s+NOT NULL|\s+NULL)?(\s+DEFAULT\s+([^,]+?))?(\s+(REFERENCES|PRIMARY|UNIQUE|CHECK)\s.*)?$/i);
    if (!m) continue;
    cols.push({
      name: m[1],
      type: m[2].trim().toUpperCase(),
      nullable: !(m[3] ?? "").toUpperCase().includes("NOT NULL"),
      default: m[5]?.trim(),
    });
  }
  return cols;
}

function buildSchemaMapInline(projectRoot) {
  const migrationsDir = path.join(projectRoot, "supabase", "migrations");
  const tableMap = new Map();
  const rpcMap = new Map();
  const policies = [];
  let totalMigrations = 0;

  if (!fs.existsSync(migrationsDir)) {
    return { builtAt: new Date().toISOString(), tables: [], rpcs: [], policies: [], totalMigrations: 0 };
  }

  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    totalMigrations++;
    try {
      const content = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
      const norm = normSql(content);

      // Tables + columns
      for (const m of norm.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.|)(\w+)\s*\(([^;]*?)\);/gi)) {
        const name = m[1].toLowerCase();
        if (!tableMap.has(name)) {
          tableMap.set(name, {
            name,
            columns: parseColumnsInline(m[2] || ""),
            policies: [],
            indexes: [],
            definedIn: file,
          });
        }
      }

      // RPCs
      for (const m of content.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.|)(\w+)\s*\(([^)]*)\)\s*RETURNS\s+([\w\s\[\]]+?)(?:\s+LANGUAGE\s+(\w+))?/gi)) {
        rpcMap.set(m[1].toLowerCase(), {
          name: m[1].toLowerCase(),
          params: m[2].trim() ? m[2].split(",").map((p) => p.trim().split(/\s+/).slice(-2).join(" ")).slice(0, 6) : [],
          returns: m[3].trim(),
          language: m[4]?.trim() || "sql",
          definedIn: file,
        });
      }

      // Policies
      for (const m of norm.matchAll(/CREATE\s+POLICY\s+"?([^"]+)"?\s+ON\s+(?:public\.|)"?(\w+)"?\s+FOR\s+(\w+)/gi)) {
        policies.push({ name: m[1].trim(), table: m[2].toLowerCase(), operation: m[3].toUpperCase() });
      }

      // Indexes
      for (const m of norm.matchAll(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s+ON\s+(?:public\.|)"?(\w+)"?/gi)) {
        const tbl = tableMap.get(m[2].toLowerCase());
        if (tbl && !tbl.indexes.includes(m[1])) tbl.indexes.push(m[1]);
      }
    } catch { /* skip */ }
  }

  return {
    builtAt: new Date().toISOString(),
    tables: [...tableMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
    rpcs: [...rpcMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
    policies,
    totalMigrations,
  };
}

// --- Docs map ---

function buildDocsMapInline(projectRoot) {
  const targets = [
    { dir: ".", recursive: false },
    { dir: "docs", recursive: false },   // root only — subdirs quá nhiều
    { dir: "memory", recursive: false },
  ];

  const skipFiles = new Set(["CHANGELOG.md", "node_modules"]);
  const files = [];

  for (const target of targets) {
    const dirPath = path.join(projectRoot, target.dir);
    if (!fs.existsSync(dirPath)) continue;

    const mdFiles = target.recursive
      ? walkMd(dirPath)
      : fs.readdirSync(dirPath).filter((f) => f.endsWith(".md")).map((f) => path.join(dirPath, f));

    for (const filePath of mdFiles) {
      if (skipFiles.has(path.basename(filePath))) continue;
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        const relativePath = path.relative(projectRoot, filePath).replace(/\\/g, "/");
        const sections = [];
        let title = path.basename(filePath, ".md");
        let cur = null;

        for (const line of content.split("\n")) {
          const hm = line.match(/^(#{1,6})\s+(.+)/);
          if (hm) {
            if (cur) { cur.content = cur.content.trim().slice(0, 1500); sections.push(cur); }
            if (hm[1].length === 1 && sections.length === 0) title = hm[2].trim();
            cur = { heading: hm[2].trim(), level: hm[1].length, content: "", lineStart: sections.length + 1 };
          } else if (cur) {
            cur.content += line + "\n";
          }
        }
        if (cur) { cur.content = cur.content.trim().slice(0, 1500); sections.push(cur); }

        files.push({
          path: relativePath,
          title,
          sections,
          wordCount: content.split(/\s+/).filter(Boolean).length,
        });
      } catch { /* skip */ }
    }
  }

  return {
    builtAt: new Date().toISOString(),
    files: files.sort((a, b) => a.path.localeCompare(b.path)),
    totalSections: files.reduce((s, f) => s + f.sections.length, 0),
  };
}

function walkMd(dirPath) {
  const results = [];
  if (!fs.existsSync(dirPath)) return results;
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) results.push(...walkMd(full));
    else if (entry.isFile() && entry.name.endsWith(".md")) results.push(full);
  }
  return results;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const statusOnly = args.includes("--status");

  if (statusOnly) {
    printStatus();
    return;
  }

  logSection("Moodie Code Index — Build");
  ensureDir(OUTPUT_DIR);

  const t0 = Date.now();

  // 1. Repo map
  log("Building repo map...");
  const t1 = Date.now();
  const repoMap = buildRepoMapInline(PROJECT_ROOT);
  const repoBytes = writeJson(path.join(OUTPUT_DIR, "repo-map.json"), repoMap);
  log(`✅ repo-map.json — ${repoMap.totalFiles} files, ${repoMap.totalSymbols} symbols — ${formatBytes(repoBytes)} — ${Date.now() - t1}ms`);

  // 2. Schema map
  log("Building schema map...");
  const t2 = Date.now();
  const schemaMap = buildSchemaMapInline(PROJECT_ROOT);
  const schemaBytes = writeJson(path.join(OUTPUT_DIR, "schema-map.json"), schemaMap);
  log(`✅ schema-map.json — ${schemaMap.tables.length} tables, ${schemaMap.rpcs.length} RPCs, ${schemaMap.totalMigrations} migrations — ${formatBytes(schemaBytes)} — ${Date.now() - t2}ms`);

  // 3. Docs map
  log("Building docs map...");
  const t3 = Date.now();
  const docsMap = buildDocsMapInline(PROJECT_ROOT);
  const docsBytes = writeJson(path.join(OUTPUT_DIR, "docs-map.json"), docsMap);
  log(`✅ docs-map.json — ${docsMap.files.length} files, ${docsMap.totalSections} sections — ${formatBytes(docsBytes)} — ${Date.now() - t3}ms`);

  // Summary
  logSection("Done");
  log(`Total time: ${Date.now() - t0}ms`);
  log(`Output: ${OUTPUT_DIR}`);
  log("");
  log("Moodie can now use these tools:");
  log("  get_repo_map  — explore codebase structure");
  log("  read_file     — read any source file");
  log("  list_symbols  — find functions/components/actions");
  log("  grep_code     — search code patterns");
  log("  get_schema    — explore database schema");
}

main().catch((err) => {
  console.error("[moodie:index] ERROR:", err);
  process.exit(1);
});
