"use server";

import { withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import { contractSubmissionSchema } from "@/lib/validations/contract.schema";
import { parseIntOrNull } from "@/lib/utils";
import { generateChecklists } from "@/app/actions/checklist-actions";
import type { ContractStatus } from "@/types/contract";

// ═══════════════════════════════════════════
// Contract Mutations — Submit + Status Update
// Max ~150 lines (lesson #7)
// Cancel/Delete/Reactivate → contract-lifecycle.ts
// ═══════════════════════════════════════════

// ─── getNextContractCode ─────────────────────
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

// ─── submitContract ──────────────────────────
// Atomic: contract upsert + items replace + payment (create only)
export async function submitContract(rawData: unknown) {
  const parsed = contractSubmissionSchema.safeParse(rawData);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false as const,
      error: `Dữ liệu không hợp lệ: ${firstIssue.message} (${firstIssue.path.join(".")})`,
    };
  }

  const data = parsed.data;

  return withAuth(async (supabase, userId) => {
    // ── Optimistic lock check (edit mode only) ──
    if (data.existingContractId && data.expectedUpdatedAt) {
      const { data: current } = await supabase
        .from("contracts")
        .select("updated_at")
        .eq("id", data.existingContractId)
        .single();

      if (current && current.updated_at !== data.expectedUpdatedAt) {
        throw new Error(
          "Hợp đồng đã được người khác cập nhật. Vui lòng tải lại trang."
        );
      }
    }

    // ── Build contract payload ──
    const contractPayload = {
      contract_code: data.formData.contract_code,
      customer_id: data.formData.customer_id,
      service_type: data.formData.service_type,
      transaction_type: data.formData.transaction_type || "hop_dong",
      contract_date: data.formData.contract_date || null,
      work_date: data.formData.work_date || null,
      delivery_date: data.formData.delivery_date || null,
      status: data.formData.status,
      description: data.formData.description || null,
      notes: data.formData.notes || null,
      total_amount: data.financials.total_amount,
      discount_amount: data.financials.discount_amount,
      paid_amount: data.financials.paid_amount,
      remaining_amount: data.financials.remaining_amount,
    };

    // ── Update customer with couple detail fields ──
    // Runs on both create & edit — always syncs latest info

    if (data.formData.customer_id) {
      await supabase
        .from("customers")
        .update({
          bride_name: data.formData.bride_name || null,
          groom_name: data.formData.groom_name || null,
          bride_phone: data.formData.bride_phone || null,
          bride_height: parseIntOrNull(data.formData.bride_height),
          bride_weight: parseIntOrNull(data.formData.bride_weight),
          bride_shoe_size: parseIntOrNull(data.formData.bride_shoe_size),
          groom_phone: data.formData.groom_phone || null,
          groom_height: parseIntOrNull(data.formData.groom_height),
          groom_weight: parseIntOrNull(data.formData.groom_weight),
          groom_shoe_size: parseIntOrNull(data.formData.groom_shoe_size),
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.formData.customer_id);
    }

    let contractId = data.existingContractId;

    if (contractId) {
      // ── UPDATE existing ──
      const { error } = await supabase
        .from("contracts")
        .update({
          ...contractPayload,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", contractId);
      if (error) throw new Error(`Lỗi cập nhật HĐ: ${error.message}`);

      // Delete old items → re-insert
      await supabase
        .from("contract_items")
        .delete()
        .eq("contract_id", contractId);
    } else {
      // ── CREATE new ──

      // [V1 PORT] Contract code race prevention (mutations.ts:34-56)
      // If another user created a contract with this code between
      // mount (preview) and submit, auto-regenerate up to 3 times.
      const MAX_CODE_RETRIES = 3;
      let finalCode = contractPayload.contract_code;

      for (let attempt = 0; attempt < MAX_CODE_RETRIES; attempt++) {
        const { data: existing } = await supabase
          .from("contracts")
          .select("id")
          .eq("contract_code", finalCode)
          .maybeSingle();

        if (!existing) break; // Code is unique, proceed

        if (attempt === MAX_CODE_RETRIES - 1) {
          throw new Error(
            `Mã hợp đồng trùng sau ${MAX_CODE_RETRIES} lần thử. Vui lòng tải lại trang.`
          );
        }

        // Auto-regenerate: fetch next available code
        const year = new Date().getFullYear();
        const prefix = `HĐ-${year}-`;
        const { data: latest } = await supabase
          .from("contracts")
          .select("contract_code")
          .like("contract_code", `${prefix}%`)
          .order("contract_code", { ascending: false })
          .limit(1)
          .maybeSingle();

        let nextNum = 1;
        if (latest?.contract_code) {
          const parts = latest.contract_code.split("-");
          const lastNum = parseInt(parts[2]);
          if (!isNaN(lastNum)) nextNum = lastNum + 1 + attempt;
        }
        finalCode = `${prefix}${nextNum.toString().padStart(4, "0")}`;
      }

      contractPayload.contract_code = finalCode;

      const { data: newContract, error } = await supabase
        .from("contracts")
        .insert({ ...contractPayload, created_by: userId })
        .select("id")
        .single();
      if (error) throw new Error(`Lỗi tạo HĐ: ${error.message}`);
      contractId = newContract.id;
    }

    // ── Insert items ──
    if (data.items.length > 0) {
      const itemRows = data.items.map((item) => ({
        contract_id: contractId,
        type: item.type,
        item_name: item.item_name,
        service_id: item.service_id || null,
        inventory_item_id: item.inventory_item_id || null,
        export_type: item.export_type || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        original_price: item.original_price ?? null,
        discount_amount: item.discount_amount || 0,
        total_amount: item.total_amount,
        is_addon: item.is_addon || false,
        addon_category: item.addon_category || null,
        notes: item.notes || null,
        added_by: userId,
      }));

      const { error: itemsError } = await supabase
        .from("contract_items")
        .insert(itemRows);
      if (itemsError)
        throw new Error(`Lỗi lưu chi tiết HĐ: ${itemsError.message}`);
    }

    // ── Payment receipt (CREATE only, amount > 0) ──
    if (!data.existingContractId && data.paymentInfo.amount > 0) {
      const { error: payError } = await supabase.from("payments").insert({
        contract_id: contractId,
        customer_id: data.formData.customer_id,
        amount: data.paymentInfo.amount,
        payment_method: data.paymentInfo.payment_method,
        payment_stage: data.paymentInfo.payment_stage || null,
        category_id: data.paymentInfo.category_id || null,
        created_by: userId,
      });
      if (payError)
        throw new Error(`Lỗi tạo phiếu thu: ${payError.message}`);
    }

    // ── Auto-generate checklists (CREATE only, non-blocking) ──
    if (!data.existingContractId && contractId && data.formData.service_type) {
      generateChecklists(contractId, data.formData.service_type).catch((err) => {
        console.error("[submitContract] Auto-generate checklists failed:", err);
      });
    }

    revalidatePath("/contracts");
    revalidatePath(`/contracts/${contractId}`);

    return {
      id: contractId,
      contract_code: data.formData.contract_code,
    };
  });
}

// ─── updateContractStatus ────────────────────
export async function updateContractStatus(
  id: string,
  newStatus: ContractStatus
) {
  return withAuth(async (supabase, userId) => {
    const { error } = await supabase
      .from("contracts")
      .update({
        status: newStatus,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;

    revalidatePath("/contracts");
    revalidatePath(`/contracts/${id}`);
    return null;
  });
}
