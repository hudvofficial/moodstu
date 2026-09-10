/**
 * #27 (T-20260910-t4-normalize-phone) — lib/phone.ts phải gương đúng public.normalize_phone(text) trên DB.
 * Các ca dưới trùng với diễn tập SQL 10/09 (spec §1). Không DB.
 */
import { isValidVnPhone, normalizePhone } from "@/lib/phone";

describe("normalizePhone — một luật cho mọi đường ghi (#27)", () => {
  it.each([
    ["+84 968 123 456", "0968123456"],
    ["090.123.4567", "0901234567"],
    ["(0901) 234-567", "0901234567"],
    ["84901234567", "0901234567"],
    ["0084901234567", "0901234567"],
    ["0901234567", "0901234567"],
  ])("%s → %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it("rỗng / không có chữ số / null → null", () => {
    expect(normalizePhone("  ")).toBeNull();
    expect(normalizePhone("abc")).toBeNull();
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
  });

  it("không đoán độ dài: thiếu/thừa số giữ nguyên chữ số (báo cáo, không sửa)", () => {
    expect(normalizePhone("097681767")).toBe("097681767");
    expect(normalizePhone("07666777881")).toBe("07666777881");
  });

  it("isValidVnPhone: 0 + 9 số sau khi chuẩn", () => {
    expect(isValidVnPhone("+84 968 123 456")).toBe(true);
    expect(isValidVnPhone("097681767")).toBe(false);
    expect(isValidVnPhone("")).toBe(false);
  });
});
