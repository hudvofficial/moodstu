"use server";

import { requireContractAccess, withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import { fireAuditLog } from "@/lib/audit";
import { contractSubmissionSchema } from "@/lib/validations/contract.schema";
import { parseIntOrNull } from "@/lib/utils";
import { generateChecklists } from "@/app/actions/checklist-actions";
import type { ContractStatus } from "@/types/contract";

type SaveContractResult = {
  id: string;
  contract_code: string;
  paid_amount: number;
  remaining_amount: number;
  payment_status: string;
};

export async function createContract(rawData: unknown) {
  const parsed = contractSubmissionSchema.safeParse(rawData);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false as const,
      error: `Du lieu khong hop le: ${firstIssue.message} (${firstIssue.path.join(".")})`,
    };
  }

  const data = parsed.data;
  const isEdit = Boolean(data.existingContractId);

  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

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
    };

    const customerPayload = {
      customer_id: data.formData.customer_id,
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
    };

    const itemPayload = data.items.map((item) => ({
      type: item.type,
      item_name: item.item_name,
      service_id: item.service_id || null,
      dress_id: item.dress_id || null,
      export_type: item.export_type || null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      original_price: item.original_price ?? null,
      discount_amount: item.discount_amount || 0,
      total_amount: item.total_amount,
      is_addon: item.is_addon || false,
      addon_category: item.addon_category || null,
      notes: item.notes || null,
    }));

    const initialPayment =
      !isEdit && data.paymentInfo.amount > 0
        ? {
            amount: data.paymentInfo.amount,
            payment_method: data.paymentInfo.payment_method,
            payment_stage: data.paymentInfo.payment_stage || null,
            category_id: data.paymentInfo.category_id || null,
            payment_date:
              data.formData.contract_date ||
              new Date().toISOString().slice(0, 10),
          }
        : null;

    const { data: rpcData, error } = await supabase.rpc("save_contract_atomic", {
      p_contract: contractPayload,
      p_customer: customerPayload,
      p_items: itemPayload,
      p_initial_payment: initialPayment,
      p_existing_contract_id: data.existingContractId || null,
      p_expected_updated_at: data.expectedUpdatedAt || null,
      p_actor_id: userId,
    });

    if (error) {
      throw new Error(`Loi luu hop dong: ${error.message}`);
    }

    const result = rpcData as SaveContractResult;
    const contractId = result.id;

    if (!isEdit && contractId && data.formData.service_type) {
      generateChecklists(contractId, data.formData.service_type).catch((err) => {
        console.error("[createContract] Auto-generate checklists failed:", err);
      });
    }

    revalidatePath("/contracts");
    revalidatePath(`/contracts/${contractId}`);

    fireAuditLog({
      action: isEdit ? "UPDATE" : "CREATE",
      tableName: "contracts",
      recordId: contractId,
      description: isEdit
        ? `Cap nhat hop dong: ${result.contract_code}`
        : `Tao hop dong: ${result.contract_code}`,
      newData: {
        ...contractPayload,
        paid_amount: result.paid_amount,
        remaining_amount: result.remaining_amount,
        payment_status: result.payment_status,
      },
      source: "server_action",
    });

    return {
      id: contractId,
      contract_code: result.contract_code,
    };
  });
}

const VALID_TRANSITIONS: Record<ContractStatus, ContractStatus[]> = {
  cho_xu_ly: ["dang_thuc_hien", "da_huy"],
  dang_thuc_hien: ["hoan_thanh", "da_huy"],
  hoan_thanh: [],
  da_huy: ["cho_xu_ly"],
};

export async function updateContractStatus(
  id: string,
  newStatus: ContractStatus,
  adminOverride = false,
) {
  return withAuth(async (supabase, userId) => {
    const access = await requireContractAccess(supabase, userId);

    if (adminOverride && !["admin", "manager"].includes(access.role)) {
      throw new Error("Ban khong co quyen bo qua quy trinh trang thai");
    }

    const { data: current, error: fetchErr } = await supabase
      .from("contracts")
      .select("status")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (fetchErr || !current) {
      throw new Error("Khong tim thay hop dong");
    }

    const currentStatus = current.status as ContractStatus;

    if (!adminOverride) {
      const allowed = VALID_TRANSITIONS[currentStatus] || [];
      if (!allowed.includes(newStatus)) {
        throw new Error(
          `Khong the chuyen tu "${currentStatus}" sang "${newStatus}". Trang thai hop le: ${
            allowed.length > 0 ? allowed.join(", ") : "khong co"
          }`,
        );
      }
    }

    const { error } = await supabase
      .from("contracts")
      .update({
        status: newStatus,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .is("deleted_at", null);

    if (error) throw error;

    revalidatePath("/contracts");
    revalidatePath(`/contracts/${id}`);

    fireAuditLog({
      action: "UPDATE",
      tableName: "contracts",
      recordId: id,
      description: `Chuyen trang thai hop dong: ${currentStatus} -> ${newStatus}`,
      source: "server_action",
    });

    return null;
  });
}
