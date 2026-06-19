"use server";

/**
 * 🔍 Contract Queries (V2)
 *
 * All READ actions for the contract module.
 * Logic: withAuth() -> Supabase -> Result.
 */

import { requireContractAccess, withAuth, withAuthRead } from "@/lib/auth_utils";
import { profileAction } from "@/lib/action-profiler";
import { isMissingRpcError } from "@/lib/finance-utils";
import type {
  ContractFilters,
  ContractStats,
  PaymentPlan,
  Contract,
  ContractEvent,
  WorkTask,
  ContractChecklist,
  Payment,
  DressReservationRow,
  PrintingOrder,
} from "@/types/contract";
import type { ContractItemFormData } from "@/types/contract-form";
import { mapPaymentPlans } from "@/lib/contracts/payment-plans";

// ─── Helpers ─────────────────────────────────

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function sanitizeSearch(raw: string): string {
  return raw
    .replace(/[,()]/g, " ")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .trim();
}

async function findMatchingCustomerIds(
  supabase: Parameters<Parameters<typeof withAuth>[0]>[0],
  safeSearch: string,
) {
  if (!safeSearch) return [] as string[];

  const { data, error } = await supabase
    .from("customers")
    .select("id")
    .or(
      [
        `full_name.ilike.%${safeSearch}%`,
        `customer_code.ilike.%${safeSearch}%`,
        `phone.ilike.%${safeSearch}%`,
        `bride_name.ilike.%${safeSearch}%`,
        `groom_name.ilike.%${safeSearch}%`,
      ].join(","),
    )
    .limit(300);

  if (error) {
    throw new Error(`Loi tim khach hang: ${error.message}`);
  }

  return (data || []).map((customer: { id: string }) => customer.id);
}

function getSortConfig(sort?: string) {
  switch (sort) {
    case "oldest":
      return { column: "created_at", ascending: true };
    case "amount_desc":
      return { column: "total_amount", ascending: false };
    case "amount_asc":
      return { column: "total_amount", ascending: true };
    default:
      return { column: "created_at", ascending: false };
  }
}

function assertQueryOk(
  label: string,
  result: { error: { message?: string } | null },
) {
  if (result.error) {
    throw new Error(`${label}: ${result.error.message || "Unknown query error"}`);
  }
}

type ContractDetailRpcPayload = {
  contract?: Contract | null;
  events?: ContractEvent[] | null;
  work_tasks?: WorkTask[] | null;
  checklists?: ContractChecklist[] | null;
  payments?: Payment[] | null;
  reservations?: DressReservationRow[] | null;
  print_orders?: PrintingOrder[] | null;
  payment_plans?: PaymentPlan[] | null;
};

type ContractListPayload = {
  contracts: Contract[];
  total: number;
  page: number;
  pageSize: number;
};

function buildChecklistSummary(items: Partial<ContractChecklist>[]) {
  const total = items.length;
  const done = items.filter((item) => item.is_completed === true).length;
  return {
    total,
    done,
    missing: Math.max(0, total - done),
  };
}

function attachChecklistSummaryFromArray(contract: Contract) {
  if (!Array.isArray(contract.contract_checklists)) return contract;

  return {
    ...contract,
    checklist_summary: buildChecklistSummary(
      contract.contract_checklists as Partial<ContractChecklist>[],
    ),
  };
}

function normalizePrintOrders(orders: unknown[]): PrintingOrder[] {
  return (orders || []).map((po: any) => {
    let rawItems = po?.items;
    if (typeof rawItems === "string") {
      try {
        rawItems = JSON.parse(rawItems);
      } catch {
        rawItems = [];
      }
    }

    const parsedItems = Array.isArray(rawItems)
      ? rawItems.map((it: any) => ({
          item_id: it.item_id ?? it.id,
          name: it.name || it.item_name || "",
          quantity: it.quantity || 1,
          unitPrice: it.unitPrice ?? it.unit_price ?? 0,
        }))
      : [];

    return { ...po, items: parsedItems } as PrintingOrder;
  });
}

