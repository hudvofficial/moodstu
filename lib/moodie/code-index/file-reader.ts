/**
 * file-reader.ts
 *
 * Đọc file source an toàn từ project root.
 * - Path sandboxing: chặn path traversal, node_modules, .git, .env*
 * - Giới hạn kích thước / số dòng
 * - Detect language từ extension
 * - Hỗ trợ đọc theo range (startLine/endLine)
 */

import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReadFileResult {
  path: string;
  content: string;
  startLine: number;
  endLine: number;
  totalLines: number;
  language: string;
  truncated: boolean;
}

export interface ReadFileError {
  error: string;
  path: string;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MAX_LINES_PER_READ = 250;
const MAX_FILE_SIZE_BYTES = 800_000;

const BLOCKED_PATTERNS = [
  ".env",
  ".git",
  "node_modules",
  ".next",
  "dist",
  "build",
  ".vercel",
  "pnpm-lock.yaml",
  "package-lock.json",
  ".key",
  ".pem",
  ".cert",
  ".pfx",
];

const ALLOWED_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".sql", ".md", ".json", ".yaml", ".yml",
  ".css", ".html", ".txt", ".env.example",
]);

const LANGUAGE_MAP: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".sql": "sql",
  ".md": "markdown",
  ".json": "json",
  ".yaml": "yaml",
  ".yml": "yaml",
  ".css": "css",
  ".html": "html",
};

// ---------------------------------------------------------------------------
// Security
// ---------------------------------------------------------------------------

function isPathSafe(filePath: string, projectRoot: string): boolean {
  // Resolve absolute path
  const resolved = path.resolve(projectRoot, filePath);

  // Phải nằm trong project root
  if (!resolved.startsWith(path.resolve(projectRoot))) return false;

  // Normalize để check patterns
  const normalized = resolved.replace(/\\/g, "/");

  for (const blocked of BLOCKED_PATTERNS) {
    if (normalized.includes(blocked)) return false;
  }

  return true;
}

function isExtensionAllowed(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  // .env.example is OK, but .env, .env.local, etc. are NOT
  if (filePath.includes(".env") && !filePath.endsWith(".example")) return false;
  return ALLOWED_EXTENSIONS.has(ext);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function readProjectFile(
  filePath: string,
  projectRoot: string,
  options?: {
    startLine?: number;  // 1-indexed
    endLine?: number;    // 1-indexed, inclusive
  },
): ReadFileResult | ReadFileError {
  const { startLine = 1, endLine } = options ?? {};

  // Normalize path separators
  const normalizedPath = filePath.replace(/\\/g, "/");

  // Security checks
  if (!isPathSafe(normalizedPath, projectRoot)) {
    return {
      error: `Đường dẫn không hợp lệ hoặc nằm ngoài phạm vi được phép: ${filePath}`,
      path: filePath,
    };
  }

  if (!isExtensionAllowed(normalizedPath)) {
    return {
      error: `Loại file không được phép đọc: ${path.extname(filePath)}`,
      path: filePath,
    };
  }

  const absolutePath = path.resolve(projectRoot, normalizedPath);

  // Check existence
  if (!fs.existsSync(absolutePath)) {
    return { error: `File không tồn tại: ${filePath}`, path: filePath };
  }

  // Check size
  const stat = fs.statSync(absolutePath);
  if (stat.size > MAX_FILE_SIZE_BYTES) {
    return {
      error: `File quá lớn để đọc (${Math.round(stat.size / 1024)}KB > ${Math.round(MAX_FILE_SIZE_BYTES / 1024)}KB)`,
      path: filePath,
    };
  }

  let content: string;
  try {
    content = fs.readFileSync(absolutePath, "utf-8");
  } catch (err) {
    return { error: `Không thể đọc file: ${String(err)}`, path: filePath };
  }

  const allLines = content.split("\n");
  const totalLines = allLines.length;

  // Apply range
  const safeStart = Math.max(1, startLine);
  const maxEnd = endLine
    ? Math.min(endLine, safeStart + MAX_LINES_PER_READ - 1, totalLines)
    : Math.min(safeStart + MAX_LINES_PER_READ - 1, totalLines);

  const selectedLines = allLines.slice(safeStart - 1, maxEnd);
  const truncated = maxEnd < totalLines && maxEnd === safeStart + MAX_LINES_PER_READ - 1;

  const ext = path.extname(normalizedPath).toLowerCase();
  const language = LANGUAGE_MAP[ext] ?? "text";

  return {
    path: normalizedPath,
    content: selectedLines.join("\n"),
    startLine: safeStart,
    endLine: maxEnd,
    totalLines,
    language,
    truncated,
  };
}

/**
 * Grep đơn giản: tìm pattern trong 1 file, trả về matching lines
 */
export function grepFile(
  filePath: string,
  projectRoot: string,
  pattern: string,
  options?: { caseSensitive?: boolean; maxMatches?: number },
): Array<{ line: number; content: string }> {
  const { caseSensitive = false, maxMatches = 30 } = options ?? {};

  const normalizedPath = filePath.replace(/\\/g, "/");
  if (!isPathSafe(normalizedPath, projectRoot)) return [];

  const absolutePath = path.resolve(projectRoot, normalizedPath);
  if (!fs.existsSync(absolutePath)) return [];

  let content: string;
  try {
    content = fs.readFileSync(absolutePath, "utf-8");
  } catch {
    return [];
  }

  const flags = caseSensitive ? "g" : "gi";
  let regex: RegExp;
  try {
    regex = new RegExp(pattern, flags);
  } catch {
    // Fallback to literal search if invalid regex
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    regex = new RegExp(escaped, flags);
  }

  const results: Array<{ line: number; content: string }> = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    if (regex.test(lines[i])) {
      results.push({ line: i + 1, content: lines[i] });
      if (results.length >= maxMatches) break;
    }
    // Reset lastIndex for global regex
    regex.lastIndex = 0;
  }

  return results;
}

