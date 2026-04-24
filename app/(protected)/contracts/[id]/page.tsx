import { getContractDetail } from "@/app/actions/contract-queries";
import { getActiveEmployees } from "@/app/actions/employee-queries";
import { notFound } from "next/navigation";
import type {
  Contract,
  Payment,
  PaymentPlan,
  DressReservationRow,
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

  const [result, employeesResult] = await Promise.all([
    getContractDetail(id),
    getActiveEmployees(),
  ]);

  if (!result.success || !result.data) {
    notFound();
  }

  const data = result.data as unknown as {
      contract: Contract;
      payments: Payment[];
      paymentPlans: PaymentPlan[];
      reservations: DressReservationRow[];
      printOrders: PrintingOrder[];
      auditLogs: AuditLogEntry[];
    };
  const { contract, payments, paymentPlans, reservations, printOrders, auditLogs } = data;
  const activeEmployees = (employeesResult.success && employeesResult.data) ? employeesResult.data : [];

  return (
    <ContractDetailClient
      initialContract={contract}
      initialPayments={payments}
      initialPaymentPlans={paymentPlans}
      initialReservations={reservations}
      initialPrintOrders={printOrders}
      initialAuditLogs={auditLogs}
      activeEmployees={activeEmployees}
    />
  );
}
