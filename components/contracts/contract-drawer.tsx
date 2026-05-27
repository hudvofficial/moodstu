"use client";

/**
 * 📋 ContractDrawer — Quick preview from contract list
 *
 * ⚡ 0ms Drawer — ALL data comes from list query (no separate fetch needed)
 * V2: DrawerContent + OperationsTabs extracted to drawer-tab-content.tsx
 */

import { useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Printer,
  Pencil,
} from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getStatusLabel,
  CONTRACT_STATUS_MAP,
} from "@/types/contract-constants";
import type { ContractStatus } from "@/types/contract";
import { DrawerContent, type DrawerEvent, type DrawerChecklist, type DrawerWorkTask } from "./drawer-tab-content";
import { useRealtimeMulti } from "@/hooks/use-realtime-multi";
import type { RealtimeMultiConfig } from "@/hooks/use-realtime-multi";
import { mutate } from "swr";
import { prefetchContractDetail, useContractDrawerExtra, contractKeys } from "@/lib/hooks/use-contracts";

// ─── TYPES ───────────────────────────────────────

/** Full contract data available from list query (0ms — no fetch needed) */
export interface ContractListItem {
  id: string;
  contract_code: string | null;
  status: ContractStatus | null;
  service_type: string | null;
  work_date: string | null;
  contract_date: string | null;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  customer_id: string | null;
  customers?: {
    id: string;
    full_name: string;
    phone?: string | null;
    address?: string | null;
  } | null;
  // Drawer sections (from list query JOINs)
  contract_events?: DrawerEvent[];
  contract_checklists?: DrawerChecklist[];
  work_tasks?: DrawerWorkTask[];
  payment_plans?: Record<string, unknown>[];
  contract_notes?: { id: string; content: string; created_by: string; created_at: string }[];
}

interface ContractDrawerProps {
  contract: ContractListItem | null;
  isOpen: boolean;
  onClose: () => void;
}

// ─── HELPERS ─────────────────────────────────────

function getStatusVariant(
  status: ContractStatus
): "info" | "warning" | "success" | "error" {
  return CONTRACT_STATUS_MAP[status]?.variant || "info";
}

// ─── MAIN COMPONENT ─────────────────────────────

export function ContractDrawer({
  contract,
  isOpen,
  onClose,
}: ContractDrawerProps) {
  const router = useRouter();
  const contractId = contract?.id || null;
  const { events, checklists, workTasks, paymentPlans, isLoadingExtra } =
    useContractDrawerExtra(isOpen ? contractId : null);

  const handleDrawerRealtime = useCallback(() => {
    if (contractId) {
      void mutate(contractKeys.drawerExtra(contractId));
      void mutate(contractKeys.detail(contractId));
    }
  }, [contractId]);

  const realtimeConfigs = useMemo<RealtimeMultiConfig[]>(() => {
    if (!contractId || !isOpen) return [];
    const filter = `contract_id=eq.${contractId}`;
    return [
      { table: "contract_notes", filter },
      { table: "contract_events", filter },
      { table: "contract_checklists", filter, eventTypes: ["INSERT", "UPDATE", "DELETE"] },
      { table: "work_tasks", filter },
      { table: "payment_plans", filter },
    ];
  }, [contractId, isOpen]);

  useRealtimeMulti(realtimeConfigs, {
    channelName: `drawer-${contractId}`,
    onChange: handleDrawerRealtime,
    debounceMs: 500,
  });

  useEffect(() => {
    if (!isOpen || !contractId) return;

    router.prefetch(`/contracts/${contractId}`);
    router.prefetch(`/contracts/${contractId}/edit`);
    prefetchContractDetail(contractId); // ⚡ Warm SWR cache before navigation
  }, [contractId, isOpen, router]);

  const contractCode = contract?.contract_code || "...";

  const status = contract?.status || "cho_xu_ly";
  
  const titleBadge = (
    <ContractStatusBadge 
      contractId={contractId} 
      currentStatus={status} 
      remainingAmount={contract?.remaining_amount || 0}
      unfinishedTasksCount={(workTasks as DrawerWorkTask[] || contract?.work_tasks || []).filter(t => t.status !== "hoan_thanh" && t.status !== "da_huy").length}
    />
  );

  const headerRight = contractId ? (
    <>
      <Button unstyled
        onClick={() => {
          onClose();
          router.push(`/contracts/${contractId}/edit`);
        }}
        className="btn-icon"
        title="Sửa hợp đồng"
      >
        <Pencil className="w-4 h-4 text-text-secondary" />
      </Button>
      <a
        href={`/contracts/${contractId}/print`}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-icon"
        title="In hợp đồng"
      >
        <Printer className="w-4 h-4 text-text-secondary" />
      </a>
    </>
  ) : null;

  if (!contract || !isOpen) return null;

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={contractCode} titleBadge={titleBadge} headerRight={headerRight}>
      <DrawerContent
        contract={contract}
        extra={{ 
          events: events as unknown as DrawerEvent[], 
          checklists: checklists as unknown as DrawerChecklist[], 
          workTasks: workTasks as unknown as DrawerWorkTask[], 
          paymentPlans 
        }}
        isLoadingExtra={isLoadingExtra}
        onViewDetail={() => {
          onClose();
          router.push(`/contracts/${contractId}`);
        }}
        onTrackPayment={() => {
          onClose();
          router.push(`/contracts/${contractId}#section-payment`);
        }}
      />
    </Drawer>
  );
}

