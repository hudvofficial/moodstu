import { describe, expect, it } from "@jest/globals";
import { isExplicitMoodieVoiceConfirmation } from "@/lib/moodie/voice-confirmation";

describe("Moodie voice confirmation evidence", () => {
  it.each(["đồng ý", "xác nhận", "ok nhé", "làm đi", "yes", "chốt luôn"])("accepts explicit confirmation: %s", (value) => {
    expect(isExplicitMoodieVoiceConfirmation(value)).toBe(true);
  });

  it.each(["không đồng ý", "chưa nhé", "đừng làm", "có cách nào khác không?", "Moodie tự quyết đi", "ừ nhưng khoan"])("rejects ambiguous or negative utterance: %s", (value) => {
    expect(isExplicitMoodieVoiceConfirmation(value)).toBe(false);
  });
});
