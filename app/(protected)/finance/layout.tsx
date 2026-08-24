import { redirect } from "next/navigation";
import { AccessDenied } from "@/components/ui/access-denied";
import { getAuthenticatedUserContext } from "@/lib/auth_utils";
import { canAccess } from "@/types/roles";

// T-20260825: <FinanceRealtimeRefresh /> đã chuyển sang AppShell (components/layout/app-shell.tsx)
// — layout này là Server Component, re-render mỗi lần điều hướng vì các trang con force-dynamic,
// khiến kênh realtime bị đóng/mở lại giữa các trang /finance/*. AppShell là client component mount
// đúng 1 lần nên không còn remount theo từng lần chuyển trang con.

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
      {children}
    </div>
  );
}

