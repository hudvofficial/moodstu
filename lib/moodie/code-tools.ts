/**
 * code-tools.ts
 *
 * 5 Moodie tools để hiểu codebase mood-studio.
 * Port logic từ RepoUnderstander (Alibaba, arXiv 2406.01422) sang TS runtime.
 *
 * Tools chỉ khả dụng cho role admin — gate trực tiếp theo role trong tool executor.
 * Cùng pattern definition + execute như business tools trong tools.ts.
 */

import path from "path";
import { buildRepoMap, renderRepoMapOutline, searchRepoMap, getFileSymbols } from "@/lib/moodie/code-index/repo-map";
import { buildSchemaMap, renderSchemaOutline, searchSchema } from "@/lib/moodie/code-index/schema-map";
import { buildDocsMap, searchDocs } from "@/lib/moodie/code-index/docs-map";
import { readProjectFile, grepProject } from "@/lib/moodie/code-index/file-reader";
import type { GeminiToolDefinition } from "@/lib/moodie/gemini";
import type { MoodieMessageMeta, MoodieSkillId } from "@/types/moodie";
import type { Role } from "@/types/roles";

// ---------------------------------------------------------------------------
// Types (mirror pattern từ tools.ts)
// ---------------------------------------------------------------------------

type MoodieToolContext = {
  role: Role;
};

type MoodieCodeToolExecution = {
  result: Record<string, unknown>;
  metadata: Partial<MoodieMessageMeta>;
};

type MoodieCodeTool = {
  definition: GeminiToolDefinition;
  execute: (
    context: MoodieToolContext,
    rawArgs: Record<string, unknown>,
  ) => Promise<MoodieCodeToolExecution>;
};

// ---------------------------------------------------------------------------
// Project root resolution (server-side Next.js)
// ---------------------------------------------------------------------------

function getProjectRoot(): string {
  // Next.js server: process.cwd() trỏ về project root
  return path.resolve(/* turbopackIgnore: true */ process.cwd());
}

// ---------------------------------------------------------------------------
// Access check — chỉ admin được dùng code tools
// ---------------------------------------------------------------------------

