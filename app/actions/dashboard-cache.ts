"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { DASHBOARD_CRITICAL_CACHE_TAG } from "@/lib/api/dashboard";

export async function invalidateDashboardCache() {
  revalidateTag(DASHBOARD_CRITICAL_CACHE_TAG, { expire: 0 });
  revalidatePath("/dashboard");
}
