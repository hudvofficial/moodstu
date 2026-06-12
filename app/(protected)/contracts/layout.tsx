import { redirect } from "next/navigation";
import { AccessDenied } from "@/components/ui/access-denied";
import { getAuthenticatedUserContext } from "@/lib/auth_utils";
import { canAccess } from "@/types/roles";

export default async function ContractsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getAuthenticatedUserContext();

  if (!context) redirect("/login");

  // Fix lỗi "giựt về dashboard": khi fetch role bị chậm hoặc middleware refresh chưa kịp,
  // `canAccess` có thể trả về false. Nếu redirect lập tức, UI sẽ giựt. 
  // Thay vì redirect("/dashboard"), ta ném Error hoặc render fallback để user biết.
  // Nhưng vì lỗi gốc (thiếu middleware.ts) đã được fix, ta giữ nguyên redirect HOẶC đổi thành block component.
  if (!canAccess(context.shellRole, "contracts")) return <AccessDenied moduleName="Hợp đồng" />;

  return <>{children}</>;
}

