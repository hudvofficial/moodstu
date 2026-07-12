import { getMoodieToolDisplayLabel, mergeMoodieSources, normalizeMoodieSources, reduceMoodieActivityHistory, sanitizeMoodieSourceUrl, upgradeMoodieMessageMeta } from "@/lib/moodie/response-metadata";
import type { MoodieRuntimeEvent } from "@/types/moodie";

describe("Moodie response metadata v2", () => {
  it("sanitizes and deduplicates sources deterministically", () => {
    const sources = normalizeMoodieSources([
      { label: "Tài liệu", value: "https://example.com/path", hint: "Nguồn web" },
      { label: "Tài liệu", value: "https://example.com/path", hint: "Nguồn web" },
      { label: "Nội bộ", value: "javascript:alert(1)" },
    ], "tool-1");
    expect(sources).toHaveLength(2);
    expect(sources[0]).toMatchObject({ kind: "web", domain: "example.com", tool_run_id: "tool-1" });
    expect(sources[1]).toMatchObject({ kind: "database", url: undefined });
    expect(sanitizeMoodieSourceUrl("file:///secret")).toBeUndefined();
  });

  it("uses business identity instead of mutable snippets when deduplicating records", () => {
    const first = normalizeMoodieSources([{ label: "Hợp đồng HD-01", value: "Còn thu 5 triệu", hint: "Bản cũ", kind: "database", entity_type: "contract", entity_id: "contract-1", href: "/contracts/contract-1" }], "tool-1");
    const second = normalizeMoodieSources([{ label: "Hợp đồng HD-01", value: "Còn thu 4 triệu", hint: "Bản mới", kind: "database", entity_type: "contract", entity_id: "contract-1", href: "/contracts/contract-1" }], "tool-2");
    const merged = mergeMoodieSources(first, second);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ entity_type: "contract", entity_id: "contract-1", href: "/contracts/contract-1", snippet: "Bản mới", tool_run_ids: ["tool-1", "tool-2"] });
  });

  it("keeps distinct records that happen to share a label", () => {
    const sources = normalizeMoodieSources([
      { label: "Hợp đồng", kind: "database", entity_type: "contract", entity_id: "contract-1" },
      { label: "Hợp đồng", kind: "database", entity_type: "contract", entity_id: "contract-2" },
    ]);
    expect(sources).toHaveLength(2);
    expect(sources[0].id).not.toBe(sources[1].id);
  });

  it("never exposes technical tool names in user-facing labels", () => {
    expect(getMoodieToolDisplayLabel("get_debt_summary", "completed", "fallback")).toBe("Đã tổng hợp công nợ");
    expect(getMoodieToolDisplayLabel("get_debt_summary", "running", "fallback")).toBe("Đang tổng hợp công nợ");
    expect(getMoodieToolDisplayLabel("get_debt_summary", "failed", "fallback")).toBe("Không thể tổng hợp công nợ");
  });

  it("keeps start time when a tool completes", () => {
    const started: MoodieRuntimeEvent = { type: "tool.started", label: "Đang tra dữ liệu", tool_run_id: "tool-1", tool_name: "lookup" };
    const completed: MoodieRuntimeEvent = { type: "tool.completed", label: "Đã tra dữ liệu", tool_run_id: "tool-1", tool_name: "lookup", duration_ms: 120, sources: [] };
    const history = reduceMoodieActivityHistory([], started, "2026-07-11T10:00:00.000Z", "turn-1");
    const result = reduceMoodieActivityHistory(history, completed, "2026-07-11T10:00:00.120Z", "turn-1");
    expect(result).toEqual([expect.objectContaining({ id: "tool-1", state: "completed", label: "Đã xử lý dữ liệu", started_at: "2026-07-11T10:00:00.000Z", completed_at: "2026-07-11T10:00:00.120Z", duration_ms: 120 })]);
  });

  it("upgrades legacy trace and source metadata", () => {
    const upgraded = upgradeMoodieMessageMeta({ provider: "test", sources: [{ label: "CRM", value: "customer:1" }], trace: { engine: "model", started_at: "2026-07-11T10:00:00.000Z", duration_ms: 100, model_steps: 1, tool_call_count: 1, verifier_corrections: 0, fallback_used: false, tools: [{ name: "lookup", ok: true, duration_ms: 80 }] } });
    expect(upgraded?.response_ui_version).toBe(2);
    expect(upgraded?.activity_history).toHaveLength(1);
    expect(upgraded?.sources_v2).toHaveLength(1);
  });
});
