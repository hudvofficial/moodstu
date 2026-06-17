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
};

/**
 * Shared UI-side guard for contract status mutations.
 *
 * Handles both API result failures ({ success: false, error }) and actual
 * network/server exceptions (throws). It manages showing the appropriate toast
 * message and triggers the onFailure callback to rollback UI states, meaning
 * calling components do not need to wrap this in try-catch.
 */
export async function handleContractStatusUpdate({
  contractId,
  newStatus,
  queryClient,
  updateStatus,
  updateCache = updateContractStatusCache,
  onFailure,
}: HandleContractStatusUpdateParams): Promise<boolean> {
  const action = updateStatus ?? updateContractStatus;
  
  try {
    const result = await action(contractId, newStatus);

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