function assertCodebaseAccess(role: Role): MoodieCodeToolExecution | null {
  if (role !== "admin") {
    return {
      result: {
      error: "Khám phá mã nguồn chỉ dành cho vai trò quản trị viên.",
        role,
      },
      metadata: {
        skill_id: "fallback" as MoodieSkillId,
        note: "permission_denied",
      },
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toStr(v: unknown): string {
  return typeof v === "string" ? v.trim().slice(0, 300) : "";
}

function toInt(v: unknown, def: number, min: number, max: number): number {
  const n = typeof v === "number" ? Math.round(v) : parseInt(String(v), 10);
  return isNaN(n) ? def : Math.max(min, Math.min(max, n));
}

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const codeTools: Record<string, MoodieCodeTool> = {

  // -------------------------------------------------------------------------
  // 1. get_repo_map
  // -------------------------------------------------------------------------
  get_repo_map: {
    definition: {
      type: "function",
      function: {
        name: "get_repo_map",
        description:
      "Lấy sơ đồ tổng quan mã nguồn Mood Studio: module, file và symbol (function/component/server action/RPC). Gọi trước khi đọc file cụ thể để biết cần tìm ở đâu.",
        parameters: {
          type: "object",
          properties: {
            module_filter: {
              type: "string",
              description: "Loc theo module cu the, vi du 'lib/moodie', 'app/actions', 'components/contracts'. De trong de lay toan bo.",
            },
            include_symbols: {
              type: "boolean",
              description: "Có bao gồm danh sách symbol trong mỗi file hay không. Mặc định là true.",
            },
          },
        },
      },
    },

    async execute(context, rawArgs) {
      const denied = assertCodebaseAccess(context.role);
      if (denied) return denied;

      const moduleFilter = toStr(rawArgs.module_filter) || undefined;
      const includeSymbols = rawArgs.include_symbols !== false;

      const repoMap = buildRepoMap(getProjectRoot());
      const outline = renderRepoMapOutline(repoMap, {
        filterModule: moduleFilter,
        maxFilesPerModule: 12,
        includeSymbols,
      });

      return {
        result: {
          outline,
          total_files: repoMap.totalFiles,
          total_symbols: repoMap.totalSymbols,
          built_at: repoMap.builtAt,
          module_filter: moduleFilter ?? "all",
        },
        metadata: {
          skill_id: "fallback" as MoodieSkillId,
          skill_label: "Repo Map",
          note: "model_generated",
          follow_ups: [
            "Doc file lib/moodie/engine.ts",
        "Tìm symbol liên quan đến hợp đồng",
        "Tìm tất cả server action",
          ],
        },
      };
    },
  },

  // -------------------------------------------------------------------------
  // 2. read_file
  // -------------------------------------------------------------------------
  read_file: {
    definition: {
      type: "function",
      function: {
        name: "read_file",
        description:
          "Doc noi dung 1 file cu the trong codebase. Toi da 250 dong moi lan. Dung startLine/endLine de doc theo doan.",
        parameters: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Duong dan relative tu project root, vi du 'lib/moodie/engine.ts' hoac 'app/actions/contract-mutations.ts'.",
            },
            start_line: {
              type: "number",
              description: "Dong bat dau doc (1-indexed). Mac dinh la 1.",
            },
            end_line: {
              type: "number",
              description: "Dong ket thuc doc (inclusive). Mac dinh la start_line + 249.",
            },
          },
          required: ["path"],
        },
      },
    },

    async execute(context, rawArgs) {
      const denied = assertCodebaseAccess(context.role);
      if (denied) return denied;

      const filePath = toStr(rawArgs.path);
      if (!filePath) {
        return {
          result: { error: "Thieu tham so path." },
          metadata: { skill_id: "fallback" as MoodieSkillId },
        };
      }

      const startLine = toInt(rawArgs.start_line, 1, 1, 999999);
      const endLine = rawArgs.end_line !== undefined
        ? toInt(rawArgs.end_line, startLine + 249, startLine, startLine + 249)
        : undefined;

      const result = readProjectFile(filePath, getProjectRoot(), { startLine, endLine });

      if ("error" in result) {
        return {
          result: { error: result.error, path: filePath },
          metadata: { skill_id: "fallback" as MoodieSkillId },
        };
      }

      const truncatedNote = result.truncated
        ? ` [TRUNCATED — con ${result.totalLines - result.endLine} dong, goi lai voi start_line=${result.endLine + 1}]`
        : "";

      return {
        result: {
          path: result.path,
          language: result.language,
          total_lines: result.totalLines,
          shown_lines: `${result.startLine}-${result.endLine}`,
          content: result.content + truncatedNote,
        },
        metadata: {
          skill_id: "fallback" as MoodieSkillId,
          skill_label: "Đọc file",
          note: "model_generated",
          sources: [{ label: result.path, value: `L${result.startLine}-${result.endLine}/${result.totalLines}` }],
          follow_ups: result.truncated
            ? [`Doc tiep ${result.path} tu dong ${result.endLine + 1}`]
        : ["Tìm thêm symbol trong file này"],
        },
      };
    },
  },

  // -------------------------------------------------------------------------
  // 3. list_symbols
  // -------------------------------------------------------------------------
  list_symbols: {
    definition: {
      type: "function",
      function: {
        name: "list_symbols",
        description:
      "Liệt kê tất cả symbol (function, component, server action, RPC call, type) trong một file hoặc tìm theo từ khóa trên toàn bộ mã nguồn.",
        parameters: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Đường dẫn file để liệt kê symbol. Để trống nếu dùng từ khóa để tìm trên toàn bộ mã nguồn.",
            },
            keyword: {
              type: "string",
              description: "Tìm symbols theo ten (function/component/type). Vi du 'createContract', 'useContracts', 'ContractDetail'.",
            },
            kind_filter: {
              type: "string",
              description: "Loc theo loai symbol: function, component, server_action, hook, rpc_call, type, interface.",
            },
          },
        },
      },
    },

    async execute(context, rawArgs) {
      const denied = assertCodebaseAccess(context.role);
      if (denied) return denied;

      const filePath = toStr(rawArgs.path);
      const keyword = toStr(rawArgs.keyword).toLowerCase();
      const kindFilter = toStr(rawArgs.kind_filter).toLowerCase();

      const repoMap = buildRepoMap(getProjectRoot());

      if (filePath) {
        // List symbols của 1 file cụ thể
        const fileNode = getFileSymbols(repoMap, filePath);
        if (!fileNode) {
          return {
            result: { error: `Không tìm thấy file: ${filePath}`, path: filePath },
            metadata: { skill_id: "fallback" as MoodieSkillId },
          };
        }

        const symbols = kindFilter
          ? fileNode.symbols.filter((s) => s.kind === kindFilter)
          : fileNode.symbols;

        return {
          result: {
            path: fileNode.path,
            is_server_action: fileNode.isServerAction,
            is_route_handler: fileNode.isRouteHandler,
            total_lines: fileNode.lines,
            symbols: symbols.map((s) => ({
              name: s.name,
              kind: s.kind,
              line: s.line,
              exported: s.exported,
            })),
          },
          metadata: {
            skill_id: "fallback" as MoodieSkillId,
            skill_label: "Symbols",
            note: "model_generated",
            sources: [{ label: fileNode.path, value: `${symbols.length} symbols` }],
          },
        };
      }

      // Search toàn codebase theo keyword
      if (keyword) {
        const matches: Array<{ file: string; name: string; kind: string; line: number }> = [];

        for (const mod of repoMap.modules) {
          for (const file of mod.files) {
            for (const sym of file.symbols) {
              if (!sym.name.toLowerCase().includes(keyword)) continue;
              if (kindFilter && sym.kind !== kindFilter) continue;
              matches.push({ file: file.path, name: sym.name, kind: sym.kind, line: sym.line });
              if (matches.length >= 25) break;
            }
            if (matches.length >= 25) break;
          }
          if (matches.length >= 25) break;
        }

        return {
          result: {
            keyword,
            total: matches.length,
            symbols: matches,
          },
          metadata: {
            skill_id: "fallback" as MoodieSkillId,
            skill_label: "Tìm symbols",
            note: "model_generated",
            follow_ups: matches.length > 0
              ? [`Doc file ${matches[0].file} tu dong ${matches[0].line}`]
              : ["Thu keyword khac"],
          },
        };
      }

      return {
        result: { error: "Can cung cap path hoac keyword." },
        metadata: { skill_id: "fallback" as MoodieSkillId },
      };
    },
  },

  // -------------------------------------------------------------------------
  // 4. grep_code
  // -------------------------------------------------------------------------
  grep_code: {
    definition: {
      type: "function",
      function: {
        name: "grep_code",
        description:
      "Tìm kiếm nội dung trong mã nguồn bằng biểu thức chính quy hoặc từ khóa nguyên bản. Trả về path:line của các dòng khớp, dùng để tìm nơi gọi function, nội dung chuỗi hoặc import cụ thể.",
        parameters: {
          type: "object",
          properties: {
            pattern: {
              type: "string",
              description: "Biểu thức chính quy hoặc từ cần tìm. Ví dụ: 'createContract', 'supabase.rpc', 'use client', 'getContractDetail'.",
            },
            dirs: {
              type: "string",
              description: "Thư mục cần tìm, phân cách bằng dấu phẩy. Ví dụ: 'app/actions,lib'. Mặc định: 'app,lib,components,hooks'.",
            },
            file_extensions: {
              type: "string",
              description: "Extension phân cach bang dau phay. Vi du '.ts,.tsx'. Mac dinh: '.ts,.tsx'.",
            },
            max_results: {
              type: "number",
              description: "So ket qua toi da. Mac dinh 25.",
            },
          },
          required: ["pattern"],
        },
      },
    },

    async execute(context, rawArgs) {
      const denied = assertCodebaseAccess(context.role);
      if (denied) return denied;

      const pattern = toStr(rawArgs.pattern);
      if (!pattern) {
        return {
          result: { error: "Thieu tham so pattern." },
          metadata: { skill_id: "fallback" as MoodieSkillId },
        };
      }

      const dirsRaw = toStr(rawArgs.dirs) || "app,lib,components,hooks";
      const dirs = dirsRaw.split(",").map((d) => d.trim()).filter(Boolean);

      const extsRaw = toStr(rawArgs.file_extensions) || ".ts,.tsx";
      const exts = extsRaw.split(",").map((e) => e.trim()).filter(Boolean);

      const maxResults = toInt(rawArgs.max_results, 25, 1, 50);

      const results = grepProject(getProjectRoot(), pattern, {
        includeDirs: dirs,
        fileExtensions: exts,
        maxResults,
        contextLines: 0,
      });

      if (results.length === 0) {
        return {
          result: {
            pattern,
            total: 0,
            message: "Không tìm thấy kết quả nào.",
          },
          metadata: {
            skill_id: "fallback" as MoodieSkillId,
            skill_label: "Grep code",
            note: "model_generated",
            follow_ups: ["Thử pattern khác", "Mở rộng sang thư mục khác"],
          },
        };
      }

      return {
        result: {
          pattern,
          total: results.length,
          matches: results.map((r) => ({
            path: r.path,
            line: r.line,
            content: r.content.trim().slice(0, 200),
          })),
        },
        metadata: {
          skill_id: "fallback" as MoodieSkillId,
          skill_label: "Grep code",
          note: "model_generated",
          sources: [{ label: "Pattern", value: pattern }, { label: "Kết quả", value: String(results.length) }],
          follow_ups: [`Đọc file ${results[0].path} từ dòng ${results[0].line}`],
        },
      };
    },
  },

  // -------------------------------------------------------------------------
  // 5. get_schema
  // -------------------------------------------------------------------------
  get_schema: {
    definition: {
      type: "function",
      function: {
        name: "get_schema",
        description:
      "Tra cứu schema cơ sở dữ liệu: bảng (cột, chính sách RLS, chỉ mục) và RPC/function từ supabase/migrations. Dùng khi cần hiểu cấu trúc dữ liệu hoặc giải thích nghiệp vụ.",
        parameters: {
          type: "object",
          properties: {
            keyword: {
              type: "string",
              description: "Tên bảng hoặc RPC cần tìm. Ví dụ: 'contracts', 'save_contract_atomic', 'payments', 'employees'.",
            },
            show_all: {
              type: "boolean",
              description: "Hiển thị toàn bộ schema (có thể dài). Mặc định là false, chỉ tìm theo từ khóa.",
            },
          },
        },
      },
    },

    async execute(context, rawArgs) {
      const denied = assertCodebaseAccess(context.role);
      if (denied) return denied;

      const keyword = toStr(rawArgs.keyword);
      const showAll = rawArgs.show_all === true;

      const schemaMap = buildSchemaMap(getProjectRoot());
      const outline = renderSchemaOutline(schemaMap, showAll ? undefined : keyword || undefined);

      const { tables, rpcs } = keyword
        ? searchSchema(schemaMap, keyword)
        : { tables: schemaMap.tables.slice(0, 10), rpcs: schemaMap.rpcs.slice(0, 8) };

      return {
        result: {
          keyword: keyword || "all",
          total_tables: schemaMap.tables.length,
          total_rpcs: schemaMap.rpcs.length,
          matched_tables: tables.length,
          matched_rpcs: rpcs.length,
          outline,
        },
        metadata: {
          skill_id: "fallback" as MoodieSkillId,
          skill_label: "Schema database",
          note: "model_generated",
          sources: [
            { label: "Tables", value: `${schemaMap.tables.length} tables` },
            { label: "RPCs", value: `${schemaMap.rpcs.length} RPCs` },
          ],
          follow_ups: keyword
        ? [`Tìm mã nguồn gọi RPC ${keyword}`, `Đọc migration tạo bảng ${keyword}`]
        : ["Tìm bảng contracts", "Tìm RPC save_contract_atomic"],
        },
      };
    },
  },
};