async function getContractListFromRpc(
  supabase: Parameters<Parameters<typeof withAuth>[0]>[0],
  filters: ContractFilters,
): Promise<ContractListPayload | null> {
  const page = Math.max(1, filters.page || 1);

  const { data, error } = await supabase.rpc("get_contract_list_v2", {
    p_status: filters.status || "all",
    p_search: filters.search ? sanitizeSearch(filters.search) : "",
    p_service_type: filters.service || "all",
    p_sort: filters.sort || "newest",
    p_time_filter: filters.time || "all",
    p_start_date: filters.startDate || null,
    p_end_date: filters.endDate || null,
    p_page: page,
    p_page_size: 20,
  });

  if (error) {
    console.warn("[contracts.getContractList] RPC fallback:", error.message);
    return null;
  }

  const payload = data as { contracts: Contract[]; total: number; page: number; pageSize: number } | null;
  if (!payload || !Array.isArray(payload.contracts)) {
    return null;
  }

  return {
    contracts: (payload.contracts as Contract[]).map(
      attachChecklistSummaryFromArray,
    ) as Contract[],
    total: Number(payload.total) || 0,
    page: Number(payload.page) || page,
    pageSize: Number(payload.pageSize) || 20,
  };
}

// ─── getNextContractCode ─────────────────────

