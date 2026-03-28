import { InventoryDetailPage } from "@/components/inventory/inventory-detail-page";

export const metadata = { title: "Chi tiết vật tư | Mood Studio" };

type Params = Promise<{ id: string }>;

export default async function InventoryDetailRoute({ params }: { params: Params }) {
  const { id } = await params;
  return <InventoryDetailPage id={id} />;
}
