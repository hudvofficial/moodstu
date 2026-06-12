import { redirect } from "next/navigation";
import { AccessDenied } from "@/components/ui/access-denied";
import { getAuthenticatedUserContext } from "@/lib/auth_utils";
import { canAccess } from "@/types/roles";

export default async function PrintingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getAuthenticatedUserContext();

  if (!context) redirect("/login");
  if (!canAccess(context.shellRole, "printing")) return <AccessDenied moduleName="In ấn" />;

  return <>{children}</>;
}

