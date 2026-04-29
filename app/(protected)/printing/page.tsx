import { getLabOptions } from "@/app/actions/lab-queries";
import {
  fetchPrintingOrders,
  getPrintingOrderStats,
} from "@/app/actions/printing-queries";
import PrintingListPage from "@/components/printing/printing-list-page";
import type { PrintingFilters } from "@/types/printing";
import type {
  PrintingOrderStatus,
  PrintingPaymentStatus,
} from "@/types/printing-constants";

export const metadata = {
  title: "In ấn",
};

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{
    status?: string;
    labId?: string;
    paymentStatus?: string;
    q?: string;
    page?: string;
  }>;
}

export default async function PrintingPage({ searchParams }: Props) {
  const params = await searchParams;
  const filters: PrintingFilters = {
    status: params.status as PrintingOrderStatus | "all" | undefined,
    labId: params.labId,
    paymentStatus: params.paymentStatus as
      | PrintingPaymentStatus
      | "all"
      | undefined,
    search: params.q,
    page: params.page ? Number(params.page) : 1,
  };

  const [ordersResult, statsResult, labOptionsResult] = await Promise.all([
    fetchPrintingOrders(filters),
    getPrintingOrderStats(),
    getLabOptions(),
  ]);

  if (!ordersResult.success) {
    throw new Error(ordersResult.error);
  }

  if (!statsResult.success) {
    throw new Error(statsResult.error);
  }

  if (!labOptionsResult.success) {
    throw new Error(labOptionsResult.error);
  }

  return (
    <PrintingListPage
      initialOrdersPage={ordersResult.data}
      initialStats={statsResult.data}
      initialLabOptions={labOptionsResult.data}
    />
  );
}

