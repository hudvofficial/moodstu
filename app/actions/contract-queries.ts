"use server";

/**
 * 🔍 Contract Queries (V2)
 *
 * All READ actions for the contract module.
 * Logic: withAuth() -> Supabase -> Result.
 */

import { requireContractAccess, withAuth } from "@/lib/auth_utils";
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

type PaymentPlanRow = PaymentPlan & {
  payment_plan_allocations?: Array<{
    id: string;
    contract_id: string;
    payment_plan_id: string;
    payment_id: string;
    amount: number;
    created_at: string;
    created_by: string | null;
  }> | null;
};

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

function normalizePlanStatus(status: string | null | undefined, paidAmount: number, amount: number) {
  const raw = String(status || "pending").toLowerCase();
  if (raw === "cancelled" || raw === "da_huy" || raw === "huy") return "cancelled";
  if (raw === "paid" || raw === "closed" || raw === "da_thanh_toan") return "paid";
  if (amount <= 0) return paidAmount > 0 ? "partial" : "pending";
  if (paidAmount <= 0) return "pending";
  if (paidAmount + 0.01 >= amount) return "paid";
  return "partial";
}

function mapPaymentPlans(rows: Partial<PaymentPlanRow>[] | null | undefined): PaymentPlan[] {
  return ((rows || []) as PaymentPlanRow[])
    .map((plan) => {
      const allocations = plan.payment_plan_allocations || plan.allocations || [];
      const paidAmount = allocations.reduce((sum, allocation) => sum + Number(allocation.amount || 0), 0);
      const amount = Number(plan.amount || 0);
      const remainingAmount = amount > 0 ? Math.max(0, amount - paidAmount) : 0;

      return {
        id: plan.id,
        contract_id: plan.contract_id,
        stage_name: plan.stage_name,
        stage_key: plan.stage_key || null,
        sort_order: Number(plan.sort_order || 0),
        amount,
        due_date: plan.due_date,
        status: normalizePlanStatus(plan.status, paidAmount, amount),
        receipt_id: plan.receipt_id,
        created_at: plan.created_at,
        allocations,
        paid_amount: paidAmount,
        remaining_amount: remainingAmount,
      };
    })
    .sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return String(a.created_at || "").localeCompare(String(b.created_at || ""));
    });
}

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
  return withAuth(async (supabase, userId) => {
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
  return profileAction("contracts.getContractList", () => withAuth(async (supabase, userId) => {
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
      const [tasksResult, checklistsResult] = await Promise.all([
        supabase
          .from("work_tasks")
          .select("id, contract_id, work_type, status, deadline")
          .in("contract_id", contractIds),
        supabase
          .from("contract_checklists")
          .select("id, contract_id, event_stage, category, item_name, is_completed, created_at, updated_at")
          .in("contract_id", contractIds),
      ]);

      assertQueryOk("Loi tai tien do cong viec", tasksResult);
      assertQueryOk("Loi tai checklist hop dong", checklistsResult);

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

      for (const contract of contracts) {
        const contractId = contract.id;
        if (typeof contractId !== "string") continue;
        const checklists = checklistsByContract.get(contractId) || [];
        contract.work_tasks = tasksByContract.get(contractId) || [];
        contract.contract_checklists = checklists;
        contract.checklist_summary = buildChecklistSummary(checklists);
      }
    }

    return { contracts, total: count || 0, page, pageSize };
  }));
}

// ─── getContractStats ────────────────────────

