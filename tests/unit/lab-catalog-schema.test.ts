import { describe, it, expect } from "@jest/globals";
import {
  upsertPrintProductSchema,
  upsertLabProductPriceSchema,
} from "@/lib/validations/lab.schema";
import { resolveLabPrice, mapLabPriceRow } from "@/lib/printing/lab-pricing";
import { canAccess } from "@/types/roles";

const LAB_A = "11111111-1111-4111-8111-111111111111";
const LAB_B = "22222222-2222-4222-8222-222222222222";
const PRODUCT = "33333333-3333-4333-8333-333333333333";

describe("upsertLabProductPriceSchema — override NULL vs 0", () => {
  const base = { lab_id: LAB_A, product_id: PRODUCT, cost_price: 40_000 };

  it("nhận override = null (dùng giá mặc định)", () => {
    const parsed = upsertLabProductPriceSchema.safeParse({
      ...base,
      selling_price_override: null,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.selling_price_override).toBeNull();
  });

  it("nhận override = 0 và KHÔNG đổi thành null", () => {
    const parsed = upsertLabProductPriceSchema.safeParse({
      ...base,
      selling_price_override: 0,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.selling_price_override).toBe(0);
  });

  it("bỏ trống override → chuẩn hoá về null", () => {
    const parsed = upsertLabProductPriceSchema.safeParse(base);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.selling_price_override).toBeNull();
  });

  it("override âm → từ chối", () => {
    expect(
      upsertLabProductPriceSchema.safeParse({
        ...base,
        selling_price_override: -1,
      }).success,
    ).toBe(false);
  });

  it("thiếu product_id → từ chối", () => {
    expect(
      upsertLabProductPriceSchema.safeParse({ lab_id: LAB_A, cost_price: 1 })
        .success,
    ).toBe(false);
  });
});

describe("upsertPrintProductSchema", () => {
  const base = { sku: " ALB-20X30 ", name: "Album 20x30" };

  it("trim SKU và mặc định active = true", () => {
    const parsed = upsertPrintProductSchema.safeParse({
      ...base,
      default_selling_price: 120_000,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.sku).toBe("ALB-20X30");
      expect(parsed.data.active).toBe(true);
    }
  });

  it("giá mặc định 0 hợp lệ", () => {
    expect(
      upsertPrintProductSchema.safeParse({ ...base, default_selling_price: 0 })
        .success,
    ).toBe(true);
  });

  it("giá âm → từ chối", () => {
    expect(
      upsertPrintProductSchema.safeParse({
        ...base,
        default_selling_price: -5,
      }).success,
    ).toBe(false);
  });

  it("SKU rỗng → từ chối", () => {
    expect(
      upsertPrintProductSchema.safeParse({
        sku: "   ",
        name: "X",
        default_selling_price: 1,
      }).success,
    ).toBe(false);
  });

  it("truyền expected_updated_at cho khoá lạc quan", () => {
    const parsed = upsertPrintProductSchema.safeParse({
      ...base,
      default_selling_price: 1,
      expected_updated_at: "2026-11-12T00:00:00.000Z",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success)
      expect(parsed.data.expected_updated_at).toBe("2026-11-12T00:00:00.000Z");
  });
});

describe("Lab A vs Lab B cùng SKU", () => {
  const defaultPrice = 120_000;

  it("Lab A cost + override riêng, Lab B chỉ dùng giá mặc định", () => {
    const a = resolveLabPrice({
      costPrice: 80_000,
      defaultSellingPrice: defaultPrice,
      sellingPriceOverride: 140_000,
    });
    const b = resolveLabPrice({
      costPrice: 95_000,
      defaultSellingPrice: defaultPrice,
      sellingPriceOverride: null,
    });

    expect(a).toEqual({
      effectiveSellingPrice: 140_000,
      priceSource: "override",
      margin: 60_000,
    });
    expect(b).toEqual({
      effectiveSellingPrice: 120_000,
      priceSource: "default",
      margin: 25_000,
    });
  });

  it("giá mặc định tăng thì chỉ Lab chưa override nhận giá mới", () => {
    const newDefault = 150_000;
    expect(
      resolveLabPrice({
        costPrice: 80_000,
        defaultSellingPrice: newDefault,
        sellingPriceOverride: 140_000,
      }).effectiveSellingPrice,
    ).toBe(140_000);
    expect(
      resolveLabPrice({
        costPrice: 95_000,
        defaultSellingPrice: newDefault,
        sellingPriceOverride: null,
      }).effectiveSellingPrice,
    ).toBe(newDefault);
  });

  it("xóa override trở về giá mặc định", () => {
    expect(
      resolveLabPrice({
        costPrice: 80_000,
        defaultSellingPrice: 150_000,
        sellingPriceOverride: null,
      }).priceSource,
    ).toBe("default");
  });
});

describe("quyền truy cập module printing", () => {
  it("admin và manager có quyền printing (khớp RLS thật của labs/lab_services)", () => {
    expect(canAccess("admin", "printing")).toBe(true);
    expect(canAccess("manager", "printing")).toBe(true);
  });
});

describe("mapLabPriceRow — unmapped + catalog inactive", () => {
  const rowBase = {
    id: "44444444-4444-4444-8444-444444444444",
    lab_id: LAB_A,
    item_name: "13x18 In lụa",
    cost_price: 2_700,
    product_id: null,
    selling_price_override: null,
    updated_at: "2026-11-12T00:00:00.000Z",
    print_products: null,
  };

  it("dòng chưa map SKU → giữ cost cũ, không có giá bán", () => {
    const mapped = mapLabPriceRow(rowBase);
    expect(mapped.priceSource).toBe("unmapped");
    expect(mapped.effectiveSellingPrice).toBeNull();
    expect(mapped.margin).toBeNull();
    expect(mapped.costPrice).toBe(2_700);
    expect(mapped.sku).toBeNull();
  });

  it("SKU inactive vẫn quy ra giá nhưng đánh dấu productActive=false", () => {
    const mapped = mapLabPriceRow({
      ...rowBase,
      product_id: PRODUCT,
      print_products: {
        sku: "ALB-20X30",
        name: "Album 20x30",
        default_selling_price: 120_000,
        active: false,
      },
    });
    expect(mapped.productActive).toBe(false);
    expect(mapped.effectiveSellingPrice).toBe(120_000);
    expect(mapped.priceSource).toBe("default");
  });

  it("override 0 đi qua mapper vẫn là 0 (không rơi về default)", () => {
    const mapped = mapLabPriceRow({
      ...rowBase,
      product_id: PRODUCT,
      selling_price_override: 0,
      print_products: {
        sku: "ALB-20X30",
        name: "Album 20x30",
        default_selling_price: 120_000,
        active: true,
      },
    });
    expect(mapped.sellingPriceOverride).toBe(0);
    expect(mapped.effectiveSellingPrice).toBe(0);
    expect(mapped.priceSource).toBe("override");
    expect(mapped.margin).toBe(-2_700);
  });

  it("cost NULL trong DB → 0, không NaN", () => {
    const mapped = mapLabPriceRow({ ...rowBase, cost_price: null });
    expect(mapped.costPrice).toBe(0);
  });
});
