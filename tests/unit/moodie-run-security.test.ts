import { describe, expect, it } from "@jest/globals";
import {
  createMoodieConfirmationToken,
  verifyMoodieConfirmationToken,
} from "@/lib/moodie/runs/security";

describe("Moodie confirmation token security", () => {
  it("stores a one-way hash and verifies the original token", () => {
    const confirmation = createMoodieConfirmationToken();
    expect(confirmation.token).not.toBe(confirmation.hash);
    expect(confirmation.token.length).toBeGreaterThanOrEqual(40);
    expect(verifyMoodieConfirmationToken(confirmation.token, confirmation.hash)).toBe(true);
    expect(verifyMoodieConfirmationToken(`${confirmation.token}x`, confirmation.hash)).toBe(false);
  });
});
