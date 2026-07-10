import { describe, expect, it } from "@jest/globals";
import { canExecuteMoodieAction, getMoodieApprovalState } from "@/lib/moodie/action-policy";
import type { MoodieActionPreview } from "@/types/moodie";

const navigate: MoodieActionPreview = {
  id: "navigate:/calendar",
  kind: "navigate",
  label: "Mở lịch",
  href: "/calendar",
  description: "Điều hướng trong ứng dụng, không thay đổi dữ liệu.",
  risk: "none",
  requires_approval: false,
};

describe("Moodie action approval policy", () => {
  it("auto-allows only no-risk navigation", () => {
    expect(getMoodieApprovalState(navigate)).toBe("auto_allowed");
    expect(canExecuteMoodieAction(navigate, false)).toBe(true);
  });

  it("requires approval if a future action is marked risky", () => {
    const action = { ...navigate, risk: "medium" as const, requires_approval: true };
    expect(getMoodieApprovalState(action)).toBe("pending_approval");
    expect(canExecuteMoodieAction(action, false)).toBe(false);
    expect(canExecuteMoodieAction(action, true)).toBe(true);
  });

  it("never auto-executes sync or share actions", () => {
    const action: MoodieActionPreview = {
      id: "sync-gallery",
      kind: "sync_drive_gallery",
      label: "Đồng bộ Drive",
      target_id: "00000000-0000-0000-0000-000000000001",
      description: "Sync",
      risk: "none",
      requires_approval: false,
    };
    expect(getMoodieApprovalState(action)).toBe("pending_approval");
    expect(canExecuteMoodieAction(action, false)).toBe(false);
  });
});
