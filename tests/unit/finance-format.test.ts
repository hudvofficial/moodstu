import { describe, it, expect } from "@jest/globals";
import {
  financeStatusLabel,
  financeStatusVariant,
  financeMethodLabel,
  financeReceiptTypeLabel,
  financeReceiptTypeVariant,
  formatVnd,
  formatFinanceDate,
} from "@/components/finance/finance-format";

describe("financeStatusLabel", () => {
  it("maps approved → Đã duyệt", () => {
    expect(financeStatusLabel("approved")).toBe("Đã duyệt");
  });

  it("maps confirmed → Đã xác nhận", () => {
    expect(financeStatusLabel("confirmed")).toBe("Đã xác nhận");
  });

  it("maps pending → Chờ duyệt", () => {
    expect(financeStatusLabel("pending")).toBe("Chờ duyệt");
  });

  it("maps draft → Nháp", () => {
    expect(financeStatusLabel("draft")).toBe("Nháp");
  });

  it("maps in_progress → Đang chốt", () => {
    expect(financeStatusLabel("in_progress")).toBe("Đang chốt");
  });

  it("maps locked → Đã khóa sổ", () => {
    expect(financeStatusLabel("locked")).toBe("Đã khóa sổ");
  });

  it("maps Vietnamese status codes", () => {
    expect(financeStatusLabel("chua_bat_dau")).toBe("Chưa bắt đầu");
    expect(financeStatusLabel("dang_thuc_hien")).toBe("Đang thực hiện");
    expect(financeStatusLabel("cho_duyet")).toBe("Chờ duyệt");
    expect(financeStatusLabel("co_van_de")).toBe("Có vấn đề");
    expect(financeStatusLabel("cho_xu_ly")).toBe("Chờ xử lý");
    expect(financeStatusLabel("hoan_thanh")).toBe("Hoàn thành");
    expect(financeStatusLabel("da_huy")).toBe("Đã hủy");
  });

  it("maps English aliases", () => {
    expect(financeStatusLabel("completed")).toBe("Hoàn thành");
    expect(financeStatusLabel("cancelled")).toBe("Đã hủy");
  });

  it("is case-insensitive", () => {
    expect(financeStatusLabel("APPROVED")).toBe("Đã duyệt");
    expect(financeStatusLabel("Pending")).toBe("Chờ duyệt");
    expect(financeStatusLabel("LOCKED")).toBe("Đã khóa sổ");
  });

  it("returns fallback for null/undefined/empty/unknown", () => {
    expect(financeStatusLabel(null)).toBe("Thông tin");
    expect(financeStatusLabel(undefined)).toBe("Thông tin");
    expect(financeStatusLabel("")).toBe("Thông tin");
    expect(financeStatusLabel("nonexistent")).toBe("Thông tin");
  });
});

describe("financeStatusVariant", () => {
  it("returns success for positive statuses", () => {
    for (const s of ["approved", "confirmed", "hoan_thanh", "completed", "locked"]) {
      expect(financeStatusVariant(s)).toBe("success");
    }
  });

  it("returns warning for in-progress statuses", () => {
    for (const s of ["pending", "dang_thuc_hien", "cho_xu_ly", "in_progress", "cho_duyet"]) {
      expect(financeStatusVariant(s)).toBe("warning");
    }
  });

  it("returns error for negative statuses", () => {
    for (const s of ["da_huy", "cancelled", "co_van_de"]) {
      expect(financeStatusVariant(s)).toBe("error");
    }
  });

  it("returns neutral for initial statuses", () => {
    for (const s of ["draft", "chua_bat_dau"]) {
      expect(financeStatusVariant(s)).toBe("neutral");
    }
  });

  it("returns info for unknown/null/undefined", () => {
    expect(financeStatusVariant(null)).toBe("info");
    expect(financeStatusVariant(undefined)).toBe("info");
    expect(financeStatusVariant("unknown")).toBe("info");
  });
});

describe("financeMethodLabel", () => {
  it("maps payment methods", () => {
    expect(financeMethodLabel("tien_mat")).toBe("Tiền mặt");
    expect(financeMethodLabel("cash")).toBe("Tiền mặt");
    expect(financeMethodLabel("chuyen_khoan")).toBe("Chuyển khoản");
    expect(financeMethodLabel("bank_transfer")).toBe("Chuyển khoản");
    expect(financeMethodLabel("card")).toBe("Chuyển khoản");
  });

  it("returns dash for null/undefined", () => {
    expect(financeMethodLabel(null)).toBe("-");
    expect(financeMethodLabel(undefined)).toBe("-");
  });

  it("returns raw method for unknown values", () => {
    expect(financeMethodLabel("crypto")).toBe("crypto");
  });
});

describe("financeReceiptTypeLabel", () => {
  it("maps all 6 receipt types", () => {
    expect(financeReceiptTypeLabel("contract_payment")).toBe("Thanh toán hợp đồng");
    expect(financeReceiptTypeLabel("contract_deposit")).toBe("Cọc hợp đồng");
    expect(financeReceiptTypeLabel("contract_adjustment")).toBe("Phát sinh hợp đồng");
    expect(financeReceiptTypeLabel("other_income")).toBe("Thu nhập khác");
    expect(financeReceiptTypeLabel("service_fee")).toBe("Phí dịch vụ");
    expect(financeReceiptTypeLabel("sale_receipt")).toBe("Bán vật tư");
  });

  it("returns fallback for null/undefined/empty", () => {
    expect(financeReceiptTypeLabel(null)).toBe("Khoản thu");
    expect(financeReceiptTypeLabel(undefined)).toBe("Khoản thu");
    expect(financeReceiptTypeLabel("")).toBe("Khoản thu");
  });

  it("returns raw type for unknown values", () => {
    expect(financeReceiptTypeLabel("refund")).toBe("refund");
  });
});

describe("financeReceiptTypeVariant", () => {
  it("maps receipt types to variants", () => {
    expect(financeReceiptTypeVariant("contract_payment")).toBe("success");
    expect(financeReceiptTypeVariant("contract_deposit")).toBe("info");
    expect(financeReceiptTypeVariant("contract_adjustment")).toBe("warning");
    expect(financeReceiptTypeVariant("sale_receipt")).toBe("warning");
    expect(financeReceiptTypeVariant("other_income")).toBe("neutral");
  });

  it("returns neutral for null/undefined/unknown", () => {
    expect(financeReceiptTypeVariant(null)).toBe("neutral");
    expect(financeReceiptTypeVariant(undefined)).toBe("neutral");
    expect(financeReceiptTypeVariant("unknown")).toBe("neutral");
  });
});

describe("formatVnd (wrapper)", () => {
  it("formats number with VND suffix", () => {
    const result = formatVnd(1000000);
    expect(result).toContain("VND");
    expect(result).toContain("1");
  });

  it("handles null/undefined", () => {
    expect(formatVnd(null)).toContain("0");
    expect(formatVnd(undefined)).toContain("0");
  });
});

describe("formatFinanceDate (wrapper)", () => {
  it("formats valid ISO date", () => {
    const result = formatFinanceDate("2026-06-13");
    expect(result).toBe("13/06/2026");
  });

  it("returns dash for null/undefined", () => {
    expect(formatFinanceDate(null)).toBe("-");
    expect(formatFinanceDate(undefined)).toBe("-");
  });

  it("returns dash for invalid date", () => {
    expect(formatFinanceDate("not-a-date")).toBe("-");
  });
});
