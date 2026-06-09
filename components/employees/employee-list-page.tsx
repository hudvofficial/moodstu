"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { AlertTriangle, Plus, Users, FilterX } from "lucide-react";
import type { EmployeeListItem } from "@/types/employee";
import { Pagination } from "@/components/ui/pagination";
import { FAB } from "@/components/ui/fab";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/ux-states";
import { SkeletonTable } from "@/components/ui/skeleton";
import EmployeeStatsBar from "./employee-stats-bar";
import EmployeeFilters from "./employee-filters";
import EmployeeTable from "./employee-table";
import EmployeeCard from "./employee-card";
import { TierSwitch } from "@/components/ui/tier-switch";
import EmployeeFormModal from "./employee-form-modal";
import EmployeeDetailDrawer from "./employee-detail-drawer";

// ═══════════════════════════════════════════
// EmployeeListPage — Client wrapper for /employees
// Optimized: Removed SWR, using RSC props and useTransition
// ═══════════════════════════════════════════

interface Props {
  employees?: EmployeeListItem[];
  stats?: { total: number; active: number; inactive: number; departments: Record<string, number> };
  total?: number;
  page?: number;
  pageSize?: number;
  canEdit?: boolean;
}

const EMPTY_STATS = { total: 0, active: 0, inactive: 0, departments: {} };

export default function EmployeeListPage({
  employees = [],
  stats = EMPTY_STATS,
  total = 0,
  page = 1,
  pageSize = 20,
  canEdit = false,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeListItem | null>(null);

  const totalPages = Math.ceil(total / pageSize);

  // Pagination onChange — update URL param
  const handlePageChange = useCallback(
    (newPage: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newPage > 1) params.set("page", String(newPage));
      else params.delete("page");
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [router, pathname, searchParams]
  );

  // Detect if filters are active (not just default view)
  const hasFilters = searchParams.get("search") || searchParams.get("dept") ||
    searchParams.get("role") || searchParams.get("status");

  const clearFilters = () => {
    startTransition(() => {
      router.push(pathname, { scroll: false });
    });
  };

  const refreshEmployees = useCallback(() => {
    startTransition(() => {
      router.refresh();
    });
  }, [router]);

  return (
    <div className="main-container gap-3!">
      {/* ── Stats + Action ── */}
      <div className="flex items-center justify-between gap-4 py-3 px-5 bg-bg-card rounded-xl shadow-xs">
        <EmployeeStatsBar stats={stats} />
        {canEdit && (
          <div className="hidden lg:flex">
            <Button unstyled onClick={() => setShowForm(true)} className="btn btn-primary gap-2 shrink-0">
              <Plus className="w-5 h-5" />
              <span>Thêm nhân viên</span>
            </Button>
          </div>
        )}
      </div>

      {canEdit && <FAB onClick={() => setShowForm(true)} label="Thêm nhân viên" />}

      {/* ── Filters (pass stats for pill counts) ── */}
      <EmployeeFilters stats={{ total: stats.total, active: stats.active, inactive: stats.inactive }} />

      {/* ── Employee List ── */}
      {isPending && employees.length === 0 ? (
        <div className="card-base p-5">
          <SkeletonTable rows={6} />
        </div>
      ) : employees.length === 0 ? (
        hasFilters ? (
          <EmptyState
            icon={FilterX}
            title="Không tìm thấy"
            description="Không tìm thấy nhân viên phù hợp bộ lọc"
            actionLabel="Xóa bộ lọc"
            onAction={clearFilters}
          />
        ) : (
          <EmptyState
            icon={Users}
            title="Chưa có nhân viên"
            description="Chưa có nhân viên nào trong hệ thống"
            actionLabel="Thêm nhân viên đầu tiên"
            onAction={() => setShowForm(true)}
          />
        )
      ) : (
        <>
          <TierSwitch
            phone={
              <div className="space-y-2 relative">
                {isPending && (
                  <div className="absolute inset-0 bg-bg-base/30 backdrop-blur-[1px] z-10 rounded-xl" />
                )}
                {employees.map((emp) => (
                  <EmployeeCard
                    key={emp.id}
                    employee={emp}
                    onSelect={setSelectedEmployee}
                  />
                ))}
              </div>
            }
            desktop={
              <div className="relative">
                {isPending && (
                  <div className="absolute inset-0 bg-bg-base/30 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-xl" />
                )}
                <EmployeeTable employees={employees} onSelect={setSelectedEmployee} />
              </div>
            }
          />
          <Pagination page={page} totalPages={totalPages} onChange={handlePageChange} className="mt-4" />
          <p className="text-center text-xs text-text-muted mt-1">
            Hiển thị {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} của {total} nhân viên
          </p>
        </>
      )}

      {/* ── Form Modal ── */}
      <EmployeeFormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSaved={refreshEmployees}
      />

      <EmployeeDetailDrawer
        employee={selectedEmployee}
        isOpen={!!selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
        onChanged={refreshEmployees}
        canEdit={canEdit}
      />
    </div>
  );
}
