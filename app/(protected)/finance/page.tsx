import { redirect } from "next/navigation";
import { getAuthenticatedUserContext } from "@/lib/auth_utils";
import { canAccess } from "@/types/roles";
import { FinanceDashboardClient } from "@/components/finance/dashboard/finance-dashboard-client";

export const metadata = { title: "Tài chính" };
export const dynamic = "force-dynamic";

export default async function FinanceDashboardPage() {
  // ⚡ LOẠI BỎ CHẶN LUỒNG: Auth check chạy trong 0ms (Cache cookie). Không gọi DB ở đây.
  const context = await getAuthenticatedUserContext();
  
  if (!context) {
    redirect("/login");
  }

  if (!canAccess(context.shellRole, "finance")) {
    throw new Error("Bạn không có quyền truy cập Tài chính");
  }

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  return (
    <FinanceDashboardClient
      initialMonth={month}
      initialYear={year}
      role={context.shellRole}
      // KHÔNG truyền initialMetrics hay bất kỳ Server data nào nữa
      // SWR ở Client sẽ tự động trigger Skeleton và Fetch data tức thì!
    />
  );
}
