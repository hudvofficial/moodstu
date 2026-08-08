"use server";

import { withFinanceRead } from "@/lib/auth_utils";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { profileAction } from "@/lib/action-profiler";
import { monthWindow } from "@/lib/finance-utils";

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
      const window = monthWindow(month, year);

      // Query work_tasks WHERE vendor_id IS NOT NULL AND status='hoan_thanh'
      const { data: tasks, error } = await supabase
        .from("work_tasks")
        .select(`
          id,
          vendor_id,
          cost,
          deadline,
          contracts!inner(contract_code)
        `)
        .not("vendor_id", "is", null)
        .eq("status", "hoan_thanh")
        .gte("deadline", window.start)
        .lt("deadline", window.end);

      if (error) throw new Error(`Loi tai chi phi vendor: ${error.message}`);

      // Fetch vendor details
      const vendorIds = [...new Set((tasks || []).map((t) => t.vendor_id))];

      if (vendorIds.length === 0) {
        return {
          items: [],
          total_cost: 0,
          total_jobs: 0,
          vendor_count: 0,
          month,
          year,
        } satisfies VendorCostSummary;
      }

      const { data: vendors, error: vendorErr } = await supabase
        .from("vendors")
        .select("id, full_name, phone, service_type")
        .in("id", vendorIds);

      if (vendorErr) throw new Error(`Loi tai vendors: ${vendorErr.message}`);

      const vendorMap = new Map((vendors || []).map((v) => [v.id, v]));

      // Aggregate by vendor
      const costMap = new Map<string, VendorCostItem>();

      for (const task of tasks || []) {
        const vendor = vendorMap.get(task.vendor_id);
        const contractCode =
          Array.isArray(task.contracts) && task.contracts[0]?.contract_code
            ? task.contracts[0].contract_code
            : "";

        const existing = costMap.get(task.vendor_id);
        if (existing) {
          existing.job_count += 1;
          existing.total_cost += task.cost || 0;
          if (contractCode && !existing.contracts.includes(contractCode)) {
            existing.contracts.push(contractCode);
          }
        } else {
          costMap.set(task.vendor_id, {
            vendor_id: task.vendor_id,
            vendor_name: vendor?.full_name || "Vendor không xác định",
            vendor_phone: vendor?.phone || null,
            service_type: vendor?.service_type || null,
            job_count: 1,
            total_cost: task.cost || 0,
            contracts: contractCode ? [contractCode] : [],
          });
        }
      }

      const items = Array.from(costMap.values()).sort(
        (a, b) => b.total_cost - a.total_cost,
      );

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
