"use server";

import { withAuth } from "@/lib/auth_utils";

// ═══════════════════════════════════════════
// Contract Detail Actions — Full Detail + Drawer Extra
// Split from contracts.ts (360 lines)
// ═══════════════════════════════════════════

// ─── getContractById ─────────────────────────
export async function getContractById(id: string) {
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
    const activeItems = (data.contract_items || []).filter((i: { deleted_at?: string | null }) => !i.deleted_at);
    const activeEvents = (data.contract_events || []).filter((e: { deleted_at?: string | null }) => !e.deleted_at);
    data.contract_items = activeItems;
    data.contract_events = activeEvents;

    const [
      { data: payments },
      { data: reservations },
      { data: printOrders },
      { data: auditLogs },
      { data: paymentPlans },
    ] = await Promise.all([
      supabase.from("payments").select("id, receipt_code, amount, payment_method, payment_date, payment_stage, notes, created_by, created_at").eq("contract_id", id).is("deleted_at", null).order("created_at", { ascending: false }),
      supabase.from("inventory_reservations").select(`id, status, start_date, end_date, notes, inventory_items (id, name, item_code, category, size, color, image_url)`).eq("contract_id", id).order("created_at", { ascending: false }),
      supabase.from("printing_orders").select(`id, order_code, status, total_amount, order_date, expected_date, received_date, notes, labs (id, name)`).eq("contract_id", id).order("created_at", { ascending: false }),
      supabase.from("audit_logs").select(`id, action, table_name, old_data, new_data, created_at, employees:user_id(id, full_name)`).eq("table_name", "contracts").eq("record_id", id).order("created_at", { ascending: false }).limit(10),
      supabase.from("payment_plans").select("id, contract_id, stage_name, amount, due_date, status, receipt_id, created_at").eq("contract_id", id).order("created_at", { ascending: true }),
    ]);

    return { contract: data, payments: payments || [], reservations: reservations || [], printOrders: printOrders || [], auditLogs: auditLogs || [], paymentPlans: paymentPlans || [] };
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
      supabase.from("contract_events").select("id, event_type, title, event_date, end_date, location, status, notes").eq("contract_id", id).is("deleted_at", null).order("event_date", { ascending: true }),
      supabase.from("contract_checklists").select("id, event_stage, category, item_name, is_completed, created_at, updated_at").eq("contract_id", id).order("created_at", { ascending: true }),
      supabase.from("work_tasks").select("id, event_id, work_type, assigned_to, status, deadline, start_date, completion_date, cost, notes, employees:assigned_to(id, full_name)").eq("contract_id", id).order("deadline", { ascending: true }),
      supabase.from("payment_plans").select("*").eq("contract_id", id).order("created_at", { ascending: true }),
    ]);

    return { events: events || [], checklists: checklists || [], workTasks: workTasks || [], paymentPlans: paymentPlans || [] };
  });
}
