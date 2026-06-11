"use client";

import { useState, useCallback, Suspense, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import useSWR from "swr";
import { Plus, Users, FilterX } from "lucide-react";
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
import { cacheKeys } from "@/lib/swr";
import { getEmployeeList, getEmployeeStats } from "@/app/actions/employee-queries";

// ═══════════════════════════════════════════
// EmployeeListPage — Client wrapper for /employees
// Optimized: Uses SWR with initialData for instant CSR filtering
// ═══════════════════════════════════════════

interface Props {
  initialList?: { employees: EmployeeListItem[]; total: number; page: number; pageSize: number };
  initialStats?: { total: number; active: number; inactive: number; departments: Record<string, number> };
  canEdit?: boolean;
}

const EMPTY_STATS = { total: 0, active: 0, inactive: 0, departments: {} };

function EmployeeListPageInner({
  initialList,
  initialStats = EMPTY_STATS,
  canEdit = false,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeListItem | null>(null);

  // ── Read filters from URL ──
  const search = searchParams.get("q") || searchParams.get("search") || undefined;
  const status = searchParams.get("status") || undefined;
  const department = searchParams.get("dept") || undefined;
  const role = searchParams.get("role") || undefined;
  const sort = searchParams.get("sort") || "newest";
  const page = Number(searchParams.get("page")) || 1;

  const filters = useMemo(() => ({
    search, status, department, role, sort, page: String(page)
  }), [search, status, department, role, sort, page]);

  // SWR — Employee list
  const { data: listData, isLoading, mutate: mutateList } = useSWR(
    [cacheKeys.employees(), filters],
    async () => {
      const res = await getEmployeeList(filters);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    { keepPreviousData: true, fallbackData: initialList }
  );

  // SWR — Employee stats
  const { data: stats, mutate: mutateStats } = useSWR(
    cacheKeys.employees() + "-stats",
    async () => {
      const res = await getEmployeeStats();
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    { keepPreviousData: true, fallbackData: initialStats }
  );

  const employees = listData?.employees || [];
  const total = listData?.total || 0;
  const pageSize = listData?.pageSize || 20;
  const totalPages = Math.ceil(total / pageSize);

  // Pagination onChange — update URL param
  const handlePageChange = useCallback(
    (newPage: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newPage > 1) params.set("page", String(newPage));
      else params.delete("page");
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  // Detect if filters are active (not just default view)
  const hasFilters = !!(search || department || role || (status && status !== "all"));

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    params.delete("search");
    params.delete("status");
    params.delete("dept");
    params.delete("role");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleSaved = useCallback(() => {
    mutateList();
    mutateStats();
  }, [mutateList, mutateStats]);

  return (
    <div className="main-container gap-3!">
      {/* ── Stats + Action ── */}
      <div className="flex items-center justify-between gap-4 py-3 px-5 bg-bg-card rounded-xl shadow-xs">
        <EmployeeStatsBar stats={stats || EMPTY_STATS} />
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
      <EmployeeFilters stats={stats || EMPTY_STATS} />

      {/* ── Employee List ── */}
      {isLoading && employees.length === 0 ? (
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
              <div className="space-y-2">
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
              <EmployeeTable employees={employees} onSelect={setSelectedEmployee} />
            }
          />
          {totalPages > 1 && (
            <Pagination page={page || 1} totalPages={totalPages} onChange={handlePageChange} className="mt-4" />
          )}
          <p className="text-center text-xs text-text-muted mt-1">
            Hiển thị {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} của {total} nhân viên
          </p>
        </>
      )}

      {/* ── Form Modal ── */}
      <EmployeeFormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSaved={handleSaved}
      />

      <EmployeeDetailDrawer
        employee={selectedEmployee}
        isOpen={!!selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
        onChanged={handleSaved}
        canEdit={canEdit}
      />
    </div>
  );
}

export default function EmployeeListPage(props: Props) {
  return (
    <Suspense>
      <EmployeeListPageInner {...props} />
    </Suspense>
  );
}
