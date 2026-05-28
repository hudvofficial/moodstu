import { getLeads, getLeadStats } from "@/app/actions/lead-actions";
import { LeadStatus, CrmLead } from "@/types/crm";
import LeadListPage from "@/components/crm/lead-list-page";

export const metadata = { title: "Lead CRM" };

export default async function LeadsRoute(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  // Parse searchparams
  const search = typeof searchParams.search === "string" ? searchParams.search : undefined;
  const status = typeof searchParams.status === "string" ? searchParams.status as LeadStatus : undefined;
  const source = typeof searchParams.source === "string" ? searchParams.source : undefined;
  const assigned = typeof searchParams.assigned === "string" ? searchParams.assigned : undefined;
  
  const page = typeof searchParams.page === "string" ? parseInt(searchParams.page, 10) : 1;
  const pageSize = 50; // Fix to 50 items/page as requested in Spec and confirmed by default

  // ⚡ LOẠI BỎ CHẶN LUỒNG SERVER: Không await fetch data ở đây nữa.
  // Trả về Thin Server Shell để Next.js route chuyển trang 0ms.
  // Data sẽ được lấy từ SWR Cache hoặc tự động fetch ở Client.

  return (
    <LeadListPage 
      leads={[]}
      stats={undefined as any}
      total={0}
      page={page}
      pageSize={pageSize}
    />
  );
}

