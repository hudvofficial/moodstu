"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Plus, Users, FilterX } from "lucide-react";
import type { EmployeeListItem } from "@/types/employee";
import { Pagination } from "@/components/ui/pagination";
import { FAB } from "@/components/ui/fab";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/ux-states";
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
  employees: EmployeeListItem[];
  stats: { total: number; active: number; inactive: number; departments: Record<string, number> };
  total: number;
  page: number;
  pageSize: number;
}

export default function EmployeeListPage({ employees, stats, total, page, pageSize }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeListItem | null>(null);
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
      {employees.length === 0 ? (
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
        onSaved={() => router.refresh()}
      />

      <EmployeeDetailDrawer
        employee={selectedEmployee}
        isOpen={!!selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
        onChanged={() => router.refresh()}
      />
    </div>
  );
}
