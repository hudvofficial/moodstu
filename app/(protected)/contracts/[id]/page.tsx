import { getContractById } from "@/app/actions/contracts";
import { notFound } from "next/navigation";
import type {
  Contract,
  Payment,
  PaymentPlan,
  InventoryReservation,
  PrintingOrder,
  AuditLogEntry,
} from "@/types/contract";
import ContractDetailClient from "@/components/contracts/detail/contract-detail-client";

// ═══════════════════════════════════════════
// Contract Detail Page — Server Component
// Phase 04a→04e: Fetch data server-side → pass to client
// ═══════════════════════════════════════════

export default async function ContractDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  const result = await getContractById(id);

  if (!result.success || !result.data) {
    notFound();
  }

  const data = result.data as unknown as {
      contract: Contract;
      payments: Payment[];
      paymentPlans: PaymentPlan[];
      reservations: InventoryReservation[];
      printOrders: PrintingOrder[];
      auditLogs: AuditLogEntry[];
    };
  const { contract, payments, paymentPlans, reservations, printOrders, auditLogs } = data;

  return (
    <ContractDetailClient
      initialContract={contract}
      initialPayments={payments}
      initialPaymentPlans={paymentPlans}
      initialReservations={reservations}
      initialPrintOrders={printOrders}
      initialAuditLogs={auditLogs}
    />
  );
}
