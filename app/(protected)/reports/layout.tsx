import { redirect } from "next/navigation";
import { AccessDenied } from "@/components/ui/access-denied";
import { getAuthenticatedUserContext } from "@/lib/auth_utils";
import { canAccess } from "@/types/roles";

export default async function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getAuthenticatedUserContext();

  if (!context) redirect("/login");
  if (!canAccess(context.shellRole, "reports")) return <AccessDenied moduleName="Báo cáo" />;

  return <div className="relative">{children}</div>;
}

