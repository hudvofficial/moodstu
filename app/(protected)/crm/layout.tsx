import { redirect } from "next/navigation";
import { getAuthenticatedUserContext } from "@/lib/auth_utils";
import { canAccess } from "@/types/roles";
import { AccessDenied } from "@/components/ui/access-denied";

// CRM Layout — role-gate tầng route (#22, T3; C1: sale không còn trong ma trận crm).
// Sub-module navigation (Leads ↔ Customers) vẫn nằm inline trong từng page (Phase 02 + 03).
export default async function CRMLayout({ children }: { children: React.ReactNode }) {
  const context = await getAuthenticatedUserContext();

  if (!context) redirect("/login");
  if (!canAccess(context.shellRole, "crm")) return <AccessDenied moduleName="CRM" />;

  return <>{children}</>;
}
