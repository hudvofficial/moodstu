import { redirect } from "next/navigation";
import { AccessDenied } from "@/components/ui/access-denied";
import { getAuthenticatedUserContext } from "@/lib/auth_utils";
import { canAccess } from "@/types/roles";
import { FinanceRealtimeRefresh } from "@/components/finance/finance-realtime-refresh";

export default async function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getAuthenticatedUserContext();

  if (!context) redirect("/login");
  if (!canAccess(context.shellRole, "finance")) return <AccessDenied moduleName="Tài chính" />;

  return (
    <div className="relative">
      <FinanceRealtimeRefresh />
      {children}
    </div>
  );
}

