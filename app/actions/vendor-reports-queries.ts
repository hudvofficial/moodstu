"use server";

import { withFinanceRead } from "@/lib/auth_utils";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { profileAction } from "@/lib/action-profiler";

export interface VendorCostItem {
  vendor_id: string;
  vendor_name: string;
  vendor_phone: string | null;
  service_type: string | null;
  job_count: number;
  total_cost: number;
  contracts: string[]; // contract codes
}

export interface VendorCostSummary {
  items: VendorCostItem[];
  total_cost: number;
  total_jobs: number;
  vendor_count: number;
  month: number;
  year: number;
}

export async function fetchVendorCosts(month: number, year: number) {
  return profileAction("finance.fetchVendorCosts", () =>
    withFinanceRead(async (supabase: SupabaseClient<Database>) => {
      // ADR-016 M2: task thợ ngoài hoàn thành gom theo NGÀY SỰ KIỆN (luật ngày ghi sổ),
      // không theo deadline như trước — logic nằm trong RPC vendor_cost_report.
      const { data, error } = await supabase.rpc("vendor_cost_report", { p_month: month, p_year: year });

      if (error) throw new Error(`Loi tai chi phi vendor: ${error.message}`);

      const items: VendorCostItem[] = (data || []).map((row) => ({
        vendor_id: row.vendor_id,
        vendor_name: row.vendor_name || "Vendor không xác định",
        vendor_phone: row.vendor_phone ?? null,
        service_type: row.service_type ?? null,
        job_count: Number(row.job_count || 0),
        total_cost: Number(row.total_cost || 0),
        contracts: row.contracts ?? [],
      }));

      return {
        items,
        total_cost: items.reduce((sum, i) => sum + i.total_cost, 0),
        total_jobs: items.reduce((sum, i) => sum + i.job_count, 0),
        vendor_count: items.length,
        month,
        year,
      } satisfies VendorCostSummary;
    }),
  );
}
