import { fetchLabsList } from "@/app/actions/lab-queries";
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
  title: "Printing | Mood Studio",
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

  const [ordersResult, statsResult, labsResult] = await Promise.all([
    fetchPrintingOrders(filters),
    getPrintingOrderStats(),
    fetchLabsList(),
  ]);

  if (!ordersResult.success) {
    throw new Error(ordersResult.error);
  }

  if (!statsResult.success) {
    throw new Error(statsResult.error);
  }

  if (!labsResult.success) {
    throw new Error(labsResult.error);
  }

  return (
    <PrintingListPage
      initialOrdersPage={ordersResult.data}
      initialStats={statsResult.data}
      initialLabs={labsResult.data}
    />
  );
}
