import { getEmployeeList, getEmployeeStats } from "@/app/actions/employee-queries";
import EmployeeListPage from "@/components/employees/employee-list-page";
import { RealtimeSync } from "@/components/shared/realtime-sync";

export const metadata = { title: "Nhân viên | Mood Studio" };

interface Props {
  searchParams: Promise<{
    search?: string;
    status?: string;
    dept?: string;
    role?: string;
    sort?: string;
    page?: string;
  }>;
}

export default async function EmployeesPage({ searchParams }: Props) {
  const params = await searchParams;

  const [listResult, statsResult] = await Promise.all([
    getEmployeeList({
      search: params.search,
      status: params.status,
      department: params.dept,
      role: params.role,
      sort: params.sort,
      page: params.page,
    }),
    getEmployeeStats(),
  ]);

  const list = listResult.success ? listResult.data : { employees: [], total: 0, page: 1, pageSize: 20 };
  const stats = statsResult.success ? statsResult.data : { total: 0, active: 0, inactive: 0, departments: {} };

  return (
    <>
      <RealtimeSync table="employees" />
      <EmployeeListPage
        employees={list?.employees || []}
        stats={stats || { total: 0, active: 0, inactive: 0, departments: {} }}
        total={list?.total || 0}
        page={list?.page || 1}
        pageSize={list?.pageSize || 20}
      />
    </>
  );
}
