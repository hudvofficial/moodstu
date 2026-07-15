"use client";

/**
 * 📋 ContractDrawer — Quick preview from contract list
 *
 * ⚡ 0ms Drawer — ALL data comes from list query (no separate fetch needed)
 * V2: DrawerContent + OperationsTabs extracted to drawer-tab-content.tsx
 */

import { useEffect, useCallback, useMemo, useRef } from "react";
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
import type { ContractStatus, ContractEvent, ContractChecklist, WorkTask, PaymentPlan } from "@/types/contract";
import { DrawerContent, type DrawerEvent, type DrawerChecklist, type DrawerWorkTask } from "./drawer-tab-content";
import { useRealtimeMulti } from "@/hooks/use-realtime-multi";
import type { RealtimeMultiConfig } from "@/hooks/use-realtime-multi";
import { realtimeSignalConfig } from "@/hooks/use-realtime-signal";
import { useQueryClient } from "@tanstack/react-query";
import { prefetchContractDetail, useContractDrawerExtra, contractKeys, isRecentChecklistSelfMutation } from "@/lib/hooks/use-contract-queries";
import type { RealtimePayload } from "@/hooks/use-realtime-multi";

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
  const queryClient = useQueryClient();
  const contractId = contract?.id || null;
  // Seed list data (events/checklists/tasks/payment_plans đã JOIN sẵn ở list query) làm placeholder
  // → tabs hiện NGAY khi mở drawer, fetch full ở nền (fix skeleton "đợi" dù data đã có).
  const drawerPlaceholder = useMemo(
    () =>
      contract
        ? {
            events: (contract.contract_events ?? []) as unknown as ContractEvent[],
            checklists: (contract.contract_checklists ?? []) as unknown as ContractChecklist[],
            workTasks: (contract.work_tasks ?? []) as unknown as WorkTask[],
            paymentPlans: (contract.payment_plans ?? []) as unknown as PaymentPlan[],
          }
        : undefined,
    [contract],
  );
  const { events, checklists, workTasks, paymentPlans, isLoadingExtra } =
    useContractDrawerExtra(isOpen ? contractId : null, drawerPlaceholder);

  const checklistReconcileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (checklistReconcileTimerRef.current) clearTimeout(checklistReconcileTimerRef.current);
  }, []);

  const handleDrawerRealtime = useCallback((payload: RealtimePayload) => {
    if (contractId) {
      // Signal (Signal ≠ Data) không mang row data → không patch được từ payload.
      // Tick checklist của chính mình đã sync đủ (optimistic patch + server confirm) —
      // KHÔNG refetch ngay (drawer đứng im). Hẹn 1 lần reconcile im lặng sau khi cửa sổ
      // khép: người khác sửa trùng cửa sổ thì data thật về; không đổi thì structural
      // sharing giữ reference → không re-render.
      if (payload.table === "contract_checklists" && isRecentChecklistSelfMutation()) {
        if (checklistReconcileTimerRef.current) clearTimeout(checklistReconcileTimerRef.current);
        checklistReconcileTimerRef.current = setTimeout(() => {
          checklistReconcileTimerRef.current = null;
          void queryClient.invalidateQueries({ queryKey: contractKeys.drawerExtra(contractId) });
        }, 3500);
        return;
      }

      void queryClient.invalidateQueries({ queryKey: contractKeys.drawerExtra(contractId) });
      void queryClient.invalidateQueries({ queryKey: contractKeys.detail(contractId) });
    }
  }, [contractId, queryClient]);

  const realtimeConfigs = useMemo<RealtimeMultiConfig[]>(() => {
    if (!contractId || !isOpen) return [];
    return [
      realtimeSignalConfig("contract_notes"),
      realtimeSignalConfig("contract_events"),
      realtimeSignalConfig("contract_checklists"),
      realtimeSignalConfig("work_tasks"),
      realtimeSignalConfig("payment_plans"),
    ];
  }, [contractId, isOpen]);

  useRealtimeMulti(realtimeConfigs, {
    channelName: `drawer-${contractId}`,
    onChange: handleDrawerRealtime,
    debounceMs: 500,
  });

  // Đã loại bỏ useEffect tự động prefetch khi mở Drawer để tránh Over-fetching.
  // Quá trình prefetch sẽ được thực hiện khi user hover vào nút Chi tiết (onHoverDetail).

  const contractCode = contract?.contract_code || "...";

  const status = contract?.status || "cho_xu_ly";
  
  const titleBadge = (
    <ContractStatusBadge
      contractId={contractId}
      currentStatus={status}
    />
  );

  const headerRight = contractId ? (
    <>
      <Button unstyled
        onClick={() => {
          // push trực tiếp, KHÔNG onClose: điều hướng sang route khác tự unmount list+drawer
          // (gọi onClose trước push gây race nuốt navigation → phải bấm 2 lần).
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
          // push trước, KHÔNG onClose: navigation tự unmount list+drawer (fix "bấm 2 lần mới mở chi tiết").
          router.push(`/contracts/${contractId}`);
        }}
        onHoverDetail={() => {
          if (contractId) {
            router.prefetch(`/contracts/${contractId}`);
            prefetchContractDetail(queryClient, contractId);
          }
        }}
        onTrackPayment={() => {
          router.push(`/contracts/${contractId}#section-payment`);
        }}
      />
    </Drawer>
  );
}

// ─── STATUS UPDATER ──────────────────────────────

import { useState } from "react";
import { SelectStatus } from "@/components/ui/select/SelectStatus";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { handleContractStatusUpdate } from "@/lib/contracts/update-contract-status-ui";

function ContractStatusBadge({
  contractId,
  currentStatus,
}: {
  contractId: string | null;
  currentStatus: string;
}) {
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
          await handleContractStatusUpdate({
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
