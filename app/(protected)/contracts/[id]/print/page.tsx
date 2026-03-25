import { getContractDetail } from "@/app/actions/contract-queries";
import { getStudioInfo } from "@/app/actions/studio";
import { notFound } from "next/navigation";
import type {
  Contract,
  ContractItem,
  PaymentPlan,
  StudioInfo,
} from "@/types/contract";
import type { Customer } from "@/types/crm";
import PrintContractClient from "@/components/contracts/print/print-contract-client";

// ═══════════════════════════════════════════
// Print Contract Page — Server Component
// Phase 02B: REUSE getContractById() — no separate fetch
// + getStudioInfo() for logo/name/address
// ═══════════════════════════════════════════

export default async function PrintContractPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  // Parallel fetch: reuse existing + studio info
  const [contractResult, studioResult] = await Promise.all([
    getContractDetail(id),
    getStudioInfo(),
  ]);

  if (!contractResult.success || !contractResult.data) {
    notFound();
  }

  if (!studioResult.success || !studioResult.data) {
    notFound();
  }

  const data = contractResult.data as unknown as {
    contract: Contract & { customers: Customer };
    payments: unknown[];
    paymentPlans: PaymentPlan[];
  };

  const { contract } = data;
  const customer = contract.customers;
  const items = (contract.contract_items || []) as ContractItem[];
  const paymentPlans = data.paymentPlans || [];
  const studio = studioResult.data as unknown as StudioInfo;

  return (
    <PrintContractClient
      contract={contract}
      customer={customer}
      items={items}
      paymentPlans={paymentPlans}
      studio={studio}
    />
  );
}
