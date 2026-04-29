"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { AlertTriangle, Plus, Users, FilterX } from "lucide-react";
import { getEmployeeList, getEmployeeStats } from "@/app/actions/employee-queries";
import type { EmployeeListItem } from "@/types/employee";
import { cacheKeys, revalidateByPrefixes, useSWR } from "@/lib/swr";
import { Pagination } from "@/components/ui/pagination";
import { FAB } from "@/components/ui/fab";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/ux-states";
import { SkeletonTable } from "@/components/ui/skeleton";
import EmployeeStatsBar from "./employee-stats-bar";
import EmployeeFilters from "./employee-filters";
import EmployeeTable from "./employee-table";
import EmployeeCard from "./employee-card";
import EmployeeFormModal from "./employee-form-modal";
import EmployeeDetailDrawer from "./employee-detail-drawer";

// ═══════════════════════════════════════════
// EmployeeListPage — Client wrapper for /employees
// Phase 4: shared Pagination, removed EmployeePagination
// ═══════════════════════════════════════════

interface Props {
  employees?: EmployeeListItem[];
  stats?: { total: number; active: number; inactive: number; departments: Record<string, number> };
  total?: number;
  page?: number;
  pageSize?: number;
}

const EMPTY_STATS = { total: 0, active: 0, inactive: 0, departments: {} };

export default function EmployeeListPage({
  employees: initialEmployees = [],
  stats: initialStats = EMPTY_STATS,
  total: initialTotal = 0,
  page: initialPage = 1,
  pageSize: initialPageSize = 20,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeListItem | null>(null);
  const search = searchParams.get("search") || undefined;
  const status = searchParams.get("status") || undefined;
  const department = searchParams.get("dept") || undefined;
  const role = searchParams.get("role") || undefined;
  const sort = searchParams.get("sort") || undefined;
  const pageParam = searchParams.get("page") || undefined;
  const listKey = [
    cacheKeys.employees(),
    search || "",
    status || "",
    department || "",
    role || "",
    sort || "",
    pageParam || "1",
  ];
  const listQuery = useSWR(
    listKey,
    async () => {
      const result = await getEmployeeList({
        search,
        status,
        department,
        role,
        sort,
        page: pageParam,
      });
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    {
      fallbackData: {
        employees: initialEmployees,
        total: initialTotal,
        page: initialPage,
        pageSize: initialPageSize,
      },
      keepPreviousData: true,
      revalidateOnMount: false,
    },
  );
  const statsQuery = useSWR(cacheKeys.employees() + ":stats", async () => {
    const result = await getEmployeeStats();
    if (!result.success) throw new Error(result.error);
    return result.data;
  }, {
    fallbackData: initialStats,
    keepPreviousData: true,
    revalidateOnMount: false,
  });

  const list = listQuery.data || {
    employees: initialEmployees,
    total: initialTotal,
    page: initialPage,
    pageSize: initialPageSize,
  };
  const employees = list.employees || [];
  const stats = statsQuery.data || initialStats;
  const total = list.total || 0;
  const page = list.page || 1;
  const pageSize = list.pageSize || 20;
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

  // Detect if filters are active (not just default view)
  const hasFilters = searchParams.get("search") || searchParams.get("dept") ||
    searchParams.get("role") || searchParams.get("status");

  const clearFilters = () => router.push(pathname);

  const refreshEmployees = useCallback(() => {
    void revalidateByPrefixes(cacheKeys.employees());
  }, []);

  return (
    <div className="main-container gap-3!">
      {/* ── Stats + Action ── */}
      <div className="flex items-center justify-between gap-4 py-3 px-5 bg-bg-card rounded-xl shadow-xs">
        <EmployeeStatsBar stats={stats} />
        <div className="hidden lg:flex">
          <Button unstyled onClick={() => setShowForm(true)} className="btn btn-primary gap-2 shrink-0">
            <Plus className="w-5 h-5" />
            <span>Thêm nhân viên</span>
          </Button>
        </div>
      </div>

      <FAB onClick={() => setShowForm(true)} label="Thêm nhân viên" />

      {/* ── Filters (pass stats for pill counts) ── */}
      <EmployeeFilters stats={{ total: stats.total, active: stats.active, inactive: stats.inactive }} />

      {/* ── Employee List ── */}
      {listQuery.error ? (
        <EmptyState
          icon={AlertTriangle}
          title="Không tải được danh sách nhân viên"
          description={listQuery.error instanceof Error ? listQuery.error.message : "Vui lòng thử lại."}
          actionLabel="Tải lại"
          onAction={refreshEmployees}
        />
      ) : listQuery.isLoading && !listQuery.data ? (
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
          <div className="hidden lg:block">
            <EmployeeTable employees={employees} onSelect={setSelectedEmployee} />
          </div>
          <div className="lg:hidden space-y-2">
            {employees.map((emp) => (
              <EmployeeCard
                key={emp.id}
                employee={emp}
                onSelect={setSelectedEmployee}
              />
            ))}
          </div>
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
      />
    </div>
  );
}
