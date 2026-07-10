/**
 * repo-map.ts
 *
 * Port của RepoUnderstander (Alibaba, arXiv 2406.01422) sang TypeScript.
 * Build hierarchical repo flow graph: module → file → symbols (functions,
 * components, server actions, RPC calls, exports).
 *
 * Output được cache in-memory (module singleton) và có thể persist ra JSON.
 * Không dùng tree-sitter — regex TS/TSX đủ cho mood-studio MVP.
 */

import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SymbolKind =
  | "function"
  | "arrow_function"
  | "component"
  | "server_action"
  | "route_handler"
  | "hook"
  | "class"
  | "rpc_call"
  | "export_const"
  | "type"
  | "interface";

export interface CodeSymbol {
  name: string;
  kind: SymbolKind;
  line: number;
  exported: boolean;
  /** import paths referenced by this file */
  refs?: string[];
}

export interface FileNode {
  path: string;         // relative to project root
  language: "ts" | "tsx" | "js" | "jsx" | "sql" | "md" | "other";
  lines: number;
  symbols: CodeSymbol[];
  imports: string[];    // raw import specifiers
  isServerAction: boolean;
  isRouteHandler: boolean;
}

export interface ModuleNode {
  name: string;         // e.g. "app/actions", "lib/moodie", "components/finance"
  files: FileNode[];
  submodules: ModuleNode[];
}

export interface RepoMap {
  root: string;         // absolute project root
  builtAt: string;      // ISO date
  totalFiles: number;
  totalSymbols: number;
  modules: ModuleNode[];
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SCAN_DIRS = ["app", "lib", "components", "hooks", "types", "constants", "contexts"];

const EXCLUDE_PATTERNS = [
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
  ".turbo",
  "coverage",
  "playwright-report",
  "test-results",
];

const INCLUDE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

const MAX_FILE_SIZE_BYTES = 500_000; // skip huge generated files

// ---------------------------------------------------------------------------
// Language detection
// ---------------------------------------------------------------------------

function detectLanguage(filePath: string): FileNode["language"] {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".ts") return "ts";
  if (ext === ".tsx") return "tsx";
  if (ext === ".js") return "js";
  if (ext === ".jsx") return "jsx";
  if (ext === ".sql") return "sql";
  if (ext === ".md") return "md";
  return "other";
}

// ---------------------------------------------------------------------------
// Symbol extraction (regex-based, RepoUnderstander-style)
// ---------------------------------------------------------------------------

