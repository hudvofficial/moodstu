import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Toaster } from "sonner";
import { Role } from "@/types/roles";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // TODO: [PRODUCTION] Khi implement multi-user:
  // 1. Đọc role từ app_metadata (không phải user_metadata — user tự sửa được)
  // 2. Fallback: query employees table
  // 3. Fail-closed: không có role → "viewer"
  // Hiện tại: dev-only, chỉ owner dùng → default admin
  const role = (user.user_metadata?.role as Role) || "admin";
  const userName = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";

  return (
    <AppShell role={role} userName={userName}>
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
