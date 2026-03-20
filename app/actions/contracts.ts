"use server";

import { withAuth } from "@/lib/auth_utils";
import type { ContractFilters, ContractStats } from "@/types/contract";

// ═══════════════════════════════════════════
// Contract Server Actions — Read Operations
// Pattern: withAuth + admin client (bypass RLS)
// DB: V2 schema (snake_case enums, FK only)
// ═══════════════════════════════════════════

// ─── Helpers ─────────────────────────────────
function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Sanitize search input — V1 proven pattern */
function sanitizeSearch(raw: string): string {
  return raw
    .replace(/[,()]/g, " ")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .trim();
}

// ─── getContracts ────────────────────────────
export async function getContracts(filters: ContractFilters) {
  return withAuth(async (supabase) => {
    const page = filters.page || 1;
    const pageSize = 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // V2 select: base fields + ALL drawer data (0ms drawer pattern)
    let query = supabase
      .from("contracts")
      .select(
        `id, contract_code, customer_id, service_type,
         contract_date, work_date, delivery_date,
         total_amount, discount_amount, paid_amount,
         remaining_amount, status, payment_status,
         updated_at, created_at,
         customers (id, customer_code, full_name, phone, address),
         work_tasks (id, work_type, assigned_to, status, deadline,
                     start_date, completion_date, cost, notes),
         contract_checklists (id, event_stage, category, item_name, is_completed),
         contract_events (id, event_type, title, event_date, end_date, location, status, notes),
         payment_plans (id, stage_name, amount, due_date, status),
         contract_notes (id, content, created_by, created_at)`,
        { count: "estimated" }
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(from, to);

    // Status filter — hide da_huy by default (V1 proven)
    if (filters.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    } else {
      query = query.neq("status", "da_huy");
    }

    // Service type filter
    if (filters.service && filters.service !== "all") {
      query = query.eq("service_type", filters.service);
    }

    // Search by contract_code or customer name via FK
    if (filters.search) {
      const safe = sanitizeSearch(filters.search);
      query = query.or(
        `contract_code.ilike.%${safe}%,customers.full_name.ilike.%${safe}%`
      );
    }

    // Time filter preset — V1 proven
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

      if (start && end) {
        query = query
          .gte("contract_date", toDateString(start))
          .lte("contract_date", toDateString(end));
      }
    }

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      contracts: data || [],
      total: count || 0,
      page,
      pageSize,
    };
  });
}

// ─── getContractStats ────────────────────────
export async function getContractStats() {
  return withAuth(async (supabase) => {
    // Total lifetime count (exclude soft-deleted)
    const { count: lifetimeCount } = await supabase
      .from("contracts")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null);

    // Recent 6 months for status breakdown
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data } = await supabase
      .from("contracts")
      .select("status, total_amount, remaining_amount")
      .is("deleted_at", null)
      .gte("created_at", sixMonthsAgo.toISOString());

    const all = data || [];
    let active = 0;
    let pending = 0;
    let completed = 0;
    let revenue = 0;
    let outstanding = 0;

    type ContractRow = {
      status: string;
      total_amount: number;
      remaining_amount: number;
    };

    all.forEach((c: ContractRow) => {
      if (c.status === "dang_thuc_hien") active++;
      else if (c.status === "cho_xu_ly") pending++;
      else if (c.status === "hoan_thanh") completed++;
      revenue += c.total_amount || 0;
      outstanding += c.remaining_amount || 0;
    });

    // Growth: compare current vs previous month
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1
    );
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const { count: thisMonthCount } = await supabase
      .from("contracts")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .gte("created_at", thisMonthStart.toISOString());

    const { count: lastMonthCount } = await supabase
      .from("contracts")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .gte("created_at", lastMonthStart.toISOString())
      .lte("created_at", lastMonthEnd.toISOString());

    const growth =
      lastMonthCount && lastMonthCount > 0
        ? Math.round(
            (((thisMonthCount || 0) - lastMonthCount) / lastMonthCount) * 100
          )
        : 0;

    const stats: ContractStats = {
      total: lifetimeCount || all.length,
      active,
      pending,
      completed,
      revenue,
      outstanding,
      growth: { total: growth, active: 0, pending: 0, completed: 0 },
    };

    return stats;
  });
}

