"use client";

/**
 * 📋 ContractDrawer — Quick preview from contract list
 *
 * ⚡ 0ms Drawer — ALL data comes from list query (no separate fetch needed)
 * V2: DrawerContent + OperationsTabs extracted to drawer-tab-content.tsx
 */

import { useEffect } from "react";
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
import { prefetchContractDetail, useContractDrawerExtra } from "@/lib/hooks/use-contracts";

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

  useEffect(() => {
    if (!isOpen || !contractId) return;

    router.prefetch(`/contracts/${contractId}`);
    router.prefetch(`/contracts/${contractId}/edit`);
    prefetchContractDetail(contractId);
  }, [contractId, isOpen, router]);

  const contractCode = contract?.contract_code || "...";

  const status = contract?.status || "cho_xu_ly";
  const titleBadge = (
    <Badge variant={getStatusVariant(status)}>
      {getStatusLabel(status)}
    </Badge>
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