// ─── STATUS UPDATER ──────────────────────────────

import { useState } from "react";
import { toast } from "sonner";
import { updateContractStatus } from "@/app/actions/contract-mutations";
import { SelectStatus } from "@/components/ui/select/SelectStatus";
import { updateContractStatusCache } from "@/lib/hooks/use-contracts";

function ContractStatusBadge({ 
  contractId, 
  currentStatus,
  remainingAmount = 0,
  unfinishedTasksCount = 0
}: { 
  contractId: string | null; 
  currentStatus: string;
  remainingAmount?: number;
  unfinishedTasksCount?: number;
}) {
  const [optimisticStatus, setOptimisticStatus] = useState(currentStatus);

  useEffect(() => {
    setOptimisticStatus(currentStatus);
  }, [currentStatus]);

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
    <SelectStatus
      current={optimisticStatus}
      options={options}
      variant="compact"
      onUpdate={async (newStatus) => {
        const debt = Number(remainingAmount) || 0;
        const tasks = Number(unfinishedTasksCount) || 0;

        if (newStatus === "hoan_thanh" && (debt > 0 || tasks > 0)) {
          let msg = `CẢNH BÁO: Hợp đồng này`;
          if (debt > 0) msg += ` đang còn nợ ${debt.toLocaleString("vi-VN")}đ`;
          if (debt > 0 && tasks > 0) msg += ` và`;
          if (tasks > 0) msg += ` còn ${tasks} công việc chưa xong`;
          msg += `.\n\nBạn có chắc chắn muốn chuyển sang trạng thái Hoàn thành không?`;
          
          // Fix: Radix UI dropdown closes and restores focus, which can instantly dismiss window.confirm.
          // Delaying the confirm by 50ms ensures Radix finishes its focus management first.
          const isConfirmed = await new Promise((resolve) => {
            setTimeout(() => {
              resolve(window.confirm(msg));
            }, 50);
          });

          if (!isConfirmed) {
            setOptimisticStatus(currentStatus);
            throw new Error("USER_CANCELLED");
          }
        }

        try {
          setOptimisticStatus(newStatus as ContractStatus);
          await updateContractStatus(contractId, newStatus as ContractStatus);
          updateContractStatusCache(contractId, newStatus as ContractStatus);
          toast.success("Đã cập nhật trạng thái hợp đồng");
        } catch (error: any) {
          setOptimisticStatus(currentStatus);
          if (error.message !== "USER_CANCELLED") {
            toast.error(error.message || "Lỗi khi cập nhật trạng thái");
          }
          throw error; // Re-throw to reset SelectStatus
        }
      }}
    />
  );
}
