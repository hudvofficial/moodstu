import { redirect } from "next/navigation";
import { getAuthenticatedUserContext } from "@/lib/auth_utils";
import { canAccess } from "@/types/roles";
import { AccessDenied } from "@/components/ui/access-denied";

/* Settings layout — role-gate tầng route (#22, T3): đọc ma trận ROLE_PERMISSIONS, cùng mẫu contracts/layout */
export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getAuthenticatedUserContext();

  if (!context) redirect("/login");
  if (!canAccess(context.shellRole, "settings")) return <AccessDenied moduleName="Cài đặt" />;

  return <>{children}</>;
}
