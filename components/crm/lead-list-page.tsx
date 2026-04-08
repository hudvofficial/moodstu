"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Plus, Users, FilterX, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CrmLead, LeadStats } from "@/types/crm";
import { Pagination } from "@/components/ui/pagination";
import { FAB } from "@/components/ui/fab";
import { EmptyState } from "@/components/ui/ux-states";
import LeadStatsBar from "./lead-stats-bar";
import LeadFilters from "./lead-filters";
import LeadTable from "./lead-table";
import LeadCard from "./lead-card";

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
  // We will pass this to Phase 03
  // const [showForm, setShowForm] = useState(false);
  
  const totalPages = Math.ceil(total / pageSize);

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

  // Action for creating lead (Placeholder for Phase 03)
  const handleCreateLead = () => {
    // setShowForm(true);
    alert("Tính năng Thêm Lead sẽ được cập nhật ở Phase 03");
  };

  return (
    <div className="main-container gap-3!">
      {/* ── Stats + Action ── */}
      <div className="flex items-center justify-between gap-4 py-3 px-5 bg-bg-card rounded-xl shadow-xs">
        <LeadStatsBar stats={stats} />
        <div className="hidden lg:flex items-center gap-2">
          <Button variant="outline" className="gap-2 shrink-0">
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
        <>
          <div className="hidden lg:block">
            <LeadTable leads={leads} />
          </div>
          <div className="lg:hidden space-y-2">
            {leads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} />
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={handlePageChange} className="mt-4" />
          <p className="text-center text-xs text-text-muted mt-1">
            Hiển thị {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} của {total} leads
          </p>
        </>
      )}

      {/* ── Form Modal (Phase 03 Placeholder) ── */}
      {/* <LeadFormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSaved={() => router.refresh()}
      /> */}
    </div>
  );
}