const PATTERNS = {
  // "use server" directive
  useServer: /^\s*["']use server["']/m,

  // route handlers: export async function GET/POST/PUT/DELETE/PATCH
  routeHandler: /^export\s+(?:async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s*\(/gm,

  // React component (PascalCase exported function/arrow)
  component: /^export\s+(?:default\s+)?(?:async\s+)?function\s+([A-Z][a-zA-Z0-9]*)\s*[(<]/gm,

  // named function export
  namedFunction: /^export\s+(?:async\s+)?function\s+([a-z][a-zA-Z0-9]*)\s*[(<]/gm,

  // custom hook (starts with use)
  hook: /^export\s+(?:const\s+)?(use[A-Z][a-zA-Z0-9]*)\s*=/gm,

  // arrow function export
  arrowExport: /^export\s+const\s+([a-zA-Z][a-zA-Z0-9]*)\s*=\s*(?:async\s*)?\(/gm,

  // export const (non-function primitives, objects, arrays)
  exportConst: /^export\s+const\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*[:=]/gm,

  // export type / interface
  exportType: /^export\s+(?:type|interface)\s+([a-zA-Z][a-zA-Z0-9]*)/gm,

  // class export
  exportClass: /^export\s+(?:default\s+)?class\s+([a-zA-Z][a-zA-Z0-9]*)/gm,

  // supabase RPC calls: .rpc("name")
  rpcCall: /\.rpc\(\s*["']([a-zA-Z_][a-zA-Z0-9_]*)["']/g,

  // import statements
  importLine: /^import\s+(?:type\s+)?(?:.+?\s+from\s+)?["']([^"']+)["']/gm,
};

function getLineNumber(content: string, index: number): number {
  return content.slice(0, index).split("\n").length;
}

function extractSymbols(content: string, filePath: string): CodeSymbol[] {
  const symbols: CodeSymbol[] = [];
  const seen = new Set<string>();

  const add = (name: string, kind: SymbolKind, index: number, exported = true) => {
    const key = `${kind}:${name}`;
    if (seen.has(key)) return;
    seen.add(key);
    symbols.push({ name, kind, line: getLineNumber(content, index), exported });
  };

  const isServerAction = PATTERNS.useServer.test(content);

  // Route handlers
  for (const m of content.matchAll(PATTERNS.routeHandler)) {
    add(m[1], "route_handler", m.index ?? 0);
  }

  // React components (PascalCase)
  for (const m of content.matchAll(PATTERNS.component)) {
    const isTsx = filePath.endsWith(".tsx") || filePath.endsWith(".jsx");
    add(m[1], isTsx ? "component" : "function", m.index ?? 0);
  }

  // Hooks
  for (const m of content.matchAll(PATTERNS.hook)) {
    add(m[1], "hook", m.index ?? 0);
  }

  // Named functions
  for (const m of content.matchAll(PATTERNS.namedFunction)) {
    if (!seen.has(`function:${m[1]}`) && !seen.has(`component:${m[1]}`)) {
      add(m[1], isServerAction ? "server_action" : "function", m.index ?? 0);
    }
  }

  // Arrow functions
  for (const m of content.matchAll(PATTERNS.arrowExport)) {
    const name = m[1];
    if (seen.has(`function:${name}`) || seen.has(`component:${name}`) || seen.has(`hook:${name}`) || seen.has(`server_action:${name}`)) continue;
    add(name, "arrow_function", m.index ?? 0);
  }

  // Export const (non-duplicate)
  for (const m of content.matchAll(PATTERNS.exportConst)) {
    const name = m[1];
    if ([...seen].some((k) => k.endsWith(`:${name}`))) continue;
    add(name, "export_const", m.index ?? 0);
  }

  // Types & interfaces
  for (const m of content.matchAll(PATTERNS.exportType)) {
    add(m[1], m[0].includes("interface") ? "interface" : "type", m.index ?? 0);
  }

  // Classes
  for (const m of content.matchAll(PATTERNS.exportClass)) {
    add(m[1], "class", m.index ?? 0);
  }

  // RPC calls (for codebase understanding — không phải export)
  for (const m of content.matchAll(PATTERNS.rpcCall)) {
    symbols.push({
      name: m[1],
      kind: "rpc_call",
      line: getLineNumber(content, m.index ?? 0),
      exported: false,
    });
  }

  return symbols.sort((a, b) => a.line - b.line);
}

function extractImports(content: string): string[] {
  const imports: string[] = [];
  for (const m of content.matchAll(PATTERNS.importLine)) {
    imports.push(m[1]);
  }
  return [...new Set(imports)];
}

// ---------------------------------------------------------------------------
// File scanning
// ---------------------------------------------------------------------------

function shouldExclude(filePath: string): boolean {
  return EXCLUDE_PATTERNS.some((p) => filePath.includes(p));
}

function scanFile(absolutePath: string, projectRoot: string): FileNode | null {
  try {
    const stat = fs.statSync(absolutePath);
    if (stat.size > MAX_FILE_SIZE_BYTES) return null;

    const content = fs.readFileSync(absolutePath, "utf-8");
    const relativePath = path.relative(projectRoot, absolutePath).replace(/\\/g, "/");
    const lang = detectLanguage(absolutePath);
    const lines = content.split("\n").length;
    const isServerAction = PATTERNS.useServer.test(content);

    // Check route handler presence
    const routeHandlerMatches = [...content.matchAll(PATTERNS.routeHandler)];
    const isRouteHandler = routeHandlerMatches.length > 0;

    const symbols = extractSymbols(content, relativePath);
    const imports = extractImports(content);

    return {
      path: relativePath,
      language: lang,
      lines,
      symbols,
      imports,
      isServerAction,
      isRouteHandler,
    };
  } catch {
    return null;
  }
}

function scanDirectory(
  dirPath: string,
  projectRoot: string,
): FileNode[] {
  const results: FileNode[] = [];
  if (!fs.existsSync(dirPath)) return results;

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (shouldExclude(fullPath)) continue;

    if (entry.isDirectory()) {
      results.push(...scanDirectory(fullPath, projectRoot));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (!INCLUDE_EXTENSIONS.has(ext)) continue;
      const node = scanFile(fullPath, projectRoot);
      if (node) results.push(node);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Module grouping (RepoUnderstander hierarchical map)
// ---------------------------------------------------------------------------

function groupIntoModules(files: FileNode[]): ModuleNode[] {
  // Group by top 2 directory levels (e.g. "app/actions", "lib/moodie")
  const moduleMap = new Map<string, FileNode[]>();

  for (const file of files) {
    const parts = file.path.split("/");
    // Use up to 2 levels for grouping
    const moduleKey = parts.length >= 2 ? `${parts[0]}/${parts[1]}` : parts[0];
    if (!moduleMap.has(moduleKey)) {
      moduleMap.set(moduleKey, []);
    }
    moduleMap.get(moduleKey)!.push(file);
  }

  return Array.from(moduleMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, moduleFiles]) => ({
      name,
      files: moduleFiles.sort((a, b) => a.path.localeCompare(b.path)),
      submodules: [],
    }));
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

let _cachedRepoMap: RepoMap | null = null;
let _cacheBuiltAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 phút

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function buildRepoMap(projectRoot: string, force = false): RepoMap {
  const now = Date.now();
  if (!force && _cachedRepoMap && now - _cacheBuiltAt < CACHE_TTL_MS) {
    return _cachedRepoMap;
  }

  const allFiles: FileNode[] = [];

  for (const dir of SCAN_DIRS) {
    const dirPath = path.join(projectRoot, dir);
    allFiles.push(...scanDirectory(dirPath, projectRoot));
  }

  const totalSymbols = allFiles.reduce((sum, f) => sum + f.symbols.length, 0);
  const modules = groupIntoModules(allFiles);

  const repoMap: RepoMap = {
    root: projectRoot,
    builtAt: new Date().toISOString(),
    totalFiles: allFiles.length,
    totalSymbols,
    modules,
  };

  _cachedRepoMap = repoMap;
  _cacheBuiltAt = now;

  return repoMap;
}

/** Render outline ngắn gọn để đưa vào LLM context */
export function renderRepoMapOutline(
  repoMap: RepoMap,
  options?: {
    filterModule?: string;
    maxFilesPerModule?: number;
    includeSymbols?: boolean;
  },
): string {
  const { filterModule, maxFilesPerModule = 10, includeSymbols = true } = options ?? {};

  const lines: string[] = [
    `# Repo Map — ${repoMap.totalFiles} files, ${repoMap.totalSymbols} symbols`,
    `Built: ${repoMap.builtAt}`,
    "",
  ];

  const modules = filterModule
    ? repoMap.modules.filter((m) => m.name.startsWith(filterModule))
    : repoMap.modules;

  for (const mod of modules) {
    lines.push(`## ${mod.name} (${mod.files.length} files)`);

    const filesToShow = mod.files.slice(0, maxFilesPerModule);
    for (const file of filesToShow) {
      const flags: string[] = [];
      if (file.isServerAction) flags.push("server_action");
      if (file.isRouteHandler) flags.push("route_handler");
      const flagStr = flags.length > 0 ? ` [${flags.join(",")}]` : "";
      lines.push(`  ${file.path}${flagStr} (${file.lines}L)`);

      if (includeSymbols) {
        const exportedSymbols = file.symbols
          .filter((s) => s.exported && s.kind !== "rpc_call")
          .slice(0, 8);
        for (const sym of exportedSymbols) {
          lines.push(`    - ${sym.name} (${sym.kind}:${sym.line})`);
        }
        const rpcs = file.symbols.filter((s) => s.kind === "rpc_call");
        if (rpcs.length > 0) {
          lines.push(`    RPC: ${rpcs.map((r) => r.name).join(", ")}`);
        }
      }
    }

    if (mod.files.length > maxFilesPerModule) {
      lines.push(`  ... và ${mod.files.length - maxFilesPerModule} files khác`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/** Tìm files theo keyword trong path hoặc symbol name */
export function searchRepoMap(repoMap: RepoMap, query: string): FileNode[] {
  const q = query.toLowerCase();
  const results: FileNode[] = [];

  for (const mod of repoMap.modules) {
    for (const file of mod.files) {
      const pathMatch = file.path.toLowerCase().includes(q);
      const symbolMatch = file.symbols.some(
        (s) => s.name.toLowerCase().includes(q),
      );
      if (pathMatch || symbolMatch) {
        results.push(file);
      }
    }
  }

  return results.slice(0, 20);
}

/** Lấy symbols của 1 file cụ thể */
export function getFileSymbols(repoMap: RepoMap, filePath: string): FileNode | null {
  const normalized = filePath.replace(/\\/g, "/");
  for (const mod of repoMap.modules) {
    const found = mod.files.find(
      (f) => f.path === normalized || f.path.endsWith(normalized),
    );
    if (found) return found;
  }
  return null;
}

/** Persist sang JSON (dùng cho script offline) */
export function saveRepoMap(repoMap: RepoMap, outputPath: string): void {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(outputPath, JSON.stringify(repoMap, null, 2), "utf-8");
}

/** Load từ JSON cache đã persist */
export function loadRepoMap(jsonPath: string): RepoMap | null {
  try {
    const raw = fs.readFileSync(jsonPath, "utf-8");
    return JSON.parse(raw) as RepoMap;
  } catch {
    return null;
  }
}