// ---------------------------------------------------------------------------
// Exports (dùng bởi tools.ts registry)
// ---------------------------------------------------------------------------

export function getCodeToolDefinitions(): GeminiToolDefinition[] {
  return Object.values(codeTools).map((t) => t.definition);
}

export async function executeCodeTool(
  name: string,
  context: MoodieToolContext,
  rawArgs: Record<string, unknown>,
): Promise<MoodieCodeToolExecution> {
  const tool = codeTools[name];
  if (!tool) {
    throw new Error(`Không nhận diện được công cụ mã nguồn: ${name}`);
  }
  return tool.execute(context, rawArgs);
}

export function isCodeToolName(name: string): boolean {
  return name in codeTools;
}

/** Render outline docs cho LLM (dùng trong system prompt bổ sung) */
export function getDocsOutlineForPrompt(): string {
  try {
    const docsMap = buildDocsMap(getProjectRoot());
    const results = searchDocs(docsMap, "architecture");
    return results
      .slice(0, 3)
      .map((r) => `[${r.file}] ## ${r.section.heading}\n${r.section.content.slice(0, 300)}`)
      .join("\n\n");
  } catch {
    return "";
  }
}

/** Search docs — dùng bởi get_repo_map context enrichment */
export function searchProjectDocs(
  query: string,
): Array<{ file: string; heading: string; preview: string }> {
  try {
    const docsMap = buildDocsMap(getProjectRoot());
    return searchDocs(docsMap, query, 4).map((r) => ({
      file: r.file,
      heading: r.section.heading,
      preview: r.section.content.slice(0, 200),
    }));
  } catch {
    return [];
  }
}
