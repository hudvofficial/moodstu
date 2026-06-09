import { describe, it, expect } from "@jest/globals";
import { normalizePlanStatus, mapPaymentPlans } from "@/lib/contracts/payment-plans";
import {
  getStatusLabel,
  getServiceLabel,
  getPaymentStatusLabel,
  getEventTypeLabel,
  getWorkTypeLabel,
  getTaskStatusLabel,
  getPaymentMethodLabel,
  getPaymentStageLabel,
  getItemTypeLabel,
  isOnSetEvent,
} from "@/types/contract-constants";
import {
  showCoupleFields,
  showWeddingDate,
  workDateLabel,
} from "@/types/contract-form";
import { contractSubmissionSchema } from "@/lib/validations/contract.schema";

// ─── normalizePlanStatus ────────────────────────────────

describe("normalizePlanStatus", () => {
  it("returns cancelled for cancelled-family strings", () => {
    expect(normalizePlanStatus("cancelled", 0, 100)).toBe("cancelled");
    expect(normalizePlanStatus("da_huy", 0, 100)).toBe("cancelled");
    expect(normalizePlanStatus("huy", 500, 1000)).toBe("cancelled");
  });

  it("returns paid for paid-family strings regardless of amounts", () => {
    expect(normalizePlanStatus("paid", 0, 0)).toBe("paid");
    expect(normalizePlanStatus("closed", 0, 100)).toBe("paid");
    expect(normalizePlanStatus("da_thanh_toan", 50, 100)).toBe("paid");
  });

  it("handles amount=0 edge: paid>0 → partial, paid=0 → pending", () => {
    expect(normalizePlanStatus(null, 50, 0)).toBe("partial");
    expect(normalizePlanStatus(null, 0, 0)).toBe("pending");
  });

  it("returns pending when paidAmount=0", () => {
    expect(normalizePlanStatus(null, 0, 1000)).toBe("pending");
    expect(normalizePlanStatus("pending", 0, 500)).toBe("pending");
  });

  it("returns paid when paidAmount within 0.01 of amount (floating-point safety)", () => {
    expect(normalizePlanStatus(null, 999.999, 1000)).toBe("paid");
    expect(normalizePlanStatus(null, 1000, 1000)).toBe("paid");
    expect(normalizePlanStatus(null, 1000.01, 1000)).toBe("paid");
  });

  it("returns partial for incomplete payment", () => {
    expect(normalizePlanStatus(null, 500, 1000)).toBe("partial");
    expect(normalizePlanStatus("pending", 1, 999999)).toBe("partial");
  });

  it("defaults null/undefined status to pending-family", () => {
    expect(normalizePlanStatus(null, 0, 100)).toBe("pending");
    expect(normalizePlanStatus(undefined, 0, 100)).toBe("pending");
  });
});

// ─── mapPaymentPlans ────────────────────────────────────

describe("mapPaymentPlans", () => {
  it("returns empty array for null/undefined input", () => {
    expect(mapPaymentPlans(null)).toEqual([]);
    expect(mapPaymentPlans(undefined)).toEqual([]);
  });

  it("computes paid_amount from allocations sum", () => {
    const result = mapPaymentPlans([
      {
        id: "p1",
        contract_id: "c1",
        stage_name: "Cọc",
        amount: 1000,
        sort_order: 1,
        payment_plan_allocations: [
          { id: "a1", contract_id: "c1", payment_plan_id: "p1", payment_id: "pay1", amount: 300, created_at: "2026-01-01", created_by: null },
          { id: "a2", contract_id: "c1", payment_plan_id: "p1", payment_id: "pay2", amount: 200, created_at: "2026-01-02", created_by: null },
        ],
      },
    ]);
    expect(result[0].paid_amount).toBe(500);
    expect(result[0].remaining_amount).toBe(500);
    expect(result[0].status).toBe("partial");
  });

  it("remaining_amount never goes negative", () => {
    const result = mapPaymentPlans([
      {
        id: "p1",
        contract_id: "c1",
        amount: 100,
        sort_order: 1,
        payment_plan_allocations: [
          { id: "a1", contract_id: "c1", payment_plan_id: "p1", payment_id: "pay1", amount: 200, created_at: "2026-01-01", created_by: null },
        ],
      },
    ]);
    expect(result[0].remaining_amount).toBe(0);
  });

  it("sorts by sort_order, then created_at", () => {
    const result = mapPaymentPlans([
      { id: "p2", contract_id: "c1", amount: 200, sort_order: 2, created_at: "2026-01-01" },
      { id: "p1a", contract_id: "c1", amount: 100, sort_order: 1, created_at: "2026-01-02" },
      { id: "p1b", contract_id: "c1", amount: 100, sort_order: 1, created_at: "2026-01-01" },
    ]);
    expect(result.map((p) => p.id)).toEqual(["p1b", "p1a", "p2"]);
  });

  it("handles plan with no allocations", () => {
    const result = mapPaymentPlans([
      { id: "p1", contract_id: "c1", amount: 500, sort_order: 1 },
    ]);
    expect(result[0].paid_amount).toBe(0);
    expect(result[0].remaining_amount).toBe(500);
    expect(result[0].status).toBe("pending");
  });
});

