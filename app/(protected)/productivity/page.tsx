import { redirect } from "next/navigation";
import {
  fetchEmployeeJobDetails,
  fetchProductivityData,
} from "@/app/actions/productivity-actions";
import ProductivityPageClient from "@/components/productivity/productivity-page-client";
import { getAuthenticatedUserContext } from "@/lib/auth_utils";
import { PRODUCTIVITY_ALLOWED_ROLES, isProductivityPeriod } from "@/types/productivity-constants";
import type { ProductivityPeriod } from "@/types/productivity";

export const metadata = {
  title: "Năng suất ekip | Mood Studio",
};

export const dynamic = "force-dynamic";

interface ProductivityPageProps {
  searchParams: Promise<{
    period?: string;
  }>;
}

export default async function ProductivityPage({
  searchParams,
}: ProductivityPageProps) {
  const context = await getAuthenticatedUserContext();
  if (!context) {
    redirect("/login");
  }

  if (
    !PRODUCTIVITY_ALLOWED_ROLES.includes(
      context.shellRole as (typeof PRODUCTIVITY_ALLOWED_ROLES)[number],
    )
  ) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const period: ProductivityPeriod = isProductivityPeriod(params.period)
    ? params.period
    : "month";

  const overviewResult = await fetchProductivityData(period);
  if (!overviewResult.success) {
    if (overviewResult.error.includes("quyền")) {
      redirect("/dashboard");
    }
    throw new Error(overviewResult.error);
  }

  let initialPayload = overviewResult.data;

  if (
    initialPayload.viewer.viewMode === "self" &&
    initialPayload.viewer.isLinkedEmployee &&
    initialPayload.viewer.currentEmployeeId
  ) {
    const detailResult = await fetchEmployeeJobDetails(
      initialPayload.viewer.currentEmployeeId,
      initialPayload.overview.date_range.start,
      initialPayload.overview.date_range.end,
    );

    if (detailResult.success) {
      initialPayload = {
        ...initialPayload,
        initialDetail: detailResult.data,
      };
    }
  }

  return (
    <ProductivityPageClient
      initialPayload={initialPayload}
      initialPeriod={period}
    />
  );
}
