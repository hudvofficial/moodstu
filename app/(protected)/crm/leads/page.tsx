import { getLeads } from "@/app/actions/lead-actions";
import { LeadStatus, CrmLead } from "@/types/crm";
import LeadListPage from "@/components/crm/lead-list-page";

export default async function LeadsRoute({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // Parse searchparams
  const search = typeof searchParams.search === "string" ? searchParams.search : undefined;
  const status = typeof searchParams.status === "string" ? searchParams.status as LeadStatus : undefined;
  const source = typeof searchParams.source === "string" ? searchParams.source : undefined;
  const assigned = typeof searchParams.assigned === "string" ? searchParams.assigned : undefined;
  
  const page = typeof searchParams.page === "string" ? parseInt(searchParams.page, 10) : 1;
  const pageSize = 50; // Fix to 50 items/page as requested in Spec and confirmed by default

  // Fetch leads
  const result = await getLeads({
    search,
    status,
    source,
    assigned,
    page,
    pageSize,
  });

  if (!result.success) {
    throw new Error(result.error);
  }

  // Create derived stats object to pass to the client component
  // Since our basic getLeads might not return grouped stats, we fake it temporarily or calculate locally
  // Phase 02 specifies a stat bar, so we extract known info
  const total = result.data.total;
  
  // NOTE: A real implementation would fetch grouped stats. Since Phase 1 didn't write it, 
  // we pass a minimal stats object that the StatsBar will use.
  const stats = {
    total,
    active: 0,
    closed: 0,
    conversionRate: 0,
    byStatus: {} // Dummy stats object, to be implemented if getLeadStats action exists
  };

  return (
    <LeadListPage 
      leads={result.data.leads as CrmLead[]}
      stats={stats}
      total={total}
      page={result.data.page}
      pageSize={result.data.pageSize}
    />
  );
}
