import { getLeads, getLeadStats } from "@/app/actions/lead-actions";
import { LeadStatus, CrmLead } from "@/types/crm";
import LeadListPage from "@/components/crm/lead-list-page";

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

  const [result, statsResult] = await Promise.all([
    getLeads({
      search,
      status,
      source,
      assigned_to: assigned,
      page,
      pageSize,
    }),
    getLeadStats(),
  ]);

  if (!result.success) {
    throw new Error(result.error);
  }

  if (!statsResult.success) {
    throw new Error(statsResult.error);
  }
  
  const stats = statsResult.data;

  return (
    <LeadListPage 
      leads={result.data.leads as CrmLead[]}
      stats={stats}
      total={result.data.total}
      page={result.data.page}
      pageSize={result.data.pageSize}
    />
  );
}
