import EmployeeListPage from "@/components/employees/employee-list-page";
import { RealtimeSync } from "@/components/shared/realtime-sync";
import { getEmployeeList, getEmployeeStats } from "@/app/actions/employee-queries";

export const metadata = { title: "Nhân viên" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const listParams = {
    search: firstParam(params.search),
    status: firstParam(params.status),
    department: firstParam(params.dept),
    role: firstParam(params.role),
    sort: firstParam(params.sort),
    page: firstParam(params.page),
  };

  const [listResult, statsResult] = await Promise.all([
    getEmployeeList(listParams),
    getEmployeeStats(),
  ]);

  if (!listResult.success) {
    throw new Error(listResult.error || "Không thể tải danh sách nhân viên");
  }

  if (!statsResult.success) {
    throw new Error(statsResult.error || "Không thể tải thống kê nhân viên");
  }

  return (
    <>
      <RealtimeSync table="employees" prefixes="employees" debounceMs={600} />
      <EmployeeListPage
        employees={listResult.data.employees}
        total={listResult.data.total}
        page={listResult.data.page}
        pageSize={listResult.data.pageSize}
        stats={statsResult.data}
      />
    </>
  );
}

