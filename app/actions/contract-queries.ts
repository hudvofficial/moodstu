"use server";

import { withAuth } from "@/lib/auth_utils";
import type { ContractItemFormData } from "@/types/contract-form";

// ═══════════════════════════════════════════
// Contract Queries — Form Support Actions
// searchCustomers, getContractForEdit, addon history
// Split from contracts.ts (lesson #7: max 250 lines)
// ═══════════════════════════════════════════

// ─── searchCustomers ─────────────────────────
// Autocomplete for customer selection in contract form
export async function searchCustomers(query: string) {
  if (!query || query.length < 2) return { success: true as const, data: [] };

  return withAuth(async (supabase) => {
    const sanitized = query
      .replace(/[%_]/g, "")
      .trim();

    const { data, error } = await supabase
      .from("customers")
      .select("id, full_name, phone, bride_name, groom_name, bride_phone, bride_height, bride_weight, bride_shoe_size, groom_phone, groom_height, groom_weight, groom_shoe_size, wedding_date, address")
      .is("deleted_at", null)
      .or(`full_name.ilike.%${sanitized}%,phone.ilike.%${sanitized}%`)
      .order("full_name")
      .limit(10);

    if (error) throw new Error(`Lỗi tìm khách hàng: ${error.message}`);
    return data || [];
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
        contract_items (*)
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

    // Map items to form format
    const items: ContractItemFormData[] = (contract.contract_items || []).map(
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

// ─── searchAddonHistory ──────────────────────
// Autocomplete for addon items in ItemModal
export async function searchAddonHistory(query: string) {
  if (!query || query.length < 2) return { success: true as const, data: [] };

  return withAuth(async (supabase) => {
    const sanitized = query.replace(/[%_]/g, "").trim();

    const { data, error } = await supabase
      .from("addon_history")
      .select("addon_name, addon_category, last_price, usage_count")
      .ilike("addon_name", `%${sanitized}%`)
      .order("usage_count", { ascending: false })
      .limit(10);

    if (error) throw new Error(`Lỗi tìm addon: ${error.message}`);
    return data || [];
  });
}

// ─── upsertAddonHistory ──────────────────────
// Track addon usage for future autocomplete + price suggestions
export async function upsertAddonHistory(
  addonName: string,
  addonCategory: string | null,
  price: number
) {
  return withAuth(async (supabase) => {
    const { data: existing } = await supabase
      .from("addon_history")
      .select("id, usage_count")
      .eq("addon_name", addonName)
      .eq("addon_category", addonCategory)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("addon_history")
        .update({
          last_price: price,
          usage_count: (existing.usage_count || 0) + 1,
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("addon_history").insert({
        addon_name: addonName,
        addon_category: addonCategory,
        last_price: price,
        usage_count: 1,
      });
    }

    return null;
  });
}

// ─── getAvailableServices ────────────────────
// Fetch services for ItemModal service picker
export async function getAvailableServices(search?: string) {
  return withAuth(async (supabase) => {
    let query = supabase
      .from("services")
      .select("id, service_name, service_type, category_id, selling_price, cost_price")
      .eq("status", "active")
      .order("service_name");

    if (search && search.trim()) {
      const sanitized = search.replace(/[%_]/g, "").trim();
      query = query.ilike("service_name", `%${sanitized}%`);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Lỗi tải dịch vụ: ${error.message}`);
    return data || [];
  });
}

// ─── quickCreateService ──────────────────────
// Quick create service from ItemModal
export async function quickCreateService(serviceData: {
  service_name: string;
  service_type: string;
  selling_price: number;
  cost_price?: number;
}) {
  return withAuth(async (supabase) => {
    const { data: service, error } = await supabase
      .from("services")
      .insert({
        service_name: serviceData.service_name.trim(),
        service_type: serviceData.service_type,
        selling_price: serviceData.selling_price,
        cost_price: serviceData.cost_price || 0,
        status: "active",
      })
      .select("id, service_name, selling_price, service_type")
      .single();

    if (error) throw error;
    return service;
  });
}
