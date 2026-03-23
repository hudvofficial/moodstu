"use server";

import { withAuth } from "@/lib/auth_utils";
import type { ContractItemFormData } from "@/types/contract-form";

// ═══════════════════════════════════════════
// Contract Queries — Contract-domain READ actions
// V2: Only contract-specific queries here
// Cross-module functions moved to their domain modules
// ═══════════════════════════════════════════

// ─── getNextContractCode ─────────────────────
// Generate next sequential contract code (HĐ-YYYY-NNNN)
export async function getNextContractCode() {
  return withAuth(async (supabase) => {
    const year = new Date().getFullYear();
    const prefix = `HĐ-${year}-`;

    const { data } = await supabase
      .from("contracts")
      .select("contract_code")
      .like("contract_code", `${prefix}%`)
      .order("contract_code", { ascending: false })
      .limit(1)
      .maybeSingle();

    let nextNum = 1;
    if (data?.contract_code) {
      const parts = data.contract_code.split("-");
      const lastNum = parseInt(parts[2]);
      if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }

    return `${prefix}${nextNum.toString().padStart(4, "0")}`;
  });
}

// ─── getContractForEdit ──────────────────────
// Fetch full contract data for edit mode pre-fill
export async function getContractForEdit(contractId: string) {
  return withAuth(async (supabase) => {
    // Fetch contract with customer + items
    const { data: contract, error } = await supabase
      .from("contracts")
      .select(`
        *,
        customers (id, full_name, phone, bride_name, groom_name, bride_phone, bride_height, bride_weight, bride_shoe_size, groom_phone, groom_height, groom_weight, groom_shoe_size, wedding_date, address),
        contract_items (id, type, item_name, service_id, inventory_item_id, export_type, is_addon, addon_category, quantity, unit_price, original_price, discount_amount, total_amount, notes, deleted_at)
      `)
      .eq("id", contractId)
      .is("deleted_at", null)
      .single();

    if (error || !contract) {
      throw new Error("Không tìm thấy hợp đồng");
    }

    // Fetch paid amount from payments
    const { data: payments } = await supabase
      .from("payments")
      .select("amount")
      .eq("contract_id", contractId)
      .is("deleted_at", null);

    const paidAmount = (payments || []).reduce(
      (sum: number, p: { amount: number }) => sum + (p.amount || 0),
      0
    );

    // Map items to form format (filter soft-deleted)
    const activeItems = (contract.contract_items || []).filter((i: { deleted_at?: string | null }) => !i.deleted_at);
    const items: ContractItemFormData[] = activeItems.map(
      (item: Record<string, unknown>, index: number) => ({
        _tempId: `existing-${index}`,
        id: item.id as string,
        service_id: (item.service_id as string) || null,
        inventory_item_id: (item.inventory_item_id as string) || null,
        item_name: item.item_name as string,
        type: item.type as string,
        export_type: (item.export_type as string) || null,
        is_addon: (item.is_addon as boolean) || false,
        addon_category: (item.addon_category as string) || null,
        quantity: item.quantity as number,
        unit_price: item.unit_price as number,
        original_price: (item.original_price as number) || null,
        discount_amount: (item.discount_amount as number) || 0,
        total_amount: item.total_amount as number,
        notes: (item.notes as string) || "",
      })
    );

    return {
      contract,
      customer: contract.customers,
      items,
      paidAmount,
      updatedAt: contract.updated_at as string,
    };
  });
}
