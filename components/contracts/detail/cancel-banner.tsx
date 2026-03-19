"use client";

import { useState } from "react";
import { AlertTriangle, RotateCcw, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { reactivateContract } from "@/app/actions/contract-lifecycle";
import { useRouter } from "next/navigation";

// ═══════════════════════════════════════════
// Cancel Banner — Warning when contract is cancelled
// Phase 08: + Reactivate button
// ═══════════════════════════════════════════

interface Props {
  contractId: string;
  notes: string | null;
  updatedAt: string;
}

export default function CancelBanner({ contractId, notes, updatedAt }: Props) {
  const router = useRouter();
  const [isReactivating, setIsReactivating] = useState(false);

  async function handleReactivate() {
    if (!confirm("Bạn có chắc muốn kích hoạt lại hợp đồng này?")) return;
    setIsReactivating(true);
    try {
      const result = await reactivateContract(contractId);
      if (!result.success) {
        alert(result.error);
      } else {
        router.refresh();
      }
    } catch {
      alert("Lỗi kích hoạt lại hợp đồng");
    } finally {
      setIsReactivating(false);
    }
  }

  return (
    <div
      className="flex items-start gap-3 p-4 rounded-2xl
                 bg-red-50 shadow-sm"
      role="alert"
    >
      <div className="shrink-0 p-2 rounded-xl bg-red-100">
        <AlertTriangle size={20} className="text-red-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-body-sm font-bold text-red-700">
          Hợp đồng đã bị hủy
        </p>
        {notes && (
          <p className="text-caption text-red-600 mt-0.5">
            Lý do: {notes}
          </p>
        )}
        <p className="text-caption text-red-400 mt-1">
          Cập nhật: {formatDate(updatedAt, "long")}
        </p>
      </div>
      <button
        onClick={handleReactivate}
        disabled={isReactivating}
        className="shrink-0 flex items-center gap-1.5 rounded-radius-md bg-red-100 px-3 py-1.5 text-caption font-medium text-red-700 hover:bg-red-200 disabled:opacity-50 transition-colors"
      >
        {isReactivating ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <RotateCcw size={14} />
        )}
        Kích hoạt lại
      </button>
    </div>
  );
}
