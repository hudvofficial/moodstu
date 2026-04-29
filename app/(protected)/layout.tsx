import { redirect } from "next/navigation";
import { Toaster } from "sonner";
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

  return (
    <AppShell role={context.shellRole} userName={context.userName}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border)",
            fontSize: "14px",
          },
        }}
      />
    </AppShell>
  );
}