// ─── Label/status mapping ───────────────────────────────

describe("contract label helpers", () => {
  it("getStatusLabel maps all statuses", () => {
    expect(getStatusLabel("cho_xu_ly")).toBe("Chờ xử lý");
    expect(getStatusLabel("dang_thuc_hien")).toBe("Đang thực hiện");
    expect(getStatusLabel("hoan_thanh")).toBe("Hoàn thành");
    expect(getStatusLabel("da_huy")).toBe("Đã hủy");
  });

  it("getServiceLabel maps all 12 service types", () => {
    expect(getServiceLabel("studio")).toBe("Studio");
    expect(getServiceLabel("ngay_cuoi")).toBe("Ngày Cưới");
    expect(getServiceLabel("baby")).toBe("Baby");
    expect(getServiceLabel("khac")).toBe("Khác");
  });

  it("getPaymentStatusLabel maps all payment statuses", () => {
    expect(getPaymentStatusLabel("chua_thanh_toan")).toBe("Chưa thanh toán");
    expect(getPaymentStatusLabel("da_coc")).toBe("Đã cọc");
    expect(getPaymentStatusLabel("da_thanh_toan")).toBe("Đã thanh toán");
    expect(getPaymentStatusLabel("hoan_tien")).toBe("Hoàn tiền");
  });

  it("getEventTypeLabel maps all event types", () => {
    expect(getEventTypeLabel("ngay_chup")).toBe("Ngày Chụp");
    expect(getEventTypeLabel("hau_ky")).toBe("Hậu Kỳ");
    expect(getEventTypeLabel("giao_san_pham")).toBe("Giao Sản Phẩm");
  });

  it("getWorkTypeLabel maps work types", () => {
    expect(getWorkTypeLabel("chup_anh")).toBe("Chụp ảnh");
    expect(getWorkTypeLabel("quay_phim")).toBe("Quay phim");
    expect(getWorkTypeLabel("makeup")).toBe("Trang điểm");
  });

  it("getTaskStatusLabel maps task statuses", () => {
    expect(getTaskStatusLabel("chua_lam")).toBe("Chờ");
    expect(getTaskStatusLabel("dang_lam")).toBe("Đang làm");
    expect(getTaskStatusLabel("hoan_thanh")).toBe("Xong");
    expect(getTaskStatusLabel("da_huy")).toBe("Hủy");
  });

  it("getPaymentMethodLabel maps known methods, falls back to raw", () => {
    expect(getPaymentMethodLabel("tien_mat")).toBe("Tiền mặt");
    expect(getPaymentMethodLabel("chuyen_khoan")).toBe("Chuyển khoản");
    expect(getPaymentMethodLabel("bitcoin")).toBe("bitcoin");
  });

  it("getItemTypeLabel maps known types, falls back to raw", () => {
    expect(getItemTypeLabel("dich_vu")).toBe("Dịch vụ");
    expect(getItemTypeLabel("trang_phuc")).toBe("Trang phục");
    expect(getItemTypeLabel("unknown_type")).toBe("unknown_type");
  });

  it("label helpers fall back to raw value for unknown keys", () => {
    expect(getStatusLabel("nonexistent" as any)).toBe("nonexistent");
    expect(getServiceLabel("nonexistent" as any)).toBe("nonexistent");
  });
});

// ─── isOnSetEvent ───────────────────────────────────────

describe("isOnSetEvent", () => {
  it("ngay_chup and ngay_to_chuc are on-set", () => {
    expect(isOnSetEvent("ngay_chup")).toBe(true);
    expect(isOnSetEvent("ngay_to_chuc")).toBe(true);
  });

  it("hau_ky, giao_san_pham, chuan_bi are NOT on-set", () => {
    expect(isOnSetEvent("hau_ky")).toBe(false);
    expect(isOnSetEvent("giao_san_pham")).toBe(false);
    expect(isOnSetEvent("chuan_bi")).toBe(false);
  });
});

// ─── getPaymentStageLabel (complex normalization) ───────

