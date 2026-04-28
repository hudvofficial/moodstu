"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, FilterX, Kanban, List, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { getLeads, getLeadStats } from "@/app/actions/lead-actions";
import { moveLeadToStage } from "@/app/actions/lead-lifecycle";
import type { CrmLead, LeadStats, LeadStatus } from "@/types/crm";
import { cacheKeys, revalidateByPrefixes, useSWR } from "@/lib/swr";
import { useRealtime } from "@/hooks/use-realtime";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/ux-states";
import { FAB } from "@/components/ui/fab";
import { Pagination } from "@/components/ui/pagination";
import { useIsMobile } from "@/hooks/use-mobile";
import { CrmDashboardLayout } from "./crm-dashboard-layout";
import LeadStatsBar from "./lead-stats-bar";
import LeadFilters from "./lead-filters";
import LeadCompactCard from "./lead-compact-card";
import LeadCard from "./lead-card";
import LeadDetailDrawer from "./lead-detail-drawer";
import LeadFormModal from "./lead-form-modal";
import { WidgetSourceDonut } from "./widgets/widget-source-donut";
import { WidgetUpcoming } from "./widgets/widget-upcoming";
import { WidgetSalesFunnel } from "./widgets/widget-sales-funnel";
import { CrmSubnav } from "./crm-subnav";
import { CrmToolbarSurface } from "./crm-toolbar-surface";
import { CrmViewSwitch } from "./crm-view-switch";

const PipelineBoard = dynamic(() => import("./pipeline-board"), {
  ssr: false,
  loading: () => (
    <div className="card-base grid min-h-[360px] place-items-center text-body-sm text-text-muted">
      Đang tải Kanban...
    </div>
  ),
});

interface Props {
  leads: CrmLead[];
  stats: LeadStats;
  total: number;
  page: number;
  pageSize: number;
}

type StatusOverride = { from: LeadStatus; to: LeadStatus };

const LEAD_VIEW_ITEMS = [
  { value: "table", label: "Danh sách", icon: List },
  { value: "kanban", label: "Kanban", icon: Kanban },
] as const;

