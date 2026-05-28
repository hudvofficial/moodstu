import InventoryListClient from "@/components/inventory/inventory-list-client";
import { getAuthenticatedUserContext } from "@/lib/auth_utils";

export const metadata = { title: "Kho vật tư" };
export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const context = await getAuthenticatedUserContext();
  const userRole = context?.shellRole || "viewer";

  return <InventoryListClient userRole={userRole} />;
}