// ─── getContractById ─────────────────────────
export async function getContractById(id: string) {
  return withAuth(async (supabase) => {
    // Full detail with all V2 joins
    const { data, error } = await supabase
      .from("contracts")
      .select(
        `*,
        customers (
          id, customer_code, full_name, phone, alt_phone,
          email, address, wedding_date, notes
        ),
        contract_items (
          id, type, item_name, service_id, export_type,
          quantity, unit_price, original_price,
          discount_amount, total_amount, is_addon,
          addon_category, inventory_item_id, notes
        ),
        contract_events (
          id, event_type, title, event_date, end_date,
          location, status, notes
        ),
        work_tasks (
          id, work_type, assigned_to, status, deadline,
          start_date, completion_date, cost, notes
        ),
        contract_checklists (
          id, event_stage, category, item_name, is_completed, created_at, updated_at
        )`
      )
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error) throw error;
    if (!data) throw new Error("Không tìm thấy hợp đồng");

    // Parallel sidebar queries for Phase 04e + 00C (payment_plans)
    const [
      { data: payments },
      { data: reservations },
      { data: printOrders },
      { data: auditLogs },
      { data: paymentPlans },
    ] = await Promise.all([
      // Payments
      supabase
        .from("payments")
        .select("*")
        .eq("contract_id", id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),

      // Inventory reservations (trang phục)
      supabase
        .from("inventory_reservations")
        .select(`
          id, status, start_date, end_date, notes,
          inventory_items (id, name, item_code, category, size, color, image_url)
        `)
        .eq("contract_id", id)
        .order("created_at", { ascending: false }),

      // Printing orders (in ấn)
      supabase
        .from("printing_orders")
        .select(`
          id, order_code, status, total_amount, order_date,
          expected_date, received_date, notes,
          labs (id, name)
        `)
        .eq("contract_id", id)
        .order("created_at", { ascending: false }),

      // Audit logs (hoạt động gần đây)
      supabase
        .from("audit_logs")
        .select(`
          id, action, table_name, old_data, new_data, created_at
        `)
        .eq("table_name", "contracts")
        .eq("record_id", id)
        .order("created_at", { ascending: false })
        .limit(10),

      // Payment plans (lịch thanh toán — Phase 00C)
      supabase
        .from("payment_plans")
        .select("*")
        .eq("contract_id", id)
        .order("created_at", { ascending: true }),
    ]);

    return {
      contract: data,
      payments: payments || [],
      reservations: reservations || [],
      printOrders: printOrders || [],
      auditLogs: auditLogs || [],
      paymentPlans: paymentPlans || [],
    };
  });
}

// ─── getContractDrawerExtra ──────────────
// Lightweight fetch for drawer's lazy-loaded sections.
// Only fetches: events, checklists, work_tasks, payment_plans.
// Skips: payments, reservations, printOrders, auditLogs (heavy, not shown in drawer).
export async function getContractDrawerExtra(id: string) {
  return withAuth(async (supabase) => {
    const [
      { data: events },
      { data: checklists },
      { data: workTasks },
      { data: paymentPlans },
    ] = await Promise.all([
      supabase
        .from("contract_events")
        .select("id, event_type, title, event_date, end_date, location, status, notes")
        .eq("contract_id", id)
        .order("event_date", { ascending: true }),

      supabase
        .from("contract_checklists")
        .select("id, event_stage, category, item_name, is_completed, created_at, updated_at")
        .eq("contract_id", id)
        .order("created_at", { ascending: true }),

      supabase
        .from("work_tasks")
        .select(`
          id, work_type, assigned_to, status, deadline,
          start_date, completion_date, cost, notes
        `)
        .eq("contract_id", id)
        .order("deadline", { ascending: true }),

      supabase
        .from("payment_plans")
        .select("*")
        .eq("contract_id", id)
        .order("created_at", { ascending: true }),
    ]);

    return {
      events: events || [],
      checklists: checklists || [],
      workTasks: workTasks || [],
      paymentPlans: paymentPlans || [],
    };
  });
}