/**
 * Grep trong nhiều files của project (JS implementation, không phụ thuộc ripgrep)
 */
export function grepProject(
  projectRoot: string,
  pattern: string,
  options?: {
    includeDirs?: string[];
    fileExtensions?: string[];
    caseSensitive?: boolean;
    maxResults?: number;
    contextLines?: number;
  },
): Array<{ path: string; line: number; content: string; context?: string }> {
  const {
    includeDirs = ["app", "lib", "components", "hooks", "types"],
    fileExtensions = [".ts", ".tsx"],
    caseSensitive = false,
    maxResults = 30,
    contextLines = 0,
  } = options ?? {};

  const results: Array<{ path: string; line: number; content: string; context?: string }> = [];

  const flags = caseSensitive ? "g" : "gi";
  let regex: RegExp;
  try {
    regex = new RegExp(pattern, flags);
  } catch {
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    regex = new RegExp(escaped, flags);
  }

  for (const dir of includeDirs) {
    if (results.length >= maxResults) break;
    const dirPath = path.join(projectRoot, dir);
    if (!fs.existsSync(dirPath)) continue;
    grepDir(dirPath, projectRoot, regex, fileExtensions, results, maxResults, contextLines);
  }

  return results;
}

function grepDir(
  dirPath: string,
  projectRoot: string,
  regex: RegExp,
  extensions: string[],
  results: Array<{ path: string; line: number; content: string; context?: string }>,
  maxResults: number,
  contextLines: number,
): void {
  if (results.length >= maxResults) return;

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (results.length >= maxResults) return;
    if (["node_modules", ".next", ".git"].includes(entry.name)) continue;

    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      grepDir(fullPath, projectRoot, regex, extensions, results, maxResults, contextLines);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (!extensions.includes(ext)) continue;

      let content: string;
      try {
        content = fs.readFileSync(fullPath, "utf-8");
      } catch {
        continue;
      }

      const lines = content.split("\n");
      const relativePath = path.relative(projectRoot, fullPath).replace(/\\/g, "/");

      for (let i = 0; i < lines.length; i++) {
        regex.lastIndex = 0;
        if (!regex.test(lines[i])) continue;
        regex.lastIndex = 0;

        let context: string | undefined;
        if (contextLines > 0) {
          const start = Math.max(0, i - contextLines);
          const end = Math.min(lines.length - 1, i + contextLines);
          context = lines.slice(start, end + 1).join("\n");
        }

        results.push({ path: relativePath, line: i + 1, content: lines[i], context });
        if (results.length >= maxResults) return;
      }
    }
  }
}
