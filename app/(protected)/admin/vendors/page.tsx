import { getAllVendors } from "@/app/actions/vendor-actions";
import { VendorsAdminClient } from "@/components/admin/vendors/vendors-admin-client";
import type { Vendor } from "@/types/vendor";

export const dynamic = "force-dynamic";

export default async function AdminVendorsPage() {
  const result = await getAllVendors();
  const vendors = result.success ? (result.data as Vendor[]) : [];

  return <VendorsAdminClient initialVendors={vendors} />;
}
