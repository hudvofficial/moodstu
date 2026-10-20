import { describe, expect, it } from "@jest/globals";
import { RETURN_PATH_MAX_LENGTH, toSafeReturnPath } from "@/lib/navigation/safe-return-path";

const ORIGIN = "https://mood.example.vn";

/** Mọi kết quả khác null phải là đường dẫn nằm trong đúng origin của app. */
function staysInOrigin(result: string | null) {
  if (result === null) return true;
  return result.startsWith("/") && new URL(result, ORIGIN).origin === ORIGIN;
}

describe("toSafeReturnPath — nhận đường dẫn nội bộ hợp lệ", () => {
  it.each([
    ["/contracts/2839b839-8a19-452d-9e7c-f1d0fbffd6f9", "/contracts/2839b839-8a19-452d-9e7c-f1d0fbffd6f9"],
    ["/contracts?tab=active&page=2", "/contracts?tab=active&page=2"],
    ["/finance/receipts", "/finance/receipts"],
    ["/dashboard", "/dashboard"],
  ])("%s → %s", (raw, expected) => {
    expect(toSafeReturnPath(raw, ORIGIN)).toBe(expected);
  });
});

describe("toSafeReturnPath — chặn open-redirect và đích không hợp lệ", () => {
  it.each([
    ["//evil.com"],
    ["/\\evil.com"],
    ["/\t/evil.com"],
    ["/\n/evil.com"],
    ["/ /evil.com"],
    ["https://evil.com"],
    ["http://mood.example.vn.evil.com/x"],
    ["javascript:alert(1)"],
    ["javascript%3Aalert(1)"],
    ["evil.com"],
    [""],
  ])("%j → null", (raw) => {
    expect(toSafeReturnPath(raw, ORIGIN)).toBeNull();
  });

  it.each([["/%2F%2Fevil.com"], ["/%5Cevil.com"], ["/%2F/evil.com"], ["/.%2F%2Fevil.com"]])(
    "%j dạng %%-mã hoá: không bao giờ ra ngoài origin",
    (raw) => {
      expect(staysInOrigin(toSafeReturnPath(raw, ORIGIN))).toBe(true);
    },
  );

  it.each([
    ["/login"],
    ["/login?next=/contracts"],
    ["/auth/callback"],
    ["/api/contracts"],
    ["/_next/static/x.js"],
    ["/offline"],
    ["/account-disabled"],
    ["/reset-password"],
  ])("%s (trang công khai/API) → null, tránh vòng lặp", (raw) => {
    expect(toSafeReturnPath(raw, ORIGIN)).toBeNull();
  });

  it("trang in/xuất PDF → null (mở lại không tự dựng PDF)", () => {
    expect(toSafeReturnPath("/contracts/x/print?isExportMode=true", ORIGIN)).toBeNull();
    expect(toSafeReturnPath("/contracts/x/print", ORIGIN)).toBeNull();
    expect(toSafeReturnPath("/printing", ORIGIN)).toBe("/printing");
  });

  it("dài quá giới hạn → null; null/undefined → null; origin hỏng → null", () => {
    expect(toSafeReturnPath(`/${"a".repeat(RETURN_PATH_MAX_LENGTH)}`, ORIGIN)).toBeNull();
    expect(toSafeReturnPath(null, ORIGIN)).toBeNull();
    expect(toSafeReturnPath(undefined, ORIGIN)).toBeNull();
    expect(toSafeReturnPath("/contracts", "khong-phai-url")).toBeNull();
  });
});
