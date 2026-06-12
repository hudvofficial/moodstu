import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export function AccessDenied({ moduleName }: { moduleName: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8 animate-fade-in">
      <div className="w-16 h-16 bg-error/10 text-error rounded-full flex items-center justify-center mb-6">
        <ShieldAlert size={32} />
      </div>
      <h2 className="text-2xl font-bold mb-2 text-text-main">Không có quyền truy cập</h2>
      <p className="text-text-muted mb-8 max-w-md">
        Tài khoản của bạn hiện tại không có quyền xem chức năng <strong className="text-text-secondary">{moduleName}</strong>. 
        Nếu bạn tin rằng đây là lỗi, vui lòng tải lại trang hoặc liên hệ Quản trị viên.
      </p>
      <div className="flex gap-4">
        <Link 
          href="/dashboard" 
          className="px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          Quay lại Bảng điều khiển
        </Link>
      </div>
    </div>
  );
}