import { notFound } from "next/navigation";
import { fetchInventoryDetail } from "@/app/actions/inventory-queries";
import { InventoryDetailPage } from "@/components/inventory/inventory-detail-page";

export const metadata = { title: "Chi tiết vật tư" };
export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function InventoryDetailRoute({ params }: { params: Params }) {
  const { id } = await params;
  const detail = await fetchInventoryDetail(id);

  if (!detail) notFound();

  return <InventoryDetailPage id={id} initialDetail={detail} />;
}

