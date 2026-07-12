import {
  getMoodieActivityDetailLabel,
  getMoodieActivityPhaseLabel,
  presentMoodieActivity,
} from "@/lib/moodie/activity-presentation";
import type { MoodieTurnActivity } from "@/types/moodie";

describe("Moodie activity presentation", () => {
  it("maps runtime stages to concise stable Vietnamese phases", () => {
    expect(getMoodieActivityPhaseLabel("accepted")).toBe("Đang hiểu yêu cầu");
    expect(getMoodieActivityPhaseLabel("tool")).toBe("Đang tra dữ liệu");
    expect(getMoodieActivityPhaseLabel("generating")).toBe("Đang soạn câu trả lời");
  });

  it("does not make short routing noise expandable", () => {
    const activities: MoodieTurnActivity[] = [
      { id: "accepted", stage: "accepted", label: "Moodie đã nhận yêu cầu", state: "done" },
      { id: "route", stage: "routing", label: "Đang định tuyến", state: "active" },
    ];
    expect(presentMoodieActivity(activities, "routing")).toMatchObject({
      phaseLabel: "Đang hiểu yêu cầu",
      expandable: false,
      details: [],
    });
  });

  it("keeps meaningful tool history expandable", () => {
    const activities: MoodieTurnActivity[] = [
      { id: "tool-a", stage: "tool", label: "Đang tra hợp đồng", state: "done", durationMs: 850 },
      { id: "tool-b", stage: "tool", label: "Đang tra lịch", state: "active" },
    ];
    expect(presentMoodieActivity(activities, "tool")).toMatchObject({
      phaseLabel: "Đang tra dữ liệu",
      expandable: true,
    });
  });

  it("sanitizes raw internal labels", () => {
    expect(getMoodieActivityDetailLabel({
      id: "tool-a",
      stage: "tool",
      label: "get_contract_lookup tool",
      state: "done",
    })).toBe("Đang tra dữ liệu");
  });
});
