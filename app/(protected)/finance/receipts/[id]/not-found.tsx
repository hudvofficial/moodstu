import Link from "next/link";
import { SearchX } from "lucide-react";

export default function ReceiptNotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center p-8 entrance entrance-1">
      <div className="icon-box bg-surface-elevated">
        <SearchX className="w-8 h-8 text-text-muted" />
      </div>
      <div>
        <h1 className="text-h2 text-text-primary">Không tìm thấy phiếu thu</h1>
        <p className="text-body-sm text-text-secondary mt-1">
          Dữ liệu phiếu thu không tồn tại hoặc đã bị xóa khỏi hệ thống.
        </p>
      </div>
      <Link href="/finance/receipts" className="btn-secondary mt-2">
        Quay lại danh sách
      </Link>
    </div>
  );
}
