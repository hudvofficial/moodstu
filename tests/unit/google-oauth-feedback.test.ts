import { getGoogleOAuthFeedback } from "@/lib/google-oauth-feedback";

describe("Google OAuth redirect feedback (client-safe)", () => {
  it.each([
    ["invalid_state", "Phiên kết nối Google không còn hợp lệ."],
    ["access_denied", "Google chưa được cấp quyền."],
    ["no_code", "Google không trả về mã xác thực."],
    ["invalid_grant", "Mã xác thực Google đã hết hạn."],
    ["missing_refresh_token", "Google chưa cấp quyền duy trì kết nối."],
    ["missing_access_token", "Google không cung cấp mã truy cập."],
    ["forbidden", "Tài khoản không có quyền quản lý kết nối Google."],
    ["internal_error", "Không thể hoàn tất kết nối Google."],
  ])("provides an actionable error for %s", (code, expectedMessage) => {
    const feedback = getGoogleOAuthFeedback(code, null, false);
    expect(feedback?.tone).toBe("error");
    expect(feedback?.message).toBe(expectedMessage);
    expect(feedback?.detail.length).toBeGreaterThan(20);
  });

  it("never reflects unknown query text or prototype names", () => {
    for (const input of ["<script>alert(1)</script>", "__proto__", "toString", "unexpected_code"]) {
      const feedback = getGoogleOAuthFeedback(input, null, false);
      expect(feedback?.tone).toBe("error");
      expect(feedback?.message).toBe("Kết nối Google không thành công.");
      expect(JSON.stringify(feedback)).not.toContain(input);
    }
  });

  it("shows success only when server state confirms a stored connection", () => {
    expect(getGoogleOAuthFeedback(null, "success", true)?.tone).toBe("success");
    expect(getGoogleOAuthFeedback(null, "success", false)?.tone).toBe("warning");
    expect(getGoogleOAuthFeedback(null, "unexpected", true)).toBeNull();
    expect(getGoogleOAuthFeedback(null, null, false)).toBeNull();
  });

  it("prioritizes a returned OAuth error over success", () => {
    expect(getGoogleOAuthFeedback("invalid_state", "success", true)?.tone).toBe("error");
  });
});
