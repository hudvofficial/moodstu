"use server";

import { revalidatePath } from "next/cache";
import { withAuth } from "@/lib/auth_utils";
import { fireAuditLog, logError } from "@/lib/audit";

// ═══════════════════════════════════════════
// Lab Sync Actions — Debts + Auto Order + Album Sync
// Split from lab-actions.ts (444 lines)
// ═══════════════════════════════════════════

// ─── TYPES ────────────────────────────────

export interface LabDebtOrder { id: string; contractCode: string; itemName: string; cost: number; paymentStatus: string }
export interface LabDebtGroup { contractCode: string; items: LabDebtOrder[]; subtotal: number }
export interface LabDebtEntry { labId: string; labName: string; phone: string; totalDebt: number; isPaid: boolean; orders: LabDebtGroup[] }
export interface LabDebtData { labs: LabDebtEntry[]; summary: { totalDebt: number; labsWithDebt: number } }

// ─── GET LAB DEBTS ────────────────────────

export async function getLabDebts(options?: { fromDate?: string; limit?: number }): Promise<LabDebtData> {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  const fromDate = options?.fromDate || new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString().split("T")[0];
  const limit = options?.limit || 500;

  const { data: orders } = await supabase
    .from("printing_orders")
    .select("id, order_code, contract_id, total_amount, payment_status, lab_id, labs(lab_name, phone)")
    .gte("created_at", fromDate)
    .order("created_at", { ascending: false })
    .limit(limit);

  const labMap = new Map<string, { labName: string; phone: string; orders: typeof orders }>();
  for (const order of orders || []) {
    const labId = order.lab_id;
    if (!labId) continue;
    if (!labMap.has(labId)) {
      const lab = Array.isArray(order.labs) ? order.labs[0] : order.labs;
      labMap.set(labId, { labName: (lab as { lab_name: string } | null)?.lab_name || "Lab", phone: (lab as { phone: string } | null)?.phone || "", orders: [] });
    }
    labMap.get(labId)!.orders!.push(order);
  }

  let totalDebt = 0;
  let labsWithDebt = 0;
  const labs: LabDebtEntry[] = [];

  for (const [labId, labData] of labMap) {
    let labDebt = 0;
    let hasUnpaid = false;
    const debtOrders: LabDebtOrder[] = [];

    for (const o of labData.orders || []) {
      const cost = Number(o.total_amount) || 0;
      const isPaid = o.payment_status === "da_thanh_toan";
      debtOrders.push({ id: o.id, contractCode: o.order_code || "N/A", itemName: o.order_code || "", cost, paymentStatus: o.payment_status || "chua_thanh_toan" });
      if (!isPaid) { labDebt += cost; hasUnpaid = true; }
    }

    if (hasUnpaid) { labsWithDebt++; totalDebt += labDebt; }

    labs.push({
      labId, labName: labData.labName, phone: labData.phone, totalDebt: labDebt, isPaid: !hasUnpaid,
      orders: [{ contractCode: labData.labName, items: debtOrders.filter((o) => o.paymentStatus !== "da_thanh_toan"), subtotal: labDebt }],
    });
  }

  labs.sort((a, b) => { if (a.isPaid !== b.isPaid) return a.isPaid ? 1 : -1; return b.totalDebt - a.totalDebt; });
  return { labs, summary: { totalDebt, labsWithDebt } };
}

// ─── AUTO-CREATE PRINTING ORDER ───────────

export async function autoCreatePrintingOrder(contractId: string, sourceTaskId: string, workType: string) {
  return withAuth(async (supabase, userId) => {
    const { data: contract, error: contractErr } = await supabase
      .from("contracts").select("id, contract_code, customer_id, customers(full_name)").eq("id", contractId).single();

    if (contractErr || !contract) {
      logError({ error: contractErr || "Contract not found", context: "autoCreatePrintingOrder", tableName: "contracts", recordId: contractId }).catch(() => {});
      return null;
    }

    const { data: existing } = await supabase.from("printing_orders").select("id").eq("contract_id", contractId).limit(1);
    if (existing && existing.length > 0) return null;

    const { data: defaultLab } = await supabase.from("labs").select("id, lab_name").eq("status", "active").limit(1).single();

    const cust = Array.isArray(contract.customers) ? contract.customers[0] : contract.customers;
    const customerName = (cust as { full_name: string } | null)?.full_name || contract.contract_code;
    const orderCode = `IN-${Date.now().toString(36).toUpperCase()}`;

    const { error: insertErr } = await supabase.from("printing_orders").insert({
      contract_id: contractId, lab_id: defaultLab?.id || null, order_code: orderCode,
      status: "cho_xu_ly", total_amount: 0, order_date: new Date().toISOString().split("T")[0],
      items: [{ name: `Album ${customerName}`, size: "20x30", quantity: 1, unitPrice: 0 }],
      notes: `Auto từ ${workType}`, created_by: userId,
    });

    if (insertErr) {
      logError({ error: insertErr, context: "autoCreatePrintingOrder.insert", tableName: "printing_orders", recordId: contractId }).catch(() => {});
      return null;
    }

    fireAuditLog({ action: "CREATE", tableName: "printing_orders", recordId: contractId, description: `Auto tạo đơn in cho HĐ ${contract.contract_code} (${workType})`, logType: "ASSIGNMENT", source: "system" });
    revalidatePath("/printing");
    revalidatePath(`/contracts/${contractId}`);
    return null;
  });
}

// ─── SYNC ALBUM STATUS ────────────────────

export async function syncAlbumStatus(contractId: string) {
  return withAuth(async (supabase) => {
    const { data: orders, error } = await supabase.from("printing_orders").select("id, status").eq("contract_id", contractId);
    if (error || !orders || orders.length === 0) return null;

    const allDelivered = orders.every((o) => o.status === "da_nhan");
    if (!allDelivered) return null;

    const { data: contract } = await supabase.from("contracts").select("contract_code").eq("id", contractId).single();
    fireAuditLog({ action: "UPDATE", tableName: "contracts", recordId: contractId, description: `Album HĐ ${contract?.contract_code || contractId} đã giao đủ (${orders.length} đơn)`, source: "system" });
    return null;
  });
}
