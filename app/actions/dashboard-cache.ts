"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { DASHBOARD_CRITICAL_CACHE_TAG } from "@/lib/api/dashboard";

const DASHBOARD_CRITICAL_TABLES = new Set(["contracts", "payments", "receipts"]);

export async function invalidateDashboardCache(changedTables?: string[]) {
  const shouldInvalidateCritical =
    !changedTables?.length ||
    changedTables.some((table) => DASHBOARD_CRITICAL_TABLES.has(table));

  if (shouldInvalidateCritical) {
    revalidateTag(DASHBOARD_CRITICAL_CACHE_TAG, { expire: 0 });
  }

  revalidatePath("/dashboard");
}
