/**
 * docs-map.ts
 *
 * Parse markdown files trong dự án để moodie có thể trả lời câu hỏi
 * về kiến trúc, planning, best practices từ docs nội bộ.
 *
 * Scan: *.md ở root + docs/*.md + plans/*.md + memory/*.md
 */

import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DocSection {
  heading: string;
  level: number; // 1-6
  content: string;
  lineStart: number;
}

export interface DocFile {
  path: string;      // relative to project root
  title: string;
  sections: DocSection[];
  wordCount: number;
}

export interface DocsMap {
  builtAt: string;
  files: DocFile[];
  totalSections: number;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SCAN_TARGETS = [
  { dir: ".", recursive: false, ext: ".md" },
  { dir: "docs", recursive: false, ext: ".md" },  // docs/ root only — quá nhiều subdirs
  { dir: "memory", recursive: false, ext: ".md" },
];

const SKIP_FILES = new Set([
  "node_modules",
  "CHANGELOG.md",  // quá dài, ít value cho LLM context
]);

const MAX_SECTION_LENGTH = 2000; // trim sections quá dài

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

let _cachedDocsMap: DocsMap | null = null;
let _cacheBuiltAt = 0;
const CACHE_TTL_MS = 10 * 60 * 1000;

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

function parseMarkdown(content: string, relativePath: string): DocFile {
  const lines = content.split("\n");
  const sections: DocSection[] = [];
  let title = path.basename(relativePath, ".md");

  let currentSection: DocSection | null = null;
  let lineNum = 0;

  for (const line of lines) {
    lineNum++;
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);

    if (headingMatch) {
      // Flush current section
      if (currentSection) {
        currentSection.content = currentSection.content.trim().slice(0, MAX_SECTION_LENGTH);
        sections.push(currentSection);
      }

      const level = headingMatch[1].length;
      const heading = headingMatch[2].trim();

      // Lấy title từ H1 đầu tiên
      if (level === 1 && sections.length === 0) {
        title = heading;
      }

      currentSection = {
        heading,
        level,
        content: "",
        lineStart: lineNum,
      };
    } else if (currentSection) {
      currentSection.content += line + "\n";
    }
  }

  // Flush last section
  if (currentSection) {
    currentSection.content = currentSection.content.trim().slice(0, MAX_SECTION_LENGTH);
    sections.push(currentSection);
  }

  // Nếu không có heading, tạo 1 section mặc định
  if (sections.length === 0 && content.trim()) {
    sections.push({
      heading: title,
      level: 1,
      content: content.trim().slice(0, MAX_SECTION_LENGTH),
      lineStart: 1,
    });
  }

  const wordCount = content.split(/\s+/).filter(Boolean).length;

  return { path: relativePath, title, sections, wordCount };
}

// ---------------------------------------------------------------------------
// Scanner
// ---------------------------------------------------------------------------

function scanDocFiles(
  projectRoot: string,
  targets: typeof SCAN_TARGETS,
): DocFile[] {
  const results: DocFile[] = [];

  for (const target of targets) {
    const dirPath = path.join(projectRoot, target.dir);
    if (!fs.existsSync(dirPath)) continue;

    const files = target.recursive
      ? walkDir(dirPath, target.ext)
      : fs.readdirSync(dirPath)
          .filter((f) => f.endsWith(target.ext))
          .map((f) => path.join(dirPath, f));

    for (const filePath of files) {
      const fileName = path.basename(filePath);
      if (SKIP_FILES.has(fileName)) continue;

      try {
        const content = fs.readFileSync(filePath, "utf-8");
        const relativePath = path.relative(projectRoot, filePath).replace(/\\/g, "/");
        results.push(parseMarkdown(content, relativePath));
      } catch {
        // skip
      }
    }
  }

  return results;
}

function walkDir(dirPath: string, ext: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dirPath)) return results;

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath, ext));
    } else if (entry.isFile() && entry.name.endsWith(ext)) {
      results.push(fullPath);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function buildDocsMap(projectRoot: string, force = false): DocsMap {
  const now = Date.now();
  if (!force && _cachedDocsMap && now - _cacheBuiltAt < CACHE_TTL_MS) {
    return _cachedDocsMap;
  }

  const files = scanDocFiles(projectRoot, SCAN_TARGETS);
  const totalSections = files.reduce((sum, f) => sum + f.sections.length, 0);

  const docsMap: DocsMap = {
    builtAt: new Date().toISOString(),
    files: files.sort((a, b) => a.path.localeCompare(b.path)),
    totalSections,
  };

  _cachedDocsMap = docsMap;
  _cacheBuiltAt = now;

  return docsMap;
}

/** Tìm sections liên quan theo keyword */
export function searchDocs(
  docsMap: DocsMap,
  query: string,
  maxResults = 5,
): Array<{ file: string; section: DocSection }> {
  const q = query.toLowerCase();
  const results: Array<{ score: number; file: string; section: DocSection }> = [];

  for (const doc of docsMap.files) {
    for (const section of doc.sections) {
      const headingMatch = section.heading.toLowerCase().includes(q);
      const contentMatch = section.content.toLowerCase().includes(q);
      if (headingMatch || contentMatch) {
        results.push({
          score: headingMatch ? 2 : 1,
          file: doc.path,
          section,
        });
      }
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(({ file, section }) => ({ file, section }));
}

/** Render outline ngắn gọn cho LLM */
export function renderDocsOutline(docsMap: DocsMap): string {
  const lines = [`# Docs Map — ${docsMap.files.length} files`, ""];

  for (const doc of docsMap.files) {
    lines.push(`## ${doc.title} (${doc.path})`);
    const topSections = doc.sections.filter((s) => s.level <= 2).slice(0, 6);
    for (const s of topSections) {
      lines.push(`  ${"#".repeat(s.level)} ${s.heading}`);
    }
    if (doc.sections.length > 6) {
      lines.push(`  ... +${doc.sections.length - 6} sections`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function saveDocsMap(docsMap: DocsMap, outputPath: string): void {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(docsMap, null, 2), "utf-8");
}

export function loadDocsMap(jsonPath: string): DocsMap | null {
  try {
    return JSON.parse(fs.readFileSync(jsonPath, "utf-8")) as DocsMap;
  } catch {
    return null;
  }
}
