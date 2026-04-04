"use server";

import { withAuth } from "@/lib/auth_utils";
import type { ContractOption, LabDebtData } from "@/types/printing";

type ActionResult<T = null> =
  | { success: true; data: T }
  | { success: false; error: string };

type RelationRecord = Record<string, unknown>;

function getFirstRelation<T extends RelationRecord>(
  relation: T | T[] | null | undefined,
): T | null {
  if (!relation) return null;
  return Array.isArray(relation) ? relation[0] ?? null : relation;
}

/** Escape LIKE wildcards to prevent search injection */
function escapeLikePattern(input: string): string {
  return input.replace(/[%_\\]/g, (char) => `\\${char}`);
}

export async function getContractOptions(
  search?: string,
): Promise<ActionResult<ContractOption[]>> {
  return withAuth(async (supabase) => {
    const term = search?.trim();

    if (!term) {
      const { data, error } = await supabase
        .from("contracts")
        .select("id, contract_code, customers!inner (full_name)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        throw new Error(`Khong the tai hop dong: ${error.message}`);
      }

      return (data ?? []).map((contract) => {
        const customer = getFirstRelation(
          contract.customers as RelationRecord | RelationRecord[] | null,
        );

        return {
          id: contract.id,
          contract_code: contract.contract_code,
          customer_name: String(customer?.full_name ?? "-"),
        };
      });
    }

    const escaped = escapeLikePattern(term);
    const { data, error } = await supabase
      .from("contracts")
      .select("id, contract_code, customers!inner (full_name)")
      .is("deleted_at", null)
      .or(`contract_code.ilike.%${escaped}%,customers.full_name.ilike.%${escaped}%`)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      throw new Error(`Khong the tim hop dong: ${error.message}`);
    }

    return (data ?? []).map((contract) => {
      const customer = getFirstRelation(
        contract.customers as RelationRecord | RelationRecord[] | null,
      );

      return {
        id: contract.id,
        contract_code: contract.contract_code,
        customer_name: String(customer?.full_name ?? "-"),
      };
    });
  });
}

export async function getLabDebts(options?: {
  fromDate?: string;
  limit?: number;
}): Promise<ActionResult<LabDebtData>> {
  return withAuth(async (supabase) => {
    let query = supabase
      .from("printing_orders")
      .select("lab_id, total_amount, order_date, labs (id, name:lab_name)")
      .eq("payment_status", "chua_thanh_toan")
      .not("lab_id", "is", null)
      .is("deleted_at", null)
      .order("order_date", { ascending: false });

    if (options?.fromDate) {
      query = query.gte("order_date", options.fromDate);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Khong the tai cong no lab: ${error.message}`);
    }

    const debtMap = new Map<
      string,
      { labName: string; totalDebt: number; unpaidOrders: number; lastOrderDate: string | null }
    >();

    (data ?? []).forEach((row) => {
      if (!row.lab_id) return;

      const lab = getFirstRelation(
        row.labs as RelationRecord | RelationRecord[] | null,
      );
      const amount = Number(row.total_amount ?? 0);
      const current = debtMap.get(row.lab_id) ?? {
        labName: String(lab?.name ?? "Lab"),
        totalDebt: 0,
        unpaidOrders: 0,
        lastOrderDate: row.order_date ?? null,
      };

      current.totalDebt += amount;
      current.unpaidOrders += 1;
      current.lastOrderDate = current.lastOrderDate ?? row.order_date ?? null;
      debtMap.set(row.lab_id, current);
    });

    const items = Array.from(debtMap.entries())
      .map(([labId, value]) => ({
        labId,
        labName: value.labName,
        unpaidOrders: value.unpaidOrders,
        totalDebt: value.totalDebt,
        lastOrderDate: value.lastOrderDate,
      }))
      .sort((left, right) => right.totalDebt - left.totalDebt);

    return {
      totalDebt: items.reduce((sum, item) => sum + item.totalDebt, 0),
      totalLabs: items.length,
      totalOrders: items.reduce((sum, item) => sum + item.unpaidOrders, 0),
      items,
    };
  });
}