export async function getContractStats() {
  return profileAction("contracts.getContractStats", () => withAuth(async (supabase, userId) => {
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

    if (rpcError && !isMissingRpcError(rpcError)) {
      throw new Error(`Loi tai thong ke hop dong: ${rpcError.message}`);
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
  return profileAction("contracts.getContractDetail", () => withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    // ⚡ Try RPC first for max performance (single request)
    const { data: rpcData, error: rpcError } = await supabase
      .rpc("get_contract_detail_v2", { p_contract_id: id });

    if (!rpcError && rpcData) {
      const data = rpcData as ContractDetailRpcPayload;
      const { data: workTasks } = await supabase
        .from("work_tasks")
        .select("id, event_id, contract_id, work_type, assigned_to, vendor_id, status, deadline, start_date, start_time, end_time, completion_date, cost, notes, employees:assigned_to(id, full_name, avatar_url, department), vendors:vendor_id(id, full_name, phone)")
        .eq("contract_id", id)
        .order("deadline", { ascending: true });

      if (data.contract) {
        const contractData = {
          ...data.contract,
          contract_events: data.events || [],
          work_tasks: workTasks || data.work_tasks || [],
          contract_checklists: data.checklists || [],
        };

        return {
          contract: contractData,
          payments: data.payments || [],
          reservations: data.reservations || [],
          printOrders: data.print_orders || [],
          paymentPlans: mapPaymentPlans(data.payment_plans || []),
        };
      }
    }

    console.warn("[contracts.getContractDetail] get_contract_detail_v2 unavailable; using 8-query fallback", {
      contractId: id,
      error: rpcError?.message || "RPC returned invalid data",
    });

    // ⚡ Fallback: Single-pass operational detail queries fire simultaneously.
    const [
      contractResult,
      eventsResult,
      workTasksResult,
      checklistsResult,
      paymentsResult,
      reservationsResult,
      printOrdersResult,
      paymentPlansResult,
    ] = await Promise.all([
      // 1) Contract + embedded FK joins
      supabase
        .from("contracts")
        .select(
          `id, contract_code, customer_id, service_type,
           transaction_type, contract_date, work_date, delivery_date,
           total_amount, discount_amount, paid_amount,
           remaining_amount, status, payment_status,
           description, notes, cancel_reason, updated_at, created_at,
           customers (
             id, customer_code, full_name, phone, alt_phone,
             email, address, wedding_date, notes,
             bride_name, groom_name, bride_phone, groom_phone,
             bride_height, bride_weight, bride_shoe_size,
             groom_height, groom_weight, groom_shoe_size
           ),
           contract_items (
             id, type, item_name, service_id, export_type,
             quantity, unit_price, original_price,
             discount_amount, total_amount, is_addon,
             addon_category, dress_id, notes, deleted_at
           )`
        )
        .eq("id", id)
        .is("deleted_at", null)
        .single(),
      // 2) Events
      supabase
        .from("contract_events")
        .select(
          `id, contract_id, event_type, title, event_date, end_date,
           location, status, notes, sort_order, deadline,
           start_time, end_time, is_manual_date, phase,
           sync_to_google, google_event_id, google_sync_status,
           google_sync_error, google_synced_at, deleted_at`
        )
        .eq("contract_id", id)
        .is("deleted_at", null)
        .order("sort_order", { ascending: true }),
      // 3) Work tasks
      supabase
        .from("work_tasks")
        .select(
          `id, event_id, contract_id, work_type, assigned_to, vendor_id, status, deadline,
           start_date, start_time, end_time, completion_date, cost, notes,
           employees:assigned_to(id, full_name, avatar_url, department),
           vendors:vendor_id(id, full_name, phone)`
        )
        .eq("contract_id", id)
        .order("deadline", { ascending: true }),
      // 4) Checklists
      supabase
        .from("contract_checklists")
        .select("id, event_stage, category, item_name, is_completed, created_at, updated_at")
        .eq("contract_id", id)
        .order("created_at", { ascending: true }),
      // 5) Payments
      supabase
        .from("payments")
        .select(
          "id, receipt_code, amount, payment_method, payment_date, payment_stage, notes, created_by, created_at"
        )
        .eq("contract_id", id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(30),
      // 6) Dress reservations
      supabase
        .from("dress_reservations")
        .select(
          `id, status, start_date, end_date, notes, dresses (id, name, item_code, category, size, color, image_url)`
        )
        .eq("contract_id", id)
        .order("created_at", { ascending: false }),
      // 7) Printing orders
      supabase
        .from("printing_orders")
        .select(
          `id, order_code, status, total_amount, order_date, expected_date, received_date, notes, labs (id, name:lab_name)`
        )
        .eq("contract_id", id)
        .order("created_at", { ascending: false }),
      // 8) Payment plans
      supabase
        .from("payment_plans")
        .select(
          "id, contract_id, stage_name, stage_key, sort_order, amount, due_date, status, receipt_id, created_at, payment_plan_allocations(id, contract_id, payment_plan_id, payment_id, amount, created_at, created_by)"
        )
        .eq("contract_id", id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);

    const { data, error } = contractResult;
    if (error) throw error;
    assertQueryOk("Loi tai lich trinh hop dong", eventsResult);
    assertQueryOk("Loi tai phan cong hop dong", workTasksResult);
    assertQueryOk("Loi tai checklist hop dong", checklistsResult);
    if (!data) throw new Error("Không tìm thấy hợp đồng");
    assertQueryOk("Lỗi tải thanh toán hợp đồng", paymentsResult);
    assertQueryOk("Lỗi tải lịch đặt trang phục", reservationsResult);
    assertQueryOk("Lỗi tải đơn in", printOrdersResult);
    assertQueryOk("Lỗi tải kế hoạch thanh toán", paymentPlansResult);

    const contractData = data as unknown as Contract;

    const activeItems = (contractData.contract_items || []).filter(
      (i: any) => !i.deleted_at
    );
    contractData.contract_items = activeItems;
    contractData.contract_events = (eventsResult.data || []) as unknown as ContractEvent[];
    contractData.work_tasks = (workTasksResult.data || []) as unknown as WorkTask[];
    contractData.contract_checklists = (checklistsResult.data || []) as unknown as ContractChecklist[];

    return {
      contract: contractData,
      payments: paymentsResult.data || [],
      reservations: reservationsResult.data || [],
      printOrders: printOrdersResult.data || [],
      paymentPlans: mapPaymentPlans(paymentPlansResult.data || []),
    };
  }));
}

import { unstable_noStore as noStore } from "next/cache";

export async function getContractDrawerExtra(id: string) {
  noStore();
  return profileAction("contracts.getContractDrawerExtra", () => withAuth(async (supabase, userId) => {
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
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    const { data: contract, error } = await supabase
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
      .single();

    if (error || !contract) {
      throw new Error("Không tìm thấy hợp đồng");
    }

    const { data: payments } = await supabase
      .from("payments")
      .select("amount")
      .eq("contract_id", contractId)
      .is("deleted_at", null);

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
