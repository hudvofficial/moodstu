import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getAuthenticatedUserContext } from "@/lib/auth_utils";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getAuthenticatedUserContext();

  if (!context) {
    redirect("/login");
  }

  if (context.isEmployeeDisabled) {
    redirect("/account-disabled");
  }

  return (
    <AppShell role={context.shellRole} userName={context.userName}>
      {children}
    </AppShell>
  );
}