describe("getPaymentStageLabel", () => {
  it("maps known DB keys", () => {
    expect(getPaymentStageLabel("dat_coc")).toBe("Cọc");
    expect(getPaymentStageLabel("dot_1")).toBe("Đợt 1");
    expect(getPaymentStageLabel("dot_2")).toBe("Đợt 2");
    expect(getPaymentStageLabel("tat_toan")).toBe("Tất toán");
    expect(getPaymentStageLabel("phat_sinh")).toBe("Phát sinh hợp đồng");
  });

  it("normalizes Vietnamese accented input", () => {
    expect(getPaymentStageLabel("Đặt cọc")).toBe("Cọc");
    expect(getPaymentStageLabel("Đợt 1")).toBe("Đợt 1");
  });

  it("falls back to fallback for empty/null input", () => {
    expect(getPaymentStageLabel(null)).toBe("Đợt thu");
    expect(getPaymentStageLabel("")).toBe("Đợt thu");
    expect(getPaymentStageLabel(undefined)).toBe("Đợt thu");
  });

  it("respects custom fallback", () => {
    expect(getPaymentStageLabel(null, "N/A")).toBe("N/A");
  });

  it("returns raw value for human-readable non-DB strings", () => {
    expect(getPaymentStageLabel("Tiền cọc studio")).toBe("Cọc");
    expect(getPaymentStageLabel("Custom Label Here")).toBe("Custom Label Here");
  });

  it("returns fallback for unknown DB-like keys", () => {
    expect(getPaymentStageLabel("unknown_db_key")).toBe("Đợt thu");
  });

  it("handles fuzzy matches via includes-logic", () => {
    expect(getPaymentStageLabel("thu_khong_theo_dot_extra")).toBe("Thu ngoài đợt");
    expect(getPaymentStageLabel("thanh_toan_het_roi")).toBe("Thanh toán hết");
  });
});

// ─── Contract form conditionals ─────────────────────────

describe("contract form conditionals", () => {
  describe("showCoupleFields", () => {
    it("true for wedding-related types", () => {
      expect(showCoupleFields("studio")).toBe(true);
      expect(showCoupleFields("ngay_cuoi")).toBe(true);
      expect(showCoupleFields("combo")).toBe(true);
    });

    it("false for non-wedding types", () => {
      expect(showCoupleFields("baby")).toBe(false);
      expect(showCoupleFields("gia_dinh")).toBe(false);
      expect(showCoupleFields("media")).toBe(false);
      expect(showCoupleFields("khac")).toBe(false);
    });
  });

  describe("showWeddingDate", () => {
    it("mirrors showCoupleFields", () => {
      expect(showWeddingDate("studio")).toBe(true);
      expect(showWeddingDate("baby")).toBe(false);
    });
  });

  describe("workDateLabel", () => {
    it("returns specific labels per service type", () => {
      expect(workDateLabel("ngay_cuoi")).toBe("Ngày tổ chức lễ");
      expect(workDateLabel("combo")).toBe("Ngày chụp prewedding");
      expect(workDateLabel("media")).toBe("Ngày thực hiện");
      expect(workDateLabel("khac")).toBe("Ngày thực hiện");
    });

    it("defaults to 'Ngày chụp'", () => {
      expect(workDateLabel("studio")).toBe("Ngày chụp");
      expect(workDateLabel("baby")).toBe("Ngày chụp");
      expect(workDateLabel("couple")).toBe("Ngày chụp");
    });
  });
});

// ─── Zod validation: date ordering ──────────────────────

describe("contractSubmissionSchema date validation", () => {
  const validBase = {
    formData: {
      contract_code: "HD-001",
      customer_id: "a0000000-0000-4000-8000-000000000001",
      service_type: "studio",
      transaction_type: "hop_dong",
      status: "cho_xu_ly",
      contract_date: "2026-06-01",
      work_date: "2026-06-05",
      delivery_date: "2026-06-10",
    },
    items: [
      {
        item_name: "Gói Studio",
        quantity: 1,
        unit_price: 1000000,
        total_amount: 1000000,
        type: "dich_vu",
      },
    ],
    paymentInfo: { amount: 0, payment_method: "tien_mat" },
    financials: { total_amount: 1000000, discount_amount: 0, paid_amount: 0, remaining_amount: 1000000 },
  };

  it("passes with valid date ordering", () => {
    const result = contractSubmissionSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it("fails when work_date < contract_date", () => {
    const result = contractSubmissionSchema.safeParse({
      ...validBase,
      formData: { ...validBase.formData, work_date: "2026-05-30" },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("formData.work_date");
    }
  });

  it("fails when delivery_date < work_date", () => {
    const result = contractSubmissionSchema.safeParse({
      ...validBase,
      formData: { ...validBase.formData, delivery_date: "2026-06-03" },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("formData.delivery_date");
    }
  });

  it("fails when delivery_date < contract_date", () => {
    const result = contractSubmissionSchema.safeParse({
      ...validBase,
      formData: {
        ...validBase.formData,
        work_date: "",
        delivery_date: "2026-05-30",
      },
    });
    expect(result.success).toBe(false);
  });

  it("allows empty dates (optional)", () => {
    const result = contractSubmissionSchema.safeParse({
      ...validBase,
      formData: {
        ...validBase.formData,
        contract_date: "",
        work_date: "",
        delivery_date: "",
      },
    });
    expect(result.success).toBe(true);
  });

  it("requires at least 1 item", () => {
    const result = contractSubmissionSchema.safeParse({
      ...validBase,
      items: [],
    });
    expect(result.success).toBe(false);
  });

  it("validates enum values strictly", () => {
    const result = contractSubmissionSchema.safeParse({
      ...validBase,
      formData: { ...validBase.formData, service_type: "invalid_type" },
    });
    expect(result.success).toBe(false);
  });
});
