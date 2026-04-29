"use server";

import { withPrintingAccess } from "@/lib/auth_utils";
import type { ContractOption, LabDebtData, LabDebtEntry } from "@/types/printing";

type ActionResult<T = null> =
  | { success: true; data: T }
  | { success: false; error: string };

type RelationRecord = Record<string, unknown>;
type LabDebtSummaryRow = {
  lab_id: string;
  lab_name: string | null;
  order_count: number | null;
  remaining: number | null;
  last_order_date: string | null;
};

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
  return withPrintingAccess(async (supabase) => {
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
  return withPrintingAccess(async (supabase) => {
    const { data, error } = await supabase.rpc("finance_lab_debt_summary");

    if (error) {
      throw new Error(`Khong the tai cong no lab: ${error.message}`);
    }

    let items: LabDebtEntry[] = ((data ?? []) as LabDebtSummaryRow[])
      .map((row) => ({
        labId: row.lab_id,
        labName: row.lab_name || "Lab",
        unpaidOrders: Number(row.order_count ?? 0),
        totalDebt: Number(row.remaining ?? 0),
        lastOrderDate: String(row.last_order_date ?? "") || null,
      }))
      .sort((left, right) => right.totalDebt - left.totalDebt);

    if (options?.fromDate) {
      items = items.filter((item) => !item.lastOrderDate || item.lastOrderDate >= options.fromDate!);
    }

    if (options?.limit && options.limit > 0) {
      items = items.slice(0, options.limit);
    }

    return {
      totalDebt: items.reduce((sum, item) => sum + item.totalDebt, 0),
      totalLabs: items.length,
      totalOrders: items.reduce((sum, item) => sum + item.unpaidOrders, 0),
      items,
    };
  });
}
