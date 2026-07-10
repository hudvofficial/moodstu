import { describe, expect, it } from "@jest/globals";
import { parseMoodieMessageParts, widgetsToMoodieParts } from "@/lib/moodie/message-parts";

describe("Moodie typed message parts", () => {
  it("accepts verified chart data and rejects oversized chart data", () => {
    const chart = {
      type: "chart",
      chart: "bar",
      title: "Doanh thu",
      x_key: "month",
      series: [{ key: "value", label: "Giá trị", color_token: "primary" }],
      data: [{ month: "T1", value: 10 }],
    };
    expect(parseMoodieMessageParts([chart])).toHaveLength(1);
    expect(parseMoodieMessageParts([{ ...chart, data: Array.from({ length: 31 }, (_, index) => ({ month: index, value: index })) }])).toBeUndefined();
  });

  it("rejects unsafe gallery URLs and invalid diagram edges", () => {
    expect(parseMoodieMessageParts([{
      type: "gallery", title: "Ảnh", layout: "grid", total_count: 1,
      items: [{ id: "1", thumbnail_url: "https://private.example/original.jpg", alt: "private" }],
    }])).toBeUndefined();
    expect(parseMoodieMessageParts([{
      type: "diagram", diagram: "flow", title: "Flow",
      nodes: [{ id: "a", label: "A", kind: "start" }],
      edges: [{ from: "a", to: "missing" }],
    }])).toBeUndefined();
  });

  it("converts legacy widgets to typed parts", () => {
    expect(widgetsToMoodieParts([{ type: "kpi_cards", items: [{ label: "Album", value: "3" }] }])?.[0].type).toBe("metric_grid");
  });
});
