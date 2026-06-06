"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import {
  DASHBOARD_CRITICAL_CACHE_TAG,
  DASHBOARD_REVENUE_CACHE_TAG,
  DASHBOARD_SERVICES_CACHE_TAG,
  DASHBOARD_EVENTS_CACHE_TAG,
  DASHBOARD_PAYMENTS_CACHE_TAG,
} from "@/lib/api/dashboard";

// Granular mapping: table → which cache tags to invalidate
const TABLE_TO_TAGS: Record<string, string[]> = {
  contracts: [
    DASHBOARD_CRITICAL_CACHE_TAG,
    DASHBOARD_SERVICES_CACHE_TAG,
    DASHBOARD_EVENTS_CACHE_TAG,
  ],
  payments: [
    DASHBOARD_CRITICAL_CACHE_TAG,
    DASHBOARD_REVENUE_CACHE_TAG,
    DASHBOARD_PAYMENTS_CACHE_TAG,
  ],
  receipts: [
    DASHBOARD_CRITICAL_CACHE_TAG,
    DASHBOARD_REVENUE_CACHE_TAG,
  ],
  payment_plans: [
    DASHBOARD_CRITICAL_CACHE_TAG,
    DASHBOARD_PAYMENTS_CACHE_TAG,
  ],
  contract_events: [
    DASHBOARD_EVENTS_CACHE_TAG,
  ],
  schedules: [
    DASHBOARD_EVENTS_CACHE_TAG,
  ],
  work_tasks: [
    DASHBOARD_EVENTS_CACHE_TAG,
  ],
};

export async function invalidateDashboardCache(changedTables?: string[]) {
  if (!changedTables?.length) {
    // No specific tables → full invalidation
    revalidatePath("/dashboard");
    return;
  }

  // Collect unique tags to invalidate
  const tagsToInvalidate = new Set<string>();
  for (const table of changedTables) {
    const tags = TABLE_TO_TAGS[table];
    if (tags) {
      for (const tag of tags) {
        tagsToInvalidate.add(tag);
      }
    }
  }

  if (tagsToInvalidate.size === 0) {
    // Unknown table → fallback to full path revalidation
    revalidatePath("/dashboard");
    return;
  }

  // Granular: only invalidate affected cache tags
  for (const tag of tagsToInvalidate) {
    revalidateTag(tag, { expire: 0 });
  }

  // Only revalidate the full path if critical data changed
  if (tagsToInvalidate.has(DASHBOARD_CRITICAL_CACHE_TAG)) {
    revalidatePath("/dashboard");
  }
}
