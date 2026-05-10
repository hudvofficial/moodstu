"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import {
  DASHBOARD_CRITICAL_CACHE_TAG,
  prewarmDashboardCritical,
} from "@/lib/api/dashboard";

export async function invalidateDashboardCache() {
  revalidateTag(DASHBOARD_CRITICAL_CACHE_TAG, { expire: 0 });
  revalidatePath("/dashboard");
}

export async function prewarmDashboardForNavigation() {
  try {
    await prewarmDashboardCritical();
    return { success: true };
  } catch (error) {
    console.warn("[dashboard-navigation] prewarm failed", error);
    return { success: false };
  }
}
