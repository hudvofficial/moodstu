import type { PriceRule } from "@/types/service";

export interface BundleItem {
  id: string;
  service_id: string;
  service_name: string;
  selling_price: number;
  quantity: number;
  category_id?: string;
  unit?: string;
  image_url?: string;
  original_price?: number;
  discount_amount?: number;
  discount_percent?: number;
  final_price?: number;
}

export interface CalculationResult {
  originalTotal: number;
  discountAmount: number;
  finalTotal: number;
  appliedRules: string[];
  itemBreakdown: {
    id: string;
    originalPrice: number;
    finalPrice: number;
    discount: number;
  }[];
}

export function calculateBundlePrice(
  items: BundleItem[],
  rules: PriceRule[] = [],
): CalculationResult {
  let originalTotal = 0;
  const itemBreakdown = items.map((item) => {
    const itemTotal = item.selling_price * item.quantity;
    originalTotal += itemTotal;
    return {
      id: item.id,
      originalPrice: itemTotal,
      finalPrice: itemTotal,
      discount: 0,
    };
  });

  let discountAmount = 0;
  const appliedRules: string[] = [];

  // Sort rules by priority (avoid mutating the original array)
  const activeRules = [...rules].sort((a, b) => b.priority - a.priority);

  // Apply rules (Basic implementation for now)
  activeRules.forEach((rule) => {
    const conditions = rule.conditions as {
      type?: string;
      category_id?: string;
      value?: number;
    };
    const actions = rule.actions as {
      type?: string;
      value?: number;
      target?: string;
    };

    // Example condition check: { type: 'min_quantity', category_id: '...', value: 2 }
    let isTriggered = false;

    if (conditions?.type === "min_quantity") {
      const count = items
        .filter(
          (i) =>
            !conditions.category_id || i.category_id === conditions.category_id,
        )
        .reduce((s, i) => s + i.quantity, 0);

      if (count >= (conditions.value ?? 0)) {
        isTriggered = true;
      }
    }

    if (isTriggered) {
      appliedRules.push(rule.name);

      // Example action: { type: 'discount_percent', value: 10, target: 'total' }
      if (actions?.type === "discount_percent") {
        const discount = (originalTotal * (actions.value ?? 0)) / 100;
        discountAmount += discount;
      }
    }
  });

  return {
    originalTotal,
    discountAmount,
    finalTotal: originalTotal - discountAmount,
    appliedRules,
    itemBreakdown,
  };
}
