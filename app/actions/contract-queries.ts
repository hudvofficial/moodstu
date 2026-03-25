"use server";

/**
 * 🔍 Contract Queries (V2)
 *
 * All READ actions for the contract module.
 * Logic: withAuth() -> Supabase -> Result.
 */

import { withAuth } from "@/lib/auth_utils";
import type { ContractFilters, ContractStats } from "@/types/contract";
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

// ─── getContractList ──────────────────────────

export async function getContractList(filters: ContractFilters) {
  return withAuth(async (supabase) => {
    const page = filters.page || 1;
    const pageSize = 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("contracts")
      .select(
        `id, contract_code, customer_id, service_type,
         contract_date, work_date, delivery_date,
         total_amount, discount_amount, paid_amount,
         remaining_amount, status, payment_status,
         updated_at, created_at,
         customers (id, customer_code, full_name, phone, address, bride_name, groom_name),
         work_tasks (id, event_id, work_type, assigned_to, status, deadline,
                     start_date, completion_date, cost, notes,
                     employees:assigned_to(id, full_name)),
         contract_checklists (id, event_stage, category, item_name, is_completed),
         contract_events (id, event_type, title, event_date, end_date, location, status, notes, sort_order, deadline, start_time, end_time, is_manual_date, phase),
         payment_plans (id, stage_name, amount, due_date, status),
         contract_notes (id, content, created_by, created_at)`,
        { count: "estimated" }
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
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
      query = query.or(
        `contract_code.ilike.%${safe}%,customers.full_name.ilike.%${safe}%`
      );
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

    const { data, count, error } = await query;
    if (error) throw error;
    return { contracts: data || [], total: count || 0, page, pageSize };
  });
}

// ─── getContractStats ────────────────────────

export async function getContractStats() {
  return withAuth(async (supabase) => {
    const { count: lifetimeCount } = await supabase
      .from("contracts")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const { data } = await supabase
      .from("contracts")
      .select("status, total_amount, remaining_amount")
      .is("deleted_at", null)
      .gte("created_at", sixMonthsAgo.toISOString());

    const all = data || [];
    let active = 0,
      pending = 0,
      completed = 0,
      revenue = 0,
      outstanding = 0;
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

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
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
        ? Math.round(((thisMonthCount || 0) - lastMonthCount) / lastMonthCount * 100)
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

// ─── getContractDetail ────────────────────────

export async function getContractDetail(id: string) {
  return withAuth(async (supabase) => {
    const { data, error } = await supabase
      .from("contracts")
      .select(
        `*,
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
          addon_category, inventory_item_id, notes, deleted_at
        ),
        contract_events (
          id, contract_id, event_type, title, event_date, end_date,
          location, status, notes, sort_order, deadline,
          start_time, end_time, is_manual_date, phase, deleted_at
        ),
        work_tasks (
          id, event_id, work_type, assigned_to, status, deadline,
          start_date, completion_date, cost, notes,
          employees:assigned_to(id, full_name)
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

    // Filter soft-deleted items/events from embedded select
    const activeItems = (data.contract_items || []).filter(
      (i: { deleted_at?: string | null }) => !i.deleted_at
    );
    const activeEvents = (data.contract_events || []).filter(
      (e: { deleted_at?: string | null }) => !e.deleted_at
    );
    data.contract_items = activeItems;
    data.contract_events = activeEvents;

    const [
      { data: payments },
      { data: reservations },
      { data: printOrders },
      { data: auditLogs },
      { data: paymentPlans },
    ] = await Promise.all([
      supabase
        .from("payments")
        .select(
          "id, receipt_code, amount, payment_method, payment_date, payment_stage, notes, created_by, created_at"
        )
        .eq("contract_id", id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("inventory_reservations")
        .select(
          `id, status, start_date, end_date, notes, inventory_items (id, name, item_code, category, size, color, image_url)`
        )
        .eq("contract_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("printing_orders")
        .select(
          `id, order_code, status, total_amount, order_date, expected_date, received_date, notes, labs (id, name)`
        )
        .eq("contract_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("audit_logs")
        .select(
          `id, action, table_name, old_data, new_data, created_at, employees:user_id(id, full_name)`
        )
        .eq("table_name", "contracts")
        .eq("record_id", id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("payment_plans")
        .select(
          "id, contract_id, stage_name, amount, due_date, status, receipt_id, created_at"
        )
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
        .select(
          "id, event_type, title, event_date, end_date, location, status, notes"
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
          "id, event_id, work_type, assigned_to, status, deadline, start_date, completion_date, cost, notes, employees:assigned_to(id, full_name)"
        )
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

// ─── getContractForEdit ──────────────────────

export async function getContractForEdit(contractId: string) {
  return withAuth(async (supabase) => {
    const { data: contract, error } = await supabase
      .from("contracts")
      .select(
        `
        *,
        customers (id, full_name, phone, bride_name, groom_name, bride_phone, bride_height, bride_weight, bride_shoe_size, groom_phone, groom_height, groom_weight, groom_shoe_size, wedding_date, address),
        contract_items (id, type, item_name, service_id, inventory_item_id, export_type, is_addon, addon_category, quantity, unit_price, original_price, discount_amount, total_amount, notes, deleted_at)
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
      (i: { deleted_at?: string | null }) => !i.deleted_at
    );
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
