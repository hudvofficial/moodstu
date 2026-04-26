"use server";

import { requireContractAccess, withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import { fireAuditLog } from "@/lib/audit";
import { contractSubmissionSchema } from "@/lib/validations/contract.schema";
import { parseIntOrNull } from "@/lib/utils";
import { _generateChecklistsInternal } from "@/app/actions/checklist-actions";
import { _generateContractEventsInternal } from "@/app/actions/contract-event-actions";
import { _generateWorkTasksInternal } from "@/app/actions/work-task-actions";
import { syncContractEventsToGoogle } from "@/lib/contract-event-google-sync";
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

type AdminSupabase = Parameters<Parameters<typeof withAuth>[0]>[0];
type ReservationStatus = "reserved" | "in_use" | "rented";
const ACTIVE_RESERVATION_STATUSES: ReservationStatus[] = ["reserved", "in_use", "rented"];

type DressContractItemInput = {
  type: string;
  dress_id?: string | null;
};

function getReservationRange(input: {
  contract_date?: string | null;
  work_date?: string | null;
  delivery_date?: string | null;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const startDate = input.work_date || input.contract_date || today;
  const rawEndDate = input.delivery_date || input.work_date || input.contract_date || startDate;
  return {
    startDate,
    endDate: rawEndDate < startDate ? startDate : rawEndDate,
  };
}

function uniqueDressIds(items: DressContractItemInput[]) {
  return Array.from(
    new Set(
      items
        .filter((item) => item.type === "trang_phuc" && item.dress_id)
        .map((item) => item.dress_id as string),
    ),
  );
}

async function validateDressAvailability(
  supabase: AdminSupabase,
  items: DressContractItemInput[],
  range: { startDate: string; endDate: string },
  currentContractId?: string | null,
) {
  const allDressIds = uniqueDressIds(items);
  if (allDressIds.length === 0) return;

  // Batch: 1 query for ALL dress IDs (instead of N queries)
  const { data, error } = await supabase
    .from("dress_reservations")
    .select("id, contract_id, dress_id")
    .in("dress_id", allDressIds)
    .in("status", ACTIVE_RESERVATION_STATUSES)
    .lte("start_date", range.endDate)
    .gte("end_date", range.startDate);

  if (error) throw new Error(`Loi kiem tra lich trang phuc: ${error.message}`);

  // Check conflicts per dress in JS
  for (const dressId of allDressIds) {
    const conflict = (data || []).find(
      (row) => row.dress_id === dressId && row.contract_id !== currentContractId,
    );
    if (conflict) {
      throw new Error("Trang phuc da duoc dat trong khoang thoi gian nay");
    }
  }
}

async function refreshDressStatuses(supabase: AdminSupabase, dressIds: Iterable<string>) {
  for (const dressId of Array.from(new Set(dressIds)).filter(Boolean)) {
    const { data: activeReservations } = await supabase
      .from("dress_reservations")
      .select("status")
      .eq("dress_id", dressId)
      .in("status", ACTIVE_RESERVATION_STATUSES);

    const nextStatus = (activeReservations || []).some((row) =>
      row.status === "in_use" || row.status === "rented"
    )
      ? "rented"
      : (activeReservations || []).length > 0
        ? "reserved"
        : "available";

    await supabase
      .from("dresses")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", dressId);
  }
}

async function syncDressReservationsForContract(
  supabase: AdminSupabase,
  contractId: string,
) {
  const { data: contract, error: contractError } = await supabase
    .from("contracts")
    .select("id, customer_id, contract_date, work_date, delivery_date, status")
    .eq("id", contractId)
    .is("deleted_at", null)
    .single();

  if (contractError || !contract) {
    throw new Error(`Khong tim thay hop dong de dong bo trang phuc: ${contractError?.message || ""}`);
  }

  if (contract.status === "da_huy") return;

  const range = getReservationRange(contract);
  const { data: items, error: itemError } = await supabase
    .from("contract_items")
    .select("id, dress_id, export_type, notes")
    .eq("contract_id", contractId)
    .eq("type", "trang_phuc")
    .is("deleted_at", null)
    .not("dress_id", "is", null);

  if (itemError) throw new Error(`Loi tai trang phuc trong hop dong: ${itemError.message}`);

  const { data: reservations, error: reservationError } = await supabase
    .from("dress_reservations")
    .select("id, dress_id, contract_item_id, status")
    .eq("contract_id", contractId);

  if (reservationError) throw new Error(`Loi tai reservation trang phuc: ${reservationError.message}`);

  const activeReservations = (reservations || []).filter(
    (reservation) => !["returned", "cancelled"].includes(reservation.status || ""),
  );
  const usedReservationIds = new Set<string>();
  const affectedDressIds = new Set<string>();
  const now = new Date().toISOString();

  for (const item of items || []) {
    if (!item.dress_id) continue;
    affectedDressIds.add(item.dress_id);

    const existing =
      activeReservations.find((reservation) => reservation.contract_item_id === item.id) ||
      activeReservations.find(
        (reservation) =>
          reservation.dress_id === item.dress_id && !usedReservationIds.has(reservation.id),
      );

    if (existing) {
      usedReservationIds.add(existing.id);
      const { error } = await supabase
        .from("dress_reservations")
        .update({
          contract_item_id: item.id,
          customer_id: contract.customer_id,
          start_date: range.startDate,
          end_date: range.endDate,
          export_type: (item.export_type as ExportType) || null,
          updated_at: now,
        })
        .eq("id", existing.id);
      if (error) throw new Error(`Loi cap nhat reservation trang phuc: ${error.message}`);
      continue;
    }

    const { error } = await supabase.from("dress_reservations").insert({
      dress_id: item.dress_id,
      contract_id: contractId,
      contract_item_id: item.id,
      customer_id: contract.customer_id,
      start_date: range.startDate,
      end_date: range.endDate,
      export_type: (item.export_type as ExportType) || null,
      status: "reserved",
      notes: item.notes || null,
      created_at: now,
      updated_at: now,
    });
    if (error) throw new Error(`Loi tao reservation trang phuc: ${error.message}`);
  }

  const removedReservations = activeReservations.filter(
    (reservation) => !usedReservationIds.has(reservation.id),
  );

  if (removedReservations.length > 0) {
    for (const reservation of removedReservations) {
      affectedDressIds.add(reservation.dress_id);
    }

    const { error } = await supabase
      .from("dress_reservations")
      .update({ status: "cancelled", updated_at: now })
      .in("id", removedReservations.map((reservation) => reservation.id));

    if (error) throw new Error(`Loi huy reservation trang phuc cu: ${error.message}`);
  }

  await refreshDressStatuses(supabase, affectedDressIds);
}

async function upsertAddonHistoryItems(
  supabase: AdminSupabase,
  items: Array<{
    item_name: string;
    is_addon?: boolean | null;
    addon_category?: string | null;
    unit_price?: number | null;
  }>,
) {
  // Collect addon items that need history tracking
  const addonItems = items.filter(
    (item) => item.is_addon && item.item_name.trim(),
  );
  if (addonItems.length === 0) return;

  // Build lookup keys for batch SELECT
  const lookupKeys = addonItems.map((item) => ({
    name: item.item_name.trim(),
    category: item.addon_category || "khac",
    price: item.unit_price || 0,
  }));

  // Batch SELECT: get all existing records at once
  const { data: existingRecords } = await supabase
    .from("addon_history")
    .select("id, addon_name, addon_category, usage_count")
    .in("addon_name", lookupKeys.map((k) => k.name));

  const existingMap = new Map(
    (existingRecords || []).map((r) => [`${r.addon_name}::${r.addon_category}`, r]),
  );

  const now = new Date().toISOString();
  const toInsert: Array<Record<string, unknown>> = [];
  const updatePromises: Array<PromiseLike<{ error: { message?: string } | null }>> = [];

  for (const key of lookupKeys) {
    const existing = existingMap.get(`${key.name}::${key.category}`);
    if (existing) {
      updatePromises.push(
        supabase
          .from("addon_history")
          .update({
            last_price: key.price,
            usage_count: (existing.usage_count || 0) + 1,
            last_used_at: now,
            updated_at: now,
          })
          .eq("id", existing.id),
      );
    } else {
      toInsert.push({
        addon_name: key.name,
        addon_category: key.category,
        last_price: key.price,
        usage_count: 1,
        last_used_at: now,
      });
    }
  }

  // Batch INSERT new + parallel UPDATE existing
  const results = await Promise.all([
    ...(toInsert.length > 0 ? [supabase.from("addon_history").insert(toInsert)] : []),
    ...updatePromises,
  ]);

  const failed = results.find((result) => result.error);
  if (failed?.error) {
    throw new Error(failed.error.message || "Loi cap nhat lich su phat sinh");
  }
}

async function ensureContractAutomation(
  supabase: AdminSupabase,
  userId: string,
  contractId: string,
  serviceType: ServiceType,
  workDate?: string | null,
) {
  // Events must complete first (tasks depend on events)
  const eventResult = await _generateContractEventsInternal(supabase, contractId, serviceType, workDate);

  // Checklists + tasks can run in parallel (both independent)
  await Promise.all([
    _generateChecklistsInternal(supabase, contractId, serviceType),
    _generateWorkTasksInternal(supabase, contractId, userId),
    syncContractEventsToGoogle(supabase, eventResult.eventIds || []).catch((syncError) => {
      console.warn("Best effort contract events Google sync failed:", syncError);
    }),
  ]);
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

  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    const contractPayload = {
      contract_code: data.formData.contract_code,
      customer_id: data.formData.customer_id,
      service_type: data.formData.service_type,
      transaction_type: data.formData.transaction_type || "hop_dong",
      assigned_to: data.formData.assigned_to || null,
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

    if (isEdit || data.formData.assigned_to) {
      const { error: assignmentError } = await supabase
        .from("contracts")
        .update({
          assigned_to: data.formData.assigned_to || null,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", contractId)
        .is("deleted_at", null);

      if (assignmentError) {
        throw new Error(`Loi luu nhan vien phu trach: ${assignmentError.message}`);
      }
    }

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

    // The core contract is already committed by save_contract_atomic.
    // Post-save work must never make the UI report "save failed" for a saved contract.
    const postSaveWarnings: string[] = [];
    await Promise.all([
      runPostSaveTask(
        "Đồng bộ đặt trang phục",
        () => syncDressReservationsForContract(supabase, contractId),
        postSaveWarnings,
      ),
      runPostSaveTask(
        "Tự động tạo lịch trình/checklist/công việc",
        () => ensureContractAutomation(
          supabase,
          userId,
          contractId,
          data.formData.service_type,
          data.formData.work_date || null,
        ),
        postSaveWarnings,
      ),
      runPostSaveTask(
        "Cập nhật lịch sử phát sinh",
        () => upsertAddonHistoryItems(supabase, data.items),
        postSaveWarnings,
      ),
    ]);

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
      warnings: postSaveWarnings,
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
