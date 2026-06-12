import { redirect } from "next/navigation";
import { AccessDenied } from "@/components/ui/access-denied";
import { getAuthenticatedUserContext } from "@/lib/auth_utils";
import { canAccess } from "@/types/roles";

export default async function EmployeesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getAuthenticatedUserContext();

  if (!context) redirect("/login");
  if (!canAccess(context.shellRole, "employees")) return <AccessDenied moduleName="Nhân sự" />;

  return <>{children}</>;
}

