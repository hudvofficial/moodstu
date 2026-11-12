import { describe, it, expect } from "@jest/globals";
import { resolveLabPrice } from "@/lib/printing/lab-pricing";

describe("resolveLabPrice — NULL vs 0", () => {
  it("override NULL → lấy giá mặc định", () => {
    expect(
      resolveLabPrice({ costPrice: 40_000, defaultSellingPrice: 100_000, sellingPriceOverride: null }),
    ).toEqual({ effectiveSellingPrice: 100_000, priceSource: "default", margin: 60_000 });
  });

  it("override 0 → bán 0đ, KHÔNG rơi về giá mặc định", () => {
    expect(
      resolveLabPrice({ costPrice: 40_000, defaultSellingPrice: 100_000, sellingPriceOverride: 0 }),
    ).toEqual({ effectiveSellingPrice: 0, priceSource: "override", margin: -40_000 });
  });

  it("override undefined cũng coi là chưa override", () => {
    expect(
      resolveLabPrice({ costPrice: 0, defaultSellingPrice: 55_000, sellingPriceOverride: undefined })
        .effectiveSellingPrice,
    ).toBe(55_000);
  });

  it("default 0 với override NULL → vẫn là giá mặc định, không unmapped", () => {
    expect(
      resolveLabPrice({ costPrice: 10_000, defaultSellingPrice: 0, sellingPriceOverride: null }),
    ).toEqual({ effectiveSellingPrice: 0, priceSource: "default", margin: -10_000 });
  });
});

describe("resolveLabPrice — unmapped", () => {
  it("chưa map SKU (default null) → không có giá bán, không có chênh lệch", () => {
    expect(
      resolveLabPrice({ costPrice: 30_000, defaultSellingPrice: null, sellingPriceOverride: null }),
    ).toEqual({ effectiveSellingPrice: null, priceSource: "unmapped", margin: null });
  });

  it("đã map nhưng override có giá trị vẫn tính từ default hiện có", () => {
    expect(
      resolveLabPrice({ costPrice: 0, defaultSellingPrice: 20_000, sellingPriceOverride: 25_000 })
        .effectiveSellingPrice,
    ).toBe(25_000);
  });
});
