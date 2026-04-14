"use client";

import { fetchInventoryForSale } from "@/app/actions/inventory-queries";
import type { SaleItem } from "@/app/actions/receipt-actions";
import { SaleItemSelector } from "@/components/finance/receipts/sale-item-selector";
import { cacheKeys, useSWR } from "@/lib/swr";

interface ReceiptFormSaleSectionProps {
  isSale: boolean;
  saleItems: SaleItem[];
  onSaleItemsChange: (items: SaleItem[]) => void;
  onTotalChange: (total: number) => void;
}

export function ReceiptFormSaleSection({
  isSale,
  saleItems,
  onSaleItemsChange,
  onTotalChange,
}: ReceiptFormSaleSectionProps) {
  const { data: inventoryOptions = [] } = useSWR(
    isSale ? cacheKeys.inventorySaleOptions() : null,
    fetchInventoryForSale,
  );

  if (!isSale) return null;

  return (
    <SaleItemSelector
      items={saleItems}
      onChange={onSaleItemsChange}
      inventoryOptions={inventoryOptions}
      onTotalChange={onTotalChange}
    />
  );
}
