import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateContractStatus } from "@/app/actions/contract-mutations";
import { updateContractStatusCache } from "@/lib/hooks/use-contract-queries";
import type { ContractStatus } from "@/types/contract";

type UpdateContractStatusAction = typeof updateContractStatus;

type HandleContractStatusUpdateParams = {
  contractId: string;
  newStatus: ContractStatus;
  queryClient: QueryClient;
  updateStatus?: UpdateContractStatusAction;
  updateCache?: typeof updateContractStatusCache;
  onFailure?: () => void;
  /** Hiện hộp xác nhận khi server trả cảnh báo (nợ/việc dở). Mặc định window.confirm. */
  confirm?: (msg: string) => Promise<boolean>;
};

/**
 * Shared UI-side guard for contract status mutations.
 *
 * Handles both API result failures ({ success: false, error }) and actual
 * network/server exceptions (throws). It manages showing the appropriate toast
 * message and triggers the onFailure callback to rollback UI states, meaning
 * calling components do not need to wrap this in try-catch.
 *
 * Cảnh báo "Hoàn thành" khi còn nợ/việc dở do SERVER quyết (số tươi từ DB):
 * server trả { needsConfirmation, debt, unfinishedTasks } → hàm này hiện confirm
 * (mọi UI đi qua đây đều được gate) → user đồng ý thì gọi lại với confirmedWarnings=true.
 */
export async function handleContractStatusUpdate({
  contractId,
  newStatus,
  queryClient,
  updateStatus,
  updateCache = updateContractStatusCache,
  onFailure,
  confirm,
}: HandleContractStatusUpdateParams): Promise<boolean> {
  const action = updateStatus ?? updateContractStatus;

  try {
    let result = await action(contractId, newStatus);

    if (result.success) {
      const data = result.data as
        | { needsConfirmation?: boolean; debt?: number; unfinishedTasks?: number }
        | null;

      if (data?.needsConfirmation) {
        const debt = Number(data.debt) || 0;
        const tasks = Number(data.unfinishedTasks) || 0;
        let msg = "CẢNH BÁO: Hợp đồng này";
        if (debt > 0) msg += ` đang còn nợ ${debt.toLocaleString("vi-VN")}đ`;
        if (debt > 0 && tasks > 0) msg += " và";
        if (tasks > 0) msg += ` còn ${tasks} công việc chưa xong`;
        msg += ".\n\nBạn có chắc chắn muốn chuyển sang trạng thái Hoàn thành không?";

        const isConfirmed = confirm
          ? await confirm(msg)
          : typeof window !== "undefined" && window.confirm(msg);

        if (!isConfirmed) {
          onFailure?.();
          return false;
        }

        result = await action(contractId, newStatus, false, true);
      }
    }

    if (!result.success) {
      onFailure?.();
      toast.error(result.error || "Lỗi khi cập nhật trạng thái");
      return false;
    }

    updateCache(queryClient, contractId, newStatus);
    toast.success("Đã cập nhật trạng thái hợp đồng");
    return true;
  } catch (error: any) {
    onFailure?.();
    const errorMessage = error instanceof Error
      ? error.message
      : (typeof error === "object" && error !== null && "message" in error)
        ? String(error.message)
        : "Lỗi khi cập nhật trạng thái";

    toast.error(errorMessage);
    return false;
  }
}