export default function LeadListPage({
  leads: initialLeads,
  stats: initialStats,
  total: initialTotal,
  page: initialPage,
  pageSize: initialPageSize,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const isMobile = useIsMobile();

  const [showForm, setShowForm] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, StatusOverride>
  >({});

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const search = searchParams.get("search") || undefined;
  const status = (searchParams.get("status") || undefined) as LeadStatus | undefined;
  const source = searchParams.get("source") || undefined;
  const assigned = searchParams.get("assigned") || undefined;
  const pageParam = Number(searchParams.get("page") || initialPage || 1);

  const fallbackList = useMemo(
    () => ({
      leads: initialLeads,
      total: initialTotal,
      page: initialPage,
      pageSize: initialPageSize,
    }),
    [initialLeads, initialTotal, initialPage, initialPageSize],
  );

  const listQuery = useSWR(
    [
      cacheKeys.leads(),
      search || "",
      status || "",
      source || "",
      assigned || "",
      String(pageParam),
      String(initialPageSize),
    ],
    async () => {
      const result = await getLeads({
        search,
        status,
        source,
        assigned_to: assigned,
        page: pageParam,
        pageSize: initialPageSize,
      });
      if (!result.success) throw new Error(result.error);
      return {
        leads: result.data.leads as CrmLead[],
        total: result.data.total,
        page: result.data.page,
        pageSize: result.data.pageSize,
      };
    },
    { fallbackData: fallbackList },
  );

  const statsQuery = useSWR(
    `${cacheKeys.leads()}:stats`,
    async () => {
      const result = await getLeadStats();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    { fallbackData: initialStats },
  );

  const listData = listQuery.data || fallbackList;
  const leads = listData.leads;
  const stats = statsQuery.data || initialStats;
  const total = listData.total;
  const page = listData.page;
  const pageSize = listData.pageSize;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const scheduleRefresh = useCallback(
    (delay = 0) => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => {
        refreshTimerRef.current = null;
        startTransition(() => {
          void revalidateByPrefixes(cacheKeys.leads());
        });
      }, delay);
    },
    [startTransition],
  );

  const visibleLeads = useMemo(
    () =>
      leads.map((lead) => {
        const override = statusOverrides[lead.id];
        return override && override.from === lead.status
          ? { ...lead, status: override.to }
          : lead;
      }),
    [leads, statusOverrides],
  );

  useRealtime("crm_leads", {
    prefixes: cacheKeys.leads(),
    debounceMs: 600,
  });

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  const handlePageChange = useCallback(
    (newPage: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newPage > 1) params.set("page", String(newPage));
      else params.delete("page");

      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [pathname, router, searchParams, startTransition],
  );

  const hasFilters = Boolean(
    searchParams.get("search") ||
      searchParams.get("status") ||
      searchParams.get("source") ||
      searchParams.get("assigned"),
  );

  const clearFilters = () => {
    startTransition(() => {
      router.push(pathname);
    });
  };

  const handleCreateLead = () => {
    setShowForm(true);
  };

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    const nextStatus = newStatus as LeadStatus;
    const baseLead = leads.find((lead) => lead.id === leadId);
    if (!baseLead) return;

    const previousOverride = statusOverrides[leadId];
    setStatusOverrides((current) => ({
      ...current,
      [leadId]: { from: baseLead.status, to: nextStatus },
    }));

    const rollbackStatus = () => {
      setStatusOverrides((current) => {
        const next = { ...current };
        if (previousOverride) next[leadId] = previousOverride;
        else delete next[leadId];
        return next;
      });
    };

    try {
      const result = await moveLeadToStage(leadId, nextStatus);
      if (!result.success) {
        rollbackStatus();
        toast.error(result.error || "Không thể cập nhật trạng thái");
        return;
      }

      scheduleRefresh();
      toast.success("Đã cập nhật trạng thái");
    } catch (error: unknown) {
      rollbackStatus();
      if (error instanceof Error) {
        toast.error(error.message || "Không thể cập nhật trạng thái");
      } else {
        toast.error("Không thể cập nhật trạng thái");
      }
    }
  };

  const handleDataChanged = useCallback(() => {
    scheduleRefresh();
  }, [scheduleRefresh]);

  const widgetsContent = (
    <>
      <div className="shrink-0">
        <WidgetSalesFunnel stats={stats} />
      </div>
      <div className="shrink-0">
        <WidgetSourceDonut bySource={stats.bySource || {}} total={stats.total} />
      </div>
      <div className="shrink-0">
        <WidgetUpcoming />
      </div>
    </>
  );

  return (
    <>
      <div className="main-container gap-3!">
        <CrmSubnav activeHref="/crm/leads" className="lg:hidden px-1" />

        <CrmToolbarSurface>
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <CrmSubnav
              activeHref="/crm/leads"
              className="hidden shrink-0 lg:flex"
            />
            <div className="hidden h-6 w-px shrink-0 bg-text-muted/20 lg:block" />
            <LeadStatsBar stats={stats} />
          </div>
          <div className="hidden items-center gap-2 lg:flex">
            <CrmViewSwitch
              items={[...LEAD_VIEW_ITEMS]}
              value={viewMode}
              onChange={(nextValue) =>
                setViewMode(nextValue as "table" | "kanban")
              }
            />
            <Button
              type="button"
              onClick={() => toast.info("Tính năng xuất file sắp ra mắt")}
              variant="outline"
              className="gap-2 shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Xuất file</span>
            </Button>
            <Button
              type="button"
              onClick={handleCreateLead}
              variant="primary"
              className="gap-2 shrink-0"
            >
              <Plus className="w-5 h-5" />
              <span>Thêm Lead</span>
            </Button>
          </div>
        </CrmToolbarSurface>

        <FAB onClick={handleCreateLead} label="Thêm Lead" />

        <LeadFilters stats={stats} />

        {visibleLeads.length === 0 ? (
          hasFilters ? (
            <EmptyState
              icon={FilterX}
              title="Không tìm thấy"
              description="Không có khách hàng tiềm năng nào khớp với bộ lọc."
              actionLabel="Xóa bộ lọc"
              onAction={clearFilters}
            />
          ) : (
            <EmptyState
              icon={Users}
              title="Chưa có Leads"
              description="Hãy bắt đầu bằng việc thêm một khách hàng tiềm năng mới."
              actionLabel="Thêm Lead đầu tiên"
              onAction={handleCreateLead}
            />
          )
        ) : (
          <CrmDashboardLayout
            view={isMobile || viewMode === "table" ? "list" : "board"}
            widgets={widgetsContent}
          >
            <div className="flex flex-col gap-2">
              {isMobile ? (
                <div className="space-y-2">
                  {visibleLeads.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      onClick={setSelectedLeadId}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {viewMode === "table" ? (
                    visibleLeads.map((lead) => (
                      <LeadCompactCard
                        key={lead.id}
                        lead={lead}
                        onClick={setSelectedLeadId}
                      />
                    ))
                  ) : (
                    <PipelineBoard
                      leads={visibleLeads}
                      onStatusChange={handleStatusChange}
                      onOpenLead={setSelectedLeadId}
                    />
                  )}
                </div>
              )}
              <Pagination
                page={page}
                totalPages={totalPages}
                onChange={handlePageChange}
                className="mt-4"
              />
              <p className="mt-1 text-center text-xs text-text-muted">
                Hiển thị {(page - 1) * pageSize + 1}–
                {Math.min(page * pageSize, total)} của {total} leads
              </p>
            </div>
          </CrmDashboardLayout>
        )}
      </div>

      <LeadFormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSaved={handleDataChanged}
      />

      <LeadDetailDrawer
        leadId={selectedLeadId}
        isOpen={!!selectedLeadId}
        onClose={() => setSelectedLeadId(null)}
        initialData={visibleLeads.find((lead) => lead.id === selectedLeadId)}
        onChanged={handleDataChanged}
      />
    </>
  );
}
