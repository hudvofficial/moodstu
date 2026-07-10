/**
 * schema-map.ts
 *
 * Parse toàn bộ supabase/migrations/*.sql để extract:
 * - Tables (columns, constraints, RLS policies)
 * - RPCs / Functions (params, returns)
 * - Indexes
 *
 * Output được moodie dùng để trả lời câu hỏi như:
 * "table contracts có những cột gì?", "RPC save_contract_atomic làm gì?"
 */

import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TableColumn {
  name: string;
  type: string;
  nullable: boolean;
  default?: string;
}

export interface TableDef {
  name: string;
  columns: TableColumn[];
  policies: PolicyDef[];
  indexes: string[];
  /** migration file nơi table được tạo lần đầu */
  definedIn: string;
}

export interface RpcParam {
  name: string;
  type: string;
  default?: string;
}

export interface RpcDef {
  name: string;
  params: RpcParam[];
  returns: string;
  language: string;
  definedIn: string;
  /** tóm tắt body function (50 chars đầu) */
  bodyPreview?: string;
}

export interface PolicyDef {
  name: string;
  table: string;
  operation: string; // ALL, SELECT, INSERT, UPDATE, DELETE
  role?: string;
}

export interface SchemaMap {
  builtAt: string;
  tables: TableDef[];
  rpcs: RpcDef[];
  policies: PolicyDef[];
  totalMigrations: number;
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

let _cachedSchemaMap: SchemaMap | null = null;
let _cacheBuiltAt = 0;
const CACHE_TTL_MS = 10 * 60 * 1000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeSql(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, " ")       // strip line comments
    .replace(/\/\*[\s\S]*?\*\//g, " ") // strip block comments
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Parsers
// ---------------------------------------------------------------------------

/** CREATE TABLE public.name ( ... ) */
const TABLE_PATTERN = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.|)(\w+)\s*\(([^;]*?)\);/gi;

/** column: "name TYPE [NOT NULL] [DEFAULT ...]" */
const COLUMN_PATTERN = /^\s*"?(\w+)"?\s+([\w\s(),']+?)(?:\s+(NOT NULL|NULL))?(?:\s+DEFAULT\s+([^,]+?))?(?:\s+(REFERENCES|PRIMARY|UNIQUE|CHECK|CONSTRAINT)[^,]*)?$/i;

function parseColumns(bodyStr: string): TableColumn[] {
  const cols: TableColumn[] = [];
  // split by comma — chú ý dấu phẩy trong type (vd numeric(10,2))
  let depth = 0;
  const parts: string[] = [];
  let cur = "";
  for (const ch of bodyStr) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) parts.push(cur.trim());

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    // Skip constraint declarations
    if (/^(CONSTRAINT|PRIMARY\s+KEY|UNIQUE|CHECK|FOREIGN\s+KEY)/i.test(trimmed)) continue;

    const m = trimmed.match(/^"?(\w+)"?\s+([\w\s(),']+?)(\s+NOT NULL|\s+NULL)?(\s+DEFAULT\s+([^,]+?))?(\s+(REFERENCES|PRIMARY|UNIQUE|CHECK)\s.*)?$/i);
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

/** CREATE FUNCTION / CREATE OR REPLACE FUNCTION */
const FUNCTION_PATTERN = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.|)(\w+)\s*\(([^)]*)\)\s*RETURNS\s+([\w\s\[\]]+?)(?:\s+LANGUAGE\s+(\w+))?(?:\s+AS\s+\$\$)?([\s\S]*?)(?:\$\$|;)/gi;

function parseParams(paramsStr: string): RpcParam[] {
  if (!paramsStr.trim()) return [];
  return paramsStr.split(",").map((p) => {
    const trimmed = p.trim();
    const m = trimmed.match(/^(?:INOUT\s+|OUT\s+|IN\s+)?(?:"?(\w+)"?\s+)?([\w\s()]+?)(?:\s+DEFAULT\s+(.+))?$/i);
    if (!m) return { name: "param", type: trimmed };
    return {
      name: m[1]?.replace(/^p_/, "") || "param",
      type: (m[2] ?? "unknown").trim().toUpperCase(),
      default: m[3]?.trim(),
    };
  });
}

/** CREATE POLICY */
const POLICY_PATTERN = /CREATE\s+POLICY\s+"?([^"]+)"?\s+ON\s+(?:public\.|)"?(\w+)"?\s+FOR\s+(\w+)/gi;

/** CREATE INDEX */
const INDEX_PATTERN = /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s+ON\s+(?:public\.|)"?(\w+)"?/gi;

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

function parseMigrationFile(content: string, fileName: string, tableMap: Map<string, TableDef>, rpcMap: Map<string, RpcDef>, policies: PolicyDef[]) {
  const norm = normalizeSql(content);

  // Tables
  for (const m of norm.matchAll(TABLE_PATTERN)) {
    const tableName = m[1].toLowerCase();
    const body = m[2];
    if (!tableMap.has(tableName)) {
      tableMap.set(tableName, {
        name: tableName,
        columns: parseColumns(body),
        policies: [],
        indexes: [],
        definedIn: fileName,
      });
    }
  }

  // Functions / RPCs
  for (const m of content.matchAll(FUNCTION_PATTERN)) {
    const rpcName = m[1].toLowerCase();
    const bodyPreview = (m[5] ?? "").trim().slice(0, 80).replace(/\s+/g, " ");
    rpcMap.set(rpcName, {
      name: rpcName,
      params: parseParams(m[2]),
      returns: m[3].trim(),
      language: m[4]?.trim() || "sql",
      definedIn: fileName,
      bodyPreview,
    });
  }

  // Policies
  for (const m of norm.matchAll(POLICY_PATTERN)) {
    const pol: PolicyDef = {
      name: m[1].trim(),
      table: m[2].toLowerCase(),
      operation: m[3].toUpperCase(),
    };
    policies.push(pol);
    // Gắn vào table nếu đã có
    const table = tableMap.get(pol.table);
    if (table) {
      table.policies.push(pol);
    }
  }

  // Indexes
  for (const m of norm.matchAll(INDEX_PATTERN)) {
    const idxName = m[1];
    const tbl = m[2].toLowerCase();
    const table = tableMap.get(tbl);
    if (table && !table.indexes.includes(idxName)) {
      table.indexes.push(idxName);
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function buildSchemaMap(projectRoot: string, force = false): SchemaMap {
  const now = Date.now();
  if (!force && _cachedSchemaMap && now - _cacheBuiltAt < CACHE_TTL_MS) {
    return _cachedSchemaMap;
  }

  const migrationsDir = path.join(projectRoot, "supabase", "migrations");
  const tableMap = new Map<string, TableDef>();
  const rpcMap = new Map<string, RpcDef>();
  const policies: PolicyDef[] = [];

  let totalMigrations = 0;

  if (fs.existsSync(migrationsDir)) {
    const files = fs.readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort(); // chronological by filename

    for (const file of files) {
      totalMigrations++;
      try {
        const content = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
        parseMigrationFile(content, file, tableMap, rpcMap, policies);
      } catch {
        // skip unreadable files
      }
    }
  }

  const schemaMap: SchemaMap = {
    builtAt: new Date().toISOString(),
    tables: Array.from(tableMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
    rpcs: Array.from(rpcMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
    policies,
    totalMigrations,
  };

  _cachedSchemaMap = schemaMap;
  _cacheBuiltAt = now;

  return schemaMap;
}

/** Tìm tables/RPCs theo keyword */
export function searchSchema(schemaMap: SchemaMap, keyword: string): {
  tables: TableDef[];
  rpcs: RpcDef[];
} {
  const q = keyword.toLowerCase();
  const tables = schemaMap.tables.filter(
    (t) => t.name.includes(q) || t.columns.some((c) => c.name.includes(q)),
  );
  const rpcs = schemaMap.rpcs.filter(
    (r) => r.name.includes(q) || r.params.some((p) => p.name.includes(q)),
  );
  return { tables: tables.slice(0, 5), rpcs: rpcs.slice(0, 5) };
}

/** Render ngắn gọn cho LLM context */
export function renderSchemaOutline(schemaMap: SchemaMap, keyword?: string): string {
  const { tables, rpcs } = keyword
    ? searchSchema(schemaMap, keyword)
    : { tables: schemaMap.tables.slice(0, 20), rpcs: schemaMap.rpcs.slice(0, 15) };

  const lines: string[] = [
    `# Schema Map — ${schemaMap.tables.length} tables, ${schemaMap.rpcs.length} RPCs`,
    "",
  ];

  if (tables.length > 0) {
    lines.push("## Tables");
    for (const t of tables) {
      lines.push(`### ${t.name} (${t.definedIn})`);
      for (const col of t.columns.slice(0, 12)) {
        const nullable = col.nullable ? "" : " NOT NULL";
        const def = col.default ? ` DEFAULT ${col.default}` : "";
        lines.push(`  - ${col.name}: ${col.type}${nullable}${def}`);
      }
      if (t.columns.length > 12) lines.push(`  ... +${t.columns.length - 12} cols`);
      if (t.policies.length > 0) {
        lines.push(`  RLS: ${t.policies.map((p) => `${p.operation}(${p.name})`).join(", ")}`);
      }
      lines.push("");
    }
  }

  if (rpcs.length > 0) {
    lines.push("## RPCs");
    for (const r of rpcs) {
      const params = r.params.map((p) => `${p.name}: ${p.type}`).join(", ");
      lines.push(`  ${r.name}(${params}) → ${r.returns} [${r.language}]`);
      if (r.bodyPreview) lines.push(`    // ${r.bodyPreview}`);
    }
  }

  return lines.join("\n");
}

export function saveSchemaMap(schemaMap: SchemaMap, outputPath: string): void {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(schemaMap, null, 2), "utf-8");
}

export function loadSchemaMap(jsonPath: string): SchemaMap | null {
  try {
    return JSON.parse(fs.readFileSync(jsonPath, "utf-8")) as SchemaMap;
  } catch {
    return null;
  }
}
