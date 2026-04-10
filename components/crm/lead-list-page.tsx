"use client";

import { useCallback, useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { Plus, Users, FilterX, Download, PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CrmLead, LeadStats, LeadStatus } from "@/types/crm";
import { Pagination } from "@/components/ui/pagination";
import { FAB } from "@/components/ui/fab";
import { EmptyState } from "@/components/ui/ux-states";
import LeadStatsBar from "./lead-stats-bar";
import LeadFilters from "./lead-filters";
import LeadCompactCard from "./lead-compact-card";
import { CrmDashboardLayout } from "./crm-dashboard-layout";
import { WidgetCTA } from "./widgets/widget-cta";
import { WidgetUpcoming } from "./widgets/widget-upcoming";
import { WidgetSourceDonut } from "./widgets/widget-source-donut";
import PipelineBoard from "./pipeline-board";
import LeadCard from "./lead-card";
import LeadDetailDrawer from "./lead-detail-drawer";
import LeadFormModal from "./lead-form-modal";
import LeadAnalytics from "./lead-analytics";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { cacheKeys } from "@/lib/swr";
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

export default function LeadListPage({ leads, stats, total, page, pageSize }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { mutate } = useSWRConfig();
  const [showForm, setShowForm] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [showAnalytics, setShowAnalytics] = useState(false);
  
  const totalPages = Math.ceil(total / pageSize);

  // Phase 01: Supabase Realtime + SWR Sync
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('public:crm_leads')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crm_leads' },
        () => {
          // Khi DB có thay đổi (INSERT, UPDATE, DELETE) -> Revalidate
          mutate(cacheKeys.leads());
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mutate]);

  // Pagination onChange — update URL param
  const handlePageChange = useCallback(
    (newPage: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newPage > 1) params.set("page", String(newPage));
      else params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  // Detect if filters are active
  const hasFilters = searchParams.get("search") || searchParams.get("status") ||
    searchParams.get("source") || searchParams.get("assigned");

  const clearFilters = () => router.push(pathname);

  // Action for creating lead
  const handleCreateLead = () => {
    setShowForm(true);
  };

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      await moveLeadToStage(leadId, newStatus as LeadStatus);
      mutate(cacheKeys.leads());
      toast.success("Đã cập nhật trạng thái");
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message || "Không thể cập nhật trạng thái");
      } else {
        toast.error("Không thể cập nhật trạng thái");
      }
    }
  };

  const widgetsContent = (
    <>
      <WidgetCTA />
      <WidgetUpcoming />
      <WidgetSourceDonut leads={leads} />
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
          <Button 
            onClick={() => setShowAnalytics(!showAnalytics)} 
            variant={showAnalytics ? "primary" : "outline"} 
            className="gap-2 shrink-0"
          >
            <PieChart className="w-4 h-4" />
            <span>Phân tích</span>
          </Button>

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

      {showAnalytics && <LeadAnalytics leads={leads} />}

      <FAB onClick={handleCreateLead} label="Thêm Lead" />

      {/* ── Filters ── */}
      <LeadFilters stats={stats} />

      {/* ── Lead List ── */}
      {leads.length === 0 ? (
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
          view={viewMode === "table" ? "list" : "board"}
          widgets={widgetsContent}
        >
          <div className="flex flex-col gap-2">
            <div className="hidden lg:flex flex-col gap-2">
              {viewMode === "table" ? (
                leads.map((lead) => (
                  <LeadCompactCard key={lead.id} lead={lead} onClick={setSelectedLeadId} />
                ))
              ) : (
                <PipelineBoard leads={leads} onStatusChange={handleStatusChange} />
              )}
            </div>
            <div className="lg:hidden space-y-2">
              {leads.map((lead) => (
                <LeadCard key={lead.id} lead={lead} onClick={setSelectedLeadId} onStatusChange={handleStatusChange} />
              ))}
            </div>
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
        onSaved={() => mutate(cacheKeys.leads())}
      />

      <LeadDetailDrawer 
        leadId={selectedLeadId}
        isOpen={!!selectedLeadId}
        onClose={() => setSelectedLeadId(null)}
        initialData={leads.find((l) => l.id === selectedLeadId)}
      />
    </>
  );
}
