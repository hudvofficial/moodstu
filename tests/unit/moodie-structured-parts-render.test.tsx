import { describe, expect, it } from "@jest/globals";
import { renderToStaticMarkup } from "react-dom/server";
import { MoodieMessageParts } from "@/components/moodie/moodie-message-parts";
import type { MoodieMessagePart } from "@/types/moodie";

describe("Moodie structured presentation render", () => {
  it("renders operational KPI, alerts, actions and responsive table without markdown leakage", () => {
    const parts: MoodieMessagePart[] = [
      { type: "metric_grid", title: "Tình hình Mood Studio", items: [
        { label: "Nhân sự hoạt động", value: "5" },
        { label: "Bộ phận", value: "3" },
        { label: "Công việc quá hạn", value: "2", tone: "warning" },
      ] },
      { type: "table", title: "Công việc quá hạn cần xử lý", columns: [
        { key: "task", label: "Công việc" }, { key: "owner", label: "Phụ trách" },
      ], rows: [{ task: "Hậu kỳ HD-001", owner: "An" }] },
      { type: "alert_list", title: "Rủi ro cần xử lý", items: [
        { id: "risk-1", title: "Hậu kỳ · HD-001", description: "Quá hạn 8 ngày", tone: "danger", owner: "An", due_label: "8 ngày" },
      ] },
      { type: "action_list", title: "Hành động ưu tiên", items: [
        { id: "action-1", label: "Xử lý hậu kỳ HD-001", reason: "Đang quá hạn lâu nhất", priority: "high" },
      ] },
    ];

    const html = renderToStaticMarkup(<MoodieMessageParts parts={parts} />);

    expect(html).toContain("Tình hình Mood Studio");
    expect(html).toContain("Rủi ro cần xử lý");
    expect(html).toContain("Hành động ưu tiên");
    expect(html).toContain("hidden max-h-[360px] overflow-auto sm:block");
    expect(html).toContain("sm:hidden");
    expect(html).not.toContain("**3 bộ phận**");
    expect(html).not.toContain("**");
  });
});
