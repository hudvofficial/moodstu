import type { ExportType } from "@/types/contract";
import type { withAuth } from "@/lib/auth_utils";

type AdminSupabase = Parameters<Parameters<typeof withAuth>[0]>[0];

type ReservationStatus = "reserved" | "in_use" | "rented";
const ACTIVE_RESERVATION_STATUSES: ReservationStatus[] = ["reserved", "in_use", "rented"];

export type DressContractItemInput = {
  id?: string | null;
  type: string;
  dress_id?: string | null;
  export_type?: string | null;
  notes?: string | null;
};

export function getReservationRange(input: {
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

export function uniqueDressIds(items: { type: string; dress_id?: string | null }[]) {
  return Array.from(
    new Set(
      items
        .filter((item) => item.type === "trang_phuc" && item.dress_id)
        .map((item) => item.dress_id as string),
    ),
  );
}

export function dressReservationFingerprint(input: {
  items: Array<{ id?: string | null; type: string; dress_id?: string | null; export_type?: string | null }>;
  formData: { contract_date?: string | null; work_date?: string | null; delivery_date?: string | null; status?: string | null };
}) {
  const range = getReservationRange(input.formData);
  const items = input.items
    .filter((item) => item.type === "trang_phuc" && item.dress_id)
    .map((item) => ({
      id: item.id || null,
      dress_id: item.dress_id || null,
      export_type: item.export_type || null,
    }))
    .sort((left, right) =>
      `${left.id || ""}:${left.dress_id || ""}`.localeCompare(
        `${right.id || ""}:${right.dress_id || ""}`,
      ),
    );

  return JSON.stringify({
    startDate: range.startDate,
    endDate: range.endDate,
    status: input.formData.status || null,
    items,
  });
}

export async function getExistingDressReservationFingerprint(
  supabase: AdminSupabase,
  contractId: string,
) {
  const [{ data: contract, error: contractError }, { data: items, error: itemError }] =
    await Promise.all([
      supabase
        .from("contracts")
        .select("contract_date, work_date, delivery_date, status")
        .eq("id", contractId)
        .is("deleted_at", null)
        .single(),
      supabase
        .from("contract_items")
        .select("id, type, dress_id, export_type")
        .eq("contract_id", contractId)
        .eq("type", "trang_phuc")
        .is("deleted_at", null),
    ]);

  if (contractError || !contract) {
    throw new Error(`Khong tim thay hop dong de so sanh trang phuc: ${contractError?.message || ""}`);
  }
  if (itemError) {
    throw new Error(`Loi tai trang phuc hien tai: ${itemError.message}`);
  }

  return dressReservationFingerprint({
    formData: contract,
    items: (items || []).map((item) => ({
      id: item.id,
      type: item.type || "trang_phuc",
      dress_id: item.dress_id,
      export_type: item.export_type,
    })),
  });
}

export async function validateDressAvailability(
  supabase: AdminSupabase,
  items: DressContractItemInput[],
  range: { startDate: string; endDate: string },
  currentContractId?: string | null,
) {
  const allDressIds = uniqueDressIds(items);
  if (allDressIds.length === 0) return;

  const { data, error } = await supabase
    .from("dress_reservations")
    .select("id, contract_id, dress_id")
    .in("dress_id", allDressIds)
    .in("status", ACTIVE_RESERVATION_STATUSES)
    .lte("start_date", range.endDate)
    .gte("end_date", range.startDate);

  if (error) throw new Error(`Loi kiem tra lich trang phuc: ${error.message}`);

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

export async function syncDressReservationsForContract(
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
