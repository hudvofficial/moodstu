import { redirect } from "next/navigation";
import ProductivityPageClient from "@/components/productivity/productivity-page-client";
import { getAuthenticatedUserContext } from "@/lib/auth_utils";
import { PRODUCTIVITY_ALLOWED_ROLES, isProductivityPeriod } from "@/types/productivity-constants";
import type { ProductivityPeriod } from "@/types/productivity";

export const metadata = {
  title: "Năng suất ekip",
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

  // 0ms navigation: we skip Server-blocking database queries here.
  // We just calculate the default period and render the client shell.
  // SWR will handle the fetching while showing the beautiful skeleton UI.
  return (
    <ProductivityPageClient
      initialPeriod={period}
    />
  );
}

