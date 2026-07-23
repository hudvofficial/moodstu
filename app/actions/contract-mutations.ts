"use server";

import {
  requireContractDestructiveAccess,
  requireContractWriteAccess,
  withAuth,
} from "@/lib/auth_utils";
import { after } from "next/server";
import { fireAuditLog } from "@/lib/audit";
import { profileAction } from "@/lib/action-profiler";
import { contractSubmissionSchema } from "@/lib/validations/contract.schema";
import { parseIntOrNull } from "@/lib/utils";
import { _generateChecklistsInternal } from "@/app/actions/checklist-actions";
import {
  _generateContractEventsInternal,
  _reconcileContractScheduleInternal,
} from "@/app/actions/contract-event-actions";
import { summarizeContractSchedules } from "@/lib/contracts/contract-schedule";
import { syncContractEventsToGoogle } from "@/lib/contract-event-google-sync";
import { createAdminClient } from "@/lib/supabase/server";
import { invalidateContractPaths } from "@/lib/server-cache-invalidation";
import type { ContractStatus, ExportType, ServiceType } from "@/types/contract";

type SaveContractResult = {
  id: string;
  contract_code: string;
  paid_amount: number;
  remaining_amount: number;
  payment_status: string;
};

async function runPostSaveTask(
  label: string,
  task: () => Promise<unknown>,
  warnings: string[],
) {
  try {
    await task();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    warnings.push(`${label}: ${message}`);
    console.warn(`[contracts.createContract] post-save task failed: ${label}`, error);
  }
}

function schedulePostSaveTask(label: string, task: () => Promise<unknown>) {
  after(async () => {
    try {
      await task();
    } catch (error) {
      console.warn(`[contracts.postSave] background task failed: ${label}`, error);
    }
  });
}

type AdminSupabase = Parameters<Parameters<typeof withAuth>[0]>[0];
import {
  dressReservationFingerprint,
  getExistingDressReservationFingerprint,
  getReservationRange,
  syncDressReservationsForContract,
  uniqueDressIds,
  validateDressAvailability,
} from "@/lib/services/dress-sync-service";
import { upsertAddonHistoryItems } from "@/lib/services/addon-sync-service";

