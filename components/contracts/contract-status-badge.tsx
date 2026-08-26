"use client";

/**
 * ContractStatusBadge — pill trạng thái hợp đồng (SSOT), đổi được trạng thái.
 * Dùng ở header drawer vận hành (contract-drawer.tsx) + drawer lợi nhuận (profit-detail-drawer.tsx).
 */

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { SelectStatus } from "@/components/ui/select/SelectStatus";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { handleContractStatusUpdate } from "@/lib/contracts/update-contract-status-ui";
import {
  getStatusLabel,
  CONTRACT_STATUS_MAP,
} from "@/types/contract-constants";
import type { ContractStatus } from "@/types/contract";

function getStatusVariant(
  status: ContractStatus
): "info" | "warning" | "success" | "error" {
  return CONTRACT_STATUS_MAP[status]?.variant || "info";
}

interface ContractStatusBadgeProps {
  contractId: string | null;
  currentStatus: string;
  /** Gọi sau khi server xác nhận đổi trạng thái thành công (drawer lợi nhuận dùng để revalidate SWR) */
  onUpdated?: (newStatus: ContractStatus) => void;
}

export function ContractStatusBadge({
  contractId,
  currentStatus,
  onUpdated,
}: ContractStatusBadgeProps) {
  const queryClient = useQueryClient();
  const [optimisticStatus, setOptimisticStatus] = useState(currentStatus);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    msg: string;
    resolve: ((value: boolean) => void) | null;
  }>({
    isOpen: false,
    msg: "",
    resolve: null,
  });

  const showConfirm = (msg: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        msg,
        resolve,
      });
    });
  };

  const [prevCurrentStatus, setPrevCurrentStatus] = useState(currentStatus);
  if (currentStatus !== prevCurrentStatus) {
    setPrevCurrentStatus(currentStatus);
    setOptimisticStatus(currentStatus);
  }

  if (!contractId) {
    return (
      <Badge variant={getStatusVariant(currentStatus as ContractStatus)}>
        {getStatusLabel(currentStatus as ContractStatus)}
      </Badge>
    );
  }

  const options = Object.entries(CONTRACT_STATUS_MAP).map(([val, info]) => {
    let color = "#cbd5e1"; // default neutral
    if (info.variant === "success") color = "#22c55e";
    if (info.variant === "warning") color = "#f59e0b";
    if (info.variant === "info") color = "#3b82f6";
    if (info.variant === "error") color = "#ef4444";
    return {
      value: val,
      label: info.label,
      color,
    };
  });

  return (
    <>
      <SelectStatus
        current={optimisticStatus}
        options={options}
        variant="compact"
        onUpdate={async (newStatus) => {
          // Cảnh báo nợ/việc dở giờ do SERVER quyết (số tươi từ DB) qua handler chung —
          // bỏ pre-check client (data từ list JOIN có thể cũ). Dialog đẹp truyền qua `confirm`.
          setOptimisticStatus(newStatus as ContractStatus);
          const ok = await handleContractStatusUpdate({
            contractId,
            newStatus: newStatus as ContractStatus,
            queryClient,
            onFailure: () => setOptimisticStatus(currentStatus),
            confirm: async (msg) => {
              // Chờ Radix đóng dropdown + trả focus xong rồi mới mở dialog
              await new Promise((r) => setTimeout(r, 50));
              const ok = await showConfirm(msg);
              if (!ok) setOptimisticStatus(currentStatus);
              return ok;
            },
          });
          if (ok) onUpdated?.(newStatus as ContractStatus);
        }}
      />
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        onClose={() => {
          setConfirmState(prev => ({ ...prev, isOpen: false }));
          if (confirmState.resolve) confirmState.resolve(false);
        }}
        onConfirm={() => {
          setConfirmState(prev => ({ ...prev, isOpen: false }));
          if (confirmState.resolve) confirmState.resolve(true);
        }}
        title="Xác nhận chuyển trạng thái"
        message={confirmState.msg}
        confirmLabel="Đồng ý hoàn thành"
        variant="warning"
      />
    </>
  );
}
