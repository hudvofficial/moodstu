import { describe, expect, it } from "@jest/globals";
import { contractSubmissionSchema } from "@/lib/validations/contract.schema";

function submission(serviceType: "studio" | "combo" | "ngay_cuoi") {
  return {
    formData: {
      contract_code: "HD-TEST",
      customer_id: "11111111-1111-4111-8111-111111111111",
      service_type: serviceType,
      transaction_type: "hop_dong" as const,
      status: "cho_xu_ly" as const,
    },
    items: [{
      item_name: "Gói chụp",
      quantity: 1,
      unit_price: 1_000_000,
      discount_amount: 0,
      total_amount: 1_000_000,
      type: "dich_vu" as const,
    }],
    paymentInfo: {
      amount: 0,
      payment_method: "tien_mat" as const,
    },
    financials: {
      total_amount: 1_000_000,
      discount_amount: 0,
      paid_amount: 0,
      remaining_amount: 1_000_000,
    },
  };
}

describe("contract submission wedding milestone", () => {
  it.each(["studio", "combo"] as const)(
    "requires weddingDate for a new %s contract",
    (serviceType) => {
      const result = contractSubmissionSchema.safeParse(submission(serviceType));

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(expect.arrayContaining([
          expect.objectContaining({ path: ["weddingDate"] }),
        ]));
      }
    },
  );

  it("allows a legacy Studio edit whose wedding date is still unknown", () => {
    const result = contractSubmissionSchema.safeParse({
      ...submission("studio"),
      existingContractId: "22222222-2222-4222-8222-222222222222",
    });

    expect(result.success).toBe(true);
  });

  it("accepts a new Studio contract when the wedding date is supplied", () => {
    const result = contractSubmissionSchema.safeParse({
      ...submission("studio"),
      weddingDate: "2026-08-01",
    });

    expect(result.success).toBe(true);
  });
});
