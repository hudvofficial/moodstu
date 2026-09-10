import { redirect } from "next/navigation";
import { getAuthenticatedUserContext } from "@/lib/auth_utils";
import { canAccess } from "@/types/roles";
import { AccessDenied } from "@/components/ui/access-denied";

// /admin/* — công cụ quản trị (vendors, backfill). Role-gate tầng route (#22, T3): khoá "admin" trong ma trận
// = admin/manager, cùng nhóm với withAdmin ở tầng action.
export default async function AdminToolsLayout({ children }: { children: React.ReactNode }) {
  const context = await getAuthenticatedUserContext();

  if (!context) redirect("/login");
  if (!canAccess(context.shellRole, "admin")) return <AccessDenied moduleName="Công cụ quản trị" />;

  return <>{children}</>;
}
