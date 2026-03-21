"use server";

import { withAuth } from "@/lib/auth_utils";
import type { ContractFilters, ContractStats } from "@/types/contract";

// ═══════════════════════════════════════════
// Contract Server Actions — List + Stats
// Split: Detail queries moved to contract-detail-actions.ts
// ═══════════════════════════════════════════

// ─── Helpers ─────────────────────────────────
function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function sanitizeSearch(raw: string): string {
  return raw.replace(/[,()]/g, " ").replace(/%/g, "\\%").replace(/_/g, "\\_").trim();
}

// ─── getContracts ────────────────────────────
export async function getContracts(filters: ContractFilters) {
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
         work_tasks (id, work_type, assigned_to, status, deadline,
                     start_date, completion_date, cost, notes),
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

    if (filters.service && filters.service !== "all") query = query.eq("service_type", filters.service);

    if (filters.search) {
      const safe = sanitizeSearch(filters.search);
      query = query.or(`contract_code.ilike.%${safe}%,customers.full_name.ilike.%${safe}%`);
    }

    if (filters.time && filters.time !== "all") {
      const now = new Date();
      let start: Date | null = null;
      let end: Date | null = null;
      switch (filters.time) {
        case "this_month": start = new Date(now.getFullYear(), now.getMonth(), 1); end = new Date(now.getFullYear(), now.getMonth() + 1, 0); break;
        case "last_month": start = new Date(now.getFullYear(), now.getMonth() - 1, 1); end = new Date(now.getFullYear(), now.getMonth(), 0); break;
        case "this_year": start = new Date(now.getFullYear(), 0, 1); end = new Date(now.getFullYear(), 11, 31); break;
      }
      if (start && end) query = query.gte("contract_date", toDateString(start)).lte("contract_date", toDateString(end));
    }

    const { data, count, error } = await query;
    if (error) throw error;
    return { contracts: data || [], total: count || 0, page, pageSize };
  });
}

// ─── getContractStats ────────────────────────
export async function getContractStats() {
  return withAuth(async (supabase) => {
    const { count: lifetimeCount } = await supabase.from("contracts").select("id", { count: "exact", head: true }).is("deleted_at", null);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const { data } = await supabase.from("contracts").select("status, total_amount, remaining_amount").is("deleted_at", null).gte("created_at", sixMonthsAgo.toISOString());

    const all = data || [];
    let active = 0, pending = 0, completed = 0, revenue = 0, outstanding = 0;
    type ContractRow = { status: string; total_amount: number; remaining_amount: number };
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

    const { count: thisMonthCount } = await supabase.from("contracts").select("id", { count: "exact", head: true }).is("deleted_at", null).gte("created_at", thisMonthStart.toISOString());
    const { count: lastMonthCount } = await supabase.from("contracts").select("id", { count: "exact", head: true }).is("deleted_at", null).gte("created_at", lastMonthStart.toISOString()).lte("created_at", lastMonthEnd.toISOString());

    const growth = lastMonthCount && lastMonthCount > 0 ? Math.round(((thisMonthCount || 0) - lastMonthCount) / lastMonthCount * 100) : 0;

    const stats: ContractStats = { total: lifetimeCount || all.length, active, pending, completed, revenue, outstanding, growth: { total: growth, active: 0, pending: 0, completed: 0 } };
    return stats;
  });
}