export async function getNextContractCode() {
  // ⚡ withAuthRead: read-only preview — mã thật vẫn do server sinh lúc submit.
  return withAuthRead(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

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

// ─── getContractList ──────────────────────────

export async function getContractList(filters: ContractFilters) {
  // ⚡ withAuthRead: local JWT verify thay vì network getUser() — cùng pattern
  // getContractDetail. Middleware đã gate mọi request bằng getClaims().
  return profileAction("contracts.getContractList", () => withAuthRead(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    const rpcPayload = await getContractListFromRpc(supabase, filters);
    if (rpcPayload) return rpcPayload;

    const page = Math.max(1, filters.page || 1);
    const pageSize = 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const sortConfig = getSortConfig(filters.sort);

    let query = supabase
      .from("contracts")
      .select(
        `id, contract_code, customer_id, service_type,
         transaction_type, contract_date, work_date, delivery_date,
         total_amount, discount_amount, paid_amount,
         remaining_amount, status, payment_status,
         description, updated_at, created_at,
         customers (id, customer_code, full_name, phone, address, bride_name, groom_name)`,
        { count: "estimated" }
      )
      .is("deleted_at", null)
      .order(sortConfig.column, { ascending: sortConfig.ascending })
      .range(from, to);

    if (filters.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    } else {
      query = query.neq("status", "da_huy");
    }

    if (filters.service && filters.service !== "all")
      query = query.eq("service_type", filters.service);

    if (filters.search) {
      const safe = sanitizeSearch(filters.search);
      if (safe) {
        const matchingCustomerIds = await findMatchingCustomerIds(supabase, safe);
        const searchClauses = [`contract_code.ilike.%${safe}%`];

        if (matchingCustomerIds.length > 0) {
          searchClauses.push(`customer_id.in.(${matchingCustomerIds.join(",")})`);
        }

        query = query.or(searchClauses.join(","));
      }
    }

    if (filters.time && filters.time !== "all") {
      const now = new Date();
      let start: Date | null = null;
      let end: Date | null = null;
      switch (filters.time) {
        case "this_month":
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          break;
        case "last_month":
          start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          end = new Date(now.getFullYear(), now.getMonth(), 0);
          break;
        case "this_year":
          start = new Date(now.getFullYear(), 0, 1);
          end = new Date(now.getFullYear(), 11, 31);
          break;
      }
      if (start && end)
        query = query
          .gte("contract_date", toDateString(start))
          .lte("contract_date", toDateString(end));
    }

    if (filters.startDate) {
      query = query.gte("contract_date", filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte("contract_date", filters.endDate);
    }

    const { data, count, error } = await query;
    if (error) throw error;
    const contracts = (data || []) as unknown as Contract[];
    const contractIds = contracts
      .map((contract) => contract.id)
      .filter((id): id is string => typeof id === "string");

    if (contractIds.length > 0) {
      const [tasksResult, checklistsResult, notesResult] = await Promise.all([
        supabase
          .from("work_tasks")
          .select("id, contract_id, work_type, status, deadline")
          .in("contract_id", contractIds),
        supabase
          .from("contract_checklists")
          .select("id, contract_id, event_stage, category, item_name, is_completed, created_at, updated_at")
          .in("contract_id", contractIds),
        // 10 notes mới nhất/HĐ — đủ cho drawer preview, không xử lý "10 per group" ở fallback (rare path);
        // limit 200 tổng để giữ payload nhẹ, sort desc theo created_at để lấy notes mới trước.
        supabase
          .from("contract_notes")
          .select("id, contract_id, content, created_by, created_at")
          .in("contract_id", contractIds)
          .order("created_at", { ascending: false })
          .limit(200),
      ]);

      assertQueryOk("Loi tai tien do cong viec", tasksResult);
      assertQueryOk("Loi tai checklist hop dong", checklistsResult);
      assertQueryOk("Loi tai ghi chu hop dong", notesResult);

      const tasksByContract = new Map<string, WorkTask[]>();
      for (const task of (tasksResult.data || []) as WorkTask[]) {
        const contractId = task.contract_id;
        if (typeof contractId !== "string") continue;
        const list = tasksByContract.get(contractId) || [];
        list.push(task);
        tasksByContract.set(contractId, list);
      }

      const checklistsByContract = new Map<string, ContractChecklist[]>();
      for (const item of (checklistsResult.data || []) as ContractChecklist[]) {
        const contractId = item.contract_id;
        if (typeof contractId !== "string") continue;
        const list = checklistsByContract.get(contractId) || [];
        list.push(item);
        checklistsByContract.set(contractId, list);
      }

      const notesByContract = new Map<string, Array<{ id: string; content: string; created_by: string; created_at: string }>>();
      for (const note of (notesResult.data || []) as Array<{ id: string; contract_id: string; content: string; created_by: string; created_at: string }>) {
        const contractId = note.contract_id;
        if (typeof contractId !== "string") continue;
        const list = notesByContract.get(contractId) || [];
        if (list.length < 10) {
          // Per-HĐ cap = 10 (khớp RPC v2 LIMIT 10).
          list.push({ id: note.id, content: note.content, created_by: note.created_by, created_at: note.created_at });
          notesByContract.set(contractId, list);
        }
      }

      for (const contract of contracts) {
        const contractId = contract.id;
        if (typeof contractId !== "string") continue;
        const checklists = checklistsByContract.get(contractId) || [];
        contract.work_tasks = tasksByContract.get(contractId) || [];
        contract.contract_checklists = checklists;
        contract.checklist_summary = buildChecklistSummary(checklists);
        (contract as Contract & { contract_notes?: typeof notesByContract extends Map<string, infer V> ? V : never }).contract_notes =
          notesByContract.get(contractId) || [];
      }
    }

    return { contracts, total: count || 0, page, pageSize };
  }));
}

// ─── getContractStats ────────────────────────

export async function getContractStats() {
  // ⚡ withAuthRead: local JWT verify — xem ghi chú ở getContractList.
  return profileAction("contracts.getContractStats", () => withAuthRead(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    const { data: rpcData, error: rpcError } = await supabase
      .rpc("contract_stats")
      .maybeSingle();

    if (!rpcError && rpcData) {
      const row = rpcData as {
        total: number;
        active: number;
        pending: number;
        completed: number;
        revenue: number;
        outstanding: number;
        growth_total: number;
      };
      return {
        total: Number(row.total) || 0,
        active: Number(row.active) || 0,
        pending: Number(row.pending) || 0,
        completed: Number(row.completed) || 0,
        revenue: Number(row.revenue) || 0,
        outstanding: Number(row.outstanding) || 0,
        growth: {
          total: Number(row.growth_total) || 0,
          active: 0,
          pending: 0,
          completed: 0,
        },
      } satisfies ContractStats;
    }

    // Nếu RPC lỗi (do đổi schema, thiếu function, runtime SQL lỗi...), ta in log cảnh báo 
    // và chạy ngay xuống fallback để không bao giờ quăng lỗi cứng về cho UI
    if (rpcError) {
      console.warn("[getContractStats] RPC contract_stats error, falling back:", rpcError.message);
    }

    // Try simple fallback RPC (single scan, no revenue/outstanding)
    const { data: simpleData, error: simpleError } = await supabase
      .rpc("contract_stats_simple")
      .maybeSingle();

    if (!simpleError && simpleData) {
      const row = simpleData as {
        total: number;
        active: number;
        pending: number;
        completed: number;
        this_month: number;
        last_month: number;
      };
      const growth = row.last_month > 0
        ? Math.round((row.this_month - row.last_month) / row.last_month * 100)
        : 0;
      return {
        total: Number(row.total) || 0,
        active: Number(row.active) || 0,
        pending: Number(row.pending) || 0,
        completed: Number(row.completed) || 0,
        revenue: 0,
        outstanding: 0,
        growth: { total: growth, active: 0, pending: 0, completed: 0 },
      } satisfies ContractStats;
    }

    console.warn("[getContractStats] All RPCs failed, using 6-query fallback.");

    // Last resort: 6 separate COUNT queries (parallelized)
    const [
      { count: totalCount },
      { count: activeCount },
      { count: pendingCount },
      { count: completedCount },
    ] = await Promise.all([
      supabase.from("contracts").select("id", { count: "exact", head: true }).is("deleted_at", null).neq("status", "da_huy"),
      supabase.from("contracts").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("status", "dang_thuc_hien"),
      supabase.from("contracts").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("status", "cho_xu_ly"),
      supabase.from("contracts").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("status", "hoan_thanh"),
    ]);

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [{ count: thisMonthCount }, { count: lastMonthCount }] = await Promise.all([
      supabase.from("contracts").select("id", { count: "exact", head: true }).is("deleted_at", null).neq("status", "da_huy").gte("created_at", thisMonthStart.toISOString()),
      supabase.from("contracts").select("id", { count: "exact", head: true }).is("deleted_at", null).neq("status", "da_huy").gte("created_at", lastMonthStart.toISOString()).lte("created_at", lastMonthEnd.toISOString()),
    ]);

    const growth = lastMonthCount && lastMonthCount > 0
      ? Math.round(((thisMonthCount || 0) - lastMonthCount) / lastMonthCount * 100)
      : 0;

    const stats: ContractStats = {
      total: totalCount || 0,
      active: activeCount || 0,
      pending: pendingCount || 0,
      completed: completedCount || 0,
      revenue: 0,
      outstanding: 0,
      growth: { total: growth, active: 0, pending: 0, completed: 0 },
    };
    return stats;
  }));
}

// ─── getContractDetail ────────────────────────

export async function getContractDetail(id: string) {
  // ⚡ withAuthRead: local JWT verify (getClaims) instead of network getUser() —
  // cuts a redundant GoTrue round-trip (~200-800ms on mobile) from the detail load.
  // Authorization still enforced by requireContractAccess (employee/role DB lookup).
  return profileAction("contracts.getContractDetail", () => withAuthRead(async (supabase, userId) => {
    // ⚡ A/B test: v3 (single-query LATERAL) vs v2 (sequential)
    // Feature flag: NEXT_PUBLIC_RPC_V3=true to enable v3
    const useV3 = process.env.NEXT_PUBLIC_RPC_V3 === "true";
    const rpcFunction = useV3 ? "get_contract_detail_v3" : "get_contract_detail_v2";

    // ⚡ Access-check (1 RTT employees) + RPC chạy song song — cắt 1 RTT nối đuôi.
    // An toàn cho READ: requireContractAccess throw → Promise.all reject → data
    // không bao giờ được trả về. KHÔNG áp pattern này cho action ghi.
    const [, { data: rpcData, error: rpcError }] = await Promise.all([
      requireContractAccess(supabase, userId),
      supabase.rpc(rpcFunction, { p_contract_id: id }),
    ]);

    if (rpcError) {
      console.error(`[contracts.getContractDetail] RPC failed:`, rpcError);
      throw new Error(`Không thể tải hợp đồng. RPC không khả dụng.`);
    }
    if (!rpcData) {
      throw new Error(`RPC returned null for contract ${id}`);
    }
    const data = rpcData as ContractDetailRpcPayload;
    // ⚡ RPC now includes vendors join - no extra query needed!

    if (!data.contract) {
      throw new Error(`RPC returned empty contract data for contract ${id}`);
    }

    const contractData = {
      ...data.contract,
      contract_events: data.events || [],
      work_tasks: data.work_tasks || [],
      contract_checklists: data.checklists || [],
    };

    return {
      contract: contractData,
      payments: data.payments || [],
      reservations: data.reservations || [],
      printOrders: normalizePrintOrders(data.print_orders || []),
      paymentPlans: mapPaymentPlans(data.payment_plans || []),
    };
  }));
}

import { unstable_noStore as noStore } from "next/cache";

export async function getContractDrawerExtra(id: string) {
  noStore();
  // ⚡ withAuthRead: local JWT verify — xem ghi chú ở getContractList.
  return profileAction("contracts.getContractDrawerExtra", () => withAuthRead(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    const [
      eventsResult,
      checklistsResult,
      workTasksResult,
      paymentPlansResult,
    ] = await Promise.all([
      supabase
        .from("contract_events")
        .select(
          `id, event_type, title, event_date, end_date, location, status, notes,
           sync_to_google, google_event_id, google_sync_status,
           google_sync_error, google_synced_at`
        )
        .eq("contract_id", id)
        .is("deleted_at", null)
        .order("event_date", { ascending: true }),
      supabase
        .from("contract_checklists")
        .select(
          "id, event_stage, category, item_name, is_completed, created_at, updated_at"
        )
        .eq("contract_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("work_tasks")
        .select(
          "id, event_id, work_type, assigned_to, vendor_id, status, deadline, start_date, completion_date, cost, notes, employees:assigned_to(id, full_name), vendors:vendor_id(id, full_name, phone)"
        )
        .eq("contract_id", id)
        .order("deadline", { ascending: true }),
      supabase
        .from("payment_plans")
        .select("id, contract_id, stage_name, stage_key, sort_order, amount, due_date, status, receipt_id, created_at, payment_plan_allocations(id, contract_id, payment_plan_id, payment_id, amount, created_at, created_by)")
        .eq("contract_id", id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);

    assertQueryOk("Lỗi tải lịch trình drawer", eventsResult);
    assertQueryOk("Lỗi tải checklist drawer", checklistsResult);
    assertQueryOk("Lỗi tải phân công drawer", workTasksResult);
    assertQueryOk("Lỗi tải kế hoạch thanh toán drawer", paymentPlansResult);

    return {
      events: eventsResult.data || [],
      checklists: checklistsResult.data || [],
      workTasks: workTasksResult.data || [],
      paymentPlans: mapPaymentPlans(paymentPlansResult.data || []),
    };
  }));
}

// ─── getContractForEdit ──────────────────────

export async function getContractForEdit(contractId: string) {
  // ⚡ withAuthRead: local JWT verify — xem ghi chú ở getContractList.
  return withAuthRead(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    // ⚡ 2 query độc lập (cùng filter theo contractId) — chạy song song.
    const [contractResult, paymentsResult] = await Promise.all([
      supabase
        .from("contracts")
        .select(
          `
        *,
        customers (id, full_name, phone, bride_name, groom_name, bride_phone, bride_height, bride_weight, bride_shoe_size, groom_phone, groom_height, groom_weight, groom_shoe_size, wedding_date, address),
        contract_items (id, type, item_name, service_id, dress_id, export_type, is_addon, addon_category, quantity, unit_price, original_price, discount_amount, total_amount, notes, deleted_at)
      `
        )
        .eq("id", contractId)
        .is("deleted_at", null)
        .single(),
      supabase
        .from("payments")
        .select("amount")
        .eq("contract_id", contractId)
        .is("deleted_at", null),
    ]);

    const { data: contract, error } = contractResult;

    if (error || !contract) {
      throw new Error("Không tìm thấy hợp đồng");
    }

    const { data: payments } = paymentsResult;

    const paidAmount = (payments || []).reduce(
      (sum: number, p: { amount: number }) => sum + (p.amount || 0),
      0
    );

    const activeItems = (contract.contract_items || []).filter(
      (i: any) => !i.deleted_at
    );
    const items: ContractItemFormData[] = activeItems.map(
      (item: any, index: number) => ({
        _tempId: `existing-${index}`,
        id: item.id as string,
        service_id: (item.service_id as string) || null,
        dress_id: (item.dress_id as string) || null,
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
