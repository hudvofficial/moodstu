import { redirect } from "next/navigation";
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
  if (!canAccess(context.shellRole, "contracts")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8">
        <h2 className="text-2xl font-bold mb-2">Không có quyền truy cập</h2>
        <p className="text-text-muted mb-4">Tài khoản của bạn không có quyền xem Hợp đồng.</p>
        <a href="/dashboard" className="text-primary hover:underline">Quay lại Bảng điều khiển</a>
      </div>
    );
  }

  return <>{children}</>;
}

