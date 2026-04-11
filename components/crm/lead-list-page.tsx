"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { Plus, Users, FilterX, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import type { CrmLead, LeadStats, LeadStatus } from "@/types/crm";
import { Pagination } from "@/components/ui/pagination";
import { FAB } from "@/components/ui/fab";
import { EmptyState } from "@/components/ui/ux-states";
import LeadStatsBar from "./lead-stats-bar";
import LeadFilters from "./lead-filters";
import LeadCompactCard from "./lead-compact-card";
import { CrmDashboardLayout } from "./crm-dashboard-layout";
// removed widget cta import
import { WidgetUpcoming } from "./widgets/widget-upcoming";
import { WidgetSourceDonut } from "./widgets/widget-source-donut";
import PipelineBoard from "./pipeline-board";
import LeadCard from "./lead-card";
import LeadDetailDrawer from "./lead-detail-drawer";
import LeadFormModal from "./lead-form-modal";
import { WidgetSalesFunnel } from "@/components/crm/widgets/widget-sales-funnel";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { moveLeadToStage } from "@/app/actions/lead-lifecycle";
import { List, Kanban } from "lucide-react";

// ═══════════════════════════════════════════
// LeadListPage — Client wrapper for /crm/leads
// Phase 02: Initial layout and UI construction
// ═══════════════════════════════════════════

interface Props {
  leads: CrmLead[];
  stats: LeadStats;
  total: number;
  page: number;
  pageSize: number;
}

type StatusOverride = { from: LeadStatus; to: LeadStatus };

export default function LeadListPage({ leads, stats, total, page, pageSize }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const isMobile = useIsMobile();
  const [showForm, setShowForm] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");

  const [statusOverrides, setStatusOverrides] = useState<Record<string, StatusOverride>>({});
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const totalPages = Math.ceil(total / pageSize);

  const scheduleRefresh = useCallback(
    (delay = 0) => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => {
        refreshTimerRef.current = null;
        startTransition(() => {
          router.refresh();
        });
      }, delay);
    },
    [router, startTransition],
  );

  const visibleLeads = useMemo(
    () =>
      leads.map((lead) => {
        const override = statusOverrides[lead.id];
        return override && override.from === lead.status ? { ...lead, status: override.to } : lead;
      }),
    [leads, statusOverrides],
  );

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  // Phase 01: Supabase Realtime + throttled server refresh
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('public:crm_leads')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crm_leads' },
        () => {
          // Khi DB có thay đổi (INSERT, UPDATE, DELETE) -> Revalidate
          scheduleRefresh(600);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [scheduleRefresh]);

  // Pagination onChange — update URL param
  const handlePageChange = useCallback(
    (newPage: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newPage > 1) params.set("page", String(newPage));
      else params.delete("page");
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams, startTransition]
  );

  // Detect if filters are active
  const hasFilters = searchParams.get("search") || searchParams.get("status") ||
    searchParams.get("source") || searchParams.get("assigned");

  const clearFilters = () => {
    startTransition(() => {
      router.push(pathname);
    });
  };

  // Action for creating lead
  const handleCreateLead = () => {
    setShowForm(true);
  };

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    const nextStatus = newStatus as LeadStatus;
    const baseLead = leads.find((lead) => lead.id === leadId);
    if (!baseLead) return;

    const previousOverride = statusOverrides[leadId];
    setStatusOverrides((current) => ({ ...current, [leadId]: { from: baseLead.status, to: nextStatus } }));
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
      <div className="shrink-0"><WidgetSalesFunnel leads={visibleLeads} /></div>
      <div className="shrink-0"><WidgetSourceDonut leads={visibleLeads} /></div>
      {/* <WidgetCTA /> */}
      <div className="shrink-0"><WidgetUpcoming /></div>
    </>
  );

  return (
    <>
      <div className="main-container gap-3!">
        {/* ── Mobile Sub-nav ── */}
      <div className="lg:hidden flex items-center gap-2 px-1">
        <Link href="/crm/leads"
          className="flex-1 text-center py-2 text-sm font-medium rounded-lg transition-colors bg-primary/10 text-primary"
        >
          DS Sale
        </Link>
        <Link href="/crm/customers"
          className="flex-1 text-center py-2 text-sm font-medium rounded-lg transition-colors text-text-secondary hover:bg-bg-hover"
        >
          Hồ sơ KH
        </Link>
      </div>

      {/* ── Stats + Action ── */}
      <div className="flex items-center justify-between gap-4 py-3 px-5 bg-bg-card rounded-xl shadow-xs">
        <LeadStatsBar stats={stats} />
        <div className="hidden lg:flex items-center gap-2">
          {/* Analytics Toggle */}
          

          {/* View Mode Toggle */}
          <div className="flex flex-row items-center bg-bg-input p-1 rounded-lg gap-1 border border-border/50">
            <div
              role="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === "table" ? "bg-bg-card shadow-sm text-primary flex items-center justify-center" : "text-text-muted hover:text-text-primary flex items-center justify-center"
              }`}
            >
              <List className="w-4 h-4" />
            </div>
            <div
              role="button"
              onClick={() => setViewMode("kanban")}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === "kanban" ? "bg-bg-card shadow-sm text-primary flex items-center justify-center" : "text-text-muted hover:text-text-primary flex items-center justify-center"
              }`}
            >
              <Kanban className="w-4 h-4" />
            </div>
          </div>
          
          <Button onClick={() => toast.info("Tính năng xuất file sắp ra mắt")} variant="outline" className="gap-2 shrink-0">
            <Download className="w-4 h-4" />
            <span>Xuất file</span>
          </Button>
          <Button onClick={handleCreateLead} variant="primary" className="gap-2 shrink-0">
            <Plus className="w-5 h-5" />
            <span>Thêm Lead</span>
          </Button>
        </div>
      </div>



      <FAB onClick={handleCreateLead} label="Thêm Lead" />

      {/* ── Filters ── */}
      <LeadFilters stats={stats} />

      {/* ── Lead List ── */}
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
                  <LeadCard key={lead.id} lead={lead} onClick={setSelectedLeadId} onStatusChange={handleStatusChange} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
              {viewMode === "table" ? (
                visibleLeads.map((lead) => (
                  <LeadCompactCard key={lead.id} lead={lead} onClick={setSelectedLeadId} />
                ))
              ) : (
                <PipelineBoard leads={visibleLeads} onStatusChange={handleStatusChange} />
              )}
              </div>
            )}
            <Pagination page={page} totalPages={totalPages} onChange={handlePageChange} className="mt-4" />
            <p className="text-center text-xs text-text-muted mt-1">
              Hiển thị {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} của {total} leads
            </p>
          </div>
        </CrmDashboardLayout>
      )}
      </div>

      {/* ── Form Modal ── */}
      <LeadFormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSaved={handleDataChanged}
      />

      <LeadDetailDrawer 
        leadId={selectedLeadId}
        isOpen={!!selectedLeadId}
        onClose={() => setSelectedLeadId(null)}
        initialData={visibleLeads.find((l) => l.id === selectedLeadId)}
        onChanged={handleDataChanged}
      />
    </>
  );
}
