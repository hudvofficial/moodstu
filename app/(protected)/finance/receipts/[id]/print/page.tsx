import { notFound } from "next/navigation";
import { getReceiptDetail } from "@/app/actions/finance-operations-queries";
import { getStudioInfo } from "@/app/actions/settings-queries";
import { PrintReceiptClient } from "@/components/finance/receipts/print-receipt-client";
import type { ReceiptPrintData } from "@/components/finance/receipts/print-receipt-client";

export const dynamic = "force-dynamic";

export default async function PrintReceiptPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const [receiptResult, studioResult] = await Promise.all([
    getReceiptDetail(params.id),
    getStudioInfo(),
  ]);

  if (!receiptResult.success || !receiptResult.data) notFound();

  return (
    <PrintReceiptClient
      receipt={receiptResult.data as ReceiptPrintData}
      studioInfo={studioResult.success ? studioResult.data : null}
    />
  );
}