async function ensureContractAutomation(
  supabase: AdminSupabase,
  contractId: string,
  serviceType: ServiceType,
  workDate?: string | null,
  weddingDate?: string | null,
) {
  // Events must complete first (tasks depend on events)
  const eventResult = await _generateContractEventsInternal(supabase, contractId, serviceType, workDate, weddingDate);

  await _generateChecklistsInternal(supabase, contractId, serviceType);
  return eventResult.eventIds || [];
}

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

  return profileAction("contracts.createContract", () => withAuth(async (supabase, userId) => {
    await requireContractWriteAccess(supabase, userId);

    const scheduleSummary = data.schedules
      ? summarizeContractSchedules(data.formData.service_type, data.schedules)
      : null;

    const contractPayload = {
      contract_code: data.formData.contract_code,
      customer_id: data.formData.customer_id,
      service_type: data.formData.service_type,
      transaction_type: data.formData.transaction_type || "hop_dong",
      assigned_to: data.formData.assigned_to || null,
      contract_date: data.formData.contract_date || null,
      work_date: scheduleSummary?.primaryWorkDate || data.formData.work_date || null,
      delivery_date: data.formData.delivery_date || null,
      status: data.formData.status,
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
      wedding_date: scheduleSummary?.primaryWeddingDate || data.weddingDate || null,
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
            notes: data.paymentInfo.notes || null,
            payment_date:
              data.formData.contract_date ||
              new Date().toISOString().slice(0, 10),
          }
        : null;

    await validateDressAvailability(
      supabase,
      data.items,
      getReservationRange(data.formData),
      data.existingContractId || null,
    );

    const previousDressFingerprint =
      isEdit && data.existingContractId
        ? await getExistingDressReservationFingerprint(supabase, data.existingContractId)
        : null;
    const nextDressFingerprint = dressReservationFingerprint({
      formData: data.formData,
      items: data.items,
    });

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

    // Logic cập nhật assigned_to và wedding_date đã được gom vào save_contract_atomic RPC

    if (!isEdit && data.paymentInfo.amount > 0 && data.paymentInfo.notes) {
      const { data: latestPayment, error: paymentFetchError } = await supabase
        .from("payments")
        .select("id")
        .eq("contract_id", contractId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (paymentFetchError) {
        throw new Error(`Loi tai phieu thu ban dau: ${paymentFetchError.message}`);
      }

      if (latestPayment?.id) {
        const { error: paymentNoteError } = await supabase
          .from("payments")
          .update({ notes: data.paymentInfo.notes })
          .eq("id", latestPayment.id);

        if (paymentNoteError) {
          throw new Error(`Loi luu ghi chu thanh toan: ${paymentNoteError.message}`);
        }
      }
    }

    const postSaveWarnings: string[] = [];
    const shouldSyncDressReservations = isEdit
      ? previousDressFingerprint !== nextDressFingerprint
      : uniqueDressIds(data.items).length > 0;

    if (shouldSyncDressReservations) {
      schedulePostSaveTask("Dong bo dat trang phuc", async () => {
        const adminSupabase = await createAdminClient();
        await syncDressReservationsForContract(adminSupabase, contractId);
      });
    }

    if (data.schedules) {
      const scheduleResult = await _reconcileContractScheduleInternal(
        supabase,
        contractId,
        data.formData.service_type,
        data.schedules,
      );

      if (!isEdit) {
        await runPostSaveTask(
          "Tạo checklist hợp đồng",
          () => _generateChecklistsInternal(supabase, contractId, data.formData.service_type),
          postSaveWarnings,
        );
      }

      const idsToSync = [...scheduleResult.eventIds, ...scheduleResult.deletedEventIds];
      if (idsToSync.length > 0) {
        schedulePostSaveTask("Đồng bộ lịch trình với Google", async () => {
          const adminSupabase = await createAdminClient();
          await syncContractEventsToGoogle(adminSupabase, idsToSync);
        });
      }
    } else if (!isEdit) {
      schedulePostSaveTask("Tao lich trinh/checklist & Google Sync", async () => {
        const adminSupabase = await createAdminClient();
        const eventIds = await ensureContractAutomation(
          adminSupabase,
          contractId,
          data.formData.service_type,
          data.formData.work_date || null,
          data.weddingDate || null,
        );
        if (eventIds.length > 0) {
          await syncContractEventsToGoogle(adminSupabase, eventIds);
        }
      });
    }

    if (data.items.some((item) => item.is_addon && item.item_name.trim())) {
      const addonItems = data.items.map((item) => ({
        item_name: item.item_name,
        is_addon: item.is_addon,
        addon_category: item.addon_category,
        unit_price: item.unit_price,
      }));
      schedulePostSaveTask("Addon history", async () => {
        const adminSupabase = await createAdminClient();
        await upsertAddonHistoryItems(adminSupabase, addonItems);
      });
    }

    invalidateContractPaths(contractId, {
      list: true,
      detail: true,
      finance: { receipts: true, cashflow: true },
      dresses: shouldSyncDressReservations,
      calendar: Boolean(data.schedules) || !isEdit,
      dashboard: true,
    });

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
      warnings: postSaveWarnings,
    };
  }));
}

const VALID_TRANSITIONS: Record<ContractStatus, ContractStatus[]> = {
  cho_xu_ly: ["dang_thuc_hien", "hoan_thanh", "da_huy"],
  dang_thuc_hien: ["hoan_thanh", "da_huy"],
  hoan_thanh: ["dang_thuc_hien"],
  da_huy: ["cho_xu_ly"],
};

export async function updateContractStatus(
  id: string,
  newStatus: ContractStatus,
  adminOverride = false,
  confirmedWarnings = false,
) {
  return withAuth(async (supabase, userId) => {
    const access = await requireContractDestructiveAccess(supabase, userId);

    if (adminOverride && !["admin", "manager"].includes(access.role)) {
      throw new Error("Ban khong co quyen bo qua quy trinh trang thai");
    }

    const { data: current, error: fetchErr } = await supabase
      .from("contracts")
      .select("status, remaining_amount")
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

      if (newStatus === "hoan_thanh" && !confirmedWarnings) {
        // Cảnh báo MỀM (không cấm cứng — studio có thể hoàn thành độc lập với
        // tài chính/task, quyết định cũ giữ nguyên). Server là nguồn chân lý:
        // số nợ + việc dở lấy TƯƠI từ DB, mọi UI đều phải hiện confirm rồi gọi
        // lại với confirmedWarnings=true — hết cửa lách ở từng nút UI riêng lẻ.
        const debt = Number(current.remaining_amount) || 0;
        const { count: unfinishedTasks } = await supabase
          .from("work_tasks")
          .select("id", { count: "exact", head: true })
          .eq("contract_id", id)
          .not("status", "in", "(hoan_thanh,da_huy)");

        if (debt > 0 || (unfinishedTasks || 0) > 0) {
          return {
            needsConfirmation: true as const,
            debt,
            unfinishedTasks: unfinishedTasks || 0,
          };
        }
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

    invalidateContractPaths(id, {
      list: true,
      detail: true,
      finance: { receipts: true, cashflow: true },
      dresses: true,
      dashboard: true,
    });

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
