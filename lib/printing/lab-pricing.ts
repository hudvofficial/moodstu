import type { LabProductPrice, PriceSource } from "@/types/printing";

/**
 * Giá bán hiệu lực của 1 dòng bảng giá Lab.
 *
 * Luật (spec §4): override khác NULL thì dùng override, ngược lại dùng giá mặc định
 * của SKU. Override 0 là giá hợp lệ — TUYỆT ĐỐI không dùng truthy check.
 */
export function resolveLabPrice(input: {
  costPrice: number;
  defaultSellingPrice: number | null | undefined;
  sellingPriceOverride: number | null | undefined;
}): {
  effectiveSellingPrice: number | null;
  priceSource: PriceSource;
  margin: number | null;
} {
  const defaultPrice =
    input.defaultSellingPrice === null || input.defaultSellingPrice === undefined
      ? null
      : Number(input.defaultSellingPrice);

  if (defaultPrice === null) {
    // SKU chưa map (hoặc catalog không còn dòng giá) → không có giá bán để so.
    return { effectiveSellingPrice: null, priceSource: "unmapped", margin: null };
  }

  const override = input.sellingPriceOverride;
  const hasOverride = override !== null && override !== undefined;
  const effective = hasOverride ? Number(override) : defaultPrice;
  const cost = Number(input.costPrice || 0);

  return {
    effectiveSellingPrice: effective,
    priceSource: hasOverride ? "override" : "default",
    margin: effective - cost,
  };
}

export const PRICE_SOURCE_LABELS: Record<PriceSource, string> = {
  override: "Giá riêng Lab",
  default: "Giá mặc định",
  unmapped: "Chưa map SKU",
};

/** Dữ liệu thô từ PostgREST: lab_services + embed print_products */
export type LabPriceRowInput = {
  id: string;
  lab_id: string;
  item_name: string;
  cost_price: number | null;
  product_id: string | null;
  selling_price_override: number | null;
  updated_at: string | null;
  print_products: {
    sku: string | null;
    name: string | null;
    default_selling_price: number | null;
    active: boolean | null;
  } | null;
};

/** Chuẩn hoá 1 dòng bảng giá Lab → LabProductPrice (giá hiệu lực + nguồn giá). */
export function mapLabPriceRow(row: LabPriceRowInput): LabProductPrice {
  const product = row.print_products;
  const costPrice = Number(row.cost_price ?? 0);
  const defaultSellingPrice =
    product?.default_selling_price === null ||
    product?.default_selling_price === undefined
      ? null
      : Number(product.default_selling_price);
  const sellingPriceOverride =
    row.selling_price_override === null ||
    row.selling_price_override === undefined
      ? null
      : Number(row.selling_price_override);

  const resolved = resolveLabPrice({
    costPrice,
    defaultSellingPrice,
    sellingPriceOverride,
  });

  return {
    labServiceId: row.id,
    labId: row.lab_id,
    itemName: row.item_name,
    productId: row.product_id,
    sku: product?.sku ?? null,
    productName: product?.name ?? null,
    costPrice,
    defaultSellingPrice,
    sellingPriceOverride,
    effectiveSellingPrice: resolved.effectiveSellingPrice,
    priceSource: resolved.priceSource,
    margin: resolved.margin,
    productActive: product?.active ?? null,
    updatedAt: row.updated_at,
  };
}

export type { LabProductPrice };
