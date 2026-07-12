import { describe, expect, it } from "@jest/globals";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { buildMoodieAuthenticatedUserPrompt, MOODIE_IDENTITY_PROMPT, MOODIE_MODEL_SYSTEM_PROMPT } from "@/lib/moodie/model-prompt";
import { MOODIE_SKILL_HINT_MAP } from "@/components/moodie/moodie-skill-meta";
import { getMoodieToolDefinitions } from "@/lib/moodie/tools";
import { normalizeMoodieDisplayText } from "@/lib/moodie/ux-helpers";

function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(entryPath);
    return /\.(ts|tsx)$/.test(entry.name) ? [entryPath] : [];
  });
}

describe("Moodie Vietnamese language contract", () => {
  it("requires natural Vietnamese with full diacritics", () => {
    expect(MOODIE_MODEL_SYSTEM_PROMPT).toContain("tiếng Việt tự nhiên, đầy đủ dấu");
    expect(MOODIE_MODEL_SYSTEM_PROMPT).toContain("Không tự đặt số liệu");
    expect(MOODIE_MODEL_SYSTEM_PROMPT).not.toContain("Ban la Moodie");
  });

  it("locks the assistant identity to Moodie", () => {
    expect(MOODIE_IDENTITY_PROMPT).toContain("Tên của bạn là Moodie");
    expect(MOODIE_IDENTITY_PROMPT).toContain("Mình là Moodie");
    expect(MOODIE_IDENTITY_PROMPT).toContain("không phải một trợ lý AI vô danh");
  });

  it("grounds the operator identity in the authenticated session without exposing private fields", () => {
    const prompt = buildMoodieAuthenticatedUserPrompt({
      id: "employee-private-id",
      fullName: "Admin",
      email: "admin@moodwedding.com",
      department: "Operations",
      position: "Studio administrator",
      role: "admin",
    });

    expect(prompt).toContain("- name: Admin");
    expect(prompt).toContain("- role: admin");
    expect(prompt).toContain("authenticated session");
    expect(prompt).toContain("Do not claim the user has not introduced themselves");
    expect(prompt).not.toContain("employee-private-id");
    expect(prompt).not.toContain("admin@moodwedding.com");
  });

  it("uses accented labels in the user-facing skill map", () => {
    expect(MOODIE_SKILL_HINT_MAP).toMatchObject({
      financial_summary: "Tài chính",
      debt_summary: "Công nợ",
      contract_lookup: "Hợp đồng",
      schedule_summary: "Lịch",
      team_summary: "Nhân sự",
      service_catalog: "Dịch vụ",
    });
  });

  it("exposes accented business tool descriptions to the model", () => {
    const definitions = getMoodieToolDefinitions();
    const descriptions = definitions.map((definition) => definition.function.description).join(" ");

    expect(descriptions).toContain("Lấy tổng quan tài chính");
    expect(descriptions).toContain("Lấy tổng hợp công nợ");
    expect(descriptions).toContain("Tìm hợp đồng");
  });

  it("normalizes legacy metadata stored without Vietnamese diacritics", () => {
    expect(normalizeMoodieDisplayText("Ngay mai ekip co lich nao?")).toBe(
      "Ngày mai ê-kíp có lịch nào?",
    );
    expect(normalizeMoodieDisplayText("Tim hop dong cua khach Lan")).toBe(
      "Tìm hợp đồng của khách Lan",
    );
    expect(normalizeMoodieDisplayText("Can them 5.000.000 ₫/thang")).toBe(
      "Cần thêm 5.000.000 ₫/tháng",
    );
  });

  it("contains no mojibake in Moodie source files", () => {
    const sourceFiles = [
      ...collectSourceFiles(path.join(process.cwd(), "components", "moodie")),
      ...collectSourceFiles(path.join(process.cwd(), "lib", "moodie")),
      ...collectSourceFiles(path.join(process.cwd(), "app", "api", "moodie")),
      path.join(process.cwd(), "app", "actions", "moodie-mutations.ts"),
      path.join(process.cwd(), "app", "actions", "moodie-queries.ts"),
      path.join(process.cwd(), "app", "actions", "moodie-memory-actions.ts"),
      path.join(process.cwd(), "app", "actions", "moodie-provider-actions.ts"),
      path.join(process.cwd(), "app", "actions", "moodie-observability-actions.ts"),
      path.join(process.cwd(), "app", "actions", "moodie-benchmark-actions.ts"),
    ];
    const source = sourceFiles.map((file) => readFileSync(file, "utf8")).join("\n");

    expect(source).not.toMatch(/[ÃÂÆÄĂ]|á[º»]|â[€—€¦™œ]/);
  });
});
